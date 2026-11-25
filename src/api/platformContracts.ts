import { z } from "zod";
import { freshnessSchema } from "./contracts";
import { dateInput } from "../domain/filters";
// F7 proposed target contracts. No supplied backend/OpenAPI contract exists for these routes.
const minor = z.string().regex(/^-?\d+$/);
export const reportKind = z.enum([
  "cash-movement",
  "receivables-aging",
  "invoice-collection",
]);
export const reportFilters = z
  .object({
    kind: reportKind,
    currency: z.enum(["KES", "USD"]),
    from: dateInput.refine((v) => !!v, "From date is required"),
    to: dateInput.refine((v) => !!v, "To date is required"),
    search: z.string().max(120),
    bucket: z.enum([
      "",
      "Current",
      "1–30 days",
      "31–60 days",
      "61–90 days",
      "90+ days",
    ]),
    page: z.coerce.number().int().min(1).max(10000),
  })
  .refine((v) => v.from <= v.to, {
    path: ["to"],
    message: "From must be before To",
  })
  .refine((v) => (Date.parse(v.to) - Date.parse(v.from)) / 86400000 <= 365, {
    path: ["to"],
    message: "Select at most 366 days",
  });
export type ReportFilters = z.infer<typeof reportFilters>;
export const reportRow = z.object({
  id: z.string(),
  name: z.string(),
  date: z.string(),
  status: z.string(),
  rail: z.string(),
  amountMinor: minor,
  paidMinor: minor,
  creditedMinor: minor,
  outstandingMinor: minor,
  bucket: z.string(),
});
export type ReportRow = z.infer<typeof reportRow>;
export const reportSchema = freshnessSchema.extend({
  kind: reportKind,
  currency: z.enum(["KES", "USD"]),
  from: z.string(),
  to: z.string(),
  items: z.array(reportRow),
  total: z.number().int(),
  page: z.number().int(),
  pages: z.number().int(),
  summary: z.array(z.object({ label: z.string(), minor })),
  excludedUnconfirmed: z.number().int(),
  note: z.string(),
});
export const exportSchema = freshnessSchema.extend({
  id: z.string(),
  kind: reportKind,
  currency: z.enum(["KES", "USD"]),
  from: z.string(),
  to: z.string(),
  status: z.enum(["Queued", "Generating", "Ready", "Failed", "Expired"]),
  attempt: z.number().int(),
  rowCount: z.number().int(),
  createdAt: z.string(),
  error: z.string().nullable(),
});
export type ReportExport = z.infer<typeof exportSchema>;
export const exportsSchema = freshnessSchema.extend({
  items: z.array(exportSchema),
});
export const apiScope = z.enum([
  "accounts:read",
  "transactions:read",
  "invoices:read",
  "payments:read",
]);
export const appInput = z.object({
  name: z.string().trim().min(3).max(80),
  description: z.string().trim().min(10).max(400),
  scopes: z
    .array(apiScope)
    .min(1)
    .max(4)
    .refine((v) => new Set(v).size === v.length, "Do not duplicate scopes"),
});
export const appSchema = appInput.extend({
  id: z.string(),
  version: z.number().int(),
  status: z.enum(["Active", "Suspended"]),
  environment: z.literal("Sandbox"),
  createdAt: z.string(),
});
export type DeveloperApp = z.infer<typeof appSchema>;
export const credentialInput = z.object({
  appId: z.string().min(1),
  name: z.string().trim().min(3).max(80),
  scopes: z
    .array(apiScope)
    .min(1)
    .max(4)
    .refine((v) => new Set(v).size === v.length, "Do not duplicate scopes"),
});
export const credentialSchema = credentialInput.extend({
  id: z.string(),
  version: z.number().int(),
  prefix: z.string(),
  status: z.enum(["Active", "Revoked"]),
  createdAt: z.string(),
  replaces: z.string().nullable(),
});
export type Credential = z.infer<typeof credentialSchema>;
export const credentialCreated = z.object({
  credential: credentialSchema,
  secret: z.string().nullable(),
  deliveredOnce: z.boolean(),
});
export type CredentialCreated = z.infer<typeof credentialCreated>;
export const eventType = z.enum([
  "payment.confirmed",
  "payment.failed",
  "invoice.issued",
  "payout.completed",
]);
export const eventRequiredScope: Record<
  z.infer<typeof eventType>,
  z.infer<typeof apiScope>
> = {
  "payment.confirmed": "payments:read",
  "payment.failed": "payments:read",
  "invoice.issued": "invoices:read",
  "payout.completed": "payments:read",
};
export const webhookInput = z.object({
  appId: z.string().min(1),
  name: z.string().trim().min(3).max(80),
  url: z
    .string()
    .url()
    .max(300)
    .refine((v) => {
      try {
        const u = new URL(v);
        return (
          u.protocol === "https:" &&
          !u.username &&
          !u.password &&
          !u.search &&
          !u.hash &&
          u.hostname.endsWith(".example.test")
        );
      } catch {
        return false;
      }
    }, "Use an HTTPS *.example.test simulator address without credentials/query/fragment"),
  events: z
    .array(eventType)
    .min(1)
    .max(4)
    .refine((v) => new Set(v).size === v.length, "Do not duplicate events"),
});
export const webhookSchema = webhookInput.extend({
  id: z.string(),
  version: z.number().int(),
  status: z.enum(["Active", "Paused"]),
});
export type Webhook = z.infer<typeof webhookSchema>;
export const deliverySchema = z.object({
  id: z.string(),
  webhookId: z.string(),
  eventId: z.string(),
  event: eventType,
  status: z.enum(["Failed", "Delivered"]),
  payload: z.object({
    event: z.string(),
    reference: z.string(),
    simulated: z.literal(true),
  }),
  attempts: z.array(
    z.object({
      number: z.number().int(),
      status: z.number().int(),
      at: z.string(),
      detail: z.string(),
    }),
  ),
});
export type Delivery = z.infer<typeof deliverySchema>;
export const productionInput = z.object({
  appId: z.string().min(1),
  useCase: z.string().trim().min(30).max(1000),
  contactEmail: z.string().email().max(150),
  securityPlan: z.string().trim().min(30).max(1000),
  acknowledged: z.literal(true, {
    error: "Acknowledge that this request does not grant live access",
  }),
});
export const productionSchema = productionInput.extend({
  id: z.string(),
  status: z.literal("Pending review"),
  at: z.string(),
});
export const logSchema = z.object({
  id: z.string(),
  appId: z.string(),
  method: z.string(),
  path: z.string(),
  status: z.number().int(),
  at: z.string(),
  detail: z.string(),
});
export const developerSchema = freshnessSchema.extend({
  apps: z.array(appSchema),
  credentials: z.array(credentialSchema),
  webhooks: z.array(webhookSchema),
  deliveries: z.array(deliverySchema),
  production: z.array(productionSchema),
  logs: z.array(logSchema),
  productionEnabled: z.literal(false),
});
