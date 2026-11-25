import { it, expect } from "vitest";
import { z } from "zod";
import { request } from "./http";
import { config } from "./config";
import {
  mockCardDetailsSchema,
  beneficiaryInput,
  beneficiarySchema,
  beneficiaryListSchema,
  payoutSchema,
  payoutListSchema,
  cardSchema,
  cardListSchema,
  type Payout,
  type BusinessCard,
} from "./paymentContracts";
import {
  accountDetailSchema,
  overviewSchema,
  transactionPageSchema,
} from "./contracts";
import { db, reset } from "../mocks/store";
import { payments } from "../mocks/paymentStore";
import { business } from "../mocks/businessStore";
const values = {
  accountId: "acc_kes",
  beneficiaryId: "BEN-MOCK-001",
  amountMinor: "12345",
  reference: "INV-TEST-001",
};
function post<T>(
  path: string,
  body: unknown,
  schema: z.ZodType<T>,
  key: string = crypto.randomUUID(),
) {
  return request(path, schema, {
    method: "POST",
    headers: { "Idempotency-Key": key },
    body: JSON.stringify(body),
  });
}
const create = (body = values, key?: string) =>
  post("/payments", body, payoutSchema, key);
const action = (p: Payout, action: string, extra: object = {}, key?: string) =>
  post(
    `/payments/${p.id}/${action}`,
    { version: p.version, ...extra },
    payoutSchema,
    key,
  );
async function approved() {
  let p = await create();
  p = await action(p, "submit");
  db.role = "finance";
  return action(p, "approve");
}
const outcome = (p: Payout, outcome: string) =>
  post(
    `/__mock/payouts/${p.id}/outcome`,
    { outcome },
    z.object({ ok: z.boolean() }),
  );
const requestValues = {
  name: "Test software card",
  holderId: "member_admin",
  accountId: "acc_kes",
  form: "Virtual",
  limits: {
    monthlyMinor: "500000",
    dailyMinor: "100000",
    singleMinor: "50000",
    online: true,
    contactless: false,
  },
};
const cardAction = (
  c: BusinessCard,
  action: string,
  body: object = {},
  key?: string,
) =>
  post(
    `/cards/${c.id}/${action}`,
    { version: c.version, ...body },
    cardSchema,
    key,
  );
