import { z } from "zod";
const minor = z.string().regex(/^\d{1,18}$/),
  currency = z.enum(["KES", "USD"]);
export const documentKind = z.enum(["invoice", "quotation", "lpo", "receipt"]);
export const appearanceSchema = z.object({
  template: z.enum(["classic", "modern", "minimal"]),
  accent: z.enum(["forest", "navy", "charcoal"]),
  logo: z.string(),
  footer: z.string(),
});
export const issuerDetailsSchema = z.object({
  address: z.string(),
  email: z.string(),
  phone: z.string(),
});
export const financialDocumentSchema = appearanceSchema.extend({
  kind: documentKind,
  id: z.string(),
  revision: z.number().int(),
  status: z.string(),
  date: z.string(),
  due: z.string(),
  currency,
  issuer: issuerDetailsSchema.extend({ name: z.string() }),
  recipient: z.object({
    name: z.string(),
    email: z.string(),
    address: z.string(),
  }),
  lines: z.array(
    z.object({
      description: z.string(),
      quantity: z.string(),
      rateMinor: minor,
      tax: z.string(),
      discount: z.string(),
      totalMinor: minor,
    }),
  ),
  subtotalMinor: minor,
  discountMinor: minor,
  taxMinor: minor,
  totalMinor: minor,
  balanceMinor: minor,
  notes: z.string(),
  terms: z.string(),
  relatedReference: z.string(),
  paymentReference: z.string(),
  tax: z.object({
    status: z.enum(["Not connected", "Demo accepted", "Demo rejected"]),
    reference: z.string(),
    qrPayload: z.string(),
    label: z.string(),
  }),
});
export type FinancialDocument = z.infer<typeof financialDocumentSchema>;
export const exportSchema = z.object({
  id: z.string(),
  kind: documentKind,
  documentId: z.string(),
  revision: z.number(),
  filename: z.string(),
  sha256: z.string(),
  status: z.enum(["Ready", "Expired"]),
  model: financialDocumentSchema,
});
export const deliverySchema = z.object({
  id: z.string(),
  kind: documentKind,
  documentId: z.string(),
  exportId: z.string(),
  to: z.email(),
  subject: z.string(),
  message: z.string(),
  status: z.enum(["Queued", "Delivered (simulated)", "Failed"]),
  attempt: z.number(),
  error: z.string().nullable(),
});
export const workspaceSchema = z.object({
  exports: z.array(exportSchema),
  deliveries: z.array(deliverySchema),
  taxMode: z.enum(["Not connected", "Demo"]),
  tax: z.array(
    z.object({
      documentId: z.string(),
      status: z.enum(["Demo accepted", "Demo rejected"]),
      reference: z.string(),
    }),
  ),
});
export const extractionSchema = z.object({
  invoiceNumber: z.string(),
  invoiceDate: z.string(),
  currency,
  amountMinor: minor.nullable(),
  termsDays: z.number().int().min(0).max(180).nullable(),
  dueDate: z.string(),
  confidence: z.enum(["High", "Medium", "Low"]),
  warnings: z.array(z.string()),
  excerpt: z.string(),
});
export const uploadSchema = z.object({
  id: z.string(),
  supplierId: z.string(),
  supplierName: z.string(),
  filename: z.string(),
  size: z.number(),
  sha256: z.string(),
  status: z.enum(["Awaiting review", "Approved", "Rejected"]),
  extracted: extractionSchema,
});
export const uploadLinkSchema = z.object({
  id: z.string(),
  supplierId: z.string(),
  supplierName: z.string(),
  expiresAt: z.string(),
  status: z.enum(["Active", "Revoked", "Expired"]),
  path: z.string(),
});
export const payableSchema = z.object({
  id: z.string(),
  intakeId: z.string(),
  supplierId: z.string(),
  supplierName: z.string(),
  beneficiaryId: z.string(),
  invoiceNumber: z.string(),
  invoiceDate: z.string(),
  dueDate: z.string(),
  termsDays: z.number(),
  currency,
  amountMinor: minor,
  orderIds: z.array(z.string()),
  latestOrderId: z.string().nullable(),
  status: z.enum([
    "Approved",
    "Awaiting authorization",
    "Pending confirmation",
    "Paid",
    "Payment failed",
  ]),
  bucket: z.enum(["Overdue", "Due today", "Upcoming", "Paid"]),
});
export const supplierWorkspaceSchema = z.object({
  asOf: z.string(),
  links: z.array(uploadLinkSchema),
  intakes: z.array(uploadSchema),
  payables: z.array(payableSchema),
  summaries: z.array(
    z.object({
      currency,
      overdueMinor: minor,
      dueTodayMinor: minor,
      upcomingMinor: minor,
      paidMinor: minor,
    }),
  ),
});
export const reviewSchema = z.object({
  invoiceNumber: z.string().trim().min(2).max(80),
  invoiceDate: z.string(),
  currency,
  amountMinor: minor.refine((s) => BigInt(s) > 0n),
  termsDays: z.number().int().min(0).max(180),
  dueDate: z.string(),
  reviewed: z.literal(true),
});
export const publicSupplierSchema = z.object({
  supplierName: z.string(),
  businessName: z.string(),
  expiresAt: z.string(),
});
