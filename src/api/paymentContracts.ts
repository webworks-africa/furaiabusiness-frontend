import { z } from "zod";
import { freshnessSchema } from "./contracts";
// Proposed F6 contracts; awaiting backend confirmation.
const minor = z.string().regex(/^\d+$/);
export const payoutRail = z.enum(["PesaLink", "M-Pesa B2C", "RTGS"]);
export const beneficiaryInput = z
  .object({
    name: z.string().trim().min(2).max(100),
    rail: payoutRail,
    institution: z.string().trim().min(2).max(80),
    destination: z
      .string()
      .trim()
      .regex(/^\d{6,16}$/, "Use a 6–16 digit test destination"),
  })
  .superRefine((v, ctx) => {
    if (v.rail === "M-Pesa B2C" && !/^254[17]\d{8}$/.test(v.destination))
      ctx.addIssue({
        code: "custom",
        path: ["destination"],
        message: "Use a test mobile in 2547… or 2541… format",
      });
  });
export const beneficiarySchema = z.object({
  id: z.string(),
  version: z.number().int(),
  name: z.string(),
  rail: payoutRail,
  institution: z.string(),
  maskedDestination: z.string(),
  currency: z.literal("KES"),
  status: z.enum(["Active", "Archived"]),
  verification: z.literal("Mock only"),
});
export type Beneficiary = z.infer<typeof beneficiarySchema>;
export const beneficiaryListSchema = freshnessSchema.extend({
  items: z.array(beneficiarySchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});
export const payoutInput = z.object({
  accountId: z.string().min(1, "Select an account"),
  beneficiaryId: z.string().min(1, "Select a beneficiary"),
  amountMinor: minor.refine(
    (v) => /^\d+$/.test(v) && BigInt(v) > 0n,
    "Amount must be greater than zero",
  ),
  reference: z.string().trim().min(3).max(80),
});
export const payoutStatus = z.enum([
  "Draft",
  "Awaiting approval",
  "Approved",
  "Pending confirmation",
  "Completed",
  "Failed",
  "Rejected",
  "Cancelled",
]);
export const payoutSchema = freshnessSchema.extend({
  id: z.string(),
  version: z.number().int(),
  accountId: z.string(),
  beneficiary: beneficiarySchema,
  amountMinor: minor,
  feeMinor: minor,
  currency: z.literal("KES"),
  reference: z.string(),
  status: payoutStatus,
  makerId: z.string(),
  makerName: z.string(),
  approverId: z.string().nullable(),
  approverName: z.string().nullable(),
  executorId: z.string().nullable(),
  holdMinor: minor,
  transactionId: z.string().nullable(),
  events: z.array(
    z.object({ label: z.string(), actor: z.string(), at: z.string() }),
  ),
});
export type Payout = z.infer<typeof payoutSchema>;
export const payoutListSchema = freshnessSchema.extend({
  items: z.array(payoutSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});
export const cardLimits = z
  .object({
    monthlyMinor: minor,
    dailyMinor: minor,
    singleMinor: minor,
    online: z.boolean(),
    contactless: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (
      ![v.singleMinor, v.dailyMinor, v.monthlyMinor].every(
        (x) => minor.safeParse(x).success,
      )
    )
      return;
    if (
      BigInt(v.singleMinor) <= 0n ||
      BigInt(v.singleMinor) > BigInt(v.dailyMinor) ||
      BigInt(v.dailyMinor) > BigInt(v.monthlyMinor)
    )
      ctx.addIssue({
        code: "custom",
        path: ["singleMinor"],
        message: "Use positive limits: single ≤ daily ≤ monthly",
      });
  });
export const cardRequestInput = z.object({
  name: z.string().trim().min(3).max(80),
  holderId: z.string().min(1),
  accountId: z.string().min(1),
  form: z.enum(["Physical", "Virtual"]),
  limits: cardLimits,
});
export const cardSchema = freshnessSchema.extend({
  id: z.string(),
  version: z.number().int(),
  name: z.string(),
  holderId: z.string(),
  holderName: z.string(),
  businessName: z.string(),
  accountId: z.string().nullable(),
  currency: z.literal("KES"),
  kind: z.enum(["Debit", "Credit"]),
  form: z.enum(["Physical", "Virtual"]),
  last4: z
    .string()
    .regex(/^\d{4}$/)
    .nullable(),
  status: z.enum([
    "Active",
    "Frozen",
    "Pending approval",
    "Approved for issuance",
    "Rejected",
    "Preview",
  ]),
  spentMinor: minor,
  limits: cardLimits,
  makerId: z.string(),
  approverId: z.string().nullable(),
  replacementOf: z.string().nullable(),
  events: z.array(
    z.object({ label: z.string(), actor: z.string(), at: z.string() }),
  ),
});
export type BusinessCard = z.infer<typeof cardSchema>;
export const cardListSchema = freshnessSchema.extend({
  items: z.array(cardSchema),
});
export const cardActivitySchema = freshnessSchema.extend({
  items: z.array(
    z.object({
      id: z.string(),
      merchant: z.string(),
      amountMinor: minor,
      currency: z.literal("KES"),
      status: z.enum(["Completed", "Declined"]),
      at: z.string(),
    }),
  ),
});

// Development display values only. A real issuer reveal contract is not enabled.
export const mockCardDetailsSchema = z.object({
  number: z.string().regex(/^0000 0000 0000 \d{4}$/),
  cvv: z.literal("000"),
  expiry: z.literal("12/30"),
  simulated: z.literal(true),
});
export type MockCardDetails = z.infer<typeof mockCardDetailsSchema>;