it("creates masked beneficiaries, paginates, and makes them selectable without fake verification", async () => {
  const initial = await request("/beneficiaries", beneficiaryListSchema);
  expect(initial.total).toBe(3);
  for (let i = 0; i < 5; i++)
    await post(
      "/beneficiaries",
      {
        name: `Test recipient ${i}`,
        rail: "PesaLink",
        institution: "Demo bank",
        destination: `100000000${i}`,
      },
      beneficiarySchema,
    );
  const list = await request("/beneficiaries?page=2", beneficiaryListSchema);
  expect(list.total).toBe(8);
  expect(list.items.length).toBe(2);
  const list1 = await request("/beneficiaries", beneficiaryListSchema);
  const b = list1.items[0];
  expect(b.verification).toBe("Mock only");
  expect(JSON.stringify(payments)).not.toContain("1000000004");
  expect(JSON.stringify([...payments.idempotency.values()])).not.toContain(
    "1000000004",
  );
  const p = await create({ ...values, beneficiaryId: b.id });
  expect(p.beneficiary.name).toBe(b.name);
});
it("validates phone destinations and blocks archived beneficiaries from execution", async () => {
  expect(
    beneficiaryInput.safeParse({
      name: "Test",
      rail: "M-Pesa B2C",
      institution: "Simulator",
      destination: "123456789",
    }).success,
  ).toBe(false);
  let p = await approved();
  const b = payments.beneficiaries[0];
  await post(
    `/beneficiaries/${b.id}/archive`,
    { version: b.version },
    beneficiarySchema,
  );
  await expect(action(p, "execute")).rejects.toMatchObject({ status: 409 });
  expect(p.status).toBe("Approved");
  p = await request(`/payments/${p.id}`, payoutSchema);
  expect(p.beneficiary.status).toBe("Active");
});
it("separates maker approval and execution; UNKNOWN retains original hold; confirms exactly once", async () => {
  const start = structuredClone(db.accounts[0]);
  let p = await create();
  expect(db.accounts[0]).toEqual(start);
  p = await action(p, "submit");
  expect(db.accounts[0].ledgerMinor).toBe(start.ledgerMinor);
  expect(db.accounts[0].heldMinor).toBe(
    (BigInt(start.heldMinor) + 12345n).toString(),
  );
  const detail = await request("/accounts/acc_kes", accountDetailSchema);
  expect(
    detail.holds.reduce((n, h) => n + BigInt(h.amountMinor), 0n).toString(),
  ).toBe(detail.account.heldMinor);
  await expect(action(p, "approve")).rejects.toMatchObject({ status: 403 });
  await expect(action(p, "execute")).rejects.toMatchObject({ status: 409 });
  db.role = "finance";
  p = await action(p, "approve");
  expect(db.transactions.some((t) => t.id === p.transactionId)).toBe(false);
  expect(db.accounts[0].ledgerMinor).toBe(start.ledgerMinor);
  p = await action(p, "execute");
  const id = p.id;
  const ledger = db.accounts[0].ledgerMinor;
  expect(p.status).toBe("Pending confirmation");
  p = await action(p, "inquiry");
  expect(p.status).toBe("Pending confirmation");
  expect(p.id).toBe(id);
  expect(p.holdMinor).toBe("12345");
  expect(db.accounts[0].ledgerMinor).toBe(ledger);
  await outcome(p, "confirmed");
  expect(db.accounts[0].ledgerMinor).toBe(ledger);
  const version = p.version;
  const key = crypto.randomUUID();
  p = await action(p, "inquiry", {}, key);
  expect(p.status).toBe("Completed");
  expect(p.holdMinor).toBe("0");
  expect(db.accounts[0].ledgerMinor).toBe(
    (BigInt(start.ledgerMinor) - 12345n).toString(),
  );
  expect(db.accounts[0].heldMinor).toBe(start.heldMinor);
  const filtered = await request(
    "/transactions?rail=PesaLink&currency=KES",
    transactionPageSchema,
  );
  expect(
    filtered.items.some(
      (t) => t.id === p.transactionId && t.status === "Completed",
    ),
  ).toBe(true);
  const retry = await post(
    `/payments/${p.id}/inquiry`,
    { version },
    payoutSchema,
    key,
  );
  expect(retry.status).toBe("Completed");
  expect(db.transactions.filter((t) => t.id === p.transactionId)).toHaveLength(
    1,
  );
  await expect(action(p, "inquiry")).rejects.toMatchObject({ status: 409 });
  expect(db.accounts[0].availableMinor).toBe(
    (BigInt(start.availableMinor) - 12345n).toString(),
  );
});
it("definitive failure releases reservation without posting cash", async () => {
  const start = structuredClone(db.accounts[0]);
  let p = await approved();
  p = await action(p, "execute");
  await outcome(p, "failed");
  p = await action(p, "inquiry");
  expect(p.status).toBe("Failed");
  expect(db.accounts[0]).toEqual(start);
  expect(db.transactions.find((t) => t.id === p.transactionId)?.status).toBe(
    "Failed",
  );
});
it("rejection requires a reason and cancellation is only possible before execution", async () => {
  const start = structuredClone(db.accounts[0]);
  let p = await create();
  p = await action(p, "submit");
  db.role = "finance";
  await expect(action(p, "reject")).rejects.toMatchObject({ status: 422 });
  p = await action(p, "reject", { note: "Wrong amount" });
  expect(p.status).toBe("Rejected");
  expect(db.accounts[0]).toEqual(start);
  db.role = "admin";
  p = await create();
  p = await action(p, "submit");
  p = await action(p, "cancel");
  expect(p.status).toBe("Cancelled");
  expect(db.accounts[0]).toEqual(start);
  p = await approved();
  p = await action(p, "execute");
  db.role = "admin";
  await expect(action(p, "cancel")).rejects.toMatchObject({ status: 409 });
});
it("rechecks available funds, account eligibility and version at submission", async () => {
  const p = await create({ ...values, amountMinor: "99999999999999" });
  await expect(action(p, "submit")).rejects.toMatchObject({ status: 409 });
  expect(db.accounts[0].heldMinor).toBe("27745000");
  await expect(
    create({ ...values, accountId: "acc_usd" }),
  ).rejects.toMatchObject({ status: 422 });
  const d = await create();
  const sent = await action(d, "submit");
  await expect(action(d, "submit")).rejects.toMatchObject({ status: 409 });
  expect(sent.version).toBe(2);
});
it("idempotency prevents duplicate drafts and execution", async () => {
  const key = crypto.randomUUID();
  const p = await create(values, key);
  expect((await create(values, key)).id).toBe(p.id);
  await expect(
    create({ ...values, amountMinor: "1" }, key),
  ).rejects.toMatchObject({ status: 409 });
  let ready = await action(p, "submit");
  db.role = "finance";
  ready = await action(ready, "approve");
  const execKey = crypto.randomUUID();
  const first = await action(ready, "execute", {}, execKey);
  const second = await action(ready, "execute", {}, execKey);
  expect(second.transactionId).toBe(first.transactionId);
  expect(
    db.transactions.filter((t) => t.id === first.transactionId),
  ).toHaveLength(1);
});
it("overview approvals reflects actual requests and removes approved requests", async () => {
  let p = await create();
  p = await action(p, "submit");
  let o = await request("/business/overview", overviewSchema);
  expect(o.pendingApprovals.map((x) => x.reference)).toContain(p.id);
  db.role = "finance";
  await action(p, "approve");
  o = await request("/business/overview", overviewSchema);
  expect(o.pendingApprovals).toHaveLength(0);
});
it("permission changes and revoked approver access block execution", async () => {
  db.role = "viewer";
  await expect(create()).rejects.toMatchObject({ status: 403 });
  await expect(request("/payments", payoutListSchema)).resolves.toMatchObject({
    total: 0,
  });
  db.role = "developer";
  await expect(request("/payments", payoutListSchema)).rejects.toMatchObject({
    status: 403,
  });
  db.role = "admin";
  const p = await approved();
  db.role = "admin";
  business.team.members.find((m) => m.id === "member_finance")!.status =
    "Suspended";
  await expect(action(p, "execute")).rejects.toMatchObject({ status: 409 });
});
it("expired, unavailable, empty and stale states are deliberate", async () => {
  const p = await create();
  db.scenario = "stale";
  expect((await request(`/payments/${p.id}`, payoutSchema)).stale).toBe(true);
  await expect(action(p, "submit")).rejects.toMatchObject({ status: 409 });
  db.scenario = "expired";
  await expect(request("/cards", cardListSchema)).rejects.toMatchObject({
    status: 401,
  });
  db.scenario = "unavailable";
  await expect(request("/payments", payoutListSchema)).rejects.toMatchObject({
    status: 503,
  });
  db.scenario = "empty";
  expect((await request("/cards", cardListSchema)).items).toHaveLength(0);
});
it("card controls and freezes persist with version protection without affecting cash", async () => {
  const start = structuredClone(db.accounts);
  let c = (await request("/cards", cardListSchema)).items[0];
  const original = c;
  c = await cardAction(c, "freeze");
  expect(c.status).toBe("Frozen");
  await expect(cardAction(original, "unfreeze")).rejects.toMatchObject({
    status: 409,
  });
  c = await cardAction(c, "unfreeze");
  const next = { ...c.limits, online: false, contactless: false };
  c = await cardAction(c, "controls", { limits: next });
  expect(c.limits.online).toBe(false);
  await expect(
    cardAction(c, "controls", { limits: { ...c.limits, monthlyMinor: "1" } }),
  ).rejects.toMatchObject({ status: 422 });
  await expect(
    cardAction(c, "controls", {
      limits: { ...c.limits, monthlyMinor: "50000000" },
    }),
  ).rejects.toMatchObject({ status: 409 });
  expect(db.accounts).toEqual(start);
});
it("card requests require another approver and separate issuer confirmation; no secrets are returned", async () => {
  const start = structuredClone(db.accounts);
  let c = await post("/cards/requests", requestValues, cardSchema);
  expect(c.last4).toBeNull();
  expect(c.status).toBe("Pending approval");
  await expect(cardAction(c, "approve")).rejects.toMatchObject({ status: 403 });
  await expect(
    post(`/__mock/cards/${c.id}/issue`, {}, cardSchema),
  ).rejects.toMatchObject({ status: 409 });
  db.role = "finance";
  c = await cardAction(c, "approve");
  expect(c.status).toBe("Approved for issuance");
  expect(c.last4).toBeNull();
  c = await post(`/__mock/cards/${c.id}/issue`, {}, cardSchema);
  expect(c.status).toBe("Active");
  expect(c.last4).toHaveLength(4);
  expect(c).not.toHaveProperty("pan");
  expect(c).not.toHaveProperty("cvv");
  expect(db.accounts).toEqual(start);
});
it("replacement freezes original, retains link and is idempotent", async () => {
  const original = (await request("/cards", cardListSchema)).items[0];
  const key = crypto.randomUUID();
  const c = await cardAction(original, "replace", {}, key);
  expect(c.replacementOf).toBe(original.id);
  expect(c.status).toBe("Pending approval");
  expect(c.last4).toBeNull();
  expect((await request(`/cards/${original.id}`, cardSchema)).status).toBe(
    "Frozen",
  );
  expect((await cardAction(original, "replace", {}, key)).id).toBe(c.id);
  expect(
    payments.cards.filter((x) => x.replacementOf === original.id),
  ).toHaveLength(1);
});
it("credit preview and viewer card mutation remain unavailable", async () => {
  const credit = await request("/cards/CARD-PREVIEW", cardSchema);
  expect(credit.kind).toBe("Credit");
  await expect(cardAction(credit, "unfreeze")).rejects.toMatchObject({
    status: 403,
  });
  db.role = "viewer";
  await expect(cardAction(payments.cards[0], "freeze")).rejects.toMatchObject({
    status: 403,
  });
});
it("reset restores cards, beneficiaries, payouts and reservations together", async () => {
  await approved();
  await cardAction(payments.cards[0], "freeze");
  reset();
  expect(payments.payouts).toHaveLength(0);
  expect(payments.cards[0].status).toBe("Active");
  expect(db.accounts[0].heldMinor).toBe("27745000");
  expect(payments.idempotency.size).toBe(0);
});

