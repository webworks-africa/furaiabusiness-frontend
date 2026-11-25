import { it, expect } from "vitest";
import { z } from "zod";
import { request } from "./http";
import {
  toolsSchema,
  challengeSchema,
  customerStatementSchema,
  brandingSchema,
} from "./enterpriseContracts";
import { accountDetailSchema, sessionSchema } from "./contracts";
import { billingDocumentSchema } from "./billingContracts";
import { db, reset } from "../mocks/store";
import { enterprise } from "../mocks/enterpriseStore";
import { business, actorSession } from "../mocks/businessStore";
import { billing } from "../mocks/billingStore";
import { collections } from "../mocks/collectionStore";
import { authAdapter } from "../auth/adapter";
import type { Order } from "./enterpriseContracts";
const key = () => crypto.randomUUID();
const write = (path: string, body: unknown, id = key()) =>
  request(path, toolsSchema, {
    method: "POST",
    headers: { "Idempotency-Key": id },
    body: JSON.stringify(body),
  });
const orderValues = (reference = key()) => ({
  accountId: "acc_kes",
  beneficiaryId: "BEN-MOCK-001",
  amountMinor: "12345",
  reference,
  outcome: "confirmed",
});
const current = (id: string) => enterprise.orders.find((o) => o.id === id)!;
async function create(outcome = "confirmed") {
  const d = await write("/payment-orders", { ...orderValues(), outcome });
  return d.orders[0];
}
async function challenge(o: Order) {
  return request(`/payment-orders/${o.id}/challenge`, challengeSchema, {
    method: "POST",
  });
}
async function approve(o: Order, code = "246810") {
  const c = await challenge(o);
  return write(`/payment-orders/${o.id}/approve`, {
    version: o.version,
    challengeId: c.id,
    code,
  });
}
it("single OTP authorization auto-dispatches and confirmed money debits shared ledger once", async () => {
  const before = structuredClone(db.accounts[0]);
  const o = await create();
  expect(db.accounts[0].ledgerMinor).toBe(before.ledgerMinor);
  expect(BigInt(db.accounts[0].availableMinor)).toBe(
    BigInt(before.availableMinor) - 12345n,
  );
  const c = await challenge(o);
  const k = key();
  const body = { version: o.version, challengeId: c.id, code: "246810" };
  let d = await write(`/payment-orders/${o.id}/approve`, body, k);
  expect(d.orders[0].payout.status).toBe("Completed");
  expect(BigInt(db.accounts[0].ledgerMinor)).toBe(
    BigInt(before.ledgerMinor) - 12345n,
  );
  expect(db.accounts[0].heldMinor).toBe(before.heldMinor);
  d = await write(`/payment-orders/${o.id}/approve`, body, k);
  expect(d.orders[0].payout.status).toBe("Completed");
  expect(db.transactions.filter((t) => t.id === `TXN-${o.id}`)).toHaveLength(1);
  expect(JSON.stringify([...enterprise.idempotency.values()])).not.toContain(
    "246810",
  );
  const account = await request("/accounts/acc_kes", accountDetailSchema);
  expect(account.account.ledgerMinor).toBe(db.accounts[0].ledgerMinor);
});
it("two distinct OTP members approve, duplicate approval cannot count and policy snapshot is immutable", async () => {
  await write("/business/mandate", { ...enterprise.mandate, approvals: 2 });
  const before = db.accounts[0].ledgerMinor;
  const o = await create();
  await approve(o);
  expect(current(o.id).payout.status).toBe("Awaiting approval");
  expect(current(o.id).approvals).toHaveLength(1);
  await expect(challenge(current(o.id))).rejects.toMatchObject({ status: 409 });
  await write("/business/mandate", { ...enterprise.mandate, approvals: 1 });
  expect(current(o.id).required).toBe(2);
  db.role = "finance";
  await approve(current(o.id));
  expect(current(o.id).payout.status).toBe("Completed");
  expect(BigInt(db.accounts[0].ledgerMinor)).toBe(BigInt(before) - 12345n);
});
it("three-authorizer policies require sufficient members and distinct invited finance identities work", async () => {
  await expect(
    write("/business/mandate", { ...enterprise.mandate, approvals: 3 }),
  ).rejects.toMatchObject({ status: 409 });
  business.team.members.push({
    id: "member_extra",
    version: 1,
    name: "Extra checker",
    email: "extra@example.test",
    role: "finance",
    status: "Active",
    developerSandbox: false,
  });
  await write("/business/mandate", { ...enterprise.mandate, approvals: 3 });
  const o = await create();
  await approve(o);
  db.role = "finance";
  await approve(current(o.id));
  await authAdapter.login({
    identifier: "extra@example.test",
    challenge: "246810",
  });
  expect(actorSession(db.role).memberId).toBe("member_extra");
  await approve(current(o.id));
  expect(current(o.id).approvals).toHaveLength(3);
  expect(current(o.id).payout.status).toBe("Completed");
});
it("OTP is member/version bound, expires, limits attempts, and never authorizes a different order", async () => {
  const o = await create();
  const c = await challenge(o);
  db.role = "finance";
  await expect(
    write(`/payment-orders/${o.id}/approve`, {
      version: o.version,
      challengeId: c.id,
      code: "246810",
    }),
  ).rejects.toMatchObject({ status: 409 });
  db.role = "admin";
  for (let i = 0; i < 3; i++)
    await expect(
      write(`/payment-orders/${o.id}/approve`, {
        version: o.version,
        challengeId: c.id,
        code: "000000",
      }),
    ).rejects.toMatchObject({ status: 422 });
  await expect(
    write(`/payment-orders/${o.id}/approve`, {
      version: o.version,
      challengeId: c.id,
      code: "246810",
    }),
  ).rejects.toMatchObject({ status: 409 });
  const expired = await challenge(o);
  enterprise.challenges.get(expired.id)!.expires = Date.now() - 1;
  await expect(
    write(`/payment-orders/${o.id}/approve`, {
      version: o.version,
      challengeId: expired.id,
      code: "246810",
    }),
  ).rejects.toMatchObject({ status: 409 });
  expect(current(o.id).approvals).toHaveLength(0);
});
it("UNKNOWN retains reference and hold until inquiry confirms, rejection/cancellation never debit", async () => {
  const before = structuredClone(db.accounts[0]);
  const o = await create("pending");
  await approve(o);
  expect(current(o.id).payout.status).toBe("Pending confirmation");
  await write(`/payment-orders/${o.id}/inquiry`, {
    version: current(o.id).version,
  });
  expect(db.accounts[0].ledgerMinor).toBe(before.ledgerMinor);
  expect(current(o.id).payout.holdMinor).toBe("12345");
  await write(`/payment-orders/${o.id}/outcome`, { outcome: "confirmed" });
  await write(`/payment-orders/${o.id}/inquiry`, {
    version: current(o.id).version,
  });
  expect(current(o.id).payout.status).toBe("Completed");
  const second = await create();
  db.role = "finance";
  await write(`/payment-orders/${second.id}/reject`, {
    version: second.version,
    reason: "Invalid supplier amount",
  });
  expect(current(second.id).payout.status).toBe("Rejected");
  expect(db.accounts[0].heldMinor).toBe(before.heldMinor);
  db.role = "admin";
  const third = await create();
  await write(`/payment-orders/${third.id}/cancel`, { version: third.version });
  expect(db.accounts[0].heldMinor).toBe(before.heldMinor);
});
it("failed settlement releases hold, insufficient funds and duplicate references are rejected", async () => {
  const before = structuredClone(db.accounts[0]);
  const o = await create("failed");
  await approve(o);
  expect(current(o.id).payout.status).toBe("Failed");
  expect(db.accounts[0]).toEqual(before);
  const v = orderValues();
  await write("/payment-orders", v);
  await expect(write("/payment-orders", v)).rejects.toMatchObject({
    status: 409,
  });
  await expect(
    write("/payment-orders", {
      ...orderValues(),
      amountMinor: "9999999999999999",
    }),
  ).rejects.toMatchObject({ status: 409 });
});
it("finance has no Team permission, entitled developer sees Developers, viewers cannot access salary/loan tools", async () => {
  db.role = "finance";
  expect((await request("/session", sessionSchema)).permissions).not.toContain(
    "team:read",
  );
  await expect(request("/team", z.unknown())).rejects.toMatchObject({
    status: 403,
  });
  await expect(
    write("/business/mandate", { ...enterprise.mandate, approvals: 1 }),
  ).rejects.toMatchObject({ status: 403 });
  db.role = "developer";
  expect((await request("/session", sessionSchema)).permissions).toContain(
    "developer:read",
  );
  await expect(request("/business-tools", toolsSchema)).rejects.toMatchObject({
    status: 403,
  });
  db.role = "viewer";
  await expect(request("/business-tools", toolsSchema)).rejects.toMatchObject({
    status: 403,
  });
});
it("branding snapshots are immutable after invoice issue and invalid logos are rejected", async () => {
  const modern = {
    ...enterprise.branding,
    template: "modern",
    accent: "navy",
    footer: "Invoice footer",
  };
  await write("/business/branding", modern);
  const d = billing.documents.find((d) => d.kind === "quotations")!;
  const draft = await request("/billing/invoices", billingDocumentSchema, {
    method: "POST",
    headers: { "Idempotency-Key": key() },
    body: JSON.stringify(d.values),
  });
  const issued = await request(
    `/billing/invoices/${draft.id}/issue`,
    billingDocumentSchema,
    {
      method: "POST",
      headers: { "Idempotency-Key": key() },
      body: JSON.stringify({ version: draft.version }),
    },
  );
  expect(issued.snapshot!.branding?.template).toBe("modern");
  await write("/business/branding", {
    ...enterprise.branding,
    template: "minimal",
  });
  const retained = await request(
    `/billing/invoices/${issued.id}`,
    billingDocumentSchema,
  );
  expect(retained.snapshot!.branding?.template).toBe("modern");
  await expect(
    write("/business/branding", {
      ...enterprise.branding,
      logo: "data:image/svg+xml;base64,PHN2Zz4=",
    }),
  ).rejects.toMatchObject({ status: 422 });
  expect((await request("/business/branding", brandingSchema)).template).toBe(
    "minimal",
  );
});
it("customer statement running balance and opening include invoice, confirmed payment, credit and refund only", async () => {
  const inv = billing.documents.find((d) => d.kind === "invoices")!;
  const invoiceId = inv.id;
  collections.credits.push({
    id: "CR-TEST",
    invoiceId,
    amountMinor: "10000",
    reason: "Adjustment",
    at: "2026-10-21T08:00:00Z",
  });
  collections.refunds.push({
    id: "RF-TEST",
    invoiceId,
    paymentId: "P-TEST",
    amountMinor: "5000",
    status: "Confirmed",
    reason: "Return customer credit",
    at: "2026-10-21T08:01:00Z",
  });
  const stmt = await request(
    "/customers/contact_1/statement?currency=KES",
    customerStatementSchema,
  );
  expect(stmt.rows.map((r) => r.kind)).toEqual([
    "Invoice",
    "Credit note",
    "Refund",
  ]);
  expect(stmt.closingMinor).toBe(
    (BigInt(inv.totals.totalMinor) - 5000n).toString(),
  );
  const usd = await request(
    "/customers/contact_1/statement?currency=USD",
    customerStatementSchema,
  );
  expect(usd.rows).toHaveLength(0);
  expect(usd.closingMinor).toBe("0");
  await expect(
    request(
      "/customers/contact_1/statement?from=2026-12-01&to=2026-10-21",
      customerStatementSchema,
    ),
  ).rejects.toMatchObject({ status: 422 });
});
it("supplier updates do not rewrite issued LPOs and issuing/receiving never moves cash", async () => {
  const cash = structuredClone(db.accounts);
  let d = await write("/suppliers", {
    name: "Paper supplier",
    email: "supplier@example.test",
    phone: "254700000001",
    address: "Nairobi depot",
    beneficiaryId: "BEN-MOCK-001",
  });
  const supplier = d.suppliers[0];
  d = await write("/lpos", {
    supplierId: supplier.id,
    date: "2026-10-21",
    deliveryDate: "2026-11-20",
    notes: "Office supplies",
    lines: [
      {
        description: "Paper",
        quantity: "2.5",
        rate: "100.25",
        discount: "0",
        tax: "16",
      },
    ],
  });
  const l = d.lpos[0];
  expect(l.totals.totalMinor).toBe("29073");
  await write(`/lpos/${l.id}/issue`, { version: l.version });
  await write(`/suppliers/${supplier.id}`, {
    ...supplier,
    name: "Renamed supplier",
  });
  expect(enterprise.lpos[0].supplier.name).toBe("Paper supplier");
  await write(`/lpos/${l.id}/receive`, { version: enterprise.lpos[0].version });
  expect(enterprise.lpos[0].status).toBe("Received");
  expect(db.accounts).toEqual(cash);
});
it("payroll reserves exact net amounts atomically and each payment follows OTP mandate", async () => {
  await write("/employees", {
    name: "Employee one",
    email: "employee1@example.test",
    beneficiaryId: "BEN-MOCK-001",
    grossMinor: "100000",
    deductionMinor: "10000",
  });
  await write("/employees", {
    name: "Employee one",
    email: "employee2@example.test",
    beneficiaryId: "BEN-MOCK-002",
    grossMinor: "200000",
    deductionMinor: "25000",
  });
  const ids = enterprise.employees.map((x) => x.id),
    before = structuredClone(db.accounts[0]);
  const d = await write("/payroll", {
    accountId: "acc_kes",
    period: "2026-10",
    employeeIds: ids,
  });
  expect(d.payroll[0].totalMinor).toBe("265000");
  expect(BigInt(db.accounts[0].availableMinor)).toBe(
    BigInt(before.availableMinor) - 265000n,
  );
  expect(db.accounts[0].ledgerMinor).toBe(before.ledgerMinor);
  await expect(
    write("/payroll", {
      accountId: "acc_kes",
      period: "2026-10",
      employeeIds: ids,
    }),
  ).rejects.toMatchObject({ status: 409 });
  for (const item of d.payroll[0].items) await approve(current(item.orderId));
  expect(BigInt(db.accounts[0].ledgerMinor)).toBe(
    BigInt(before.ledgerMinor) - 265000n,
  );
  expect(db.accounts[0].heldMinor).toBe(before.heldMinor);
});
it("POS pending sale has no cash effect and explicit confirmation posts once", async () => {
  const before = db.accounts[0].ledgerMinor;
  let d = await write("/pos/terminals", {
    name: "Counter one",
    location: "Nairobi",
    accountId: "acc_kes",
  });
  d = await write("/pos/sales", {
    terminalId: d.terminals[0].id,
    amountMinor: "25000",
    reference: "POS-ORDER-001",
  });
  const sale = d.sales[0];
  expect(db.accounts[0].ledgerMinor).toBe(before);
  await write(`/pos/sales/${sale.id}/outcome`, { outcome: "confirmed" });
  expect(BigInt(db.accounts[0].ledgerMinor)).toBe(BigInt(before) + 25000n);
  await expect(
    write(`/pos/sales/${sale.id}/outcome`, { outcome: "confirmed" }),
  ).rejects.toMatchObject({ status: 409 });
});
it("loan issuance uses principal payout; confirmed partial repayment updates exact schedule and cash", async () => {
  const before = db.accounts[0].ledgerMinor;
  let d = await write("/loans", {
    borrowerId: "contact_1",
    beneficiaryId: "BEN-MOCK-001",
    accountId: "acc_kes",
    principalMinor: "100000",
    monthlyRate: "1.5",
    months: 3,
    firstDue: "2026-11-21",
  });
  const loan = d.loans[0];
  expect(loan.schedule.reduce((n, s) => n + BigInt(s.principalMinor), 0n)).toBe(
    100000n,
  );
  expect(loan.schedule.reduce((n, s) => n + BigInt(s.totalMinor), 0n)).toBe(
    104500n,
  );
  d = await write(`/loans/${loan.id}/issue`, { version: loan.version });
  expect(db.accounts[0].ledgerMinor).toBe(before);
  await approve(current(d.loans[0].orderId!));
  expect(enterprise.loans[0].status).toBe("Active");
  expect(BigInt(db.accounts[0].ledgerMinor)).toBe(BigInt(before) - 100000n);
  await write(`/loans/${loan.id}/repayments`, {
    amountMinor: "10000",
    reference: "BORROWER-REPAY-1",
    confirmed: true,
  });
  expect(enterprise.loans[0].schedule[0].paidMinor).toBe("10000");
  expect(BigInt(db.accounts[0].ledgerMinor)).toBe(BigInt(before) - 90000n);
  await expect(
    write(`/loans/${loan.id}/repayments`, {
      amountMinor: "10000",
      reference: "BORROWER-REPAY-1",
      confirmed: true,
    }),
  ).rejects.toMatchObject({ status: 409 });
  await expect(
    write(`/loans/${loan.id}/repayments`, {
      amountMinor: "999999",
      reference: "TOO-MUCH",
      confirmed: true,
    }),
  ).rejects.toMatchObject({ status: 422 });
  await write(`/loans/${loan.id}/repayments`, {
    amountMinor: "94500",
    reference: "BORROWER-REPAY-2",
    confirmed: true,
  });
  expect(enterprise.loans[0].status).toBe("Repaid");
});
it("optional FX account gate and deliberate unavailable/stale states are enforced", async () => {
  await write("/business/mandate", {
    ...enterprise.mandate,
    foreignAccounts: false,
  });
  await expect(
    request("/account-requests", z.unknown(), {
      method: "POST",
      body: JSON.stringify({ name: "Optional USD account", currency: "USD" }),
    }),
  ).rejects.toMatchObject({ status: 403 });
  db.scenario = "stale";
  await expect(write("/payment-orders", orderValues())).rejects.toMatchObject({
    status: 409,
  });
  db.scenario = "unavailable";
  await expect(request("/business-tools", toolsSchema)).rejects.toMatchObject({
    status: 503,
  });
});
it("business signup starts unfunded onboarding without developer grants and reset restores fixture", async () => {
  await request("/business-registration", z.object({ ok: z.boolean() }), {
    method: "POST",
    body: JSON.stringify({
      businessName: "New Test Business",
      name: "Test Owner",
      email: "new@example.test",
      phone: "254700000001",
      challenge: "246810",
      accept: true,
    }),
  });
  const s = await authAdapter.login({
    identifier: "new@example.test",
    challenge: "246810",
  });
  expect(s.business).toBe("New Test Business");
  expect(s.permissions).not.toContain("developer:read");
  expect(db.accounts).toHaveLength(0);
  expect(business.onboarding.status).toBe("Draft");
  expect(business.onboarding.values.legalName).toBe("New Test Business");
  reset();
  expect(enterprise.orders).toHaveLength(0);
  expect(db.accounts.length).toBe(2);
});

