import { it, expect } from "vitest";
import { z } from "zod";
import { request } from "./http";
import {
  onboardingSchema,
  profileSchema,
  teamSchema,
  securitySchema,
  documentKinds,
  accountRequestsSchema,
} from "./businessContracts";
import {
  sessionSchema,
  accountListSchema,
  accountDetailSchema,
} from "./contracts";
import { db } from "../mocks/store";
import { business } from "../mocks/businessStore";
function patch(path: string, body: unknown, schema: typeof onboardingSchema) {
  return request(path, schema, { method: "PATCH", body: JSON.stringify(body) });
}
function post(path: string, body: unknown) {
  return request(path, onboardingSchema, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
async function scenario(value: string) {
  return request("/__mock/scenario", z.object({ ok: z.boolean() }), {
    method: "POST",
    body: JSON.stringify({ scenario: value, role: "admin" }),
  });
}
function readyDraft() {
  business.onboarding.values.declaration = true;
  business.onboarding.documents = documentKinds.map((kind) => ({
    id: kind,
    kind,
    name: `${kind}.pdf`,
    size: 10,
    mime: "application/pdf",
    status: "Received",
    reason: null,
  }));
}
it("draft edits persist and stale versions cannot overwrite them", async () => {
  const values = { ...business.onboarding.values, city: "Mombasa" };
  const saved = await patch(
    "/onboarding/draft",
    { version: 1, values },
    onboardingSchema,
  );
  expect(saved.values.city).toBe("Mombasa");
  await expect(
    patch(
      "/onboarding/draft",
      { version: 1, values: { ...values, city: "Nakuru" } },
      onboardingSchema,
    ),
  ).rejects.toMatchObject({ status: 409 });
  expect(business.onboarding.values.city).toBe("Mombasa");
});
it("submission requires all inputs and locks without granting eligibility or moving money", async () => {
  await expect(
    post("/onboarding/submit", { version: 1 }),
  ).rejects.toMatchObject({ status: 422 });
  readyDraft();
  const accounts = structuredClone(db.accounts);
  const saved = await post("/onboarding/submit", { version: 1 });
  expect(saved.status).toBe("In review");
  expect(saved.bankingEligible).toBe(false);
  expect(saved.productionApi).toBe(false);
  await expect(
    patch(
      "/onboarding/draft",
      { version: saved.version, values: saved.values },
      onboardingSchema,
    ),
  ).rejects.toMatchObject({ status: 409 });
  expect(db.accounts).toEqual(accounts);
});
it("requested changes require replacement and resubmission retains the application reference", async () => {
  readyDraft();
  await post("/onboarding/submit", { version: 1 });
  await scenario("onboarding-changes");
  expect(business.onboarding.status).toBe("Changes requested");
  await expect(
    post("/onboarding/submit", { version: business.onboarding.version }),
  ).rejects.toMatchObject({ status: 422 });
  business.onboarding.documents.find((d) => d.kind === "address")!.status =
    "Received";
  const saved = await post("/onboarding/submit", {
    version: business.onboarding.version,
  });
  expect(saved.id).toBe("APP-MOCK-0001");
  expect(saved.status).toBe("In review");
  expect(saved.history).toHaveLength(3);
});
it("approval, account request and zero-balance provisioning are separate events", async () => {
  readyDraft();
  await post("/onboarding/submit", { version: 1 });
  await scenario("onboarding-approved");
  expect(db.accounts).toHaveLength(2);
  const body = { name: "Collections account", currency: "KES" };
  const create = () =>
    request("/account-requests", accountRequestsSchema, {
      method: "POST",
      headers: { "Idempotency-Key": "account-test-key" },
      body: JSON.stringify(body),
    });
  const a = await create();
  const b = await create();
  expect(a.items[0].id).toBe(b.items[0].id);
  expect(b.items).toHaveLength(1);
  expect(db.accounts).toHaveLength(2);
  await scenario("account-provisioned");
  const accounts = await request("/accounts", accountListSchema);
  expect(accounts.items).toHaveLength(3);
  const added = accounts.items.find((a) => a.name === "Collections account")!;
  expect(added.ledgerMinor).toBe("0");
  const detail = await request(`/accounts/${added.id}`, accountDetailSchema);
  expect(detail.holds).toHaveLength(0);
  expect(business.onboarding.productionApi).toBe(false);
});
it("viewer cannot edit onboarding, profile, team or business security policy", async () => {
  db.role = "viewer";
  await expect(
    patch(
      "/onboarding/draft",
      { version: 1, values: business.onboarding.values },
      onboardingSchema,
    ),
  ).rejects.toMatchObject({ status: 403 });
  await expect(
    request("/business/profile", profileSchema, {
      method: "PATCH",
      body: JSON.stringify({ version: 1, values: business.profile.values }),
    }),
  ).rejects.toMatchObject({ status: 403 });
  await expect(
    request("/team/invitations", teamSchema, {
      method: "POST",
      body: JSON.stringify({
        version: 1,
        name: "Colleague",
        email: "new@example.test",
        role: "viewer",
      }),
    }),
  ).rejects.toMatchObject({ status: 403 });
  await expect(
    request("/security/policy", securitySchema, {
      method: "PATCH",
      body: JSON.stringify({ version: 1, values: business.security.policy }),
    }),
  ).rejects.toMatchObject({ status: 403 });
});
it("profile save updates session business name and protects concurrent changes", async () => {
  const saved = await request("/business/profile", profileSchema, {
    method: "PATCH",
    body: JSON.stringify({
      version: 1,
      values: {
        ...business.profile.values,
        displayName: "Updated Demo Company",
      },
    }),
  });
  expect(saved.version).toBe(2);
  expect((await request("/session", sessionSchema)).business).toBe(
    "Updated Demo Company",
  );
  await expect(
    request("/business/profile", profileSchema, {
      method: "PATCH",
      body: JSON.stringify({ version: 1, values: business.profile.values }),
    }),
  ).rejects.toMatchObject({ status: 409 });
});
it("invitations reject duplicates and expire/resend/revoke without activating a member", async () => {
  const create = (version: number) =>
    request("/team/invitations", teamSchema, {
      method: "POST",
      body: JSON.stringify({
        version,
        name: "Colleague",
        email: "New@example.test",
        role: "developer",
      }),
    });
  const first = await create(1);
  expect(first.members).toHaveLength(4);
  expect(first.invitations[0].status).toBe("Pending");
  await expect(create(first.version)).rejects.toMatchObject({ status: 409 });
  await scenario("invitation-expired");
  const id = first.invitations[0].id;
  const resend = await request(`/team/invitations/${id}/resend`, teamSchema, {
    method: "POST",
    body: JSON.stringify({ version: business.team.version }),
  });
  expect(resend.invitations[0].attempt).toBe(2);
  const revoke = await request(`/team/invitations/${id}/revoke`, teamSchema, {
    method: "POST",
    body: JSON.stringify({ version: resend.version }),
  });
  expect(revoke.invitations[0].status).toBe("Revoked");
  expect(revoke.members).toHaveLength(4);
});
it("last administrator and self-suspension cannot be changed", async () => {
  const body = {
    version: 1,
    memberVersion: 1,
    role: "viewer",
    status: "Active",
    developerSandbox: false,
  };
  await expect(
    request("/team/members/member_admin", teamSchema, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  ).rejects.toMatchObject({ status: 409 });
  expect(business.team.members[0].role).toBe("admin");
  await expect(
    request("/team/members/member_admin", teamSchema, {
      method: "PATCH",
      body: JSON.stringify({ ...body, role: "admin", status: "Suspended" }),
    }),
  ).rejects.toMatchObject({ status: 409 });
});
it("sandbox grant affects session scope, not banking or production access", async () => {
  const body = {
    version: 1,
    memberVersion: 1,
    role: "developer",
    status: "Active",
    developerSandbox: true,
  };
  await request("/team/members/member_developer", teamSchema, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  db.role = "developer";
  const session = await request("/session", sessionSchema);
  expect(session.permissions).toContain("developer:read");
  await expect(request("/accounts", accountListSchema)).rejects.toMatchObject({
    status: 403,
  });
  db.role = "admin";
  await scenario("no-developer-access");
  db.role = "developer";
  expect((await request("/session", sessionSchema)).permissions).not.toContain(
    "developer:read",
  );
  expect(business.team.productionApi).toBe(false);
});
it("sessions are ownership-scoped and the current session cannot be revoked", async () => {
  const values = () => ({
    method: "DELETE",
    body: JSON.stringify({ version: business.security.version }),
  });
  await expect(
    request(
      "/security/sessions/session_viewer_other",
      securitySchema,
      values(),
    ),
  ).rejects.toMatchObject({ status: 404 });
  await expect(
    request(
      "/security/sessions/session_admin_current",
      securitySchema,
      values(),
    ),
  ).rejects.toMatchObject({ status: 409 });
  const saved = await request(
    "/security/sessions/session_admin_other",
    securitySchema,
    values(),
  );
  expect(saved.sessions.find((s) => !s.current)?.status).toBe("Revoked");
  expect(saved.sessions).toHaveLength(2);
});
it("security policy updates reject stale or unsupported timeouts", async () => {
  await expect(
    request("/security/policy", securitySchema, {
      method: "PATCH",
      body: JSON.stringify({
        version: 1,
        values: { requireMfa: false, sessionTimeoutMinutes: 999 },
      }),
    }),
  ).rejects.toMatchObject({ status: 422 });
  const saved = await request("/security/policy", securitySchema, {
    method: "PATCH",
    body: JSON.stringify({
      version: 1,
      values: { requireMfa: true, sessionTimeoutMinutes: 15 },
    }),
  });
  expect(saved.policy.sessionTimeoutMinutes).toBe(15);
  await expect(
    request("/security/policy", securitySchema, {
      method: "PATCH",
      body: JSON.stringify({
        version: 1,
        values: { requireMfa: false, sessionTimeoutMinutes: 60 },
      }),
    }),
  ).rejects.toMatchObject({ status: 409 });
});
