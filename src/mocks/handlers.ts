import { documentHandlers } from "./documentHandlers";
import { enterpriseHandlers } from "./enterpriseHandlers";
import { identityHandlers } from "./identityHandlers";
import { hasMockSession } from "./identityStore";
import { platformHandlers } from "./platformHandlers";
import { paymentHandlers, payoutHolds } from "./paymentHandlers";
import { payments } from "./paymentStore";
import { collectionHandlers } from "./collectionHandlers";
import { billingHandlers } from "./billingHandlers";
import { billing } from "./billingStore";
import { actorPermissions, actorSession, currentMember } from "./businessStore";
import { businessHandlers, applyBusinessScenario } from "./businessHandlers";
import type { Permission } from "../api/contracts";
import { http, HttpResponse, delay } from "msw";
import { z } from "zod";
import { db, fixedDate, reset } from "./store";
import { scenarioSchema, roleSchema } from "../api/contracts";
import {
  defaultFilters,
  transactionFiltersSchema,
  dayInNairobi,
} from "../domain/filters";
import {
  statementFormSchema,
  makeStatementCsv,
  statementRows,
} from "../domain/statements";
import {
  freshness,
  visibleTransactions,
  selectTransactions,
  movement,
  cashflow,
} from "./selectors";
const failure = () =>
  db.scenario === "expired"
    ? 401
    : db.scenario === "denied"
      ? 403
      : db.scenario === "unavailable"
        ? 503
        : 0;
