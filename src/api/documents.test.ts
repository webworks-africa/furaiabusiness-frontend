import { it, expect } from "vitest";
import { z } from "zod";
import { request } from "./http";
import {
  financialDocumentSchema,
  exportSchema,
  deliverySchema,
  workspaceSchema,
  uploadLinkSchema,
  supplierWorkspaceSchema,
} from "./documentContracts";
import { challengeSchema, toolsSchema } from "./enterpriseContracts";
import { billing } from "../mocks/billingStore";
import { db } from "../mocks/store";
import { documents, supplierRepo } from "../mocks/documentStore";
import { enterprise } from "../mocks/enterpriseStore";
const post = <T>(path: string, schema: z.ZodType<T>, body: unknown = {}) =>
  request(path, schema, {
    method: "POST",
    headers: { "Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify(body),
  });
async function supplier() {
  enterprise.suppliers.push({
    id: "SUP-TEST",
    version: 1,
    name: "Acacia Supplies",
    email: "supplier@example.test",
    phone: "+254700000000",
    address: "Nairobi",
    beneficiaryId: "BEN-MOCK-001",
    archived: false,
  });
  return post("/suppliers/SUP-TEST/upload-links", uploadLinkSchema);
}
it("exports capture authoritative document revisions and scoped PDF bytes", async () => {
  const id = billing.documents[1].id,
    m = await request(`/documents/invoice/${id}`, financialDocumentSchema),
    r = await post(`/documents/invoice/${id}/exports`, exportSchema, {
      revision: m.revision,
    });
  expect(r.model.totalMinor).toBe(
    billing.documents[1].snapshot!.totals.totalMinor,
  );
  const file = await fetch("/api/document-exports/" + r.id + "/pdf");
  expect(new TextDecoder().decode((await file.arrayBuffer()).slice(0, 5))).toBe(
    "%PDF-",
  );
  enterprise.branding.template = "modern";
  expect(r.model.template).toBe(m.template);
  await expect(
    post(`/documents/invoice/${id}/exports`, exportSchema, { revision: 999 }),
  ).rejects.toMatchObject({ status: 409 });
  db.role = "developer";
  await expect(
    request(`/documents/invoice/${id}`, financialDocumentSchema),
  ).rejects.toMatchObject({ status: 403 });
});
it("email queues and retries the same immutable PDF attachment", async () => {
  const id = billing.documents[1].id,
    m = await request(`/documents/invoice/${id}`, financialDocumentSchema),
    r = await post(`/documents/invoice/${id}/exports`, exportSchema, {
      revision: m.revision,
    }),
    mail = await post("/document-deliveries", deliverySchema, {
      exportId: r.id,
      to: "fail@example.test",
      subject: "Invoice attached",
      message: "Please review.",
    });
  expect(mail.status).toBe("Queued");
  expect(
    (await request("/documents/workspace", workspaceSchema)).deliveries[0]
      .status,
  ).toBe("Failed");
  await post(`/document-deliveries/${mail.id}/retry`, deliverySchema);
  const w = await request("/documents/workspace", workspaceSchema);
  expect(w.deliveries[0].status).toBe("Delivered (simulated)");
  expect(w.deliveries[0].exportId).toBe(r.id);
});
it("tax requires explicit demo connection and cannot fabricate a KRA authority reference", async () => {
  const id = billing.documents[1].id,
    s = z.object({
      documentId: z.string(),
      status: z.string(),
      reference: z.string(),
    });
  await expect(
    post(`/tax/invoices/${id}/submit-demo`, s, { outcome: "accepted" }),
  ).rejects.toMatchObject({ status: 409 });
  await post("/tax/demo-connection", z.object({ ok: z.boolean() }), {
    enabled: true,
  });
  expect(
    (await post(`/tax/invoices/${id}/submit-demo`, s, { outcome: "accepted" }))
      .reference,
  ).toMatch(/^FURAIA-DEMO/);
  db.role = "finance";
  await expect(
    post("/tax/demo-connection", z.object({ ok: z.boolean() }), {
      enabled: false,
    }),
  ).rejects.toMatchObject({ status: 403 });
});
it("supplier review creates a net-30 payable without cash and only completed OTP payout marks it paid", async () => {
  await supplier();
  await supplierRepo.put("intakes", {
    id: "UPLOAD-TEST",
    supplierId: "SUP-TEST",
    supplierName: "Acacia Supplies",
    filename: "invoice.csv",
    size: 10,
    sha256: "test",
    status: "Awaiting review",
    extracted: {
      invoiceNumber: "S-100",
      invoiceDate: "2026-10-01",
      currency: "KES",
      amountMinor: "12345",
      termsDays: 30,
      dueDate: "2026-10-31",
      confidence: "High",
      warnings: [],
      excerpt: "Synthetic",
    },
    bytes: new Uint8Array([1]),
    mime: "text/csv",
  });
  const before = db.accounts[0].ledgerMinor,
    body = {
      invoiceNumber: "S-100",
      invoiceDate: "2026-10-01",
      currency: "KES",
      amountMinor: "12345",
      termsDays: 30,
      dueDate: "2026-10-31",
      reviewed: true,
    };
  await expect(
    post("/supplier-invoices/UPLOAD-TEST/approve", supplierWorkspaceSchema, {
      ...body,
      reviewed: false,
    }),
  ).rejects.toMatchObject({ status: 422 });
  const w = await post(
    "/supplier-invoices/UPLOAD-TEST/approve",
    supplierWorkspaceSchema,
    body,
  );
  expect(w.payables[0].bucket).toBe("Upcoming");
  expect(db.accounts[0].ledgerMinor).toBe(before);
  const p = w.payables[0],
    s = z.object({ orderId: z.string() }),
    o = await post(`/supplier-payables/${p.id}/payment`, s, {
      accountId: "acc_kes",
    });
  expect(
    (
      await post(`/supplier-payables/${p.id}/payment`, s, {
        accountId: "acc_kes",
      })
    ).orderId,
  ).toBe(o.orderId);
  expect(
    (await request("/supplier-documents", supplierWorkspaceSchema)).payables[0]
      .status,
  ).toBe("Awaiting authorization");
  const c = await post(
    `/payment-orders/${o.orderId}/challenge`,
    challengeSchema,
  );
  await post(`/payment-orders/${o.orderId}/approve`, toolsSchema, {
    version: enterprise.orders[0].version,
    challengeId: c.id,
    code: "246810",
  });
  expect(
    (await request("/supplier-documents", supplierWorkspaceSchema)).payables[0]
      .status,
  ).toBe("Paid");
  expect(BigInt(db.accounts[0].ledgerMinor)).toBe(BigInt(before) - 12345n);
  enterprise.orders = [];
  expect(
    (await request("/supplier-documents", supplierWorkspaceSchema)).payables[0]
      .status,
  ).toBe("Pending confirmation");
  await expect(
    post(`/supplier-payables/${p.id}/payment`, s, { accountId: "acc_kes" }),
  ).rejects.toMatchObject({ status: 409 });
});
it("revocation removes public upload access and pending receipts cannot be exported", async () => {
  const l = await supplier(),
    token = l.path.split("/").at(-1);
  expect(
    (await fetch("/api/public/supplier-submissions/" + token)).status,
  ).toBe(200);
  await post(
    `/supplier-upload-links/${l.id}/revoke`,
    z.object({ ok: z.boolean() }),
  );
  expect(
    (await fetch("/api/public/supplier-submissions/" + token)).status,
  ).toBe(410);
  expect(
    (await fetch("/api/public/collection-results/unknown/receipt.pdf")).status,
  ).toBe(404);
});
it("workspace excludes purchase-order exports from read-only viewers", async () => {
  documents.exports.push({
    id: "PRIVATE-LPO",
    kind: "lpo",
    documentId: "LPO-TEST",
    revision: 1,
    filename: "lpo.pdf",
    sha256: "test",
    status: "Ready",
    model: {} as z.infer<typeof financialDocumentSchema>,
  });
  db.role = "viewer";
  expect(
    (await request("/documents/workspace", workspaceSchema)).exports,
  ).toEqual([]);
});