it("malformed money and invalid decimals return validation rather than crashing handlers", async () => {
  for (const amountMinor of ["abc", "-1", "1.1", ""]) {
    await expect(
      write("/payment-orders", { ...orderValues(), amountMinor }),
    ).rejects.toMatchObject({ status: 422 });
  }
  await expect(
    write("/employees", {
      name: "Invalid employee",
      email: "bad@example.test",
      beneficiaryId: "BEN-MOCK-001",
      grossMinor: "bad",
      deductionMinor: "0",
    }),
  ).rejects.toMatchObject({ status: 422 });
});
it("customer opening and running balances use confirmed partial allocation and exclude pending attempts", async () => {
  const { linkSchema, attemptSchema } = await import("./collectionContracts");
  const inv = billing.documents.find((d) => d.kind === "invoices")!;
  inv.values.date = "2026-10-20";
  inv.snapshot!.values.date = "2026-10-20";
  const post = <T>(path: string, schema: z.ZodType<T>, body: unknown = {}) =>
    request(path, schema, {
      method: "POST",
      headers: { "Idempotency-Key": key() },
      body: JSON.stringify(body),
    });
  const l = await post("/payment-links", linkSchema, {
    invoiceId: inv.id,
    accountId: "acc_kes",
    expires: "2026-11-20",
    partial: true,
  });
  const p = await post(`/public/checkouts/${l.token}/attempts`, attemptSchema, {
    amountMinor: "100000",
  });
  const pending = await request(
    "/customers/contact_1/statement?currency=KES&from=2026-10-21",
    customerStatementSchema,
  );
  expect(pending.openingMinor).toBe("3480000");
  expect(pending.rows).toHaveLength(0);
  expect(pending.closingMinor).toBe("3480000");
  await post("/__mock/collection-outcome", z.object({ ok: z.boolean() }), {
    outcome: "confirmed",
  });
  await post(`/public/collection-results/${p.token}/inquiry`, attemptSchema);
  const paid = await request(
    "/customers/contact_1/statement?currency=KES&from=2026-10-21",
    customerStatementSchema,
  );
  expect(paid.rows).toHaveLength(1);
  expect(paid.rows[0]).toMatchObject({
    kind: "Payment",
    creditMinor: "100000",
    balanceMinor: "3380000",
  });
  expect(paid.closingMinor).toBe("3380000");
});
