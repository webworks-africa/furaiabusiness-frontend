import { http, HttpResponse, delay } from "msw";
import { z } from "zod";
import { enterprise as e } from "./enterpriseStore";
import { guard, mockError } from "./handlers";
import { db, fixedDate, reset } from "./store";
import { actorSession, business, record } from "./businessStore";
import { payments } from "./paymentStore";
import { billing } from "./billingStore";
import { collections } from "./collectionStore";
import { freshness } from "./selectors";
import { calculate } from "../domain/billing";
import { loanSchedule } from "../domain/loans";
import {
  brandingSchema,
  mandateSchema,
  orderInput,
  supplierInput,
  lpoInput,
  employeeInput,
  terminalInput,
  loanInput,
  registrationSchema,
} from "../api/enterpriseContracts";
import type { Order } from "../api/enterpriseContracts";
import type { Permission } from "../api/contracts";
const id = (prefix: string) => `${prefix}-${e.next++}`;
const actor = () => actorSession(db.role);
const approvers = () =>
  business.team.members.filter(
    (m) => m.status === "Active" && ["admin", "finance"].includes(m.role),
  );
const json = (data: unknown) =>
  HttpResponse.json(data as object, {
    headers: { "Cache-Control": "no-store" },
  });
function workspace() {
  return {
    ...freshness(),
    mandate: e.mandate,
    branding: e.branding,
    orders: e.orders,
    suppliers: e.suppliers,
    lpos: e.lpos,
    employees: e.employees,
    payroll: e.payroll,
    terminals: e.terminals,
    sales: e.sales,
    loans: e.loans,
    approvers: approvers().map((m) => ({ id: m.id, name: m.name })),
  };
}
const version = z.object({ version: z.number().int().positive() });
const amount = z
  .string()
  .regex(/^\d{1,16}$/)
  .refine((v) => /^\d+$/.test(v) && BigInt(v) > 0n);
