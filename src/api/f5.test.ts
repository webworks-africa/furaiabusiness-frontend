import { it, expect } from "vitest";
import { request } from "./http";
import { z } from "zod";
import {
  linkSchema,
  checkoutSchema,
  attemptSchema,
  settlementSchema,
  receiptSchema,
} from "./collectionContracts";
import { billingDocumentSchema } from "./billingContracts";
import { billing } from "../mocks/billingStore";
import { collections } from "../mocks/collectionStore";
import { db } from "../mocks/store";
const invoice = "INV-MOCK-101";
const post = <T>(
  path: string,
  schema: z.ZodType<T>,
  body: unknown = {},
  key: string = crypto.randomUUID(),
) =>
  request(path, schema, {
    method: "POST",
    headers: { "Idempotency-Key": key },
    body: JSON.stringify(body),
  });
const link = (partial = true, key?: string) =>
  post(
    "/payment-links",
    linkSchema,
    {
      invoiceId: invoice,
      accountId: "acc_kes",
      expires: "2026-11-20",
      partial,
    },
    key,
  );
const settlement = () =>
  request(`/invoices/${invoice}/settlement`, settlementSchema);
async function payment(amountMinor = "3480000") {
  const l = await link();
  const p = await post(`/public/checkouts/${l.token}/attempts`, attemptSchema, {
    amountMinor,
  });
  return { l, p };
}
async function outcome(value: string) {
  await post("/__mock/collection-outcome", z.object({ ok: z.boolean() }), {
    outcome: value,
  });
}
const inquiry = (token: string) =>
  post(`/public/collection-results/${token}/inquiry`, attemptSchema);
