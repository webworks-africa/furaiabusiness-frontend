import { z } from "zod";
import {
  documentKinds,
  type Onboarding,
  type DraftFields,
} from "../api/businessContracts";
export const onboardingSteps = [
  "Business details",
  "Operating address",
  "Representative",
  "Documents",
  "Business use & volumes",
  "Review & submit",
];
const business = z.object({
  legalName: z.string().trim().min(2, "Enter the legal business name"),
  registrationNumber: z.string().trim().min(3, "Enter a registration number"),
  taxId: z
    .string()
    .regex(
      /^[A-Z]\d{9}[A-Z]$/,
      "Use a Kenya tax identifier such as P000000001A",
    ),
  entityType: z.enum(["Limited company", "Sole proprietor", "Partnership"]),
});
const address = z.object({
  address: z.string().trim().min(5, "Enter the operating address"),
  city: z.string().trim().min(2, "Enter the city"),
  postalCode: z.string().trim().min(2, "Enter the postal code"),
});
const representative = z.object({
  representativeName: z.string().trim().min(2, "Enter the representative name"),
  representativeEmail: z.email("Enter a valid representative email"),
  representativePhone: z
    .string()
    .regex(
      /^\+[1-9]\d{7,14}$/,
      "Use an international representative phone number",
    ),
  representativeTitle: z
    .string()
    .trim()
    .min(2, "Enter the representative title"),
});
const use = z.object({
  businessUse: z
    .string()
    .trim()
    .min(20, "Describe the business use in at least 20 characters"),
  monthlyVolume: z.enum(
    ["Below KES 1 million", "KES 1–10 million", "Above KES 10 million"],
    { error: "Select an estimated monthly volume" },
  ),
});
export function stepIssues(
  step: number,
  values: DraftFields,
  documents: Onboarding["documents"],
): { field: keyof DraftFields | "documents"; message: string }[] {
  if (step === 4)
    return documentKinds
      .filter(
        (kind) =>
          !documents.some((d) => d.kind === kind && d.status === "Received"),
      )
      .map((kind) => ({
        field: "documents",
        message: `Provide the ${kind} document`,
      }));
  if (step === 6)
    return values.declaration
      ? []
      : [
          {
            field: "declaration",
            message: "Confirm the declaration before submitting",
          },
        ];
  const schema =
    step === 1
      ? business
      : step === 2
        ? address
        : step === 3
          ? representative
          : use;
  const parsed = schema.safeParse(values);
  return parsed.success
    ? []
    : parsed.error.issues.map((i) => ({
        field: i.path[0] as keyof DraftFields,
        message: i.message,
      }));
}
export function applicationIssues(
  values: DraftFields,
  documents: Onboarding["documents"],
) {
  return [1, 2, 3, 4, 5, 6].flatMap((step) =>
    stepIssues(step, values, documents),
  );
}
export const documentLabels: Record<(typeof documentKinds)[number], string> = {
  registration: "Business registration certificate",
  tax: "Tax identifier evidence",
  representative: "Representative identity document",
  address: "Proof of operating address",
};
export function editableApplication(status: Onboarding["status"]) {
  return status === "Draft" || status === "Changes requested";
}
