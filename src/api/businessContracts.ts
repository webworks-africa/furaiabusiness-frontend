import { z } from "zod";
import { freshnessSchema, roleSchema } from "./contracts";
export const documentKinds = [
  "registration",
  "tax",
  "representative",
  "address",
] as const;
export const documentKindSchema = z.enum(documentKinds);
const text = z.string().max(160);
export const draftFieldsSchema = z.object({
  legalName: text,
  registrationNumber: text,
  taxId: text,
  entityType: z.enum(["Limited company", "Sole proprietor", "Partnership"]),
  address: text,
  city: text,
  postalCode: z.string().max(20),
  representativeName: text,
  representativeEmail: z.string().max(200),
  representativePhone: z.string().max(30),
  representativeTitle: text,
  businessUse: z.string().max(1000),
  monthlyVolume: z.enum([
    "",
    "Below KES 1 million",
    "KES 1–10 million",
    "Above KES 10 million",
  ]),
  declaration: z.boolean(),
});
export type DraftFields = z.infer<typeof draftFieldsSchema>;
export const documentSchema = z.object({
  id: z.string(),
  kind: documentKindSchema,
  name: z.string(),
  size: z.number().int(),
  mime: z.string(),
  status: z.enum(["Received", "Changes requested"]),
  reason: z.string().nullable(),
});
export const onboardingSchema = freshnessSchema.extend({
  id: z.string(),
  version: z.number().int(),
  status: z.enum([
    "Draft",
    "In review",
    "Changes requested",
    "Approved",
    "Rejected",
  ]),
  values: draftFieldsSchema,
  documents: z.array(documentSchema),
  submittedAt: z.string().datetime().nullable(),
  reviewNote: z.string().nullable(),
  history: z.array(z.object({ label: z.string(), at: z.string().datetime() })),
  bankingEligible: z.boolean(),
  developerSandbox: z.boolean(),
  productionApi: z.literal(false),
});
export type Onboarding = z.infer<typeof onboardingSchema>;
const phone = z
  .string()
  .regex(
    /^\+[1-9]\d{7,14}$/,
    "Use an international number, for example +254700000000",
  );
export const profileFieldsSchema = z.object({
  displayName: z.string().trim().min(2).max(120),
  contactEmail: z.email(),
  phone,
  website: z
    .string()
    .max(200)
    .refine(
      (v) =>
        !v ||
        (() => {
          try {
            const u = new URL(v);
            return u.protocol === "https:" && !u.username && !u.password;
          } catch {
            return false;
          }
        })(),
      "Use an HTTPS website without credentials",
    ),
  operatingAddress: z.string().trim().min(5).max(250),
});
export type ProfileFields = z.infer<typeof profileFieldsSchema>;
export const profileSchema = freshnessSchema.extend({
  version: z.number().int(),
  legalName: z.string(),
  values: profileFieldsSchema,
});
export const memberSchema = z.object({
  id: z.string(),
  version: z.number().int(),
  name: z.string(),
  email: z.email(),
  role: roleSchema,
  status: z.enum(["Active", "Suspended"]),
  developerSandbox: z.boolean(),
});
export const invitationSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  role: roleSchema,
  status: z.enum(["Pending", "Accepted", "Expired", "Revoked"]),
  attempt: z.number().int(),
  expiresAt: z.string().datetime(),
});
export const teamSchema = freshnessSchema.extend({
  version: z.number().int(),
  members: z.array(memberSchema),
  invitations: z.array(invitationSchema),
  developerSandbox: z.boolean(),
  productionApi: z.literal(false),
});
export const invitationFieldsSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email(),
  role: roleSchema,
});
export type InvitationFields = z.infer<typeof invitationFieldsSchema>;
export const policyFieldsSchema = z.object({
  requireMfa: z.boolean(),
  sessionTimeoutMinutes: z.union([z.literal(15), z.literal(30), z.literal(60)]),
});
export type PolicyFields = z.infer<typeof policyFieldsSchema>;
export const securitySchema = freshnessSchema.extend({
  version: z.number().int(),
  policy: policyFieldsSchema,
  mfaStatus: z.literal("Mock enrolled"),
  sessions: z.array(
    z.object({
      id: z.string(),
      device: z.string(),
      location: z.string(),
      current: z.boolean(),
      status: z.enum(["Active", "Revoked"]),
    }),
  ),
});
export const auditSchema = freshnessSchema.extend({
  items: z.array(
    z.object({
      id: z.string(),
      actor: z.string(),
      event: z.string(),
      at: z.string().datetime(),
    }),
  ),
});
export const accountRequestFieldsSchema = z.object({
  name: z.string().trim().min(3).max(100),
  currency: z.enum(["KES", "USD"]),
});
export const accountRequestsSchema = freshnessSchema.extend({
  items: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      currency: z.enum(["KES", "USD"]),
      status: z.enum(["Pending review", "Opened"]),
      accountId: z.string().nullable(),
      createdAt: z.string().datetime(),
    }),
  ),
});
export const mutationOkSchema = z.object({ ok: z.boolean() });
