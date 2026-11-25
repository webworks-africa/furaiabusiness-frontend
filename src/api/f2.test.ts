import { it, expect } from "vitest";
import { request } from "./http";
import {
  statementJobSchema,
  statementListSchema,
  transactionPageSchema,
  transactionDetailSchema,
  overviewSchema,
} from "./contracts";
import { db } from "../mocks/store";
import { config } from "./config";
const values = {
  accountId: "acc_kes",
  from: "2026-10-01",
  to: "2026-10-21",
  format: "csv",
  includeUnresolved: true,
};
function create(key = "request-001", body = values) {
  return request("/statements", statementJobSchema, {
    method: "POST",
    headers: { "Idempotency-Key": key },
    body: JSON.stringify(body),
  });
}
async function tick(id: string) {
  return request(`/statements/${id}`, statementJobSchema);
}
async function download(id: string) {
  return fetch(`${config.baseUrl}/statements/${id}/download`);
}
it("filters before pagination and preserves filter summary", async () => {
  const p = await request(
    "/transactions?currency=USD&page=1",
    transactionPageSchema,
  );
  expect(p.items).toHaveLength(2);
  expect(p.total).toBe(2);
  expect(p.summary.currency).toBe("USD");
  expect(p.summary.incomingMinor).toBe("500000");
});
it("does not sum currencies, pending or failed records", async () => {
  const mixed = await request("/transactions", transactionPageSchema);
  expect(mixed.summary.currency).toBeNull();
  const pending = await request(
    "/transactions?status=Pending%20confirmation&currency=KES",
    transactionPageSchema,
  );
  expect(pending.items).toHaveLength(1);
  expect(pending.summary.incomingMinor).toBe("0");
  const overview = await request("/business/overview", overviewSchema);
  const kes = db.transactions
    .filter(
      (t) =>
        t.currency === "KES" &&
        t.status === "Completed" &&
        t.date.startsWith("2026-10") &&
        BigInt(t.amountMinor) > 0n,
    )
    .reduce((sum, t) => sum + BigInt(t.amountMinor), 0n);
  expect(overview.incomingMinor).toBe(kes.toString());
});
it("rejects invalid URL filters and unknown objects", async () => {
  await expect(
    request("/transactions?status=Paid", transactionPageSchema),
  ).rejects.toMatchObject({ status: 422 });
  await expect(
    request("/transactions/foreign", transactionDetailSchema),
  ).rejects.toMatchObject({ status: 404 });
});
it("refreshing an UNKNOWN outcome never settles it or changes balances", async () => {
  const before = structuredClone(db.accounts);
  const t = await request("/transactions/TXN-90234", transactionDetailSchema);
  expect(t.transaction.status).toBe("Pending confirmation");
  expect(t.ledgerImpactMinor).toBe("0");
  expect(t.reference).toBe("TXN-90234");
  expect(db.accounts).toEqual(before);
});
it("export creation is idempotent and rejects key reuse with different input", async () => {
  const a = await create();
  const b = await create();
  expect(b.id).toBe(a.id);
  expect(db.statements.size).toBe(1);
  await expect(
    create("request-001", { ...values, includeUnresolved: false }),
  ).rejects.toMatchObject({ status: 409 });
});
it("queues, generates and downloads an immutable snapshot without moving money", async () => {
  const before = structuredClone(db.accounts);
  const a = await create();
  expect(a.status).toBe("Queued");
  expect((await tick(a.id)).status).toBe("Generating");
  db.transactions = [];
  const ready = await tick(a.id);
  expect(ready.status).toBe("Ready");
  expect(ready.rowCount).toBe(12);
  const response = await download(a.id);
  expect(response.ok).toBe(true);
  const text = await response.text();
  expect(text).toContain("TXN-90234");
  expect(db.accounts).toEqual(before);
  expect(
    (await request("/statements", statementListSchema)).items[0].status,
  ).toBe("Ready");
});
it("blocks premature download, fails once and retries the same job", async () => {
  db.scenario = "export-failure";
  const a = await create();
  expect((await download(a.id)).status).toBe(409);
  await tick(a.id);
  expect((await tick(a.id)).status).toBe("Failed");
  const retried = await request(
    `/statements/${a.id}/retry`,
    statementJobSchema,
    { method: "POST" },
  );
  expect(retried.id).toBe(a.id);
  expect(retried.attempt).toBe(2);
  await tick(a.id);
  expect((await tick(a.id)).status).toBe("Ready");
  expect(db.statements.size).toBe(1);
});
it("exports cannot be created, retried or downloaded by viewer role", async () => {
  const a = await create();
  await tick(a.id);
  await tick(a.id);
  db.role = "viewer";
  await expect(create("viewer-request")).rejects.toMatchObject({ status: 403 });
  await expect(
    request(`/statements/${a.id}/retry`, statementJobSchema, {
      method: "POST",
    }),
  ).rejects.toMatchObject({ status: 403 });
  expect((await download(a.id)).status).toBe(403);
});
it("expired download stays unavailable and future ranges are rejected", async () => {
  db.scenario = "export-expired";
  const a = await create();
  await tick(a.id);
  expect((await tick(a.id)).status).toBe("Expired");
  expect((await download(a.id)).status).toBe(410);
  await expect(
    create("future", { ...values, to: "2026-10-22" }),
  ).rejects.toMatchObject({ status: 422 });
});