it("link creation/replay is idempotent and requires an issued invoice and matching currency", async () => {
  const one = await link(true, "same");
  expect((await link(true, "same")).id).toBe(one.id);
  await expect(link(false, "same")).rejects.toMatchObject({ status: 409 });
  for (const changes of [
    { invoiceId: "Q-MOCK-100" },
    { accountId: "acc_usd" },
    { expires: "2026-02-30" },
    { expires: "2026-10-20" },
  ])
    await expect(
      post("/payment-links", linkSchema, {
        invoiceId: invoice,
        accountId: "acc_kes",
        expires: "2026-11-20",
        partial: true,
        ...changes,
      }),
    ).rejects.toMatchObject({ status: 422 });
});
it("pending inquiry preserves amount/reference and never changes cash, allocations or receipts", async () => {
  const cash = structuredClone(db.accounts);
  const { l, p } = await payment("10000");
  const checked = await inquiry(p.token);
  expect(checked).toMatchObject({
    id: p.id,
    status: "Pending confirmation",
    receipt: null,
  });
  expect((await settlement()).outstandingMinor).toBe("3480000");
  expect(db.accounts).toEqual(cash);
  await expect(
    post(`/public/checkouts/${l.token}/attempts`, attemptSchema, {
      amountMinor: "10000",
    }),
  ).rejects.toMatchObject({ status: 409 });
  const second = await link();
  expect(
    (await request(`/public/checkouts/${second.token}`, checkoutSchema))
      .activeAttempt?.id,
  ).toBe(p.id);
});
it("confirmed partial payment posts once, preserves receipt and exact remaining balance", async () => {
  const before = BigInt(db.accounts[0].ledgerMinor);
  const snapshot = structuredClone(billing.documents[1].snapshot);
  const { p } = await payment("10000");
  await outcome("confirmed");
  const confirmed = await inquiry(p.token);
  expect(confirmed.receipt?.balanceDueMinor).toBe("3470000");
  await inquiry(p.token);
  expect(BigInt(db.accounts[0].ledgerMinor) - before).toBe(10000n);
  expect(await settlement()).toMatchObject({
    paidMinor: "10000",
    outstandingMinor: "3470000",
  });
  expect(billing.documents[1].snapshot).toEqual(snapshot);
  expect(billing.documents[1].status).toBe("Partially paid");
  expect(
    await request(`/receipts/${confirmed.receipt!.id}`, receiptSchema),
  ).toEqual(confirmed.receipt);
});
it("failed payment has no receipt or posting and allows another attempt with a new reference", async () => {
  const cash = structuredClone(db.accounts);
  const { l, p } = await payment();
  await outcome("failed");
  expect((await inquiry(p.token)).status).toBe("Failed");
  const retry = await post(
    `/public/checkouts/${l.token}/attempts`,
    attemptSchema,
    { amountMinor: "10000" },
  );
  expect(retry.id).not.toBe(p.id);
  expect(db.accounts).toEqual(cash);
});
it("full-only and excessive partial amounts are rejected; attempt idempotency prevents duplicates", async () => {
  const l = await link(false);
  await expect(
    post(`/public/checkouts/${l.token}/attempts`, attemptSchema, {
      amountMinor: "100",
    }),
  ).rejects.toMatchObject({ status: 422 });
  await expect(
    post(`/public/checkouts/${l.token}/attempts`, attemptSchema, {
      amountMinor: "3480001",
    }),
  ).rejects.toMatchObject({ status: 422 });
  const path = `/public/checkouts/${l.token}/attempts`;
  const one = await post(
    path,
    attemptSchema,
    { amountMinor: "3480000" },
    "same",
  );
  expect(
    (await post(path, attemptSchema, { amountMinor: "3480000" }, "same")).id,
  ).toBe(one.id);
});
it("revocation prevents new attempts while original in-flight inquiry can confirm", async () => {
  const { l, p } = await payment();
  await post(`/payment-links/${l.id}/revoke`, linkSchema, {
    version: l.version,
  });
  await outcome("confirmed");
  expect((await inquiry(p.token)).status).toBe("Confirmed");
  expect(
    (await request(`/public/checkouts/${l.token}`, checkoutSchema)).link.status,
  ).toBe("Revoked");
  await expect(
    post(`/public/checkouts/${l.token}/attempts`, attemptSchema, {
      amountMinor: "100",
    }),
  ).rejects.toMatchObject({ status: 409 });
});
it("credit notes change receivables without returning cash; blocked during uncertainty", async () => {
  const cash = structuredClone(db.accounts);
  let d = await settlement();
  await post(`/invoices/${invoice}/credit-notes`, settlementSchema, {
    version: d.version,
    amountMinor: "10000",
    reason: "Scope correction",
  });
  expect(await settlement()).toMatchObject({
    creditedMinor: "10000",
    outstandingMinor: "3470000",
  });
  expect(db.accounts).toEqual(cash);
  await payment("10000");
  d = await settlement();
  await expect(
    post(`/invoices/${invoice}/credit-notes`, settlementSchema, {
      version: d.version,
      amountMinor: "100",
      reason: "Further correction",
    }),
  ).rejects.toMatchObject({ status: 409 });
});
it("refund reservation, confirmation and credit are separate, receipt remains immutable", async () => {
  const { p } = await payment();
  await outcome("confirmed");
  const result = await inquiry(p.token);
  const receipt = structuredClone(result.receipt);
  let d = await settlement();
  await post(`/invoices/${invoice}/credit-notes`, settlementSchema, {
    version: d.version,
    amountMinor: "10000",
    reason: "Service credit",
  });
  d = await settlement();
  const cash = BigInt(db.accounts[0].ledgerMinor);
  const body = {
    version: d.version,
    paymentId: p.id,
    amountMinor: "10000",
    reason: "Return customer credit",
  };
  const requested = await post(
    `/invoices/${invoice}/refunds`,
    settlementSchema,
    body,
    "refund-once",
  );
  expect(requested.refunds[0].status).toBe("Pending confirmation");
  expect(BigInt(db.accounts[0].ledgerMinor)).toBe(cash);
  expect(
    (
      await post(
        `/invoices/${invoice}/refunds`,
        settlementSchema,
        body,
        "refund-once",
      )
    ).refunds,
  ).toHaveLength(1);
  await expect(
    post(`/invoices/${invoice}/refunds`, settlementSchema, {
      ...body,
      version: requested.version,
    }),
  ).rejects.toMatchObject({ status: 422 });
  const refunded = await post(
    `/__mock/refunds/${requested.refunds[0].id}/confirmed`,
    settlementSchema,
  );
  expect(refunded).toMatchObject({
    refundedMinor: "10000",
    outstandingMinor: "0",
    customerCreditMinor: "0",
  });
  expect(BigInt(db.accounts[0].ledgerMinor)).toBe(cash - 10000n);
  expect(collections.attempts[0].receipt).toEqual(receipt);
});
it("stale/over-credit and refund without paid credit are rejected; viewer denied", async () => {
  const d = await settlement();
  await expect(
    post(`/invoices/${invoice}/credit-notes`, settlementSchema, {
      version: d.version,
      amountMinor: "3480001",
      reason: "Excessive credit",
    }),
  ).rejects.toMatchObject({ status: 422 });
  await expect(
    post(`/invoices/${invoice}/refunds`, settlementSchema, {
      version: d.version,
      paymentId: "unknown",
      amountMinor: "100",
      reason: "No confirmed funds",
    }),
  ).rejects.toMatchObject({ status: 422 });
  db.role = "viewer";
  await expect(link()).rejects.toMatchObject({ status: 403 });
  db.role = "developer";
  await expect(settlement()).rejects.toMatchObject({ status: 403 });
});
it("expired and unknown capabilities never initiate payment, redirect query cannot mark paid", async () => {
  const l = await link();
  collections.links[0].expires = "2026-10-20";
  expect(
    (await request(`/public/checkouts/${l.token}`, checkoutSchema)).link.status,
  ).toBe("Expired");
  await expect(
    post(`/public/checkouts/${l.token}/attempts`, attemptSchema, {
      amountMinor: "100",
    }),
  ).rejects.toMatchObject({ status: 409 });
  await expect(
    request("/public/collection-results/fake?status=paid", attemptSchema),
  ).rejects.toMatchObject({ status: 404 });
  expect(
    (await request(`/billing/invoices/${invoice}`, billingDocumentSchema))
      .status,
  ).toBe("Outstanding");
});

