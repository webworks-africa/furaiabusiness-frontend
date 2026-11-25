import { z } from "zod";
import { freshnessSchema } from "./contracts";
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (s) =>
      !Number.isNaN(Date.parse(s)) &&
      new Date(s).toISOString().slice(0, 10) === s,
    "Enter a real date",
  );
export const contactFields = z.object({
  name: z.string().trim().min(2).max(150),
  person: z.string().trim().min(2).max(100),
  email: z.email().max(200),
  address: z.string().trim().min(3).max(300),
  termsDays: z.enum(["0", "15", "30", "45", "60"]),
  archived: z.boolean(),
});
export const contactSchema = contactFields.extend({
  id: z.string(),
  version: z.number().int().positive(),
});
export type Contact = z.infer<typeof contactSchema>;
export type ContactFields = z.infer<typeof contactFields>;
const decimal = (places: number, max: number) =>
  z
    .string()
    .regex(
      new RegExp("^\\d{1," + max + "}(?:\\.\\d{1," + places + "})?$"),
      "Use a positive decimal with the supported precision",
    );
export const lineSchema = z.object({
  description: z.string().trim().min(1).max(300),
  quantity: decimal(3, 6).refine(
    (s) => /[1-9]/.test(s),
    "Quantity must be greater than zero",
  ),
  rate: decimal(2, 12),
  discount: decimal(2, 3).refine((s) => Number(s) <= 100, "Maximum 100%"),
  tax: decimal(2, 3).refine((s) => Number(s) <= 100, "Maximum 100%"),
});
export const documentFields = z
  .object({
    contactId: z.string().min(1, "Choose a customer"),
    currency: z.enum(["KES", "USD"]),
    title: z.string().trim().min(3).max(150),
    date,
    until: date,
    notes: z.string().max(2000),
    terms: z.string().max(2000),
    lines: z.array(lineSchema).min(1).max(30),
  })
  .refine((v) => v.until >= v.date, {
    message: "Due/validity date must be on or after document date",
    path: ["until"],
  });
export type DocumentFields = z.infer<typeof documentFields>;
export type Line = z.infer<typeof lineSchema>;
const amount = z.string().regex(/^\d+$/);
export const totalsSchema = z.object({
  grossMinor: amount,
  discountMinor: amount,
  netMinor: amount,
  taxMinor: amount,
  totalMinor: amount,
  lines: z.array(
    z.object({
      grossMinor: amount,
      discountMinor: amount,
      netMinor: amount,
      taxMinor: amount,
      totalMinor: amount,
    }),
  ),
});
export const snapshotSchema = z.object({
  issuerDetails: z
    .object({ address: z.string(), email: z.string(), phone: z.string() })
    .optional(),
  branding: z
    .object({
      template: z.enum(["classic", "modern", "minimal"]),
      logo: z.string(),
      footer: z.string(),
      accent: z.enum(["forest", "navy", "charcoal"]),
      version: z.number(),
    })
    .optional(),
  issuerName: z.string(),
  values: documentFields,
  customer: contactSchema,
  totals: totalsSchema,
  at: z.string(),
  revision: z.number().int(),
});
export const billingDocumentSchema = freshnessSchema.extend({
  appearance: z
    .object({ template: z.enum(["classic", "modern", "minimal"]) })
    .optional(),
  id: z.string(),
  kind: z.enum(["quotations", "invoices"]),
  version: z.number().int().positive(),
  status: z.enum([
    "Draft",
    "Sent",
    "Accepted",
    "Declined",
    "Expired",
    "Converted",
    "Outstanding",
    "Partially paid",
    "Paid",
    "Credited",
  ]),
  values: documentFields,
  customer: contactSchema,
  totals: totalsSchema,
  snapshot: snapshotSchema.nullable(),
  revisions: z.array(snapshotSchema),
  publicToken: z.string().nullable(),
  linkedId: z.string().nullable(),
  outstandingMinor: amount,
  events: z.array(z.object({ label: z.string(), at: z.string() })),
});
export type BillingDocument = z.infer<typeof billingDocumentSchema>;
export const billingListSchema = freshnessSchema.extend({
  items: z.array(billingDocumentSchema),
  total: z.number(),
  page: z.number(),
  pages: z.number(),
  summary: z.object({
    count: z.number(),
    outstandingMinor: amount,
    currency: z.enum(["KES", "USD"]),
  }),
});
export const contactListSchema = freshnessSchema.extend({
  items: z.array(
    contactSchema.extend({
      receivables: z.object({
        KES: z.string().regex(/^\d+$/),
        USD: z.string().regex(/^\d+$/),
      }),
    }),
  ),
  total: z.number(),
  page: z.number(),
  pages: z.number(),
});
export const publicQuoteSchema = z.object({
  id: z.string(),
  version: z.number(),
  status: z.enum(["Sent", "Accepted", "Declined", "Expired", "Converted"]),
  snapshot: snapshotSchema,
  signer: z.string().nullable(),
});
export type PublicQuote = z.infer<typeof publicQuoteSchema>;