it("only the maker can edit a versioned draft and submitted payment terms are locked", async () => {
  const start = structuredClone(db.accounts[0]);
  let p = await create();
  const edited = {
    ...values,
    amountMinor: "20001",
    reference: "EDITED-REF",
    version: p.version,
  };
  db.role = "finance";
  await expect(
    post(`/payments/${p.id}/edit`, edited, payoutSchema),
  ).rejects.toMatchObject({ status: 409 });
  db.role = "admin";
  const key = crypto.randomUUID();
  p = await post(`/payments/${p.id}/edit`, edited, payoutSchema, key);
  expect(p.amountMinor).toBe("20001");
  expect(db.accounts[0]).toEqual(start);
  expect(
    (await post(`/payments/${p.id}/edit`, edited, payoutSchema, key)).version,
  ).toBe(p.version);
  await expect(
    post(`/payments/${p.id}/edit`, edited, payoutSchema),
  ).rejects.toMatchObject({ status: 409 });
  p = await action(p, "submit");
  await expect(
    post(
      `/payments/${p.id}/edit`,
      { ...edited, version: p.version },
      payoutSchema,
    ),
  ).rejects.toMatchObject({ status: 409 });
  expect(payments.payouts[0].amountMinor).toBe("20001");
});

it("malformed integer amounts and limits return validation errors instead of throwing conversion errors", async () => {
  for (const amountMinor of ["abc", "1.5", "1e3", "-1", "0"]) {
    await expect(create({ ...values, amountMinor })).rejects.toMatchObject({
      status: 422,
    });
  }
  await expect(
    post(
      "/cards/requests",
      {
        ...requestValues,
        limits: { ...requestValues.limits, singleMinor: "abc" },
      },
      cardSchema,
    ),
  ).rejects.toMatchObject({ status: 422 });
  expect(payments.payouts).toHaveLength(0);
  expect(db.accounts[0].ledgerMinor).toBe("1512040000");
});

