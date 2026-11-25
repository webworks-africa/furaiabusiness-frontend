import { http, HttpResponse, delay } from "msw";
import { loginSchema } from "../api/identityContracts";
import { db } from "./store";
import { currentMember, actorSession, business } from "./businessStore";
import {
  mockIdentity,
  beginMockSession,
  endMockSession,
  hasMockSession,
} from "./identityStore";
const denied = (status: number) =>
  HttpResponse.json(
    { error: { code: "MOCK_IDENTITY", message: "Sign-in unavailable" } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
function response() {
  const session = actorSession(db.role);
  const scope = "10000000-0000-4000-8000-000000000001";
  return HttpResponse.json(
    {
      principal_id:
        db.role === "admin"
          ? "20000000-0000-4000-8000-000000000001"
          : db.role === "finance"
            ? "20000000-0000-4000-8000-000000000002"
            : db.role === "developer"
              ? "20000000-0000-4000-8000-000000000003"
              : "20000000-0000-4000-8000-000000000004",
      display_name: session.name,
      surface: "partner",
      active_scope_id: scope,
      environment: "sandbox",
      scopes: [
        {
          id: scope,
          name: session.business,
          kind: "business",
          environments: ["sandbox"],
        },
      ],
      capabilities: session.permissions,
      csrf_token: "MOCK_CSRF_NOT_A_CREDENTIAL",
      expires_at: new Date(mockIdentity.expiresAt).toISOString(),
      idle_expires_at: new Date(mockIdentity.expiresAt).toISOString(),
      mfa: "not_required",
      session_id: "30000000-0000-4000-8000-000000000001",
      server_time: new Date().toISOString(),
      idle_timeout_seconds: 1800,
      warning_before_seconds: 60,
      authorization_version: 1,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
export const identityHandlers = [
  http.get("*/api/partner/v1/sessions", async () => {
    await delay(100);
    if (db.scenario === "unavailable") return denied(503);
    if (
      !hasMockSession() ||
      db.scenario === "expired" ||
      currentMember(db.role)?.status !== "Active"
    )
      return denied(401);
    return response();
  }),
  http.post("*/api/partner/v1/sessions", async ({ request }) => {
    await delay(250);
    if (db.scenario === "unavailable") return denied(503);
    const parsed = loginSchema.safeParse(await request.json());
    if (!parsed.success) return denied(422);
    const roles: Record<string, typeof db.role> = {
      "admin@business.sandbox": "admin",
      "finance@business.sandbox": "finance",
      "developer@partner.sandbox": "developer",
      "viewer@business.sandbox": "viewer",
    };
    const registered = business.team.members.find(
      (m) => m.email.toLowerCase() === parsed.data.identifier.toLowerCase(),
    );
    const role =
      registered?.role ?? roles[parsed.data.identifier.toLowerCase()];
    if (!role || parsed.data.challenge !== "246810") return denied(401);
    db.memberId = registered?.id ?? null;
    if (currentMember(role)?.status !== "Active") return denied(403);
    db.role = role;
    if (db.scenario === "expired") db.scenario = "normal";
    beginMockSession();
    return response();
  }),
  http.delete("*/api/partner/v1/sessions", async () => {
    await delay(100);
    endMockSession();
    return new HttpResponse(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
  }),
];
