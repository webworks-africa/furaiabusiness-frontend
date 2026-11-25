import { http, HttpResponse, delay } from "msw";
import { z } from "zod";
import { guard, mockError } from "./handlers";
import {
  documents as d,
  supplierRepo,
  type StoredUpload,
  type StoredPayable,
} from "./documentStore";
import { documentModel } from "./documentModels";
import { documentKind, reviewSchema } from "../api/documentContracts";
import { renderDocumentPdf } from "../documents/pdf";
import { extractInvoiceFile, maxUploadBytes } from "../documents/extract";
import { validDate, dueFromTerms } from "../domain/supplierInvoices";
import { enterprise } from "./enterpriseStore";
import { makeOrder } from "./enterpriseHandlers";
import { business, actorPermissions } from "./businessStore";
import { billing } from "./billingStore";
import { collections } from "./collectionStore";
import { db, fixedDate } from "./store";
const json = (x: unknown) =>
    HttpResponse.json(x as object, {
      headers: { "Cache-Control": "no-store" },
    }),
  id = (s: string) => s + "-" + crypto.randomUUID();
const digest = async (b: Uint8Array) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new Uint8Array(b).buffer),
    ),
  )
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
const tokenHash = (s: string) => digest(new TextEncoder().encode(s));
const permission = (kind: string) =>
  kind === "lpo" ? ("payments:write" as const) : ("billing:read" as const);
const visible = (x: { kind: string }) =>
  x.kind !== "lpo" || actorPermissions(db.role).includes("payments:write");
function file(bytes: Uint8Array, name: string, mime = "application/pdf") {
  return new HttpResponse(new Uint8Array(bytes).buffer, {
    headers: {
      "Content-Type": mime,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": `attachment; filename="${name.replace(/[^A-Za-z0-9._-]/g, "_")}"`,
    },
  });
}
async function createExport(kind: z.infer<typeof documentKind>, ref: string) {
  const model = documentModel(kind, ref);
  if (!model) throw Error("Document unavailable");
  const bytes = await renderDocumentPdf(model),
    record = {
      id: id("PDF"),
      kind,
      documentId: ref,
      revision: model.revision,
      filename: `${kind}-${ref}-r${model.revision}.pdf`,
      sha256: await digest(bytes),
      status: "Ready" as const,
      model,
    };
  d.exports.unshift(record);
  d.pdfs.set(record.id, bytes);
  return record;
}
const publicFailure = () =>
  db.scenario === "unavailable" ? mockError(503) : null;
const metadata = (i: StoredUpload) => ({
  id: i.id,
  supplierId: i.supplierId,
  supplierName: i.supplierName,
  filename: i.filename,
  size: i.size,
  sha256: i.sha256,
  status: i.status,
  extracted: i.extracted,
});
const live = (l: { status: string; expiresAt: string }) =>
  l.status === "Active" && Date.parse(l.expiresAt) > Date.now();
