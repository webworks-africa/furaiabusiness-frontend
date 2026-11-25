import { z } from "zod";
import { freshnessSchema } from "./contracts";
import { lineSchema, totalsSchema } from "./billingContracts";
import { payoutSchema } from "./paymentContracts";
const minor = z.string().regex(/^\d{1,16}$/);
const positive = minor.refine(
  (v) => /^\d+$/.test(v) && BigInt(v) > 0n,
  "Enter a positive amount",
);
export const brandingSchema = z.object({
  version: z.number().int().positive(),
  template: z.enum(["classic", "modern", "minimal"]),
  logo: z
    .string()
    .max(280000)
    .refine(
      (v) => !v || /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(v),
      "Use a small PNG or JPEG logo",
    ),
  footer: z.string().max(300),
  accent: z.enum(["forest", "navy", "charcoal"]),
});
export const mandateSchema = z.object({
  version: z.number().int().positive(),
  approvals: z.number().int().min(1).max(5),
  foreignAccounts: z.boolean(),
});
export const orderInput = z.object({
  accountId: z.string().min(1),
  beneficiaryId: z.string().min(1),
  amountMinor: positive,
  reference: z.string().trim().min(3).max(80),
  outcome: z.enum(["confirmed", "pending", "failed"]).default("confirmed"),
});
export const orderSchema = z.object({
  id: z.string(),
  version: z.number().int(),
  payout: payoutSchema,
  required: z.number().int(),
  approvals: z.array(
    z.object({ memberId: z.string(), name: z.string(), at: z.string() }),
  ),
  outcome: z.enum(["confirmed", "pending", "failed"]),
  linkedType: z.enum(["payment", "payroll", "loan"]).default("payment"),
  linkedId: z.string().nullable(),
});
export type Order = z.infer<typeof orderSchema>;
export const challengeSchema = z.object({
  id: z.string(),
  expiresAt: z.string(),
  remainingAttempts: z.number().int(),
  maskedDestination: z.string(),
});
export const supplierInput = z.object({
  name: z.string().trim().min(2).max(150),
  email: z.email(),
  phone: z.string().regex(/^\+?\d{9,15}$/),
  address: z.string().trim().min(3).max(200),
  beneficiaryId: z.string().min(1),
});
export const supplierSchema = supplierInput.extend({
  id: z.string(),
  version: z.number().int(),
  archived: z.boolean(),
});
export const lpoInput = z
  .object({
    supplierId: z.string().min(1),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    notes: z.string().max(1000),
    lines: z.array(lineSchema).min(1).max(30),
  })
  .refine((v) => v.deliveryDate >= v.date, "Delivery must follow order date");
export const lpoSchema = z.object({
  branding: brandingSchema.optional(),
  issuerDetails: z
    .object({
      name: z.string(),
      address: z.string(),
      email: z.string(),
      phone: z.string(),
    })
    .optional(),
  id: z.string(),
  version: z.number().int(),
  values: lpoInput,
  supplier: supplierSchema,
  totals: totalsSchema,
  status: z.enum(["Draft", "Issued", "Received", "Cancelled"]),
  issuedAt: z.string().nullable(),
});
export const employeeInput = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: z.email(),
    beneficiaryId: z.string().min(1),
    grossMinor: positive,
    deductionMinor: minor,
  })
  .refine(
    (v) =>
      /^\d+$/.test(v.grossMinor) &&
      /^\d+$/.test(v.deductionMinor) &&
      BigInt(v.grossMinor) > BigInt(v.deductionMinor),
    "Deductions must be below gross pay",
  );
export const employeeSchema = employeeInput.safeExtend({
  id: z.string(),
  version: z.number().int(),
  active: z.boolean(),
});
export const payrollSchema = z.object({
  id: z.string(),
  period: z.string(),
  accountId: z.string(),
  items: z.array(
    z.object({
      employeeId: z.string(),
      name: z.string(),
      grossMinor: minor,
      deductionMinor: minor,
      netMinor: minor,
      orderId: z.string(),
    }),
  ),
  totalMinor: minor,
});
export const terminalInput = z.object({
  name: z.string().trim().min(2).max(80),
  accountId: z.string().min(1),
  location: z.string().trim().min(2).max(120),
});
export const terminalSchema = terminalInput.extend({
  id: z.string(),
  status: z.enum(["Active", "Suspended"]),
  version: z.number().int(),
});
export const saleSchema = z.object({
  id: z.string(),
  terminalId: z.string(),
  amountMinor: positive,
  reference: z.string(),
  status: z.enum(["Pending confirmation", "Confirmed", "Failed"]),
  at: z.string(),
  transactionId: z.string().nullable(),
});
export const loanInput = z.object({
  borrowerId: z.string().min(1),
  beneficiaryId: z.string().min(1),
  accountId: z.string().min(1),
  principalMinor: positive,
  monthlyRate: z
    .string()
    .regex(/^\d{1,2}(?:\.\d{1,2})?$/)
    .refine((v) => Number(v) <= 20, "Preview monthly rate limit is 20%"),
  months: z.number().int().min(1).max(60),
  firstDue: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export const installmentSchema = z.object({
  date: z.string(),
  principalMinor: minor,
  interestMinor: minor,
  totalMinor: minor,
  paidMinor: minor,
});
export const loanSchema = loanInput.extend({
  id: z.string(),
  version: z.number().int(),
  status: z.enum([
    "Draft",
    "Awaiting disbursement",
    "Active",
    "Repaid",
    "Disbursement failed",
  ]),
  orderId: z.string().nullable(),
  schedule: z.array(installmentSchema),
  repayments: z.array(
    z.object({
      id: z.string(),
      amountMinor: positive,
      at: z.string(),
      reference: z.string(),
    }),
  ),
  preview: z.literal(true),
});
export const toolsSchema = freshnessSchema.extend({
  mandate: mandateSchema,
  branding: brandingSchema,
  orders: z.array(orderSchema),
  suppliers: z.array(supplierSchema),
  lpos: z.array(lpoSchema),
  employees: z.array(employeeSchema),
  payroll: z.array(payrollSchema),
  terminals: z.array(terminalSchema),
  sales: z.array(saleSchema),
  loans: z.array(loanSchema),
  approvers: z.array(z.object({ id: z.string(), name: z.string() })),
});
export type Tools = z.infer<typeof toolsSchema>;
export const customerStatementSchema = freshnessSchema.extend({
  customer: z.string(),
  currency: z.enum(["KES", "USD"]),
  openingMinor: z.string(),
  closingMinor: z.string(),
  rows: z.array(
    z.object({
      date: z.string(),
      reference: z.string(),
      kind: z.string(),
      debitMinor: minor,
      creditMinor: minor,
      balanceMinor: z.string(),
      invoiceId: z.string(),
    }),
  ),
});
export const registrationSchema = z.object({
  businessName: z.string().trim().min(3).max(150),
  name: z.string().trim().min(2).max(100),
  email: z.email(),
  phone: z.string().regex(/^254[17]\d{8}$/),
  challenge: z.string().regex(/^\d{6}$/),
  accept: z.literal(true),
});
