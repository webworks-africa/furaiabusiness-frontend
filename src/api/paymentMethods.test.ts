import { it, expect } from "vitest";
import { z } from "zod";
import { request } from "./http";
import {
  linkSchema,
  attemptSchema,
  settlementSchema,
} from "./collectionContracts";
import { db } from "../mocks/store";
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
async function setup() {
  return post("/payment-links", linkSchema, {
    invoiceId: "INV-MOCK-101",
    accountId: "acc_kes",
    expires: "2026-11-20",
    partial: true,
  });
}
it("STK sends once, returns masked phone and stable provider reference, approval alone posts nothing", async () => {
  const link = await setup();
  const path = `/public/checkouts/${link.token}/attempts`;
  const cash = structuredClone(db.accounts);
  const first = await post(
    path,
    attemptSchema,
    { amountMinor: "10000", method: "mpesa", phone: "0712345678" },
    "stk-once",
  );
  expect(first).toMatchObject({
    method: "mpesa",
    maskedPhone: "2547•••••678",
    providerState: "STK push sent (simulated)",
    status: "Processing",
  });
  expect(first.providerEvents).toHaveLength(1);
  const again = await post(
    path,
    attemptSchema,
    { amountMinor: "10000", method: "mpesa", phone: "+254712345678" },
    "stk-once",
  );
  expect(again.id).toBe(first.id);
  expect(again.providerEvents).toHaveLength(1);
  expect(JSON.stringify(first)).not.toContain("0712345678");
  expect(JSON.stringify([...db.idempotency.values()])).not.toContain(
    "254712345678",
  );
  await expect(
    post(
      path,
      attemptSchema,
      { amountMinor: "10000", method: "mpesa", phone: "0712345679" },
      "stk-once",
    ),
  ).rejects.toMatchObject({ status: 409 });
  const approved = await post(
    `/__mock/provider/${first.token}/approve`,
    attemptSchema,
  );
  expect(approved.status).toBe("Processing");
  expect(db.accounts).toEqual(cash);
  const confirmed = await post(
    `/public/collection-results/${first.token}/inquiry`,
    attemptSchema,
  );
  expect(confirmed.status).toBe("Confirmed");
  await post(
    `/public/collection-results/${first.token}/inquiry`,
    attemptSchema,
  );
  expect(BigInt(db.accounts[0].ledgerMinor) - BigInt(cash[0].ledgerMinor)).toBe(
    10000n,
  );
});
it("invalid mobile never dispatches; cancelling the STK prompt records a failure without allocation", async () => {
  const l = await setup();
  const path = `/public/checkouts/${l.token}/attempts`;
  await expect(
    post(path, attemptSchema, {
      amountMinor: "100",
      method: "mpesa",
      phone: "123",
    }),
  ).rejects.toMatchObject({ status: 422 });
  const p = await post(path, attemptSchema, {
    amountMinor: "100",
    method: "mpesa",
    phone: "0112345678",
  });
  await post(`/__mock/provider/${p.token}/cancel`, attemptSchema);
  await expect(
    post(`/__mock/provider/${p.token}/approve`, attemptSchema),
  ).rejects.toMatchObject({ status: 409 });
  const result = await post(
    `/public/collection-results/${p.token}/inquiry`,
    attemptSchema,
  );
  expect(result).toMatchObject({ status: "Failed", receipt: null });
  expect(
    (await request("/invoices/INV-MOCK-101/settlement", settlementSchema))
      .paidMinor,
  ).toBe("0");
});
for (const method of ["pesalink", "visa", "mastercard", "paypal"])
  it(`${method} authorization is scoped to its original attempt and confirms only via inquiry`, async () => {
    const l = await setup();
    const cash = structuredClone(db.accounts);
    const p = await post(
      `/public/checkouts/${l.token}/attempts`,
      attemptSchema,
      { amountMinor: "100", method },
    );
    expect(p.method).toBe(method);
    expect(p.maskedPhone).toBeNull();
    await post(`/__mock/provider/${p.token}/approve`, attemptSchema);
    expect(db.accounts).toEqual(cash);
    const result = await post(
      `/public/collection-results/${p.token}/inquiry`,
      attemptSchema,
    );
    expect(result.receipt?.amountMinor).toBe("100");
  });
