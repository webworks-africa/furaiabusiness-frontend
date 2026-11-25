import { z } from "zod";
import type { components } from "./identityGenerated";
export type LoginInput = components["schemas"]["LoginRequest"];
export const loginSchema = z.object({
  identifier: z.string().trim().min(3).max(254),
  challenge: z.string().min(6).max(128),
});
// Matches the uploaded Session contract. Business permissions remain a separate projection.
export const identitySchema: z.ZodType<components["schemas"]["Session"]> =
  z.object({
    principal_id: z.string().uuid(),
    display_name: z.string(),
    surface: z.literal("partner"),
    active_scope_id: z.string().uuid(),
    environment: z.enum(["sandbox", "production"]),
    scopes: z.array(
      z.object({
        id: z.string().uuid(),
        name: z.string(),
        kind: z.enum([
          "legal_entity",
          "individual",
          "business",
          "partner_organization",
        ]),
        environments: z.array(z.enum(["sandbox", "production"])),
      }),
    ),
    capabilities: z.array(z.string()),
    csrf_token: z.string(),
    expires_at: z.string().datetime(),
    idle_expires_at: z.string().datetime(),
    mfa: z.enum(["verified", "required", "not_required"]),
    session_id: z.string().uuid(),
    server_time: z.string().datetime(),
    idle_timeout_seconds: z.number().int().positive(),
    warning_before_seconds: z.number().int().positive(),
    authorization_version: z.number().int().positive(),
  });
export function safeReturnTo(raw: unknown): string {
  if (
    typeof raw !== "string" ||
    !raw.startsWith("/") ||
    raw.startsWith("//") ||
    [...raw].some((c) => c.charCodeAt(0) < 32) ||
    /[\\\s]/.test(raw)
  )
    return "/";
  const url = new URL(raw, "https://furaia.example.test");
  if (
    url.origin !== "https://furaia.example.test" ||
    ["/login", "/public", "/app", "/ops", "/partners"].some(
      (p) => url.pathname === p || url.pathname.startsWith(p + "/"),
    )
  )
    return "/";
  return url.pathname + url.search;
}