const changed = (o: Order, label: string) => {
  o.version++;
  o.payout.version++;
  o.payout.events.push({ label, actor: actor().name, at: fixedDate });
  record(db.role, `${o.id}: ${label}`);
};
export function makeOrder(
  v: z.infer<typeof orderInput>,
  linkedType: Order["linkedType"] = "payment",
  linkedId: string | null = null,
) {
  if (payments.payouts.some((p) => p.reference === v.reference))
    throw Error("Original reference already exists");
  if (e.mandate.approvals > approvers().length)
    throw Error("Insufficient active authorizers");
  const a = db.accounts.find(
    (a) =>
      a.id === v.accountId && a.currency === "KES" && a.status === "Active",
  );
  const b = payments.beneficiaries.find(
    (b) => b.id === v.beneficiaryId && b.status === "Active",
  );
  if (!a || !b || BigInt(a.availableMinor) < BigInt(v.amountMinor))
    throw Error("Funds or recipient unavailable");
  const orderId = id("PAY-ORDER");
  const p: Order["payout"] = {
    ...freshness(),
    id: orderId,
    version: 1,
    accountId: a.id,
    beneficiary: structuredClone(b),
    amountMinor: v.amountMinor,
    feeMinor: "0",
    currency: "KES",
    reference: v.reference,
    status: "Awaiting approval",
    makerId: actor().memberId,
    makerName: actor().name,
    approverId: null,
    approverName: null,
    executorId: null,
    holdMinor: v.amountMinor,
    transactionId: null,
    events: [
      {
        label: "Submitted; available funds reserved pending OTP approvals",
        actor: actor().name,
        at: fixedDate,
      },
    ],
  };
  const order: Order = {
    id: orderId,
    version: 1,
    payout: p,
    required: e.mandate.approvals,
    approvals: [],
    outcome: v.outcome,
    linkedType,
    linkedId,
  };
  a.heldMinor = (BigInt(a.heldMinor) + BigInt(v.amountMinor)).toString();
  a.availableMinor = (BigInt(a.ledgerMinor) - BigInt(a.heldMinor)).toString();
  payments.payouts.unshift(p);
  e.orders.unshift(order);
  return order;
}
function release(o: Order) {
  const a = db.accounts.find((a) => a.id === o.payout.accountId)!;
  a.heldMinor = (BigInt(a.heldMinor) - BigInt(o.payout.holdMinor)).toString();
  o.payout.holdMinor = "0";
  a.availableMinor = (BigInt(a.ledgerMinor) - BigInt(a.heldMinor)).toString();
}
function syncLoan(o: Order) {
  if (o.linkedType !== "loan") return;
  const loan = e.loans.find((l) => l.id === o.linkedId);
  if (loan)
    loan.status =
      o.payout.status === "Completed"
        ? "Active"
        : ["Failed", "Cancelled", "Rejected"].includes(o.payout.status)
          ? "Disbursement failed"
          : "Awaiting disbursement";
}
function settle(o: Order) {
  const p = o.payout;
  if (p.status !== "Pending confirmation") return;
  const a = db.accounts.find((a) => a.id === p.accountId)!;
  const t = db.transactions.find((t) => t.id === p.transactionId)!;
  if (o.outcome === "confirmed") {
    a.ledgerMinor = (BigInt(a.ledgerMinor) - BigInt(p.amountMinor)).toString();
    release(o);
    p.status = "Completed";
    t.status = "Completed";
    changed(o, "Confirmed; account ledger debited once");
  } else if (o.outcome === "failed") {
    release(o);
    p.status = "Failed";
    t.status = "Failed";
    changed(o, "Definitive failure; reservation released");
  } else
    changed(
      o,
      "Pending confirmation; original reference and reservation retained",
    );
  syncLoan(o);
}
function dispatch(o: Order) {
  o.payout.status = "Approved";
  changed(o, "Approval threshold met; execution authorized");
  const a = db.accounts.find((a) => a.id === o.payout.accountId)!;
  o.payout.status = "Pending confirmation";
  o.payout.executorId = actor().memberId;
  o.payout.transactionId = `TXN-${o.id}`;
  db.transactions.unshift({
    id: o.payout.transactionId,
    accountId: a.id,
    counterparty: o.payout.beneficiary.name,
    category:
      o.linkedType === "payroll"
        ? "Payroll"
        : o.linkedType === "loan"
          ? "Loan disbursement"
          : "Outgoing payment",
    rail: o.payout.beneficiary.rail,
    date: fixedDate,
    amountMinor: `-${o.payout.amountMinor}`,
    currency: "KES",
    status: "Pending confirmation",
  });
  changed(o, "Dispatched after OTP authorization");
  settle(o);
}
function postCash(
  accountId: string,
  value: bigint,
  reference: string,
  label: string,
) {
  const a = db.accounts.find(
    (a) => a.id === accountId && a.currency === "KES" && a.status === "Active",
  );
  if (!a) throw Error("Account unavailable");
  a.ledgerMinor = (BigInt(a.ledgerMinor) + value).toString();
  a.availableMinor = (BigInt(a.ledgerMinor) - BigInt(a.heldMinor)).toString();
  db.transactions.unshift({
    id: `TXN-${reference}`,
    accountId,
    counterparty: label,
    category: label,
    rail: "Development simulator",
    date: fixedDate,
    amountMinor: value.toString(),
    currency: "KES",
    status: "Completed",
  });
}
function write<T>(
  path: string,
  permission: Permission,
  schema: z.ZodType<T>,
  action: (
    value: T,
    params: Record<string, string | readonly string[] | undefined>,
  ) => Promise<unknown> | unknown,
) {
  return http.post(`*/api${path}`, async ({ request, params }) => {
    const denied = await guard(permission);
    if (denied) return denied;
    if (db.scenario === "stale") return mockError(409);
    const raw = await request.json().catch(() => null);
    const parsed = schema.safeParse(raw);
    if (!parsed.success) return mockError(422);
    const key = request.headers.get("Idempotency-Key");
    if (!key || key.length > 128) return mockError(422);
    const scope = `${actor().memberId}:${new URL(request.url).pathname}:${key}`;
    const body = JSON.stringify(raw, (key, value) =>
      key === "code" ? "REDACTED" : value,
    );
    const prior = e.idempotency.get(scope);
    if (prior) return prior.body === body ? json(workspace()) : mockError(409);
    try {
      const result = await action(parsed.data, params);
      if (result instanceof Response) return result;
      e.idempotency.set(scope, { body, kind: path, id: "" });
      record(db.role, `${path}: development action completed`);
      return json(result ?? workspace());
    } catch {
      return mockError(409);
    }
  });
}
export const enterpriseHandlers = [
  http.get("*/api/cards/holders", async () => {
    const denied = await guard("cards:manage");
    return (
      denied ??
      json({
        ...freshness(),
        members: business.team.members
          .filter((m) => m.status === "Active")
          .map(({ id, name, status, role }) => ({ id, name, status, role })),
      })
    );
  }),
  http.post(
    "*/api/billing/:kind/:id/appearance",
    async ({ params, request }) => {
      const denied = await guard("billing:write");
      if (denied) return denied;
      if (db.scenario === "stale") return mockError(409);
      const v = z
        .object({
          version: z.number().int(),
          template: z.enum(["classic", "modern", "minimal"]),
        })
        .safeParse(await request.json());
      if (!v.success) return mockError(422);
      const d = billing.documents.find(
        (d) => d.id === params.id && d.kind === params.kind,
      );
      if (!d) return mockError(404);
      if (d.status !== "Draft" || d.version !== v.data.version)
        return mockError(409);
      d.appearance = { template: v.data.template };
      d.version++;
      d.events.push({ label: "Draft appearance changed", at: fixedDate });
      return json(d);
    },
  ),
  http.get("*/api/beneficiaries/options", async () => {
    const denied = await guard("payments:read");
    const items = payments.beneficiaries.filter((b) => b.status === "Active");
    return (
      denied ??
      json({
        ...freshness(),
        items,
        total: items.length,
        page: 1,
        pageSize: items.length || 1,
      })
    );
  }),
  http.get("*/api/business/preferences", async () => {
    const denied = await guard("business:read");
    return (
      denied ??
      json({
        foreignAccounts: e.mandate.foreignAccounts,
        requiredApprovals: e.mandate.approvals,
      })
    );
  }),
  http.get("*/api/business-tools", async () => {
    const denied = await guard("payments:write");
    return (
      denied ??
      json(
        db.scenario === "empty"
          ? {
              ...workspace(),
              orders: [],
              suppliers: [],
              lpos: [],
              employees: [],
              payroll: [],
              terminals: [],
              sales: [],
              loans: [],
            }
          : workspace(),
      )
    );
  }),
  http.get("*/api/business/branding", async () => {
    const denied = await guard("business:read");
    return denied ?? json(e.branding);
  }),
  write("/business/branding", "business:manage", brandingSchema, (v) => {
    if (v.version !== e.branding.version) return mockError(409);
    e.branding = { ...v, version: v.version + 1 };
    return workspace();
  }),
  write("/business/mandate", "business:manage", mandateSchema, (v) => {
    if (v.version !== e.mandate.version || v.approvals > approvers().length)
      return mockError(409);
    e.mandate = { ...v, version: v.version + 1 };
  }),
  write("/payment-orders", "payments:write", orderInput, (v) => {
    if (e.mandate.approvals > approvers().length) return mockError(409);
    makeOrder(v);
  }),
  // Challenges are deliberately outside mutation replay caching and never expose a secret.
  http.post("*/api/payment-orders/:id/challenge", async ({ params }) => {
    const denied = await guard("payments:approve");
    if (denied) return denied;
    const o = e.orders.find((o) => o.id === params.id);
    if (!o) return mockError(404);
    if (
      o.payout.status !== "Awaiting approval" ||
      o.approvals.some((a) => a.memberId === actor().memberId)
    )
      return mockError(409);
    const challengeId = id("OTP");
    const expires = Date.now() + 120000;
    e.challenges.set(challengeId, {
      orderId: o.id,
      memberId: actor().memberId,
      version: o.version,
      expires,
      attempts: 0,
      used: false,
    });
    return json({
      id: challengeId,
      expiresAt: new Date(expires).toISOString(),
      remainingAttempts: 3,
      maskedDestination: "Registered member channel · simulated",
    });
  }),
  write(
    "/payment-orders/:id/approve",
    "payments:approve",
    z.object({
      version: z.number().int(),
      challengeId: z.string(),
      code: z.string().regex(/^\d{6}$/),
    }),
    async (v, params) => {
      const o = e.orders.find((o) => o.id === params.id);
      const c = e.challenges.get(v.challengeId);
      if (
        !o ||
        !c ||
        c.used ||
        c.orderId !== o.id ||
        c.memberId !== actor().memberId ||
        c.version !== o.version ||
        v.version !== o.version ||
        c.expires < Date.now() ||
        c.attempts >= 3 ||
        o.payout.status !== "Awaiting approval"
      )
        return mockError(409);
      if (
        !db.accounts.some(
          (a) => a.id === o.payout.accountId && a.status === "Active",
        ) ||
        !payments.beneficiaries.some(
          (b) => b.id === o.payout.beneficiary.id && b.status === "Active",
        )
      )
        return mockError(409);
      c.attempts++;
      if (v.code !== "246810") return mockError(422);
      if (o.approvals.some((a) => a.memberId === actor().memberId))
        return mockError(403);
      if (
        o.approvals.some(
          (a) =>
            !business.team.members.some(
              (m) =>
                m.id === a.memberId &&
                m.status === "Active" &&
                ["admin", "finance"].includes(m.role),
            ),
        )
      )
        return mockError(409);
      c.used = true;
      o.approvals.push({
        memberId: actor().memberId,
        name: actor().name,
        at: fixedDate,
      });
      o.payout.approverId = actor().memberId;
      o.payout.approverName = actor().name;
      changed(o, "OTP verified; unique member approval recorded");
      if (o.approvals.length >= o.required) {
        await delay(900);
        dispatch(o);
      }
    },
  ),
  write(
    "/payment-orders/:id/inquiry",
    "payments:write",
    version,
    (v, params) => {
      const o = e.orders.find((o) => o.id === params.id);
      if (
        !o ||
        v.version !== o.version ||
        o.payout.status !== "Pending confirmation"
      )
        return mockError(409);
      settle(o);
    },
  ),
  write(
    "/payment-orders/:id/outcome",
    "payments:execute",
    z.object({ outcome: z.enum(["confirmed", "pending", "failed"]) }),
    (v, params) => {
      const o = e.orders.find((o) => o.id === params.id);
      if (!o || o.payout.status !== "Pending confirmation")
        return mockError(409);
      o.outcome = v.outcome;
    },
  ),
  write(
    "/payment-orders/:id/cancel",
    "payments:write",
    version,
    (v, params) => {
      const o = e.orders.find((o) => o.id === params.id);
      if (
        !o ||
        v.version !== o.version ||
        o.payout.makerId !== actor().memberId ||
        o.payout.status !== "Awaiting approval"
      )
        return mockError(409);
      release(o);
      o.payout.status = "Cancelled";
      changed(o, "Cancelled before dispatch; reservation released");
      syncLoan(o);
    },
  ),
  write(
    "/payment-orders/:id/reject",
    "payments:approve",
    version.extend({ reason: z.string().trim().min(3).max(200) }),
    (v, params) => {
      const o = e.orders.find((o) => o.id === params.id);
      if (
        !o ||
        v.version !== o.version ||
        o.payout.status !== "Awaiting approval" ||
        o.payout.makerId === actor().memberId
      )
        return mockError(409);
      release(o);
      o.payout.status = "Rejected";
      changed(o, `Rejected: ${v.reason}`);
      syncLoan(o);
    },
  ),
  write("/suppliers", "payments:write", supplierInput, (v) => {
    if (
      !payments.beneficiaries.some(
        (b) => b.id === v.beneficiaryId && b.status === "Active",
      )
    )
      return mockError(422);
    e.suppliers.unshift({ ...v, id: id("SUP"), version: 1, archived: false });
  }),
  write(
    "/suppliers/:id",
    "payments:write",
    supplierInput.extend({ version: z.number().int() }),
    (v, p) => {
      const s = e.suppliers.find((s) => s.id === p.id);
      if (
        !s ||
        s.archived ||
        s.version !== v.version ||
        !payments.beneficiaries.some(
          (b) => b.id === v.beneficiaryId && b.status === "Active",
        )
      )
        return mockError(409);
      Object.assign(s, v, { version: s.version + 1 });
    },
  ),
  write("/suppliers/:id/archive", "payments:write", version, (v, p) => {
    const s = e.suppliers.find((s) => s.id === p.id);
    if (
      !s ||
      s.version !== v.version ||
      e.lpos.some((l) => l.supplier.id === s.id && l.status === "Draft")
    )
      return mockError(409);
    s.archived = true;
    s.version++;
  }),
  write("/lpos", "payments:write", lpoInput, (v) => {
    const supplier = e.suppliers.find(
      (s) => s.id === v.supplierId && !s.archived,
    );
    if (!supplier) return mockError(422);
    if (
      Number.isNaN(Date.parse(v.date)) ||
      Number.isNaN(Date.parse(v.deliveryDate))
    )
      return mockError(422);
    e.lpos.unshift({
      id: id("LPO"),
      version: 1,
      values: v,
      supplier: structuredClone(supplier),
      totals: calculate(v.lines),
      status: "Draft",
      issuedAt: null,
    });
  }),
  write("/lpos/:id/:action", "payments:write", version, (v, p) => {
    const l = e.lpos.find((l) => l.id === p.id);
    if (!l || l.version !== v.version) return mockError(409);
    if (p.action === "issue" && l.status === "Draft") {
      l.status = "Issued";
      l.issuedAt = fixedDate;
      l.branding = structuredClone(e.branding);
      l.issuerDetails = {
        name: business.profile.values.displayName,
        address: business.profile.values.operatingAddress,
        email: business.profile.values.contactEmail,
        phone: business.profile.values.phone,
      };
    } else if (p.action === "receive" && l.status === "Issued")
      l.status = "Received";
    else if (p.action === "cancel" && l.status === "Draft")
      l.status = "Cancelled";
    else return mockError(409);
    l.version++;
  }),
  write("/employees", "payments:write", employeeInput, (v) => {
    if (
      !payments.beneficiaries.some(
        (b) => b.id === v.beneficiaryId && b.status === "Active",
      )
    )
      return mockError(422);
    if (
      e.employees.some((x) => x.email.toLowerCase() === v.email.toLowerCase())
    )
      return mockError(409);
    e.employees.push({ ...v, id: id("EMP"), version: 1, active: true });
  }),
  write("/employees/:id/archive", "payments:write", version, (v, p) => {
    const employee = e.employees.find((x) => x.id === p.id);
    if (!employee || employee.version !== v.version) return mockError(409);
    employee.active = false;
    employee.version++;
  }),
  write(
    "/payroll",
    "payments:write",
    z.object({
      accountId: z.string(),
      period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
      employeeIds: z
        .array(z.string())
        .min(1)
        .max(50)
        .refine((v) => new Set(v).size === v.length),
    }),
    (v) => {
      if (e.payroll.some((r) => r.period === v.period)) return mockError(409);
      const employees = e.employees.filter(
        (x) => x.active && v.employeeIds.includes(x.id),
      );
      if (
        employees.length !== v.employeeIds.length ||
        employees.some(
          (x) =>
            !payments.beneficiaries.some(
              (b) => b.id === x.beneficiaryId && b.status === "Active",
            ),
        )
      )
        return mockError(422);
      const total = employees.reduce(
        (n, x) => n + BigInt(x.grossMinor) - BigInt(x.deductionMinor),
        0n,
      );
      const a = db.accounts.find(
        (a) =>
          a.id === v.accountId && a.currency === "KES" && a.status === "Active",
      );
      if (!a || BigInt(a.availableMinor) < total) return mockError(409);
      const payrollId = id("PAYROLL");
      const items = employees.map((x) => {
        const net = (
          BigInt(x.grossMinor) - BigInt(x.deductionMinor)
        ).toString();
        const o = makeOrder(
          {
            accountId: a.id,
            beneficiaryId: x.beneficiaryId,
            amountMinor: net,
            reference: `${payrollId} ${x.id}`,
            outcome: "confirmed",
          },
          "payroll",
          payrollId,
        );
        return {
          employeeId: x.id,
          name: x.name,
          grossMinor: x.grossMinor,
          deductionMinor: x.deductionMinor,
          netMinor: net,
          orderId: o.id,
        };
      });
      e.payroll.push({
        id: payrollId,
        period: v.period,
        accountId: a.id,
        items,
        totalMinor: total.toString(),
      });
    },
  ),
  write("/pos/terminals", "payments:write", terminalInput, (v) => {
    if (
      !db.accounts.some(
        (a) =>
          a.id === v.accountId && a.currency === "KES" && a.status === "Active",
      )
    )
      return mockError(422);
    e.terminals.push({ ...v, id: id("POS"), version: 1, status: "Active" });
  }),
  write("/pos/terminals/:id/toggle", "payments:write", version, (v, p) => {
    const t = e.terminals.find((t) => t.id === p.id);
    if (!t || t.version !== v.version) return mockError(409);
    t.status = t.status === "Active" ? "Suspended" : "Active";
    t.version++;
  }),
  write(
    "/pos/sales",
    "payments:write",
    z.object({
      terminalId: z.string(),
      amountMinor: amount,
      reference: z.string().trim().min(3).max(80),
    }),
    (v) => {
      if (
        !e.terminals.some(
          (t) => t.id === v.terminalId && t.status === "Active",
        ) ||
        e.sales.some(
          (s) => s.terminalId === v.terminalId && s.reference === v.reference,
        )
      )
        return mockError(409);
      e.sales.unshift({
        ...v,
        id: id("SALE"),
        status: "Pending confirmation",
        at: fixedDate,
        transactionId: null,
      });
    },
  ),
  write(
    "/pos/sales/:id/outcome",
    "payments:write",
    z.object({ outcome: z.enum(["confirmed", "failed"]) }),
    (v, p) => {
      const sale = e.sales.find((s) => s.id === p.id);
      if (!sale || sale.status !== "Pending confirmation")
        return mockError(409);
      const t = e.terminals.find((t) => t.id === sale.terminalId)!;
      if (v.outcome === "confirmed") {
        postCash(
          t.accountId,
          BigInt(sale.amountMinor),
          sale.id,
          `POS sale ${sale.reference}`,
        );
        sale.transactionId = `TXN-${sale.id}`;
        sale.status = "Confirmed";
      } else sale.status = "Failed";
    },
  ),
  write("/loans", "payments:write", loanInput, (v) => {
    if (
      !db.accounts.some(
        (a) =>
          a.id === v.accountId && a.currency === "KES" && a.status === "Active",
      ) ||
      !billing.contacts.some((c) => c.id === v.borrowerId && !c.archived) ||
      !payments.beneficiaries.some(
        (b) => b.id === v.beneficiaryId && b.status === "Active",
      ) ||
      v.firstDue < fixedDate.slice(0, 10)
    )
      return mockError(422);
    const schedule = loanSchedule(
      v.principalMinor,
      v.monthlyRate,
      v.months,
      v.firstDue,
    );
    e.loans.unshift({
      ...v,
      id: id("LOAN"),
      version: 1,
      status: "Draft",
      orderId: null,
      schedule,
      repayments: [],
      preview: true,
    });
  }),
  write("/loans/:id/issue", "payments:write", version, (v, p) => {
    const l = e.loans.find((l) => l.id === p.id);
    if (!l || l.version !== v.version || l.status !== "Draft")
      return mockError(409);
    const o = makeOrder(
      {
        accountId: l.accountId,
        beneficiaryId: l.beneficiaryId,
        amountMinor: l.principalMinor,
        reference: `${l.id} principal disbursement`,
        outcome: "confirmed",
      },
      "loan",
      l.id,
    );
    l.orderId = o.id;
    l.status = "Awaiting disbursement";
    l.version++;
  }),
  write(
    "/loans/:id/repayments",
    "payments:write",
    z.object({
      amountMinor: amount,
      reference: z.string().trim().min(3).max(80),
      confirmed: z.literal(true),
    }),
    (v, p) => {
      const l = e.loans.find((l) => l.id === p.id);
      if (
        !l ||
        l.status !== "Active" ||
        l.repayments.some((r) => r.reference === v.reference)
      )
        return mockError(409);
      let remaining = BigInt(v.amountMinor);
      const due = l.schedule.reduce(
        (n, s) => n + BigInt(s.totalMinor) - BigInt(s.paidMinor),
        0n,
      );
      if (remaining > due) return mockError(422);
      postCash(
        l.accountId,
        remaining,
        id("LOAN-RCPT"),
        `Loan repayment ${l.id}`,
      );
      for (const s of l.schedule) {
        const amount = BigInt(s.totalMinor) - BigInt(s.paidMinor);
        const applied = amount < remaining ? amount : remaining;
        s.paidMinor = (BigInt(s.paidMinor) + applied).toString();
        remaining -= applied;
      }
      l.repayments.push({
        id: id("REPAY"),
        amountMinor: v.amountMinor,
        at: fixedDate,
        reference: v.reference,
      });
      l.status = l.schedule.every((s) => s.paidMinor === s.totalMinor)
        ? "Repaid"
        : "Active";
      l.version++;
    },
  ),
  http.get("*/api/customers/:id/statement", async ({ params, request }) => {
    const denied = await guard("billing:read");
    if (denied) return denied;
    const contact = billing.contacts.find((c) => c.id === params.id);
    if (!contact) return mockError(404);
    const query = new URL(request.url).searchParams;
    const currency = query.get("currency") ?? "KES";
    if (!["KES", "USD"].includes(currency)) return mockError(422);
    const from = query.get("from") ?? "0000-01-01",
      to = query.get("to") ?? fixedDate.slice(0, 10);
    if (
      from > to ||
      to > fixedDate.slice(0, 10) ||
      ![from, to].every((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    )
      return mockError(422);
    const rows: {
      date: string;
      reference: string;
      kind: string;
      debitMinor: string;
      creditMinor: string;
      invoiceId: string;
      sort: number;
    }[] = [];
    const docs = billing.documents.filter(
      (d) =>
        d.kind === "invoices" &&
        d.snapshot &&
        d.values.contactId === contact.id &&
        d.values.currency === currency,
    );
    for (const d of docs) {
      rows.push({
        date: d.values.date,
        reference: d.id,
        kind: "Invoice",
        debitMinor: d.snapshot!.totals.totalMinor,
        creditMinor: "0",
        invoiceId: d.id,
        sort: 0,
      });
      for (const p of collections.attempts.filter(
        (p) => p.invoiceId === d.id && p.status === "Confirmed",
      ))
        rows.push({
          date: p.receipt!.at.slice(0, 10),
          reference: p.id,
          kind: "Payment",
          debitMinor: "0",
          creditMinor: p.amountMinor,
          invoiceId: d.id,
          sort: 1,
        });
      for (const c of collections.credits.filter((c) => c.invoiceId === d.id))
        rows.push({
          date: c.at.slice(0, 10),
          reference: c.id,
          kind: "Credit note",
          debitMinor: "0",
          creditMinor: c.amountMinor,
          invoiceId: d.id,
          sort: 2,
        });
      for (const f of collections.refunds.filter(
        (f) => f.invoiceId === d.id && f.status === "Confirmed",
      ))
        rows.push({
          date: f.at.slice(0, 10),
          reference: f.id,
          kind: "Refund",
          debitMinor: f.amountMinor,
          creditMinor: "0",
          invoiceId: d.id,
          sort: 3,
        });
    }
    rows.sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        a.sort - b.sort ||
        a.reference.localeCompare(b.reference),
    );
    let balance = 0n;
    let opening = 0n;
    const visible = [];
    for (const row of rows) {
      if (row.date > to) continue;
      balance += BigInt(row.debitMinor) - BigInt(row.creditMinor);
      if (row.date < from) opening = balance;
      else visible.push({ ...row, balanceMinor: balance.toString() });
    }
    return json({
      ...freshness(),
      customer: contact.name,
      currency,
      openingMinor: opening.toString(),
      closingMinor: balance.toString(),
      rows: visible,
    });
  }),
  http.post("*/api/business-registration", async ({ request }) => {
    await delay(400);
    const v = registrationSchema.safeParse(await request.json());
    if (!v.success || v.data.challenge !== "246810") return mockError(422);
    if (e.registration) return mockError(409);
    reset();
    e.registration = { email: v.data.email, name: v.data.name };
    business.profile.legalName = v.data.businessName;
    business.profile.values.displayName = v.data.businessName;
    for (const field of [
      "registrationNumber",
      "taxId",
      "address",
      "city",
      "postalCode",
      "representativeTitle",
      "businessUse",
      "monthlyVolume",
    ] as const)
      business.onboarding.values[field] = "";
    business.profile.values.contactEmail = v.data.email;
    business.profile.values.phone = "+" + v.data.phone;
    business.profile.values.website = "";
    business.profile.values.operatingAddress = "";
    business.onboarding.values.legalName = v.data.businessName;
    business.onboarding.values.representativeName = v.data.name;
    business.onboarding.values.representativeEmail = v.data.email;
    business.onboarding.values.representativePhone = "+" + v.data.phone;
    business.team.members[0].name = v.data.name;
    business.team.members[0].email = v.data.email;
    business.team.members = business.team.members.slice(0, 1);
    business.team.developerSandbox = false;
    business.onboarding.developerSandbox = false;
    business.team.members[0].developerSandbox = false;
    db.accounts = [];
    db.transactions = [];
    billing.contacts = [];
    billing.documents = [];
    payments.beneficiaries = [];
    payments.cards = [];
    return json({ ok: true });
  }),
];