async function linkFor(token: string) {
  const hash = await tokenHash(token);
  return (await supplierRepo.all("links")).find((l) => l.hash === hash);
}
async function supplierWorkspace() {
  const links = await supplierRepo.all("links"),
    intakes = await supplierRepo.all("intakes"),
    stored = await supplierRepo.all("payables");
  const payables = stored.map((p) => {
    const latestOrderId = p.orderIds.at(-1) ?? null,
      o = enterprise.orders.find((o) => o.id === latestOrderId);
    const status =
      o?.payout.status === "Completed"
        ? ("Paid" as const)
        : o?.payout.status === "Pending confirmation" || (latestOrderId && !o)
          ? ("Pending confirmation" as const)
          : o?.payout.status === "Awaiting approval"
            ? ("Awaiting authorization" as const)
            : o && ["Failed", "Cancelled", "Rejected"].includes(o.payout.status)
              ? ("Payment failed" as const)
              : ("Approved" as const);
    const today = fixedDate.slice(0, 10),
      bucket =
        status === "Paid"
          ? ("Paid" as const)
          : p.dueDate < today
            ? ("Overdue" as const)
            : p.dueDate === today
              ? ("Due today" as const)
              : ("Upcoming" as const);
    return { ...p, latestOrderId, status, bucket };
  });
  return {
    asOf: fixedDate,
    links: links.map((l) => ({
      id: l.id,
      supplierId: l.supplierId,
      supplierName: l.supplierName,
      expiresAt: l.expiresAt,
      status:
        l.status === "Revoked" ? "Revoked" : live(l) ? "Active" : "Expired",
      path: "",
    })),
    intakes: intakes.map(metadata),
    payables,
    summaries: (["KES", "USD"] as const).map((currency) => {
      const sum = (bucket: string) =>
        payables
          .filter((p) => p.currency === currency && p.bucket === bucket)
          .reduce((v, p) => v + BigInt(p.amountMinor), 0n)
          .toString();
      return {
        currency,
        overdueMinor: sum("Overdue"),
        dueTodayMinor: sum("Due today"),
        upcomingMinor: sum("Upcoming"),
        paidMinor: sum("Paid"),
      };
    }),
  };
}
export const documentHandlers = [
  http.get("*/api/documents/workspace", async () => {
    const e = await guard("billing:read");
    if (e) return e;
    for (const m of d.deliveries.filter((x) => x.status === "Queued")) {
      m.status =
        m.to.includes("fail") && m.attempt === 1
          ? "Failed"
          : "Delivered (simulated)";
      m.error =
        m.status === "Failed"
          ? "Simulated delivery failure. Retry the same attachment."
          : null;
    }
    return json({
      exports: d.exports.filter(visible),
      deliveries: d.deliveries.filter(visible),
      tax: d.tax,
      taxMode: d.taxMode,
    });
  }),
  http.get("*/api/documents/:kind/:id", async ({ params }) => {
    const k = documentKind.safeParse(params.kind);
    if (!k.success) return mockError(404);
    const e = await guard(permission(k.data));
    if (e) return e;
    const m = documentModel(k.data, String(params.id));
    return m ? json(m) : mockError(404);
  }),
  http.post(
    "*/api/documents/:kind/:id/exports",
    async ({ params, request }) => {
      const k = documentKind.safeParse(params.kind);
      if (!k.success) return mockError(404);
      const e = await guard(permission(k.data));
      if (e) return e;
      const v = z
          .object({ revision: z.number().int() })
          .safeParse(await request.json()),
        m = documentModel(k.data, String(params.id));
      if (!m) return mockError(404);
      if (
        !v.success ||
        v.data.revision !== m.revision ||
        db.scenario === "stale"
      )
        return mockError(409);
      try {
        await delay(250);
        return json(await createExport(k.data, m.id));
      } catch {
        return mockError(503);
      }
    },
  ),
  http.get("*/api/document-exports/:id/pdf", async ({ params }) => {
    const r = d.exports.find((x) => x.id === params.id);
    if (!r) return mockError(404);
    const e = await guard(permission(r.kind));
    if (e) return e;
    const bytes = d.pdfs.get(r.id);
    return r.status === "Ready" && bytes
      ? file(bytes, r.filename)
      : mockError(410);
  }),
  http.post("*/api/document-deliveries", async ({ request }) => {
    const e = await guard("billing:write");
    if (e) return e;
    const v = z
      .object({
        exportId: z.string(),
        to: z.email(),
        subject: z
          .string()
          .trim()
          .min(3)
          .max(200)
          .refine((s) => !/[\r\n]/.test(s)),
        message: z.string().max(3000),
      })
      .safeParse(await request.json());
    if (!v.success) return mockError(422);
    const r = d.exports.find(
      (x) => x.id === v.data.exportId && x.status === "Ready",
    );
    if (!r) return mockError(404);
    if (!visible(r)) return mockError(403);
    const key = request.headers.get("Idempotency-Key");
    if (!key) return mockError(422);
    const prior = d.deliveries.find((x) => x.id === "MAIL-" + key);
    if (prior)
      return Object.entries(v.data).every(
        ([k, v]) => prior[k as keyof typeof prior] === v,
      )
        ? json(prior)
        : mockError(409);
    const m = {
      ...v.data,
      id: "MAIL-" + key,
      kind: r.kind,
      documentId: r.documentId,
      status: "Queued" as const,
      attempt: 1,
      error: null,
    };
    d.deliveries.unshift(m);
    return json(m);
  }),
  http.post("*/api/document-deliveries/:id/retry", async ({ params }) => {
    const e = await guard("billing:write");
    if (e) return e;
    const m = d.deliveries.find((x) => x.id === params.id);
    if (!m) return mockError(404);
    if (!visible(m)) return mockError(403);
    if (m.status !== "Failed" || m.attempt >= 3) return mockError(409);
    m.status = "Queued";
    m.attempt++;
    m.error = null;
    return json(m);
  }),
  http.post("*/api/tax/demo-connection", async ({ request }) => {
    const e = await guard("business:manage");
    if (e) return e;
    const v = z
      .object({ enabled: z.boolean() })
      .safeParse(await request.json());
    if (!v.success) return mockError(422);
    d.taxMode = v.data.enabled ? "Demo" : "Not connected";
    return json({ ok: true });
  }),
  http.post(
    "*/api/tax/invoices/:id/submit-demo",
    async ({ params, request }) => {
      const e = await guard("billing:write");
      if (e) return e;
      if (d.taxMode !== "Demo") return mockError(409);
      const inv = billing.documents.find(
        (x) => x.id === params.id && x.kind === "invoices" && x.snapshot,
      );
      if (!inv) return mockError(404);
      const v = z
        .object({ outcome: z.enum(["accepted", "rejected"]) })
        .safeParse(await request.json());
      if (!v.success) return mockError(422);
      await delay(600);
      const t = {
        documentId: inv.id,
        status:
          v.data.outcome === "accepted"
            ? ("Demo accepted" as const)
            : ("Demo rejected" as const),
        reference: "FURAIA-DEMO-" + inv.id,
      };
      const prior = d.tax.find((x) => x.documentId === inv.id);
      if (prior) Object.assign(prior, t);
      else d.tax.push(t);
      return json(t);
    },
  ),
  http.get("*/api/public/quotations/:token/pdf", async ({ params }) => {
    const e = publicFailure();
    if (e) return e;
    const q = billing.documents.find(
      (x) =>
        x.kind === "quotations" && x.publicToken === params.token && x.snapshot,
    );
    if (!q) return mockError(404);
    if (q.values.until < fixedDate.slice(0, 10)) return mockError(410);
    try {
      const r = await createExport("quotation", q.id);
      return file(d.pdfs.get(r.id)!, r.filename);
    } catch {
      return mockError(503);
    }
  }),
  http.get(
    "*/api/public/collection-results/:token/receipt.pdf",
    async ({ params }) => {
      const e = publicFailure();
      if (e) return e;
      const p = collections.attempts.find(
        (x) =>
          x.token === params.token && x.status === "Confirmed" && x.receipt,
      );
      if (!p?.receipt) return mockError(404);
      try {
        const r = await createExport("receipt", p.receipt.id);
        return file(d.pdfs.get(r.id)!, r.filename);
      } catch {
        return mockError(503);
      }
    },
  ),
  http.get("*/api/supplier-documents", async () => {
    const e = await guard("payments:write");
    return e ?? json(await supplierWorkspace());
  }),
  http.post("*/api/suppliers/:id/upload-links", async ({ params }) => {
    const e = await guard("payments:write");
    if (e) return e;
    const s = enterprise.suppliers.find(
      (x) => x.id === params.id && !x.archived,
    );
    if (!s) return mockError(404);
    const token = crypto.randomUUID() + crypto.randomUUID(),
      l = {
        id: id("SLINK"),
        supplierId: s.id,
        supplierName: s.name,
        businessName: business.profile.values.displayName,
        hash: await tokenHash(token),
        expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
        status: "Active" as const,
      };
    await supplierRepo.put("links", l);
    return json({
      id: l.id,
      supplierId: s.id,
      supplierName: s.name,
      expiresAt: l.expiresAt,
      status: l.status,
      path: "/public/supplier-upload/" + token,
    });
  }),
  http.post("*/api/supplier-upload-links/:id/revoke", async ({ params }) => {
    const e = await guard("payments:write");
    if (e) return e;
    const l = (await supplierRepo.all("links")).find((x) => x.id === params.id);
    if (!l) return mockError(404);
    l.status = "Revoked";
    await supplierRepo.put("links", l);
    return json({ ok: true });
  }),
  http.get("*/api/public/supplier-submissions/:token", async ({ params }) => {
    const e = publicFailure();
    if (e) return e;
    const l = await linkFor(String(params.token));
    if (!l) return mockError(404);
    if (!live(l)) return mockError(410);
    return json({
      supplierName: l.supplierName,
      businessName: l.businessName,
      expiresAt: l.expiresAt,
    });
  }),
  http.post(
    "*/api/public/supplier-submissions/:token/uploads",
    async ({ params, request }) => {
      const e = publicFailure();
      if (e) return e;
      const l = await linkFor(String(params.token));
      if (!l) return mockError(404);
      if (!live(l)) return mockError(410);
      const epoch = d.epoch,
        form = await request.formData().catch(() => null),
        f = form?.get("file");
      if (!f || typeof f === "string" || !f.size || f.size > maxUploadBytes)
        return mockError(422);
      const bytes = new Uint8Array(await f.arrayBuffer()),
        hash = await digest(bytes),
        list = await supplierRepo.all("intakes"),
        prior = list.find(
          (x) => x.supplierId === l.supplierId && x.sha256 === hash,
        );
      if (prior) return json(metadata(prior));
      if (list.reduce((n, x) => n + x.size, 0) + f.size > 60 * 1024 * 1024)
        return mockError(413);
      try {
        const extracted = await extractInvoiceFile(f.name, bytes),
          again = await linkFor(String(params.token));
        if (epoch !== d.epoch || !again || !live(again)) return mockError(410);
        const ext = f.name.toLowerCase().split(".").pop(),
          mime =
            ext === "pdf"
              ? "application/pdf"
              : ext === "docx"
                ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                : ext === "xlsx"
                  ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  : "text/csv";
        const i: StoredUpload = {
          id: id("UPLOAD"),
          supplierId: l.supplierId,
          supplierName: l.supplierName,
          filename: f.name.split(/[\\/]/).at(-1)!.slice(0, 150),
          size: f.size,
          sha256: hash,
          status: "Awaiting review",
          extracted,
          bytes,
          mime,
        };
        await supplierRepo.put("intakes", i);
        return json(metadata(i));
      } catch {
        return mockError(422);
      }
    },
  ),
  http.get("*/api/supplier-invoices/:id/original", async ({ params }) => {
    const e = await guard("payments:write");
    if (e) return e;
    const i = (await supplierRepo.all("intakes")).find(
      (x) => x.id === params.id,
    );
    return i ? file(i.bytes, i.filename, i.mime) : mockError(404);
  }),
  http.post(
    "*/api/supplier-invoices/:id/approve",
    async ({ params, request }) => {
      const e = await guard("payments:write");
      if (e) return e;
      const i = (await supplierRepo.all("intakes")).find(
        (x) => x.id === params.id,
      );
      if (!i) return mockError(404);
      const v = reviewSchema.safeParse(await request.json());
      if (!v.success) return mockError(422);
      const p = v.data;
      if (
        !validDate(p.invoiceDate) ||
        !validDate(p.dueDate) ||
        dueFromTerms(p.invoiceDate, p.termsDays) !== p.dueDate
      )
        return mockError(422);
      const list = await supplierRepo.all("payables");
      if (list.some((x) => x.intakeId === i.id))
        return json(await supplierWorkspace());
      if (i.status !== "Awaiting review" || db.scenario === "stale")
        return mockError(409);
      const s = enterprise.suppliers.find(
        (x) => x.id === i.supplierId && !x.archived,
      );
      if (!s) return mockError(409);
      if (
        list.some(
          (x) =>
            x.supplierId === s.id &&
            x.invoiceNumber.toLowerCase() === p.invoiceNumber.toLowerCase() &&
            x.currency === p.currency,
        )
      )
        return mockError(409);
      const record: StoredPayable = {
        id: id("BILL"),
        intakeId: i.id,
        supplierId: s.id,
        supplierName: s.name,
        beneficiaryId: s.beneficiaryId,
        invoiceNumber: p.invoiceNumber,
        invoiceDate: p.invoiceDate,
        dueDate: p.dueDate,
        termsDays: p.termsDays,
        currency: p.currency,
        amountMinor: p.amountMinor,
        orderIds: [],
      };
      await supplierRepo.put("payables", record);
      i.status = "Approved";
      await supplierRepo.put("intakes", i);
      return json(await supplierWorkspace());
    },
  ),
  http.post("*/api/supplier-invoices/:id/reject", async ({ params }) => {
    const e = await guard("payments:write");
    if (e) return e;
    const i = (await supplierRepo.all("intakes")).find(
      (x) => x.id === params.id,
    );
    if (!i) return mockError(404);
    if (i.status !== "Awaiting review") return mockError(409);
    i.status = "Rejected";
    await supplierRepo.put("intakes", i);
    return json(await supplierWorkspace());
  }),
  http.post(
    "*/api/supplier-payables/:id/payment",
    async ({ params, request }) => {
      const e = await guard("payments:write");
      if (e) return e;
      const v = z
        .object({ accountId: z.string() })
        .safeParse(await request.json());
      if (!v.success) return mockError(422);
      const p = (await supplierRepo.all("payables")).find(
        (x) => x.id === params.id,
      );
      if (!p) return mockError(404);
      if (p.currency !== "KES") return mockError(422);
      const prior = enterprise.orders.find((x) => x.id === p.orderIds.at(-1));
      if (p.orderIds.length && !prior) return mockError(409);
      if (
        prior &&
        !["Failed", "Cancelled", "Rejected"].includes(prior.payout.status)
      )
        return json({ orderId: prior.id });
      try {
        const order = makeOrder({
          accountId: v.data.accountId,
          beneficiaryId: p.beneficiaryId,
          amountMinor: p.amountMinor,
          reference: `${p.id}:attempt${p.orderIds.length + 1}`,
          outcome: "confirmed",
        });
        p.orderIds.push(order.id);
        await supplierRepo.put("payables", p);
        return json({ orderId: order.id });
      } catch {
        return mockError(409);
      }
    },
  ),
];
