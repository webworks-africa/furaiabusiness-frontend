import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { request } from "../api/http";
import {
  onboardingSchema,
  profileSchema,
  teamSchema,
  securitySchema,
  auditSchema,
  accountRequestsSchema,
  type DraftFields,
  type ProfileFields,
  type PolicyFields,
  type InvitationFields,
} from "../api/businessContracts";
import type { Role } from "../api/contracts";
function useWrite<TInput, TResult>(
  operation: (input: TInput) => Promise<TResult>,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: operation,
    onSuccess: () => client.invalidateQueries(),
  });
}
export function useOnboarding() {
  return useQuery({
    queryKey: ["onboarding"],
    queryFn: () => request("/onboarding", onboardingSchema),
  });
}
export function useSaveDraft() {
  return useWrite(
    ({ version, values }: { version: number; values: DraftFields }) =>
      request("/onboarding/draft", onboardingSchema, {
        method: "PATCH",
        body: JSON.stringify({ version, values }),
      }),
  );
}
export function useSubmitApplication() {
  return useWrite((version: number) =>
    request("/onboarding/submit", onboardingSchema, {
      method: "POST",
      body: JSON.stringify({ version }),
    }),
  );
}
export function useDocumentUpload() {
  return useWrite(
    ({
      file,
      kind,
      version,
    }: {
      file: File;
      kind: string;
      version: number;
    }) => {
      const form = new FormData();
      form.set("file", file);
      form.set("kind", kind);
      form.set("version", String(version));
      return request("/onboarding/documents", onboardingSchema, {
        method: "POST",
        body: form,
        redirect: "error",
      });
    },
  );
}
export function useRemoveDocument() {
  return useWrite(({ id, version }: { id: string; version: number }) =>
    request(
      `/onboarding/documents/${encodeURIComponent(id)}`,
      onboardingSchema,
      { method: "DELETE", body: JSON.stringify({ version }) },
    ),
  );
}
export function useBusinessProfile() {
  return useQuery({
    queryKey: ["business-profile"],
    queryFn: () => request("/business/profile", profileSchema),
  });
}
export function useSaveProfile() {
  return useWrite(
    ({ version, values }: { version: number; values: ProfileFields }) =>
      request("/business/profile", profileSchema, {
        method: "PATCH",
        body: JSON.stringify({ version, values }),
      }),
  );
}
export function useTeam() {
  return useQuery({
    queryKey: ["team"],
    queryFn: () => request("/team", teamSchema),
  });
}
export function useInvite() {
  return useWrite((values: InvitationFields & { version: number }) =>
    request("/team/invitations", teamSchema, {
      method: "POST",
      body: JSON.stringify(values),
    }),
  );
}
export function useInvitationAction() {
  return useWrite(
    ({
      id,
      action,
      version,
    }: {
      id: string;
      action: "resend" | "revoke";
      version: number;
    }) =>
      request(
        `/team/invitations/${encodeURIComponent(id)}/${action}`,
        teamSchema,
        { method: "POST", body: JSON.stringify({ version }) },
      ),
  );
}
export function useMemberAccess() {
  return useWrite(
    ({
      id,
      ...values
    }: {
      id: string;
      version: number;
      memberVersion: number;
      role: Role;
      status: "Active" | "Suspended";
      developerSandbox: boolean;
    }) =>
      request(`/team/members/${encodeURIComponent(id)}`, teamSchema, {
        method: "PATCH",
        body: JSON.stringify(values),
      }),
  );
}
export function useSecurity() {
  return useQuery({
    queryKey: ["security"],
    queryFn: () => request("/security", securitySchema),
  });
}
export function useSavePolicy() {
  return useWrite(
    ({ version, values }: { version: number; values: PolicyFields }) =>
      request("/security/policy", securitySchema, {
        method: "PATCH",
        body: JSON.stringify({ version, values }),
      }),
  );
}
export function useRevokeSession() {
  return useWrite(({ id, version }: { id: string; version: number }) =>
    request(`/security/sessions/${encodeURIComponent(id)}`, securitySchema, {
      method: "DELETE",
      body: JSON.stringify({ version }),
    }),
  );
}
export function useActivity() {
  return useQuery({
    queryKey: ["business-activity"],
    queryFn: () => request("/business/activity", auditSchema),
  });
}
export function useAccountRequests() {
  return useQuery({
    queryKey: ["account-requests"],
    queryFn: () => request("/account-requests", accountRequestsSchema),
  });
}
export function useRequestAccount() {
  return useWrite(
    ({
      name,
      currency,
      key,
    }: {
      name: string;
      currency: "KES" | "USD";
      key: string;
    }) =>
      request("/account-requests", accountRequestsSchema, {
        method: "POST",
        headers: { "Idempotency-Key": key },
        body: JSON.stringify({ name, currency }),
      }),
  );
}
