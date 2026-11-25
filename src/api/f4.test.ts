import { it, expect } from "vitest";
import { request } from "./http";
import {
  billingDocumentSchema,
  contactSchema,
  contactListSchema,
  billingListSchema,
  publicQuoteSchema,
  type BillingDocument,
} from "./billingContracts";
import { overviewSchema, sessionSchema } from "./contracts";
import { billing } from "../mocks/billingStore";
import { db } from "../mocks/store";
const write = (path: string, body: unknown, method = "POST") =>
  request(path, billingDocumentSchema, { method, body: JSON.stringify(body) });
const action = (d: BillingDocument, action: string) =>
  write(`/billing/${d.kind}/${d.id}/${action}`, { version: d.version });
const get = (id: string) =>
  request(`/billing/quotations/${id}`, billingDocumentSchema);
async function shared() {
  return action(billing.documents[0], "share");
}
async function respond(
  d: BillingDocument,
  decision = "accept",
  version = d.version,
) {
  return request(
    `/public/quotations/${d.publicToken}/respond`,
    publicQuoteSchema,
    {
      method: "POST",
      body: JSON.stringify({
        version,
        decision,
        name: "Test Recipient",
        consent: true,
      }),
    },
  );
}
it("created contact becomes selectable; duplicate and stale writes fail", async () => {
  const body = {
    name: "New customer",
    person: "Contact Person",
    email: "new@example.test",
    address: "Test address",
    termsDays: "30",
    archived: false,
  };
  const c = await request("/contacts", contactSchema, {
    method: "POST",
    body: JSON.stringify(body),
  });
  expect(
    (await request("/contacts/options", contactListSchema)).items.some(
      (x) => x.id === c.id,
    ),
  ).toBe(true);
  await expect(
    request("/contacts", contactSchema, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  ).rejects.toMatchObject({ status: 409 });
  await request(`/contacts/${c.id}`, contactSchema, {
    method: "PATCH",
    body: JSON.stringify({ ...body, name: "Changed", version: c.version }),
  });
  await expect(
    request(`/contacts/${c.id}`, contactSchema, {
      method: "PATCH",
      body: JSON.stringify({ ...body, version: c.version }),
    }),
  ).rejects.toMatchObject({ status: 409 });
});
it("contact archive removes selection without rewriting issued snapshot", async () => {
  const inv = billing.documents[1];
  const before = structuredClone(inv.snapshot);
  const c = billing.contacts[0];
  await request(`/contacts/${c.id}`, contactSchema, {
    method: "PATCH",
    body: JSON.stringify({ ...c, archived: true, name: "Updated company" }),
  });
  expect(
    (await request("/contacts/options", contactListSchema)).items.some(
      (x) => x.id === c.id,
    ),
  ).toBe(false);
  expect(inv.snapshot).toEqual(before);
});
it("draft creation is idempotent and different key body conflicts", async () => {
  const values = billing.documents[0].values;
  const call = (title: string) =>
    request("/billing/invoices", billingDocumentSchema, {
      method: "POST",
      headers: { "Idempotency-Key": "fixed-key" },
      body: JSON.stringify({ ...values, title }),
    });
  const one = await call("Draft test");
  expect((await call("Draft test")).id).toBe(one.id);
  await expect(call("Different title")).rejects.toMatchObject({ status: 409 });
  expect(one.outstandingMinor).toBe("0");
});
it("sent quotes lock, recipient accepts version, conversion replays one linked draft", async () => {
  const d = await shared();
  await expect(
    write(
      `/billing/quotations/${d.id}`,
      { version: d.version, values: d.values },
      "PATCH",
    ),
  ).rejects.toMatchObject({ status: 409 });
  await respond(d);
  const accepted = await get(d.id);
  expect(accepted.status).toBe("Accepted");
  const invoice = await action(accepted, "convert");
  expect(invoice).toMatchObject({
    status: "Draft",
    linkedId: d.id,
    outstandingMinor: "0",
  });
  expect((await action(accepted, "convert")).id).toBe(invoice.id);
  expect((await get(d.id)).linkedId).toBe(invoice.id);
  expect(invoice.values).toEqual(d.snapshot?.values);
});
it("issue creates immutable receivable and updates overview without bank movement", async () => {
  const values = billing.documents[0].values;
  const d = await request("/billing/invoices", billingDocumentSchema, {
    method: "POST",
    headers: { "Idempotency-Key": "issue-test" },
    body: JSON.stringify(values),
  });
  const cash = structuredClone(db.accounts);
  const before = await request("/business/overview", overviewSchema);
  const issued = await action(d, "issue");
  expect(issued.outstandingMinor).toBe(d.totals.totalMinor);
  expect(issued.snapshot?.values).toEqual(d.values);
  await expect(
    write(
      `/billing/invoices/${d.id}`,
      { version: issued.version, values: { ...d.values, title: "Tamper" } },
      "PATCH",
    ),
  ).rejects.toMatchObject({ status: 409 });
  await expect(action(issued, "issue")).rejects.toMatchObject({ status: 409 });
  const after = await request("/business/overview", overviewSchema);
  expect(BigInt(after.receivableMinor) - BigInt(before.receivableMinor)).toBe(
    BigInt(issued.outstandingMinor),
  );
  expect(db.accounts).toEqual(cash);
  const customers = await request("/contacts/options", contactListSchema);
  expect(
    customers.items.find((c) => c.id === issued.values.contactId)?.receivables
      .KES,
  ).toBe(after.receivableMinor);
});
it("decline/revision invalidates old token and retains immutable revision history", async () => {
  const d = await shared();
  await respond(d, "decline");
  const declined = await get(d.id);
  const revised = await action(declined, "revise");
  await expect(
    request(`/public/quotations/${d.publicToken}`, publicQuoteSchema),
  ).rejects.toMatchObject({ status: 404 });
  const edited = await write(
    `/billing/quotations/${d.id}`,
    {
      version: revised.version,
      values: { ...revised.values, title: "New scope" },
    },
    "PATCH",
  );
  const sent = await action(edited, "share");
  expect(sent.revisions).toHaveLength(2);
  expect(sent.revisions[0].values.title).toBe(d.values.title);
  expect(sent.revisions[1].values.title).toBe("New scope");
  expect(sent.publicToken).not.toBe(d.publicToken);
});
it("public response rejects stale versions, consent omission and unknown tokens", async () => {
  const d = await shared();
  await expect(respond(d, "accept", 1)).rejects.toMatchObject({ status: 409 });
  await expect(
    request("/public/quotations/unknown", publicQuoteSchema),
  ).rejects.toMatchObject({ status: 404 });
  await expect(
    request(`/public/quotations/${d.publicToken}/respond`, publicQuoteSchema, {
      method: "POST",
      body: JSON.stringify({
        version: d.version,
        name: "Test",
        decision: "accept",
        consent: false,
      }),
    }),
  ).rejects.toMatchObject({ status: 422 });
  await respond(d);
  expect((await respond(d)).status).toBe("Accepted");
  await expect(respond(d, "decline")).rejects.toMatchObject({ status: 409 });
});
it("expired quotation preserves reference and refuses response", async () => {
  const d = await shared();
  const stored = billing.documents.find((x) => x.id === d.id)!;
  stored.values.until = "2026-10-20";
  const expired = await request(
    `/public/quotations/${d.publicToken}`,
    publicQuoteSchema,
  );
  expect(expired).toMatchObject({ id: d.id, status: "Expired" });
  await expect(respond(d)).rejects.toMatchObject({ status: 409 });
});
it("permissions deny viewer writes and developer reads at network boundary", async () => {
  db.role = "viewer";
  const d = billing.documents[0];
  expect((await request("/session", sessionSchema)).permissions).toContain(
    "billing:read",
  );
  await expect(action(d, "share")).rejects.toMatchObject({ status: 403 });
  db.role = "developer";
  await expect(get(d.id)).rejects.toMatchObject({ status: 403 });
  db.role = "finance";
  expect((await action(d, "share")).status).toBe("Sent");
});
it("filtering precedes pagination and currencies are never combined", async () => {
  const d = billing.documents[0];
  billing.documents.push({
    ...structuredClone(d),
    id: "USD-QUOTE",
    values: { ...d.values, currency: "USD" },
  });
  const usd = await request(
    "/billing/quotations?currency=USD",
    billingListSchema,
  );
  expect(usd.items).toHaveLength(1);
  expect(usd.items[0].id).toBe("USD-QUOTE");
  const options = await request(
    "/contacts?search=Acacia&page=1",
    contactListSchema,
  );
  expect(options.items).toHaveLength(1);
  expect(options.total).toBe(1);
  await expect(
    request("/billing/quotations?currency=EUR", billingListSchema),
  ).rejects.toMatchObject({ status: 422 });
});
