import { enterprise } from "./enterpriseStore";
import { http, HttpResponse, delay } from "msw";
import { z } from "zod";
import { guard, mockError } from "./handlers";
import { business } from "./businessStore";
import { billing, makeDocument } from "./billingStore";
import { db, fixedDate } from "./store";
import { freshness } from "./selectors";
import {
  contactFields,
  documentFields,
  type BillingDocument,
} from "../api/billingContracts";
import { calculate } from "../domain/billing";
const contactSummary = (c: (typeof billing.contacts)[number]) => ({
  ...c,
  receivables: Object.fromEntries(
    ["KES", "USD"].map((currency) => [
      currency,
      billing.documents
        .filter(
          (d) =>
            d.kind === "invoices" &&
            d.values.contactId === c.id &&
            d.values.currency === currency,
        )
        .reduce((n, d) => n + BigInt(d.outstandingMinor), 0n)
        .toString(),
    ]),
  ),
});
const json = (value: object) => HttpResponse.json({ ...value, ...freshness() });
const event = (d: BillingDocument, label: string) => {
  d.events.push({ label, at: fixedDate });
  d.version++;
};
const snapshot = (d: BillingDocument) => ({
  issuerDetails: {
    address: business.profile.values.operatingAddress,
    email: business.profile.values.contactEmail,
    phone: business.profile.values.phone,
  },
  branding: {
    ...structuredClone(enterprise.branding),
    template: d.appearance?.template ?? enterprise.branding.template,
  },
  issuerName: business.profile.values.displayName,
  values: structuredClone(d.values),
  customer: structuredClone(d.customer),
  totals: structuredClone(d.totals),
  at: fixedDate,
  revision: d.revisions.length + 1,
});
const expire = (d: BillingDocument) => {
  if (d.status === "Sent" && d.values.until < fixedDate.slice(0, 10)) {
    d.status = "Expired";
    event(d, "Quotation expired");
  }
};
function query(request: Request) {
  const p = Object.fromEntries(new URL(request.url).searchParams);
  return z
    .object({
      page: z.coerce.number().int().min(1).default(1),
      search: z.string().max(150).default(""),
      currency: z.enum(["KES", "USD"]).default("KES"),
      status: z.string().default("All"),
      contactId: z.string().default(""),
    })
    .safeParse(p);
}
export const billingHandlers = [
  http.get("*/api/contacts", async ({ request }) => {
    const e = await guard("billing:read");
    if (e) return e;
    const q = query(request);
    if (!q.success) return mockError(422);
    const all = db.scenario === "empty" ? [] : billing.contacts;
    const items = all.filter(
      (c) =>
        (c.name + " " + c.email)
          .toLowerCase()
          .includes(q.data.search.toLowerCase()) &&
        (q.data.status === "All" ||
          (q.data.status === "Archived" ? c.archived : !c.archived)),
    );
    const pages = Math.max(1, Math.ceil(items.length / 6));
    return json({
      items: items
        .slice((q.data.page - 1) * 6, q.data.page * 6)
        .map(contactSummary),
      total: items.length,
      page: q.data.page,
      pages,
    });
  }),
  http.get("*/api/contacts/options", async () => {
    const e = await guard("billing:read");
    return (
      e ??
      json({
        items:
          db.scenario === "empty"
            ? []
            : billing.contacts.filter((c) => !c.archived).map(contactSummary),
        total: billing.contacts.length,
        page: 1,
        pages: 1,
      })
    );
  }),
  http.get("*/api/contacts/:id", async ({ params }) => {
    const e = await guard("billing:read");
    if (e) return e;
    const c = billing.contacts.find((c) => c.id === params.id);
    return c ? json(c) : mockError(404);
  }),
  http.post("*/api/contacts", async ({ request }) => {
    const e = await guard("billing:write");
    if (e) return e;
    const data = contactFields.safeParse(await request.json());
    if (!data.success) return mockError(422);
    if (
      billing.contacts.some(
        (c) => c.email.toLowerCase() === data.data.email.toLowerCase(),
      )
    )
      return mockError(409);
    const c = { ...data.data, id: `contact_${billing.next++}`, version: 1 };
    billing.contacts.unshift(c);
    return json(c);
  }),
  http.patch("*/api/contacts/:id", async ({ request, params }) => {
    const e = await guard("billing:write");
    if (e) return e;
    const data = contactFields
      .extend({ version: z.number().int() })
      .safeParse(await request.json());
    const c = billing.contacts.find((c) => c.id === params.id);
    if (!c) return mockError(404);
    if (!data.success) return mockError(422);
    if (c.version !== data.data.version) return mockError(409);
    if (
      billing.contacts.some(
        (other) =>
          other.id !== c.id &&
          other.email.toLowerCase() === data.data.email.toLowerCase(),
      )
    )
      return mockError(409);
    Object.assign(c, data.data, { version: c.version + 1 });
    return json(c);
  }),
  http.get("*/api/billing/:kind", async ({ request, params }) => {
    const e = await guard("billing:read");
    if (e) return e;
    if (!["quotations", "invoices"].includes(String(params.kind)))
      return mockError(404);
    const q = query(request);
    if (!q.success) return mockError(422);
    billing.documents.forEach(expire);
    const all = (db.scenario === "empty" ? [] : billing.documents).filter(
      (d) =>
        d.kind === params.kind &&
        d.values.currency === q.data.currency &&
        (!q.data.contactId || d.values.contactId === q.data.contactId),
    );
    const filtered = all.filter(
      (d) =>
        (d.id + " " + d.values.title + " " + d.customer.name)
          .toLowerCase()
          .includes(q.data.search.toLowerCase()) &&
        (q.data.status === "All" || d.status === q.data.status),
    );
    return json({
      items: filtered.slice((q.data.page - 1) * 6, q.data.page * 6),
      total: filtered.length,
      page: q.data.page,
      pages: Math.max(1, Math.ceil(filtered.length / 6)),
      summary: {
        count: all.length,
        currency: q.data.currency,
        outstandingMinor: all
          .reduce((n, d) => n + BigInt(d.outstandingMinor), 0n)
          .toString(),
      },
    });
  }),
  http.post("*/api/billing/:kind", async ({ request, params }) => {
    const e = await guard("billing:write");
    if (e) return e;
    if (params.kind !== "quotations" && params.kind !== "invoices")
      return mockError(404);
    const data = documentFields.safeParse(await request.json());
    if (
      !data.success ||
      !billing.contacts.some((c) => c.id === data.data.contactId && !c.archived)
    )
      return mockError(422);
    const key = request.headers.get("Idempotency-Key");
    if (!key) return mockError(422);
    const body = JSON.stringify(data.data);
    const mapkey = `billing:${params.kind}:${key}`;
    const old = db.idempotency.get(mapkey);
    if (old) {
      const d = billing.documents.find((d) => d.id === old.id);
      return old.body === body && d ? json(d) : mockError(409);
    }
    const d = makeDocument(params.kind, data.data);
    billing.documents.unshift(d);
    db.idempotency.set(mapkey, { body, id: d.id });
    return json(d);
  }),
  http.get("*/api/billing/:kind/:id", async ({ params }) => {
    const e = await guard("billing:read");
    if (e) return e;
    const d = billing.documents.find(
      (d) => d.kind === params.kind && d.id === params.id,
    );
    if (d) expire(d);
    return d ? json(d) : mockError(404);
  }),
  http.patch("*/api/billing/:kind/:id", async ({ params, request }) => {
    const e = await guard("billing:write");
    if (e) return e;
    const d = billing.documents.find(
      (d) => d.kind === params.kind && d.id === params.id,
    );
    if (!d) return mockError(404);
    const data = z
      .object({ version: z.number().int(), values: documentFields })
      .safeParse(await request.json());
    if (!data.success) return mockError(422);
    if (d.status !== "Draft" || d.version !== data.data.version)
      return mockError(409);
    const c = billing.contacts.find(
      (c) => c.id === data.data.values.contactId && !c.archived,
    );
    if (!c) return mockError(422);
    d.values = data.data.values;
    d.customer = structuredClone(c);
    d.totals = calculate(d.values.lines);
    event(d, "Draft saved");
    return json(d);
  }),
  http.post("*/api/billing/:kind/:id/:action", async ({ params, request }) => {
    const e = await guard("billing:write");
    if (e) return e;
    const d = billing.documents.find(
      (d) => d.kind === params.kind && d.id === params.id,
    );
    if (!d) return mockError(404);
    expire(d);
    const data = z
      .object({ version: z.number().int() })
      .safeParse(await request.json());
    if (!data.success) return mockError(422);
    // Conversion replay returns original linked invoice even with the original accepted version.
    if (params.action === "convert" && d.kind === "quotations" && d.linkedId)
      return json(billing.documents.find((i) => i.id === d.linkedId)!);
    if (data.data.version !== d.version) return mockError(409);
    if (
      params.action === "share" &&
      d.kind === "quotations" &&
      d.status === "Draft"
    ) {
      if (d.values.until < fixedDate.slice(0, 10)) return mockError(422);
      d.snapshot = snapshot(d);
      d.revisions.push(structuredClone(d.snapshot));
      d.status = "Sent";
      d.publicToken = `mock-quote-${crypto.randomUUID()}`;
      event(d, "Recipient link created; no email sent");
    } else if (
      params.action === "revise" &&
      d.kind === "quotations" &&
      ["Sent", "Declined", "Expired"].includes(d.status)
    ) {
      d.publicToken = null;
      d.status = "Draft";
      event(d, "New draft revision; prior recipient link invalidated");
    } else if (
      params.action === "convert" &&
      d.kind === "quotations" &&
      d.status === "Accepted" &&
      d.snapshot
    ) {
      const i = makeDocument("invoices", d.snapshot.values);
      i.customer = structuredClone(d.snapshot.customer);
      i.totals = structuredClone(d.snapshot.totals);
      i.linkedId = d.id;
      d.linkedId = i.id;
      d.status = "Converted";
      event(d, "Converted to linked draft invoice");
      billing.documents.unshift(i);
      return json(i);
    } else if (
      params.action === "issue" &&
      d.kind === "invoices" &&
      d.status === "Draft"
    ) {
      if (
        !billing.contacts.some(
          (c) => c.id === d.values.contactId && !c.archived,
        )
      )
        return mockError(422);
      d.snapshot = snapshot(d);
      d.revisions.push(structuredClone(d.snapshot));
      d.status = "Outstanding";
      d.outstandingMinor = d.totals.totalMinor;
      event(
        d,
        "Immutable invoice version issued; receivable created, no cash movement",
      );
    } else return mockError(409);
    return json(d);
  }),
  http.get("*/api/public/quotations/:token", async ({ params }) => {
    await delay(200);
    if (db.scenario === "unavailable") return mockError(503);
    const d = billing.documents.find((d) => d.publicToken === params.token);
    if (!d || !d.snapshot) return mockError(404);
    expire(d);
    return HttpResponse.json({
      id: d.id,
      version: d.version,
      status: d.status,
      snapshot: d.snapshot,
      signer: billing.signers[d.id] ?? null,
    });
  }),
  http.post(
    "*/api/public/quotations/:token/respond",
    async ({ params, request }) => {
      await delay(200);
      if (db.scenario === "unavailable") return mockError(503);
      const d = billing.documents.find((d) => d.publicToken === params.token);
      if (!d || !d.snapshot) return mockError(404);
      expire(d);
      const data = z
        .object({
          version: z.number().int(),
          decision: z.enum(["accept", "decline"]),
          name: z.string().trim().min(2).max(100),
          consent: z.literal(true),
        })
        .safeParse(await request.json());
      if (!data.success) return mockError(422);
      const status = data.data.decision === "accept" ? "Accepted" : "Declined";
      if (d.status === status && billing.signers[d.id] === data.data.name)
        return HttpResponse.json({
          id: d.id,
          version: d.version,
          status: d.status,
          snapshot: d.snapshot,
          signer: billing.signers[d.id],
        });
      if (d.status !== "Sent" || d.version !== data.data.version)
        return mockError(409);
      d.status = status;
      billing.signers[d.id] = data.data.name;
      event(
        d,
        `Recipient ${status.toLowerCase()} quotation (mock acknowledgement)`,
      );
      return HttpResponse.json({
        id: d.id,
        version: d.version,
        status: d.status,
        snapshot: d.snapshot,
        signer: billing.signers[d.id],
      });
    },
  ),
];