export function mockError(status: number) {
  return HttpResponse.json(
    { error: { code: `MOCK_${status}`, message: "Simulated API failure" } },
    { status, headers: { "X-Request-Id": "mock-request-001" } },
  );
}
export async function guard(permission: Permission = "banking:read") {
  await delay(200);
  if (!hasMockSession()) return mockError(401);
  const status = failure();
  if (status) return mockError(status);
  if (currentMember(db.role)?.status !== "Active") return mockError(401);
  return actorPermissions(db.role).includes(permission)
    ? undefined
    : mockError(403);
}
const canExport = () => actorPermissions(db.role).includes("statements:create");
export const handlers = [
  ...documentHandlers,
  ...enterpriseHandlers,
  ...identityHandlers,
  ...platformHandlers,
  ...paymentHandlers,
  ...businessHandlers,
  ...billingHandlers,
  ...collectionHandlers,
  http.get("*/api/session", async () => {
    await delay(100);
    if (!hasMockSession() || db.scenario === "expired") return mockError(401);
    if (currentMember(db.role)?.status !== "Active") return mockError(401);
    return HttpResponse.json(actorSession(db.role));
  }),
  http.get("*/api/business/overview", async () => {
    const e = await guard();
    if (e) return e;
    const monthly = movement(
      visibleTransactions().filter(
        (t) =>
          t.currency === "KES" && dayInNairobi(t.date).startsWith("2026-10"),
      ),
    );
    const empty = db.scenario === "empty";
    return HttpResponse.json({
      ...freshness(),
      accounts: empty ? [] : db.accounts,
      incomingMinor: monthly.incoming.toString(),
      outgoingMinor: monthly.outgoing.toString(),
      receivableMinor: empty
        ? "0"
        : billing.documents
            .filter((d) => d.kind === "invoices" && d.values.currency === "KES")
            .reduce((n, d) => n + BigInt(d.outstandingMinor), 0n)
            .toString(),
      unpaidCount: empty
        ? 0
        : billing.documents.filter(
            (d) =>
              d.kind === "invoices" &&
              d.values.currency === "KES" &&
              BigInt(d.outstandingMinor) > 0n,
          ).length,
      overdueCount: empty
        ? 0
        : billing.documents.filter(
            (d) =>
              d.kind === "invoices" &&
              d.values.currency === "KES" &&
              d.values.until < fixedDate.slice(0, 10) &&
              BigInt(d.outstandingMinor) > 0n,
          ).length,
      recent: visibleTransactions().slice(0, 6),
      cashflow: cashflow(),
      overdue: empty
        ? []
        : billing.documents
            .filter(
              (d) =>
                d.kind === "invoices" &&
                d.values.currency === "KES" &&
                d.values.until < fixedDate.slice(0, 10) &&
                BigInt(d.outstandingMinor) > 0n,
            )
            .map((d) => ({
              name: d.customer.name,
              amountMinor: d.outstandingMinor,
              days: Math.floor(
                (Date.parse(fixedDate.slice(0, 10)) -
                  Date.parse(d.values.until)) /
                  86400000,
              ),
            })),
      pendingApprovals: empty
        ? []
        : payments.payouts
            .filter((p) => p.status === "Awaiting approval")
            .map((p) => ({
              reference: p.id,
              name: p.beneficiary.name,
              amountMinor: p.amountMinor,
              currency: p.currency,
            })),
    });
  }),
  http.get("*/api/accounts", async () => {
    const e = await guard();
    return (
      e ??
      HttpResponse.json({
        ...freshness(),
        items: db.scenario === "empty" ? [] : db.accounts,
      })
    );
  }),
  http.get("*/api/accounts/:id", async ({ params }) => {
    const e = await guard();
    if (e) return e;
    const account =
      db.scenario === "empty"
        ? undefined
        : db.accounts.find((a) => a.id === params.id);
    if (!account) return mockError(404);
    return HttpResponse.json({
      ...freshness(),
      account,
      holds: [
        ...payoutHolds(account.id),
        ...(account.heldMinor === "0"
          ? []
          : account.id === "acc_kes"
            ? [
                {
                  reference: "TXN-90234",
                  amountMinor: "12540000",
                  reason:
                    "Payment outcome unresolved. Hold retained pending inquiry.",
                  status: "Pending confirmation",
                },
                {
                  reference: "PAY-MOCK-015",
                  amountMinor: "15205000",
                  reason: "Reserved for authorized payment",
                  status: "Reserved",
                },
              ]
            : account.id === "acc_usd"
              ? [
                  {
                    reference: "PAY-MOCK-USD-001",
                    amountMinor: "40000",
                    reason: "Authorized settlement reservation",
                    status: "Reserved",
                  },
                ]
              : []),
      ],
      dailyLimitMinor: account.currency === "KES" ? "1000000000" : "1000000",
      monthlyLimitMinor: account.currency === "KES" ? "5000000000" : "5000000",
      mandate:
        "Mock mandate: every new F6 payment requires a different active approver. Approval is separate from execution. Limits and fees await backend confirmation.",
    });
  }),
  http.get("*/api/transactions", async ({ request }) => {
    const e = await guard();
    if (e) return e;
    const values = Object.fromEntries(new URL(request.url).searchParams);
    const parsed = transactionFiltersSchema.safeParse({
      ...defaultFilters,
      ...values,
    });
    if (!parsed.success) return mockError(422);
    const filters = parsed.data;
    if (filters.account && !db.accounts.some((a) => a.id === filters.account))
      return mockError(404);
    const filtered = selectTransactions(filters);
    const currencies = new Set(filtered.map((t) => t.currency));
    const currency =
      filters.currency ||
      (filters.account
        ? db.accounts.find((a) => a.id === filters.account)?.currency
        : undefined) ||
      (currencies.size === 1 ? [...currencies][0] : null);
    const sums = currency ? movement(filtered) : { incoming: 0n, outgoing: 0n };
    return HttpResponse.json({
      ...freshness(),
      items: filtered.slice((filters.page - 1) * 6, filters.page * 6),
      total: filtered.length,
      page: filters.page,
      pageSize: 6,
      summary: {
        incomingMinor: sums.incoming.toString(),
        outgoingMinor: sums.outgoing.toString(),
        pendingCount: filtered.filter(
          (t) => t.status === "Pending confirmation",
        ).length,
        failedCount: filtered.filter((t) => t.status === "Failed").length,
        currency,
      },
    });
  }),
  http.get("*/api/transactions/:id", async ({ params }) => {
    const e = await guard();
    if (e) return e;
    const transaction = visibleTransactions().find((t) => t.id === params.id);
    if (!transaction) return mockError(404);
    return HttpResponse.json({
      ...freshness(),
      transaction,
      ledgerImpactMinor:
        transaction.status === "Completed" ? transaction.amountMinor : "0",
      reference: transaction.id,
      events: [
        {
          label: "Request recorded",
          detail: "Original reference preserved",
          at: transaction.date,
          status: "Completed",
        },
        {
          label:
            transaction.status === "Completed"
              ? "Ledger posting confirmed"
              : transaction.status === "Failed"
                ? "Payment failed"
                : "Awaiting confirmation",
          detail:
            transaction.status === "Pending confirmation"
              ? "Outcome is unresolved. Do not submit a duplicate payment."
              : transaction.status === "Failed"
                ? "No ledger movement has been posted."
                : "Confirmed ledger movement recorded.",
          at: transaction.date,
          status: transaction.status,
        },
      ],
    });
  }),
  http.post("*/api/statements", async ({ request }) => {
    const e = await guard();
    if (e) return e;
    if (!canExport()) return mockError(403);
    const data = statementFormSchema.safeParse(await request.json());
    if (!data.success || data.data.to > dayInNairobi(fixedDate))
      return mockError(422);
    const key = request.headers.get("Idempotency-Key");
    if (!key || key.length > 128) return mockError(422);
    const serialized = JSON.stringify(data.data);
    const existing = db.idempotency.get(key);
    if (existing)
      return existing.body === serialized
        ? HttpResponse.json(db.statements.get(existing.id)!.value)
        : mockError(409);
    const account =
      db.scenario === "empty"
        ? undefined
        : db.accounts.find((a) => a.id === data.data.accountId);
    if (!account) return mockError(404);
    const id = `STMT-${String(db.nextStatementId++).padStart(4, "0")}`;
    const value = {
      ...data.data,
      id,
      currency: account.currency,
      status: "Queued" as const,
      attempt: 1,
      createdAt: fixedDate,
      expiresAt: null,
      errorCode: null,
      rowCount: null,
    };
    db.statements.set(id, {
      value,
      polls: 0,
      failOnce: db.scenario === "export-failure",
      csv: makeStatementCsv(account, visibleTransactions(), data.data),
      rowCount: statementRows(visibleTransactions(), data.data).length,
    });
    db.idempotency.set(key, { body: serialized, id });
    return HttpResponse.json(value, { status: 202 });
  }),
  http.get("*/api/statements", async () => {
    const e = await guard();
    return (
      e ??
      HttpResponse.json({
        ...freshness(),
        items: [...db.statements.values()].map((j) => j.value).reverse(),
      })
    );
  }),
  http.get("*/api/statements/:id", async ({ params }) => {
    const e = await guard();
    if (e) return e;
    const job = db.statements.get(String(params.id));
    if (!job) return mockError(404);
    if (job.value.status === "Queued" || job.value.status === "Generating") {
      job.polls++;
      if (job.polls === 1) job.value.status = "Generating";
      else if (job.failOnce) {
        job.failOnce = false;
        job.value.status = "Failed";
        job.value.errorCode = "GENERATION_FAILED";
      } else {
        job.value.status =
          db.scenario === "export-expired" ? "Expired" : "Ready";
        job.value.expiresAt =
          db.scenario === "export-expired"
            ? "2026-10-20T08:00:00.000Z"
            : "2026-10-22T08:00:00.000Z";
        job.value.rowCount = job.rowCount;
      }
    }
    return HttpResponse.json(job.value);
  }),
  http.post("*/api/statements/:id/retry", async ({ params }) => {
    const e = await guard();
    if (e) return e;
    if (!canExport()) return mockError(403);
    const job = db.statements.get(String(params.id));
    if (!job) return mockError(404);
    if (job.value.status !== "Failed") return mockError(409);
    job.value.status = "Queued";
    job.value.errorCode = null;
    job.value.attempt++;
    job.polls = 0;
    return HttpResponse.json(job.value, { status: 202 });
  }),
  http.get("*/api/statements/:id/download", async ({ params }) => {
    const e = await guard();
    if (e) return e;
    if (!canExport()) return mockError(403);
    const job = db.statements.get(String(params.id));
    if (!job) return mockError(404);
    if (job.value.status === "Expired") return mockError(410);
    if (job.value.status !== "Ready") return mockError(409);
    return new HttpResponse(job.csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${job.value.id}.csv"`,
      },
    });
  }),
  http.post("*/api/__mock/reset", () => {
    reset();
    return HttpResponse.json({ ok: true });
  }),
  http.post("*/api/__mock/scenario", async ({ request }) => {
    const data = z
      .object({ scenario: scenarioSchema, role: roleSchema })
      .safeParse(await request.json());
    if (!data.success) return mockError(422);
    db.scenario = data.data.scenario;
    db.role = data.data.role;
    db.memberId = null;
    applyBusinessScenario(data.data.scenario);
    return HttpResponse.json({ ok: true });
  }),
];
