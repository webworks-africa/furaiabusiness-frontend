import { z } from "zod";
import { request } from "../api/http";
import { sessionSchema, type Permission } from "../api/contracts";
import { identitySchema, type LoginInput } from "../api/identityContracts";
import { setCsrf } from "./csrf";
export interface AuthAdapter {
  session: typeof loadSession;
  login: typeof login;
  logout: typeof logout;
}
async function loadSession() {
  const identity = await request("/partner/v1/sessions", identitySchema, {
    cache: "no-store",
  });
  if (identity.mfa === "required")
    throw new Error(
      "Additional verification is required by the identity service.",
    );
  const deadline = Math.min(
    Date.parse(identity.expires_at),
    Date.parse(identity.idle_expires_at),
  );
  if (
    deadline <= Date.parse(identity.server_time) ||
    !identity.scopes.some(
      (s) =>
        s.id === identity.active_scope_id &&
        s.kind !== "individual" &&
        s.environments.includes(identity.environment),
    )
  )
    throw new Error("Business session scope is unavailable.");
  setCsrf(identity.csrf_token);
  const session = await request("/session", sessionSchema, {
    cache: "no-store",
  });
  return {
    ...session,
    deadline,
    serverOffset: Date.parse(identity.server_time) - Date.now(),
  };
}
async function login(input: LoginInput) {
  const identity = await request("/partner/v1/sessions", identitySchema, {
    method: "POST",
    body: JSON.stringify(input),
    cache: "no-store",
  });
  setCsrf(identity.csrf_token);
  return loadSession();
}
async function logout() {
  await request("/partner/v1/sessions", z.undefined(), { method: "DELETE" });
  setCsrf();
}
export const authAdapter: AuthAdapter = { session: loadSession, login, logout };
export function can(permissions: Permission[], permission: Permission) {
  return permissions.includes(permission);
}
