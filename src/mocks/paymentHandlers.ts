import { http, HttpResponse } from "msw";
import { z } from "zod";
import { guard, mockError } from "./handlers";
import { db, fixedDate } from "./store";
import { payments } from "./paymentStore";
import { actorSession, business, record } from "./businessStore";
import {
  beneficiaryInput,
  payoutInput,
  cardRequestInput,
  cardLimits,
  type Payout,
  type BusinessCard,
} from "../api/paymentContracts";
import type { Permission } from "../api/contracts";
import { freshness } from "./selectors";
const json = (value: object) => HttpResponse.json({ ...value, ...freshness() });
async function writeGuard(permission: Permission) {
  const e = await guard(permission);
  return e ?? (db.scenario === "stale" ? mockError(409) : undefined);
}
const actor = () => actorSession(db.role);
const event = (label: string) => ({
  label,
  actor: actor().name,
  at: fixedDate,
});
const versionInput = z.object({ version: z.number().int().positive() });
function changed(item: Payout | BusinessCard, label: string) {
  item.version++;
  item.events.push(event(label));
  record(db.role, `${item.id}: ${label}`);
}
function page<T>(items: T[], request: Request) {
  const p = new URL(request.url).searchParams;
  const n = Number(p.get("page") || 1);
  if (!Number.isInteger(n) || n < 1) return mockError(422);
  const search = (p.get("search") || "").toLowerCase();
  const status = p.get("status") || "";
  const filtered = items.filter((v) => {
    const x = v as {
      name?: string;
      reference?: string;
      id: string;
      status: string;
      beneficiary?: { name: string };
    };
    return (
      (!status || x.status === status) &&
      `${x.name ?? x.beneficiary?.name ?? ""} ${x.id} ${x.reference ?? ""}`
        .toLowerCase()
        .includes(search)
    );
  });
  return json({
    items: db.scenario === "empty" ? [] : filtered.slice((n - 1) * 6, n * 6),
    total: db.scenario === "empty" ? 0 : filtered.length,
    page: n,
    pageSize: 6,
  });
}
function idem(
  request: Request,
  body: unknown,
  kind: "beneficiary" | "payout" | "card",
) {
  const key = request.headers.get("Idempotency-Key");
  if (!key || key.length > 128) return { error: mockError(422) };
  const scope = `${actor().memberId}:${kind}:${new URL(request.url).pathname}:${key}`;
  const serialized = JSON.stringify(body);
  const saved = payments.idempotency.get(scope);
  if (saved) {
    if (saved.body !== serialized) return { error: mockError(409) };
    const item =
      kind === "beneficiary"
        ? payments.beneficiaries.find((x) => x.id === saved.id)
        : kind === "payout"
          ? payments.payouts.find((x) => x.id === saved.id)
          : payments.cards.find((x) => x.id === saved.id);
    return { error: item ? json(item) : mockError(409) };
  }
  return {
    save: (id: string) =>
      payments.idempotency.set(scope, { body: serialized, id }),
  };
}
const accountFor = (p: Payout) =>
  db.accounts.find((a) => a.id === p.accountId)!;
