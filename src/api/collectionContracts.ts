import { appearanceSchema, issuerDetailsSchema } from "./documentContracts";
import { z } from "zod";
import { freshnessSchema } from "./contracts";
import { snapshotSchema } from "./billingContracts";
const amount = z.string().regex(/^\d+$/);
const currency = z.enum(["KES", "USD"]);
export const linkInput = z.object({
  invoiceId: z.string().min(1),
  accountId: z.string().min(1),
  expires: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  partial: z.boolean(),
});
export const linkSchema = linkInput.extend({
  id: z.string(),
  version: z.number(),
  token: z.string(),
  status: z.enum(["Active", "Revoked", "Expired", "Closed"]),
  currency,
  outstandingMinor: amount,
  customer: z.string(),
});
export const paymentMethodSchema = z.enum([
  "mpesa",
  "pesalink",
  "visa",
  "mastercard",
  "paypal",
  "simulated",
]);
export const receiptSchema = z.object({
  branding: appearanceSchema.optional(),
  issuerDetails: issuerDetailsSchema.optional(),
  method: paymentMethodSchema,
  providerReference: z.string(),
  maskedPhone: z.string().nullable(),
  id: z.string(),
  paymentId: z.string(),
  invoiceId: z.string(),
  amountMinor: amount,
  currency,
  at: z.string(),
  issuer: z.string(),
  customer: z.string(),
  balanceDueMinor: amount,
});
export const attemptSchema = z.object({
  method: paymentMethodSchema,
  providerReference: z.string(),
  maskedPhone: z.string().nullable(),
  providerState: z.string(),
  providerEvents: z.array(z.object({ label: z.string(), at: z.string() })),
  id: z.string(),
  token: z.string(),
  linkId: z.string(),
  invoiceId: z.string(),
  amountMinor: amount,
  currency,
  status: z.enum(["Processing", "Pending confirmation", "Confirmed", "Failed"]),
  receipt: receiptSchema.nullable(),
  asOf: z.string(),
  stale: z.boolean(),
});
export const creditSchema = z.object({
  id: z.string(),
  invoiceId: z.string(),
  amountMinor: amount,
  reason: z.string(),
  at: z.string(),
});
export const refundSchema = z.object({
  id: z.string(),
  invoiceId: z.string(),
  paymentId: z.string(),
  amountMinor: amount,
  status: z.enum(["Pending confirmation", "Confirmed", "Failed"]),
  reason: z.string(),
  at: z.string(),
});
export const settlementSchema = freshnessSchema.extend({
  invoiceId: z.string(),
  currency,
  version: z.number(),
  paidMinor: amount,
  creditedMinor: amount,
  refundedMinor: amount,
  customerCreditMinor: amount,
  refundableMinor: amount,
  outstandingMinor: amount,
  links: z.array(linkSchema),
  attempts: z.array(attemptSchema),
  receipts: z.array(receiptSchema),
  credits: z.array(creditSchema),
  refunds: z.array(refundSchema),
});
export const linkListSchema = freshnessSchema.extend({
  items: z.array(linkSchema),
  total: z.number(),
  page: z.number(),
  pages: z.number(),
});
export const checkoutSchema = freshnessSchema.extend({
  link: linkSchema,
  invoiceStatus: z.string(),
  snapshot: snapshotSchema,
  activeAttempt: attemptSchema.nullable(),
});
export type PaymentLink = z.infer<typeof linkSchema>;
export type Attempt = z.infer<typeof attemptSchema>;
export type Receipt = z.infer<typeof receiptSchema>;
export type Credit = z.infer<typeof creditSchema>;
export type Refund = z.infer<typeof refundSchema>;
