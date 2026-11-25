import { http, HttpResponse } from "msw";
import { server } from "../test/setup";
import { it, expect } from "vitest";
import { z } from "zod";
import { authAdapter } from "../auth/adapter";
import { setCsrf } from "../auth/csrf";
import { endMockSession, mockIdentity } from "../mocks/identityStore";
import { db } from "../mocks/store";
import { business } from "../mocks/businessStore";
import { safeReturnTo, identitySchema } from "./identityContracts";
import { request } from "./http";
import { accountListSchema } from "./contracts";
import { payoutSchema, type Payout } from "./paymentContracts";
const login = (identifier = "admin@business.sandbox") =>
  authAdapter.login({ identifier, challenge: "246810" });
const write = (path: string, body: unknown) =>
  request(path, payoutSchema, {
    method: "POST",
    headers: { "Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify(body),
  });
const action = (p: Payout, name: string) =>
  write(`/payments/${p.id}/${name}`, { version: p.version });
it("anonymous reads and writes are denied, login uses uploaded partner boundary and logout revokes it", async () => {
  endMockSession();
  setCsrf();
  await expect(authAdapter.session()).rejects.toMatchObject({ status: 401 });
  await expect(request("/accounts", accountListSchema)).rejects.toMatchObject({
    status: 401,
  });
  await expect(
    write("/payments", {
      accountId: "acc_kes",
      beneficiaryId: "BEN-MOCK-001",
      amountMinor: "12345",
      reference: "NO-AUTH",
    }),
  ).rejects.toMatchObject({ status: 401 });
  const session = await login();
  expect(session.role).toBe("admin");
  expect(session.permissions).toContain("payments:approve");
  const wire = await request("/partner/v1/sessions", identitySchema);
  expect(wire.surface).toBe("partner");
  expect(wire.scopes[0].kind).toBe("business");
  await authAdapter.logout();
  await expect(request("/accounts", accountListSchema)).rejects.toMatchObject({
    status: 401,
  });
});
it("invalid and wrong-surface credentials do not authenticate and never change cash", async () => {
  endMockSession();
  const before = structuredClone(db.accounts);
  for (const identifier of [
    "operator@staff.sandbox",
    "customer@customer.sandbox",
    "admin@business.sandbox",
  ])
    await expect(
      authAdapter.login({ identifier, challenge: "000000" }),
    ).rejects.toMatchObject({ status: 401 });
  expect(mockIdentity.signedIn).toBe(false);
  expect(db.accounts).toEqual(before);
});
it("server expiry, suspended member and identity service outage remain distinct", async () => {
  await login();
  mockIdentity.expiresAt = Date.now() - 1;
  await expect(authAdapter.session()).rejects.toMatchObject({ status: 401 });
  await login();
  business.team.members.find((m) => m.id === "member_admin")!.status =
    "Suspended";
  await expect(authAdapter.session()).rejects.toMatchObject({ status: 401 });
  db.scenario = "unavailable";
  await expect(authAdapter.session()).rejects.toMatchObject({ status: 503 });
});
it("login roles preserve permission boundaries and do not grant production API", async () => {
  for (const [identifier, role] of [
    ["finance@business.sandbox", "finance"],
    ["viewer@business.sandbox", "viewer"],
    ["developer@partner.sandbox", "developer"],
  ]) {
    const s = await login(identifier);
    expect(s.role).toBe(role);
    expect(s.permissions).not.toContain("developer:production-request");
    if (role === "viewer")
      expect(s.permissions).not.toContain("payments:approve");
  }
  expect(business.team.productionApi).toBe(false);
});
it("signed-in maker/checker keeps approval separate from execution and posts confirmed debit once", async () => {
  const original = structuredClone(db.accounts[0]);
  await login();
  let p = await write("/payments", {
    accountId: "acc_kes",
    beneficiaryId: "BEN-MOCK-001",
    amountMinor: "12345",
    reference: "LOGIN-E2E-APPROVAL",
  });
  p = await action(p, "submit");
  expect(db.accounts[0].ledgerMinor).toBe(original.ledgerMinor);
  expect(BigInt(db.accounts[0].heldMinor)).toBe(
    BigInt(original.heldMinor) + 12345n,
  );
  await expect(action(p, "approve")).rejects.toMatchObject({ status: 403 });
  await authAdapter.logout();
  await login("viewer@business.sandbox");
  await expect(action(p, "approve")).rejects.toMatchObject({ status: 403 });
  await authAdapter.logout();
  await login("finance@business.sandbox");
  p = await action(p, "approve");
  expect(p.status).toBe("Approved");
  expect(db.accounts[0].ledgerMinor).toBe(original.ledgerMinor);
  expect(p.transactionId).toBe(null);
  p = await action(p, "execute");
  expect(p.status).toBe("Pending confirmation");
  p = await action(p, "inquiry");
  expect(p.status).toBe("Pending confirmation");
  await request(
    `/__mock/payouts/${p.id}/outcome`,
    z.object({ ok: z.boolean() }),
    { method: "POST", body: JSON.stringify({ outcome: "confirmed" }) },
  );
  p = await action(p, "inquiry");
  expect(p.status).toBe("Completed");
  expect(BigInt(db.accounts[0].ledgerMinor)).toBe(
    BigInt(original.ledgerMinor) - 12345n,
  );
  expect(db.accounts[0].heldMinor).toBe(original.heldMinor);
  await expect(action(p, "inquiry")).rejects.toMatchObject({ status: 409 });
  expect(BigInt(db.accounts[0].ledgerMinor)).toBe(
    BigInt(original.ledgerMinor) - 12345n,
  );
});
it("return targets reject external, wrong-surface and obfuscated login redirects", () => {
  for (const p of [
    "https://evil.test",
    "//evil.test",
    "/\\evil",
    "/login",
    "/ops/accounts",
    "/app/accounts",
    "/public/payments/a",
    "/partners",
    "/\u0000x",
  ])
    expect(safeReturnTo(p)).toBe("/");
  expect(safeReturnTo("/payments/PAY-1?review=1")).toBe(
    "/payments/PAY-1?review=1",
  );
});

it("required verification or wrong organization scope cannot open the business projection", async () => {
  await login();
  const wire = await request("/partner/v1/sessions", identitySchema);
  for (const altered of [
    { ...wire, mfa: "required" },
    { ...wire, active_scope_id: "40000000-0000-4000-8000-000000000001" },
    { ...wire, scopes: wire.scopes.map((s) => ({ ...s, kind: "individual" })) },
  ]) {
    server.use(
      http.get("*/api/partner/v1/sessions", () => HttpResponse.json(altered)),
    );
    await expect(authAdapter.session()).rejects.toThrow();
  }
});