it("fully credited unpaid invoice is Credited, never paid cash", async () => {
  const cash = structuredClone(db.accounts);
  const d = await settlement();
  const result = await post(
    `/invoices/${invoice}/credit-notes`,
    settlementSchema,
    {
      version: d.version,
      amountMinor: "3480000",
      reason: "Full service cancellation",
    },
  );
  expect(result).toMatchObject({
    paidMinor: "0",
    creditedMinor: "3480000",
    outstandingMinor: "0",
    refundableMinor: "0",
  });
  expect(
    (await request(`/billing/invoices/${invoice}`, billingDocumentSchema))
      .status,
  ).toBe("Credited");
  expect(db.accounts).toEqual(cash);
});
it("failed refund releases its credit reservation without a cash movement", async () => {
  const { p } = await payment();
  await outcome("confirmed");
  await inquiry(p.token);
  let d = await settlement();
  d = await post(`/invoices/${invoice}/credit-notes`, settlementSchema, {
    version: d.version,
    amountMinor: "10000",
    reason: "Refundable correction",
  });
  d = await post(`/invoices/${invoice}/refunds`, settlementSchema, {
    version: d.version,
    paymentId: p.id,
    amountMinor: "10000",
    reason: "Return customer credit",
  });
  expect(d.refundableMinor).toBe("0");
  const cash = structuredClone(db.accounts);
  const result = await post(
    `/__mock/refunds/${d.refunds[0].id}/failed`,
    settlementSchema,
  );
  expect(result).toMatchObject({
    refundedMinor: "0",
    refundableMinor: "10000",
    customerCreditMinor: "10000",
  });
  expect(db.accounts).toEqual(cash);
});