function release(p: Payout) {
  const a = accountFor(p);
  a.heldMinor = (BigInt(a.heldMinor) - BigInt(p.holdMinor)).toString();
  p.holdMinor = "0";
  a.availableMinor = (BigInt(a.ledgerMinor) - BigInt(a.heldMinor)).toString();
}
export function payoutHolds(accountId: string) {
  return payments.payouts
    .filter((p) => p.accountId === accountId && BigInt(p.holdMinor) > 0n)
    .map((p) => ({
      reference: p.id,
      amountMinor: p.holdMinor,
      reason:
        p.status === "Pending confirmation"
          ? "Outcome unresolved; original hold retained"
          : "Reserved pending payment mandate",
      status:
        p.status === "Pending confirmation"
          ? ("Pending confirmation" as const)
          : ("Reserved" as const),
    }));
}
export const paymentHandlers = [
  http.post("*/api/__mock/cards/:id/details", async ({ params }) => {
    const e = await writeGuard("cards:reveal");
    if (e) return e;
    const c = payments.cards.find((c) => c.id === params.id);
    if (!c) return mockError(404);
    if (!["Active", "Frozen", "Preview"].includes(c.status))
      return mockError(409);
    return HttpResponse.json(
      {
        number: `0000 0000 0000 ${c.last4 ?? "0000"}`,
        cvv: "000",
        expiry: "12/30",
        simulated: true,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }),
  http.get("*/api/beneficiaries", async ({ request }) => {
    const e = await guard("payments:read");
    return e ?? page(payments.beneficiaries, request);
  }),
  http.post("*/api/beneficiaries", async ({ request }) => {
    const e = await writeGuard("payments:write");
    if (e) return e;
    const v = beneficiaryInput.safeParse(await request.json());
    if (!v.success) return mockError(422);
    const fingerprint = Array.from(
      new Uint8Array(
        await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(v.data.destination),
        ),
      ),
    )
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("");
    const k = idem(
      request,
      { ...v.data, destination: fingerprint },
      "beneficiary",
    );
    if (k.error) return k.error;
    // Destination is transient; mock fixture stores a mask, never the full account/mobile.
    const { destination, ...fields } = v.data;
    const b = {
      ...fields,
      id: `BEN-MOCK-${payments.next++}`,
      version: 1,
      maskedDestination: `•••• ${destination.slice(-4)}`,
      currency: "KES" as const,
      status: "Active" as const,
      verification: "Mock only" as const,
    };
    payments.beneficiaries.unshift(b);
    k.save!(b.id);
    record(db.role, `${b.id}: Beneficiary saved (mock verification only)`);
    return json(b);
  }),
  http.post("*/api/beneficiaries/:id/archive", async ({ params, request }) => {
    const e = await writeGuard("payments:write");
    if (e) return e;
    const v = versionInput.safeParse(await request.json());
    const b = payments.beneficiaries.find((x) => x.id === params.id);
    if (!b) return mockError(404);
    if (!v.success) return mockError(422);
    if (b.version !== v.data.version || b.status !== "Active")
      return mockError(409);
    b.status = "Archived";
    b.version++;
    record(db.role, `${b.id}: Beneficiary archived`);
    return json(b);
  }),
  http.get("*/api/payments", async ({ request }) => {
    const e = await guard("payments:read");
    return e ?? page(payments.payouts, request);
  }),
  http.get("*/api/payments/:id", async ({ params }) => {
    const e = await guard("payments:read");
    if (e) return e;
    const p = payments.payouts.find((p) => p.id === params.id);
    return p ? json(p) : mockError(404);
  }),
  http.post("*/api/payments", async ({ request }) => {
    const e = await writeGuard("payments:write");
    if (e) return e;
    const v = payoutInput.safeParse(await request.json());
    if (!v.success) return mockError(422);
    const k = idem(request, v.data, "payout");
    if (k.error) return k.error;
    const a = db.accounts.find((a) => a.id === v.data.accountId);
    const b = payments.beneficiaries.find(
      (b) => b.id === v.data.beneficiaryId && b.status === "Active",
    );
    if (!a || !b) return mockError(404);
    if (a.status !== "Active" || a.currency !== "KES") return mockError(422);
    const p: Payout = {
      ...freshness(),
      ...v.data,
      id: `PAY-MOCK-F6-${payments.next++}`,
      version: 1,
      beneficiary: structuredClone(b),
      feeMinor: "0",
      currency: "KES",
      status: "Draft",
      makerId: actor().memberId,
      makerName: actor().name,
      approverId: null,
      approverName: null,
      executorId: null,
      holdMinor: "0",
      transactionId: null,
      events: [event("Payment draft created")],
    };
    payments.payouts.unshift(p);
    k.save!(p.id);
    record(db.role, `${p.id}: Draft created`);
    return json(p);
  }),
  http.post("*/api/payments/:id/:action", async ({ params, request }) => {
    const action = String(params.action);
    const permission: Permission =
      action === "approve" || action === "reject"
        ? "payments:approve"
        : action === "execute"
          ? "payments:execute"
          : action === "inquiry"
            ? "payments:read"
            : "payments:write";
    const e = await writeGuard(permission);
    if (e) return e;
    const p = payments.payouts.find((p) => p.id === params.id);
    if (!p) return mockError(404);
    if (action === "edit") {
      const v = payoutInput
        .extend({ version: z.number().int().positive() })
        .safeParse(await request.json());
      if (!v.success) return mockError(422);
      const k = idem(request, v.data, "payout");
      if (k.error) return k.error;
      if (
        p.status !== "Draft" ||
        p.makerId !== actor().memberId ||
        p.version !== v.data.version
      )
        return mockError(409);
      const a = db.accounts.find(
        (a) =>
          a.id === v.data.accountId &&
          a.currency === "KES" &&
          a.status === "Active",
      );
      const b = payments.beneficiaries.find(
        (b) => b.id === v.data.beneficiaryId && b.status === "Active",
      );
      if (!a || !b) return mockError(422);
      p.accountId = a.id;
      p.beneficiary = structuredClone(b);
      p.amountMinor = v.data.amountMinor;
      p.reference = v.data.reference;
      changed(p, "Draft edited before submission");
      k.save!(p.id);
      return json(p);
    }
    const v = versionInput
      .extend({ note: z.string().trim().max(200).optional() })
      .safeParse(await request.json());
    if (!v.success) return mockError(422);
    const k = idem(request, { action, ...v.data }, "payout");
    if (k.error) return k.error;
    if (p.version !== v.data.version) return mockError(409);
    const a = accountFor(p);
    if (!a) return mockError(404);
    const member = actor().memberId;
    if (action === "submit") {
      if (p.status !== "Draft" || p.makerId !== member) return mockError(409);
      if (
        a.status !== "Active" ||
        BigInt(a.availableMinor) < BigInt(p.amountMinor) ||
        !payments.beneficiaries.some(
          (b) => b.id === p.beneficiary.id && b.status === "Active",
        )
      )
        return mockError(409);
      p.holdMinor = p.amountMinor;
      a.heldMinor = (BigInt(a.heldMinor) + BigInt(p.holdMinor)).toString();
      a.availableMinor = (
        BigInt(a.ledgerMinor) - BigInt(a.heldMinor)
      ).toString();
      p.status = "Awaiting approval";
      changed(p, "Submitted; funds reserved");
    } else if (action === "approve" || action === "reject") {
      if (p.makerId === member) return mockError(403);
      if (p.status !== "Awaiting approval") return mockError(409);
      if (action === "reject" && !v.data.note) return mockError(422);
      p.approverId = member;
      p.approverName = actor().name;
      if (action === "reject") {
        release(p);
        p.status = "Rejected";
        changed(p, `Rejected: ${v.data.note}`);
      } else {
        p.status = "Approved";
        changed(p, "Approved; execution still required");
      }
    } else if (action === "cancel") {
      if (
        p.makerId !== member ||
        !["Draft", "Awaiting approval", "Approved"].includes(p.status)
      )
        return mockError(409);
      release(p);
      p.status = "Cancelled";
      changed(p, "Cancelled before execution");
    } else if (action === "execute") {
      if (
        p.status !== "Approved" ||
        p.approverId === p.makerId ||
        !p.approverId
      )
        return mockError(409);
      const approver = business.team.members.find((m) => m.id === p.approverId);
      if (
        a.status !== "Active" ||
        !approver ||
        approver.status !== "Active" ||
        !["admin", "finance"].includes(approver.role) ||
        !payments.beneficiaries.some(
          (b) => b.id === p.beneficiary.id && b.status === "Active",
        )
      )
        return mockError(409);
      p.status = "Pending confirmation";
      p.executorId = member;
      p.transactionId = `TXN-${p.id}`;
      db.transactions.unshift({
        id: p.transactionId,
        accountId: a.id,
        counterparty: p.beneficiary.name,
        category: "Supplier disbursement",
        rail: p.beneficiary.rail,
        date: fixedDate,
        amountMinor: `-${p.amountMinor}`,
        currency: p.currency,
        status: "Pending confirmation",
      });
      changed(p, "Dispatched to simulated rail; awaiting confirmation");
    } else if (action === "inquiry") {
      if (p.status !== "Pending confirmation") return mockError(409);
      const outcome = payments.outcomes[p.id] ?? "pending";
      const t = db.transactions.find((t) => t.id === p.transactionId)!;
      if (outcome === "confirmed") {
        a.ledgerMinor = (
          BigInt(a.ledgerMinor) - BigInt(p.amountMinor)
        ).toString();
        release(p);
        p.status = "Completed";
        t.status = "Completed";
        changed(p, "Confirmed; ledger debit posted once");
      } else if (outcome === "failed") {
        release(p);
        p.status = "Failed";
        t.status = "Failed";
        changed(p, "Definitive failure; reservation released");
      } else
        changed(p, "Inquiry unresolved; original reference and hold retained");
    } else return mockError(404);
    k.save!(p.id);
    return json(p);
  }),
  http.post("*/api/__mock/payouts/:id/outcome", async ({ params, request }) => {
    const e = await guard("payments:execute");
    if (e) return e;
    const v = z
      .object({ outcome: z.enum(["pending", "confirmed", "failed"]) })
      .safeParse(await request.json());
    const p = payments.payouts.find((p) => p.id === params.id);
    if (!p) return mockError(404);
    if (!v.success) return mockError(422);
    if (p.status !== "Pending confirmation") return mockError(409);
    payments.outcomes[p.id] = v.data.outcome;
    return HttpResponse.json({ ok: true });
  }),
  http.get("*/api/cards", async () => {
    const e = await guard("banking:read");
    return e ?? json({ items: db.scenario === "empty" ? [] : payments.cards });
  }),
  http.get("*/api/cards/:id/activity", async ({ params }) => {
    const e = await guard("banking:read");
    if (e) return e;
    const c = payments.cards.find((c) => c.id === params.id);
    if (!c) return mockError(404);
    return json({
      items:
        c.id === "CARD-MOCK-001"
          ? [
              {
                id: "CA-MOCK-001",
                merchant: "Demo cloud services",
                amountMinor: "64280000",
                currency: "KES",
                status: "Completed",
                at: fixedDate,
              },
              {
                id: "CA-MOCK-002",
                merchant: "Demo online merchant",
                amountMinor: "80000000",
                currency: "KES",
                status: "Declined",
                at: fixedDate,
              },
            ]
          : c.id === "CARD-MOCK-002"
            ? [
                {
                  id: "CA-MOCK-003",
                  merchant: "Demo software supplier",
                  amountMinor: "31245000",
                  currency: "KES",
                  status: "Completed",
                  at: fixedDate,
                },
              ]
            : [],
    });
  }),
  http.get("*/api/cards/:id", async ({ params }) => {
    const e = await guard("banking:read");
    if (e) return e;
    const c = payments.cards.find((c) => c.id === params.id);
    return c ? json(c) : mockError(404);
  }),
  http.post("*/api/cards/requests", async ({ request }) => {
    const e = await writeGuard("cards:manage");
    if (e) return e;
    const v = cardRequestInput.safeParse(await request.json());
    if (!v.success) return mockError(422);
    const k = idem(request, v.data, "card");
    if (k.error) return k.error;
    const a = db.accounts.find(
      (a) =>
        a.id === v.data.accountId &&
        a.currency === "KES" &&
        a.status === "Active",
    );
    const holder = business.team.members.find(
      (m) => m.id === v.data.holderId && m.status === "Active",
    );
    if (!a || !holder) return mockError(422);
    const c: BusinessCard = {
      ...freshness(),
      ...v.data,
      id: `CARD-MOCK-F6-${payments.next++}`,
      version: 1,
      kind: "Debit",
      last4: null,
      currency: "KES",
      holderName: holder.name,
      businessName: business.profile.values.displayName,
      status: "Pending approval",
      spentMinor: "0",
      makerId: actor().memberId,
      approverId: null,
      replacementOf: null,
      events: [event("Card request submitted; no card issued")],
    };
    payments.cards.unshift(c);
    k.save!(c.id);
    record(db.role, `${c.id}: Card request submitted`);
    return json(c);
  }),
  http.post("*/api/cards/:id/:action", async ({ params, request }) => {
    const e = await writeGuard("cards:manage");
    if (e) return e;
    const c = payments.cards.find((c) => c.id === params.id);
    if (!c) return mockError(404);
    if (c.kind === "Credit") return mockError(403);
    const action = String(params.action);
    const v = versionInput
      .extend({ limits: cardLimits.optional() })
      .safeParse(await request.json());
    if (!v.success) return mockError(422);
    const k = idem(request, { action, ...v.data }, "card");
    if (k.error) return k.error;
    if (c.version !== v.data.version) return mockError(409);
    if (action === "approve" || action === "reject") {
      if (c.makerId === actor().memberId) return mockError(403);
      if (c.status !== "Pending approval") return mockError(409);
      c.approverId = actor().memberId;
      c.status = action === "approve" ? "Approved for issuance" : "Rejected";
      changed(
        c,
        action === "approve"
          ? "Request approved; issuer confirmation required"
          : "Request rejected",
      );
    } else if (action === "freeze" || action === "unfreeze") {
      if (c.status !== (action === "freeze" ? "Active" : "Frozen"))
        return mockError(409);
      c.status = action === "freeze" ? "Frozen" : "Active";
      changed(
        c,
        action === "freeze"
          ? "Card frozen in mock policy"
          : "Card unfrozen in mock policy",
      );
    } else if (action === "controls") {
      if (
        !["Active", "Frozen"].includes(c.status) ||
        !v.data.limits ||
        BigInt(v.data.limits.monthlyMinor) < BigInt(c.spentMinor)
      )
        return mockError(409);
      c.limits = v.data.limits;
      changed(c, "Spending controls updated");
    } else if (action === "replace") {
      if (
        !["Active", "Frozen"].includes(c.status) ||
        payments.cards.some(
          (x) => x.replacementOf === c.id && x.status !== "Rejected",
        )
      )
        return mockError(409);
      c.status = "Frozen";
      changed(c, "Original frozen; replacement requested");
      const replacement: BusinessCard = {
        ...structuredClone(c),
        id: `CARD-MOCK-F6-${payments.next++}`,
        version: 1,
        last4: null,
        status: "Pending approval",
        spentMinor: "0",
        makerId: actor().memberId,
        approverId: null,
        replacementOf: c.id,
        events: [event(`Replacement requested for ${c.id}`)],
      };
      payments.cards.unshift(replacement);
      k.save!(replacement.id);
      return json(replacement);
    } else return mockError(404);
    k.save!(c.id);
    return json(c);
  }),
  http.post("*/api/__mock/cards/:id/issue", async ({ params }) => {
    const e = await guard("cards:manage");
    if (e) return e;
    const c = payments.cards.find((c) => c.id === params.id);
    if (!c) return mockError(404);
    if (c.status !== "Approved for issuance" || c.kind !== "Debit")
      return mockError(409);
    const holder = business.team.members.find((m) => m.id === c.holderId);
    const approver = business.team.members.find((m) => m.id === c.approverId);
    if (
      !db.accounts.some(
        (a) =>
          a.id === c.accountId && a.status === "Active" && a.currency === "KES",
      ) ||
      holder?.status !== "Active" ||
      approver?.status !== "Active" ||
      !["admin", "finance"].includes(approver.role)
    )
      return mockError(409);
    c.status = "Active";
    c.last4 = String(6000 + payments.next++).slice(-4);
    changed(c, "Simulated issuer confirmation; masked card activated");
    return json(c);
  }),
];
