import { db } from "./store";
import type { z } from "zod";
import type { Role } from "../api/contracts";
import {
  profileSchema,
  teamSchema,
  securitySchema,
  accountRequestsSchema,
  type Onboarding,
} from "../api/businessContracts";
import { permissionsFor } from "../domain/access";
const date = "2026-10-21T08:00:00.000Z";
const initial = () => ({
  profile: {
    version: 1,
    legalName: "Webworks Africa Limited",
    asOf: date,
    stale: false,
    values: {
      displayName: "Webworks Africa Ltd",
      contactEmail: "office@example.test",
      phone: "+254700000000",
      website: "https://example.test",
      operatingAddress: "Demo Business Centre, Nairobi",
    },
  },
  onboarding: {
    id: "APP-MOCK-0001",
    version: 1,
    status: "Draft",
    asOf: date,
    stale: false,
    values: {
      legalName: "Webworks Africa Limited",
      registrationNumber: "PVT-MOCK-001",
      taxId: "P000000001A",
      entityType: "Limited company",
      address: "Demo Business Centre, Nairobi",
      city: "Nairobi",
      postalCode: "00100",
      representativeName: "David K.",
      representativeEmail: "david@example.test",
      representativePhone: "+254700000000",
      representativeTitle: "Director",
      businessUse:
        "Business collections and supplier payments for digital services.",
      monthlyVolume: "KES 1–10 million",
      declaration: false,
    },
    documents: [],
    submittedAt: null,
    reviewNote: null,
    history: [],
    bankingEligible: false,
    developerSandbox: true,
    productionApi: false,
  } as Onboarding,
  team: {
    version: 1,
    asOf: date,
    stale: false,
    developerSandbox: true,
    productionApi: false as const,
    members: [
      {
        id: "member_admin",
        version: 1,
        name: "David K.",
        email: "david@example.test",
        role: "admin" as const,
        status: "Active" as const,
        developerSandbox: true,
      },
      {
        id: "member_finance",
        version: 1,
        name: "Michael O.",
        email: "michael@example.test",
        role: "finance" as const,
        status: "Active" as const,
        developerSandbox: false,
      },
      {
        id: "member_developer",
        version: 1,
        name: "Amina S.",
        email: "amina@example.test",
        role: "developer" as const,
        status: "Active" as const,
        developerSandbox: true,
      },
      {
        id: "member_viewer",
        version: 1,
        name: "Sarah N.",
        email: "sarah@example.test",
        role: "viewer" as const,
        status: "Active" as const,
        developerSandbox: false,
      },
    ],
    invitations: [],
  },
  security: {
    version: 1,
    asOf: date,
    stale: false,
    policy: { requireMfa: true, sessionTimeoutMinutes: 30 as const },
    mfaStatus: "Mock enrolled" as const,
    sessions: ["admin", "finance", "developer", "viewer"].flatMap((role) => [
      {
        id: `session_${role}_current`,
        owner: `member_${role}`,
        device: "Current mock browser",
        location: "Nairobi · simulated",
        current: true,
        status: "Active" as const,
      },
      {
        id: `session_${role}_other`,
        owner: `member_${role}`,
        device: "Other mock device",
        location: "Nairobi · simulated",
        current: false,
        status: "Active" as const,
      },
    ]),
  },
  requests: { asOf: date, stale: false, items: [] },
  audit: [] as { id: string; actor: string; event: string; at: string }[],
  nextId: 1,
});
type BusinessState = {
  profile: z.infer<typeof profileSchema>;
  onboarding: Onboarding;
  team: z.infer<typeof teamSchema>;
  security: Omit<z.infer<typeof securitySchema>, "sessions"> & {
    sessions: (z.infer<typeof securitySchema>["sessions"][number] & {
      owner: string;
    })[];
  };
  requests: z.infer<typeof accountRequestsSchema>;
  audit: { id: string; actor: string; event: string; at: string }[];
  nextId: number;
};
export const business: BusinessState = initial();
export function resetBusiness() {
  Object.assign(business, initial());
}
export function currentMember(role: Role) {
  const selected = business.team.members.find(
    (m) => m.id === db.memberId && m.role === role,
  );
  return (
    selected ?? business.team.members.find((m) => m.id === `member_${role}`)!
  );
}
export function actorPermissions(role: Role) {
  const member = currentMember(role);
  return !member || member.status !== "Active"
    ? []
    : permissionsFor(
        member.role,
        member.developerSandbox,
        business.team.developerSandbox,
      );
}
export function actorSession(role: Role) {
  const member = currentMember(role);
  return {
    memberId: member?.id ?? "",
    name: member?.name ?? "",
    business: business.profile.values.displayName,
    role: member?.role ?? role,
    permissions: actorPermissions(role),
  };
}
export function record(role: Role, event: string) {
  business.audit.unshift({
    id: `ACT-${business.nextId++}`,
    actor: currentMember(role)?.name ?? "Development simulator",
    event,
    at: date,
  });
}