it("card reveal is scoped, uncached and returns non-payable development values without issuing credit", async () => {
  const start = structuredClone(db.accounts);
  const c = payments.cards[0];
  const d = await post(
    `/__mock/cards/${c.id}/details`,
    {},
    mockCardDetailsSchema,
  );
  const response = await fetch(
    `${config.baseUrl}/__mock/cards/${c.id}/details`,
    { method: "POST" },
  );
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(d.number).toBe("0000 0000 0000 4821");
  expect(d.cvv).toBe("000");
  expect(JSON.stringify(payments.cards)).not.toContain(d.number);
  const preview = await post(
    "/__mock/cards/CARD-PREVIEW/details",
    {},
    mockCardDetailsSchema,
  );
  expect(preview.simulated).toBe(true);
  expect(payments.cards.find((c) => c.id === "CARD-PREVIEW")?.status).toBe(
    "Preview",
  );
  expect(db.accounts).toEqual(start);
  db.role = "viewer";
  await expect(
    post(`/__mock/cards/${c.id}/details`, {}, mockCardDetailsSchema),
  ).rejects.toMatchObject({ status: 403 });
  db.role = "admin";
  db.scenario = "stale";
  await expect(
    post(`/__mock/cards/${c.id}/details`, {}, mockCardDetailsSchema),
  ).rejects.toMatchObject({ status: 409 });
});
it("unissued requests do not reveal simulated numbers", async () => {
  const c = await post("/cards/requests", requestValues, cardSchema);
  await expect(
    post(`/__mock/cards/${c.id}/details`, {}, mockCardDetailsSchema),
  ).rejects.toMatchObject({ status: 409 });
});
