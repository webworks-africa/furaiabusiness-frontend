import { z } from "zod";
// Proposed v2 contracts. Awaiting backend confirmation; no supplied OpenAPI contract.
export const permissionSchema = z.enum([
  "banking:read",
  "payments:read",
  "payments:write",
  "payments:approve",
  "payments:execute",
  "cards:manage",
  "cards:reveal",
  "billing:read",
  "billing:write",
  "developer:read",
  "developer:manage",
  "developer:credentials",
  "developer:webhooks",
  "developer:production-request",
  "reports:read",
  "reports:export",
  "statements:create",
  "business:read",
  "business:manage",
  "onboarding:write",
  "team:read",
  "team:manage",
  "security:self",
  "security:manage",
]);
export type Permission = z.infer<typeof permissionSchema>;
export const roleSchema = z.enum(["admin", "finance", "developer", "viewer"]);
export type Role = z.infer<typeof roleSchema>;
export const sessionSchema = z.object({
  memberId: z.string(),
  name: z.string(),
  business: z.string(),
  permissions: z.array(permissionSchema),
  role: roleSchema,
});
const minor = z.string().regex(/^-?\d+$/);
const currency = z.enum(["KES", "USD"]);
export const freshnessSchema = z.object({
  asOf: z.string().datetime(),
  stale: z.boolean(),
});
export const accountSchema = z.object({
  id: z.string(),
  name: z.string(),
  currency,
  maskedNumber: z.string(),
  ledgerMinor: minor,
  heldMinor: minor,
  availableMinor: minor,
  status: z.enum(["Active", "Restricted"]),
});
export const accountListSchema = freshnessSchema.extend({
  items: z.array(accountSchema),
});
export const transactionSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  counterparty: z.string(),
  category: z.string(),
  rail: z.string(),
  date: z.string().datetime(),
  amountMinor: minor,
  currency,
  status: z.enum(["Completed", "Pending confirmation", "Failed"]),
});
export const transactionDetailSchema = freshnessSchema.extend({
  transaction: transactionSchema,
  ledgerImpactMinor: minor,
  reference: z.string(),
  events: z.array(
    z.object({
      label: z.string(),
      detail: z.string(),
      at: z.string().datetime(),
      status: z.enum(["Completed", "Pending confirmation", "Failed"]),
    }),
  ),
});
export const accountDetailSchema = freshnessSchema.extend({
  account: accountSchema,
  holds: z.array(
    z.object({
      reference: z.string(),
      amountMinor: minor,
      reason: z.string(),
      status: z.enum(["Reserved", "Pending confirmation"]),
    }),
  ),
  dailyLimitMinor: minor,
  monthlyLimitMinor: minor,
  mandate: z.string(),
});
export const overviewSchema = freshnessSchema.extend({
  accounts: z.array(accountSchema),
  incomingMinor: minor,
  outgoingMinor: minor,
  receivableMinor: minor,
  unpaidCount: z.number().int(),
  overdueCount: z.number().int(),
  recent: z.array(transactionSchema),
  cashflow: z.array(
    z.object({ month: z.string(), incomingMinor: minor, outgoingMinor: minor }),
  ),
  overdue: z.array(
    z.object({ name: z.string(), amountMinor: minor, days: z.number().int() }),
  ),
  pendingApprovals: z.array(
    z.object({
      reference: z.string(),
      name: z.string(),
      amountMinor: minor,
      currency,
    }),
  ),
});
export type Account = z.infer<typeof accountSchema>;
export type Transaction = z.infer<typeof transactionSchema>;
export const transactionPageSchema = freshnessSchema.extend({
  items: z.array(transactionSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  summary: z.object({
    incomingMinor: minor,
    outgoingMinor: minor,
    pendingCount: z.number().int(),
    failedCount: z.number().int(),
    currency: currency.nullable(),
  }),
});
export const scenarioSchema = z.enum([
  "normal",
  "empty",
  "unavailable",
  "stale",
  "expired",
  "denied",
  "export-failure",
  "export-expired",
  "upload-failure",
  "onboarding-changes",
  "onboarding-approved",
  "onboarding-rejected",
  "invitation-expired",
  "invitation-accepted",
  "account-provisioned",
  "no-developer-access",
]);
export type Scenario = z.infer<typeof scenarioSchema>;
export const statementRequestSchema = z.object({
  accountId: z.string().min(1, "Select an account"),
  from: z.string(),
  to: z.string(),
  format: z.literal("csv"),
  includeUnresolved: z.boolean(),
});
export const statementJobSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  currency,
  from: z.string(),
  to: z.string(),
  format: z.literal("csv"),
  includeUnresolved: z.boolean(),
  status: z.enum(["Queued", "Generating", "Ready", "Failed", "Expired"]),
  attempt: z.number().int(),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime().nullable(),
  errorCode: z.string().nullable(),
  rowCount: z.number().int().nullable(),
});
export const statementListSchema = freshnessSchema.extend({
  items: z.array(statementJobSchema),
});
export type StatementJob = z.infer<typeof statementJobSchema>;
export type StatementRequest = z.infer<typeof statementRequestSchema>;
