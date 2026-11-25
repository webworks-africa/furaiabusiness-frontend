import { enterprise } from "./enterpriseStore";
import { http, HttpResponse, delay } from "msw";
import { z } from "zod";
import { guard, mockError } from "./handlers";
import { db, fixedDate } from "./store";
import { billing } from "./billingStore";
import {
  collections,
  financials,
  updateInvoice,
  updateLink,
  postMovement,
} from "./collectionStore";
import { normalizeKenyanMobile, maskMobile } from "../domain/paymentMethods";
import {
  linkInput,
  paymentMethodSchema,
  type Attempt,
} from "../api/collectionContracts";
import { freshness } from "./selectors";
const json = (x: object) => HttpResponse.json({ ...x, ...freshness() });
const find = (id: unknown) =>
  billing.documents.find(
    (d) =>
      d.id === id &&
      d.kind === "invoices" &&
      d.snapshot &&
      d.status !== "Draft",
  );
const unresolved = (id: string) =>
  collections.attempts.find(
    (p) =>
      p.invoiceId === id &&
      ["Processing", "Pending confirmation"].includes(p.status),
  );
function settlement(id: string) {
  const d = find(id)!;
  const f = financials(id);
  return {
    invoiceId: id,
    currency: d.values.currency,
    version: d.version,
    paidMinor: f.paid.toString(),
    creditedMinor: f.credited.toString(),
    refundedMinor: f.refunded.toString(),
    customerCreditMinor: f.customerCredit.toString(),
    refundableMinor: f.refundable.toString(),
    outstandingMinor: f.due.toString(),
    links: collections.links.filter((l) => l.invoiceId === id).map(updateLink),
    attempts: collections.attempts.filter((p) => p.invoiceId === id),
    receipts: collections.attempts
      .filter((p) => p.invoiceId === id && p.receipt)
      .map((p) => p.receipt!),
    credits: collections.credits.filter((c) => c.invoiceId === id),
    refunds: collections.refunds.filter((c) => c.invoiceId === id),
  };
}
async function publicGuard() {
  await delay(200);
  return db.scenario === "unavailable" ? mockError(503) : undefined;
}
function key(request: Request, body: unknown) {
  const k = request.headers.get("Idempotency-Key");
  return k
    ? {
        key: "collection:" + new URL(request.url).pathname + ":" + k,
        body: JSON.stringify(body),
      }
    : null;
}
function replay(k: { key: string; body: string }) {
  const old = db.idempotency.get(k.key);
  return old ? (old.body === k.body ? old.id : false) : null;
}
function remember(k: { key: string; body: string }, id: string) {
  db.idempotency.set(k.key, { body: k.body, id });
}
function confirm(p: Attempt) {
  if (!["Processing", "Pending confirmation"].includes(p.status)) return;
  const outcome = collections.providerOutcomes[p.id] ?? collections.outcome;
  if (outcome === "pending") {
    p.status = "Pending confirmation";
    return;
  }
  if (outcome === "failed") {
    p.status = "Failed";
    p.providerState = "Failed";
    p.providerEvents.push({
      label: "Provider outcome failed (simulated)",
      at: fixedDate,
    });
    return;
  }
  const link = collections.links.find((l) => l.id === p.linkId)!;
  const d = find(p.invoiceId)!;
  if (BigInt(d.outstandingMinor) < BigInt(p.amountMinor))
    throw new Error("Allocation invariant");
  p.status = "Confirmed";
  p.providerState = "Confirmed";
  p.providerEvents.push({
    label: "Provider outcome confirmed (simulated)",
    at: fixedDate,
  });
  postMovement(link.accountId, BigInt(p.amountMinor), p.id, p.invoiceId);
  updateInvoice(p.invoiceId);
  p.receipt = {
    branding: ((b) => ({
      template: b.template,
      accent: b.accent,
      logo: b.logo,
      footer: b.footer,
    }))(d.snapshot?.branding ?? enterprise.branding),
    issuerDetails: structuredClone(
      d.snapshot?.issuerDetails ?? { address: "", email: "", phone: "" },
    ),
    method: p.method,
    providerReference: p.providerReference,
    maskedPhone: p.maskedPhone,
    id: `RCT-MOCK-${collections.next++}`,
    paymentId: p.id,
    invoiceId: p.invoiceId,
    amountMinor: p.amountMinor,
    currency: p.currency,
    at: fixedDate,
    issuer: d.snapshot!.issuerName,
    customer: d.customer.name,
    balanceDueMinor: d.outstandingMinor,
  };
}
export const collectionHandlers = [
  http.get("*/api/payment-links", async ({ request }) => {
    const e = await guard("billing:read");
    if (e) return e;
    const q = z
      .object({
        page: z.coerce.number().int().min(1).default(1),
        search: z.string().default(""),
        status: z
          .enum(["All", "Active", "Revoked", "Expired", "Closed"])
          .default("All"),
      })
      .safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!q.success) return mockError(422);
    const all = (db.scenario === "empty" ? [] : collections.links)
      .map(updateLink)
      .filter(
        (l) =>
          (q.data.status === "All" || l.status === q.data.status) &&
          (l.id + " " + l.invoiceId + " " + l.customer)
            .toLowerCase()
            .includes(q.data.search.toLowerCase()),
      );
    return json({
      items: all.slice((q.data.page - 1) * 6, q.data.page * 6),
      total: all.length,
      page: q.data.page,
      pages: Math.max(1, Math.ceil(all.length / 6)),
    });
  }),
  http.post("*/api/payment-links", async ({ request }) => {
    const e = await guard("billing:write");
    if (e) return e;
    const b = linkInput.safeParse(await request.json());
    if (!b.success) return mockError(422);
    const k = key(request, b.data);
    if (!k) return mockError(422);
    const old = replay(k);
    if (old !== null)
      return old
        ? json(collections.links.find((l) => l.id === old)!)
        : mockError(409);
    const d = find(b.data.invoiceId);
    const account = db.accounts.find(
      (a) => a.id === b.data.accountId && a.status === "Active",
    );
    if (
      !d ||
      !account ||
      account.currency !== d.values.currency ||
      d.outstandingMinor === "0" ||
      b.data.expires < fixedDate.slice(0, 10) ||
      Number.isNaN(Date.parse(b.data.expires)) ||
      new Date(b.data.expires).toISOString().slice(0, 10) !== b.data.expires
    )
      return mockError(422);
    const l = {
      ...b.data,
      id: `LNK-MOCK-${collections.next++}`,
      version: 1,
      token: `mock-checkout-${crypto.randomUUID()}`,
      status: "Active" as const,
      currency: d.values.currency,
      outstandingMinor: d.outstandingMinor,
      customer: d.customer.name,
    };
    collections.links.unshift(l);
    remember(k, l.id);
    return json(l);
  }),
  http.get("*/api/payment-links/:id", async ({ params }) => {
    const e = await guard("billing:read");
    if (e) return e;
    const l = collections.links.find((l) => l.id === params.id);
    return l ? json(updateLink(l)) : mockError(404);
  }),
  http.post("*/api/payment-links/:id/revoke", async ({ params, request }) => {
    const e = await guard("billing:write");
    if (e) return e;
    const l = collections.links.find((l) => l.id === params.id);
    const b = z.object({ version: z.number() }).safeParse(await request.json());
    if (!l) return mockError(404);
    if (!b.success) return mockError(422);
    if (b.data.version !== l.version || l.status === "Revoked")
      return mockError(409);
    l.status = "Revoked";
    l.version++;
    return json(l);
  }),
  http.get("*/api/invoices/:id/settlement", async ({ params }) => {
    const e = await guard("billing:read");
    if (e) return e;
    const d = find(params.id);
    return d ? json(settlement(d.id)) : mockError(404);
  }),
  http.get("*/api/receipts/:id", async ({ params }) => {
    const e = await guard("billing:read");
    if (e) return e;
    const r = collections.attempts.find(
      (p) => p.receipt?.id === params.id,
    )?.receipt;
    return r ? json(r) : mockError(404);
  }),
  http.post("*/api/invoices/:id/credit-notes", async ({ params, request }) => {
    const e = await guard("billing:write");
    if (e) return e;
    const b = z
      .object({
        version: z.number(),
        amountMinor: z.string().regex(/^[1-9]\d*$/),
        reason: z.string().trim().min(5).max(300),
      })
      .safeParse(await request.json());
    if (!b.success) return mockError(422);
    const k = key(request, b.data);
    if (!k) return mockError(422);
    const old = replay(k);
    if (old !== null)
      return old ? json(settlement(String(params.id))) : mockError(409);
    const d = find(params.id);
    if (!d) return mockError(404);
    if (d.version !== b.data.version || unresolved(d.id)) return mockError(409);
    if (
      financials(d.id).credited + BigInt(b.data.amountMinor) >
      BigInt(d.totals.totalMinor)
    )
      return mockError(422);
    const id = `CN-MOCK-${collections.next++}`;
    collections.credits.push({
      id,
      invoiceId: d.id,
      amountMinor: b.data.amountMinor,
      reason: b.data.reason,
      at: fixedDate,
    });
    updateInvoice(d.id);
    remember(k, id);
    return json(settlement(d.id));
  }),
  http.post("*/api/invoices/:id/refunds", async ({ params, request }) => {
    const e = await guard("billing:write");
    if (e) return e;
    const b = z
      .object({
        version: z.number(),
        paymentId: z.string(),
        amountMinor: z.string().regex(/^[1-9]\d*$/),
        reason: z.string().trim().min(5).max(300),
      })
      .safeParse(await request.json());
    if (!b.success) return mockError(422);
    const k = key(request, b.data);
    if (!k) return mockError(422);
    const old = replay(k);
    if (old !== null)
      return old ? json(settlement(String(params.id))) : mockError(409);
    const d = find(params.id);
    if (!d) return mockError(404);
    if (d.version !== b.data.version || unresolved(d.id)) return mockError(409);
    const p = collections.attempts.find(
      (p) =>
        p.id === b.data.paymentId &&
        p.invoiceId === d.id &&
        p.status === "Confirmed",
    );
    const reserved = collections.refunds
      .filter((r) => r.paymentId === p?.id && r.status !== "Failed")
      .reduce((n, r) => n + BigInt(r.amountMinor), 0n);
    if (
      !p ||
      BigInt(b.data.amountMinor) > financials(d.id).refundable ||
      BigInt(b.data.amountMinor) > BigInt(p.amountMinor) - reserved
    )
      return mockError(422);
    const id = `RFD-MOCK-${collections.next++}`;
    collections.refunds.push({
      id,
      invoiceId: d.id,
      paymentId: p.id,
      amountMinor: b.data.amountMinor,
      reason: b.data.reason,
      status: "Pending confirmation",
      at: fixedDate,
    });
    d.version++;
    remember(k, id);
    return json(settlement(d.id));
  }),
  http.get("*/api/public/checkouts/:token", async ({ params }) => {
    const e = await publicGuard();
    if (e) return e;
    const l = collections.links.find((l) => l.token === params.token);
    if (!l) return mockError(404);
    const d = find(l.invoiceId)!;
    return json({
      link: updateLink(l),
      invoiceStatus: d.status,
      snapshot: d.snapshot,
      activeAttempt: unresolved(d.id) ?? null,
    });
  }),
  http.post(
    "*/api/public/checkouts/:token/attempts",
    async ({ params, request }) => {
      const e = await publicGuard();
      if (e) return e;
      const l = collections.links.find((l) => l.token === params.token);
      if (!l) return mockError(404);
      const b = z
        .object({
          amountMinor: z.string().regex(/^[1-9]\d*$/),
          method: paymentMethodSchema.default("simulated"),
          phone: z.string().max(40).optional(),
        })
        .safeParse(await request.json());
      if (!b.success) return mockError(422);
      const phone =
        b.data.method === "mpesa"
          ? normalizeKenyanMobile(b.data.phone ?? "")
          : null;
      if (
        (b.data.method === "mpesa" && !phone) ||
        (["mpesa", "pesalink"].includes(b.data.method) && l.currency !== "KES")
      )
        return mockError(422);
      const phoneDigest = phone
        ? Array.from(
            new Uint8Array(
              await crypto.subtle.digest(
                "SHA-256",
                new TextEncoder().encode(phone),
              ),
            ),
          )
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("")
        : null;
      const k = key(request, {
        amountMinor: b.data.amountMinor,
        method: b.data.method,
        phoneDigest,
      });
      if (!k) return mockError(422);
      const old = replay(k);
      if (old !== null)
        return old
          ? json(collections.attempts.find((p) => p.id === old)!)
          : mockError(409);
      updateLink(l);
      if (l.status !== "Active" || unresolved(l.invoiceId))
        return mockError(409);
      const d = find(l.invoiceId)!;
      if (
        BigInt(b.data.amountMinor) > BigInt(d.outstandingMinor) ||
        (!l.partial && b.data.amountMinor !== d.outstandingMinor)
      )
        return mockError(422);
      const id = `COL-MOCK-${collections.next++}`;
      const providerState =
        b.data.method === "mpesa"
          ? "STK push sent (simulated)"
          : b.data.method === "pesalink"
            ? "Awaiting bank transfer"
            : b.data.method === "paypal"
              ? "Awaiting PayPal approval"
              : ["visa", "mastercard"].includes(b.data.method)
                ? "Awaiting card authorization"
                : "Awaiting confirmation";
      const p: Attempt = {
        id,
        method: b.data.method,
        maskedPhone: phone ? maskMobile(phone) : null,
        providerReference: `${b.data.method === "mpesa" ? "STK" : "PROVIDER"}-MOCK-${id}`,
        providerState,
        providerEvents: [{ label: providerState, at: fixedDate }],
        token: `mock-result-${crypto.randomUUID()}`,
        linkId: l.id,
        invoiceId: l.invoiceId,
        amountMinor: b.data.amountMinor,
        currency: l.currency,
        status: "Processing",
        receipt: null,
        ...freshness(),
      };
      collections.attempts.unshift(p);
      remember(k, p.id);
      return json(p);
    },
  ),
  http.get("*/api/public/collection-results/:token", async ({ params }) => {
    const e = await publicGuard();
    if (e) return e;
    const p = collections.attempts.find((p) => p.token === params.token);
    return p ? json(p) : mockError(404);
  }),
  http.post(
    "*/api/public/collection-results/:token/inquiry",
    async ({ params }) => {
      const e = await publicGuard();
      if (e) return e;
      const p = collections.attempts.find((p) => p.token === params.token);
      if (!p) return mockError(404);
      confirm(p);
      return json(p);
    },
  ),
  http.post("*/api/__mock/provider/:token/:action", async ({ params }) => {
    await delay(200);
    const p = collections.attempts.find((p) => p.token === params.token);
    if (!p) return mockError(404);
    if (
      !["Processing", "Pending confirmation"].includes(p.status) ||
      !["approve", "cancel"].includes(String(params.action))
    )
      return mockError(409);
    const state =
      params.action === "approve"
        ? "Authorized (simulated)"
        : "Cancelled (simulated)";
    if (
      p.providerState === "Cancelled (simulated)" ||
      p.providerState === "Authorized (simulated)"
    )
      return p.providerState === state ? json(p) : mockError(409);
    p.providerState = state;
    p.providerEvents.push({ label: state, at: fixedDate });
    collections.providerOutcomes[p.id] =
      params.action === "approve" ? "confirmed" : "failed";
    return json(p);
  }),
  // Development-only external event simulation. These handlers are excluded from releases.
  http.post("*/api/__mock/collection-outcome", async ({ request }) => {
    const b = z
      .object({ outcome: z.enum(["pending", "confirmed", "failed"]) })
      .safeParse(await request.json());
    if (!b.success) return mockError(422);
    collections.outcome = b.data.outcome;
    return json({ ok: true });
  }),
  http.post("*/api/__mock/refunds/:id/:outcome", async ({ params }) => {
    const r = collections.refunds.find((r) => r.id === params.id);
    if (!r) return mockError(404);
    if (
      r.status !== "Pending confirmation" ||
      !["confirmed", "failed"].includes(String(params.outcome))
    )
      return mockError(409);
    if (params.outcome === "confirmed") {
      const p = collections.attempts.find((p) => p.id === r.paymentId)!;
      const l = collections.links.find((l) => l.id === p.linkId)!;
      const account = db.accounts.find((a) => a.id === l.accountId)!;
      if (BigInt(account.availableMinor) < BigInt(r.amountMinor))
        return mockError(409);
      postMovement(l.accountId, -BigInt(r.amountMinor), r.id, r.invoiceId);
      r.status = "Confirmed";
    } else r.status = "Failed";
    const d = find(r.invoiceId)!;
    d.version++;
    d.events.push({
      label: `Refund ${r.status.toLowerCase()} as separate cash event`,
      at: fixedDate,
    });
    return json(settlement(r.invoiceId));
  }),
];
