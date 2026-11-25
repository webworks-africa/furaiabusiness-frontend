import { it, expect } from "vitest";
import { z } from "zod";
import { request } from "./http";
import { config } from "./config";
import {
  reportSchema,
  exportSchema,
  developerSchema,
  appSchema,
  credentialCreated,
  webhookSchema,
  deliverySchema,
  productionSchema,
  webhookInput,
  type ReportFilters,
} from "./platformContracts";
import { linkSchema, attemptSchema } from "./collectionContracts";
import { db, reset } from "../mocks/store";
import { platform } from "../mocks/platformStore";
import { business } from "../mocks/businessStore";
import { billing } from "../mocks/billingStore";
import { agingBucket } from "../mocks/reportSelectors";
const defaults: ReportFilters = {
  kind: "cash-movement",
  currency: "KES",
  from: "2026-10-01",
  to: "2026-10-21",
  search: "",
  bucket: "",
  page: 1,
};
function post<T>(
  path: string,
  body: unknown,
  schema: z.ZodType<T>,
  key: string = crypto.randomUUID(),
) {
  return request(path, schema, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Idempotency-Key": key },
  });
}
function report(changes: Partial<ReportFilters> = {}) {
  return request(
    "/reports/data?" +
      new URLSearchParams(
        Object.entries({ ...defaults, ...changes }).map(([k, v]) => [
          k,
          String(v),
        ]),
      ),
    reportSchema,
  );
}
const workspace = () => request("/developers/workspace", developerSchema);
const credential = (key?: string) =>
  post(
    "/developers/credentials",
    {
      appId: "APP-SBX-001",
      name: "Sandbox test key",
      scopes: ["payments:read"],
    },
    credentialCreated,
    key,
  );
const hook = (key?: string) =>
  post(
    "/developers/webhooks",
    {
      appId: "APP-SBX-001",
      name: "Invoice receiver",
      url: "https://receiver.example.test/furaia",
      events: ["payment.confirmed", "invoice.issued"],
    },
    webhookSchema,
    key,
  );
const testEvent = async (outcome = "failure") => {
  const w = await hook();
  const d = await post(
    `/developers/webhooks/${w.id}/test`,
    { event: "payment.confirmed", outcome },
    deliverySchema,
  );
  return { w, d };
};
it("cash report excludes uncertain/failed records, preserves exact equation and separates currencies", async () => {
  const r = await report();
  const tx = db.transactions.filter(
    (t) =>
      t.currency === "KES" &&
      t.status === "Completed" &&
      t.date.startsWith("2026-10"),
  );
  const net = tx.reduce((n, t) => n + BigInt(t.amountMinor), 0n);
  const summary = Object.fromEntries(
    r.summary.map((x) => [x.label, BigInt(x.minor)]),
  );
  expect(summary["Closing ledger"] - summary["Opening ledger"]).toBe(net);
  expect(r.total).toBe(tx.length);
  expect(r.excludedUnconfirmed).toBe(2);
  const usd = await report({ currency: "USD" });
  expect(usd.total).toBe(2);
  expect(usd.items.every((t) => t.id.startsWith("TXN-USD"))).toBe(true);
  expect((await report({ search: "Safaricom" })).total).toBe(1);
});
it("aging buckets use due dates and current balances without mixing USD", async () => {
  expect(
    [
      "2026-10-22",
      "2026-10-20",
      "2026-09-21",
      "2026-09-20",
      "2026-08-22",
      "2026-08-21",
      "2026-07-22",
    ].map((d) => agingBucket(d, "2026-10-21")),
  ).toEqual([
    "Current",
    "1–30 days",
    "1–30 days",
    "31–60 days",
    "31–60 days",
    "61–90 days",
    "90+ days",
  ]);
  const r = await report({ kind: "receivables-aging" });
  expect(r.items.every((x) => BigInt(x.outstandingMinor) > 0n)).toBe(true);
  const all = await report({ kind: "receivables-aging", search: "missing" });
  expect(all.total).toBe(0);
  expect(all.summary).toEqual(r.summary);
});
it("report filters validate date/order/future/page and service states", async () => {
  await expect(report({ to: "2026-10-23" })).rejects.toMatchObject({
    status: 422,
  });
  await expect(report({ from: "2026-10-22" })).rejects.toMatchObject({
    status: 422,
  });
  await expect(report({ page: 0 })).rejects.toMatchObject({ status: 422 });
  db.scenario = "stale";
  expect((await report()).stale).toBe(true);
  await expect(
    post("/report-exports", defaults, exportSchema),
  ).rejects.toMatchObject({ status: 409 });
  db.scenario = "unavailable";
  await expect(report()).rejects.toMatchObject({ status: 503 });
});
it("invoice allocation changes receivables/reporting but pending does not; report snapshot remains immutable", async () => {
  const before = await report({ kind: "invoice-collection" });
  const exported = await post(
    "/report-exports",
    { ...defaults, kind: "invoice-collection" },
    exportSchema,
  );
  const link = await post(
    "/payment-links",
    {
      invoiceId: "INV-MOCK-101",
      accountId: "acc_kes",
      expires: "2026-11-20",
      partial: true,
    },
    linkSchema,
  );
  const p = await post(
    `/public/checkouts/${link.token}/attempts`,
    { amountMinor: "10000" },
    attemptSchema,
  );
  expect((await report({ kind: "invoice-collection" })).summary).toEqual(
    before.summary,
  );
  await post(
    "/__mock/collection-outcome",
    { outcome: "confirmed" },
    z.object({ ok: z.boolean() }),
  );
  await post(
    `/public/collection-results/${p.token}/inquiry`,
    {},
    attemptSchema,
  );
  const after = await report({ kind: "invoice-collection" });
  const allocations = (r: typeof after) =>
    BigInt(r.summary.find((x) => x.label === "Confirmed allocations")!.minor);
  expect(allocations(after) - allocations(before)).toBe(10000n);
  expect(after.summary.find((x) => x.label === "Issued value")).toEqual(
    before.summary.find((x) => x.label === "Issued value"),
  );
  await request(`/report-exports/${exported.id}`, exportSchema);
  await request(`/report-exports/${exported.id}`, exportSchema);
  const file = await fetch(
    `${config.baseUrl}/report-exports/${exported.id}/download`,
  );
  const csv = await file.text();
  expect(csv).toContain('"Confirmed allocations","0 minor units"');
  expect(csv).not.toContain('"Confirmed allocations","10000 minor units"');
});
it("report exports are idempotent and retry original snapshots after a selected failure", async () => {
  db.scenario = "export-failure";
  const x = await post(
    "/report-exports",
    defaults,
    exportSchema,
    "report-once",
  );
  expect(
    (await post("/report-exports", defaults, exportSchema, "report-once")).id,
  ).toBe(x.id);
  await expect(
    post(
      "/report-exports",
      { ...defaults, currency: "USD" },
      exportSchema,
      "report-once",
    ),
  ).rejects.toMatchObject({ status: 409 });
  await request(`/report-exports/${x.id}`, exportSchema);
  expect((await request(`/report-exports/${x.id}`, exportSchema)).status).toBe(
    "Failed",
  );
  await post(`/report-exports/${x.id}/retry`, {}, exportSchema);
  await request(`/report-exports/${x.id}`, exportSchema);
  expect((await request(`/report-exports/${x.id}`, exportSchema)).status).toBe(
    "Ready",
  );
  expect(platform.exports.get(x.id)!.value.attempt).toBe(2);
});
it("export expiry/read-only permissions and CSV injection protection are enforced", async () => {
  const invoice = billing.documents.find(
    (d) => d.kind === "invoices" && d.snapshot,
  )!;
  invoice.customer.name = "=SUM(1+1)";
  db.scenario = "export-expired";
  const x = await post(
    "/report-exports",
    { ...defaults, kind: "invoice-collection" },
    exportSchema,
  );
  expect(platform.exports.get(x.id)!.csv).toContain("'=SUM(1+1)");
  await request(`/report-exports/${x.id}`, exportSchema);
  expect((await request(`/report-exports/${x.id}`, exportSchema)).status).toBe(
    "Expired",
  );
  expect(
    (await fetch(`${config.baseUrl}/report-exports/${x.id}/download`)).status,
  ).toBe(410);
  db.role = "viewer";
  await expect(report()).resolves.toBeDefined();
  await expect(
    post("/report-exports", defaults, exportSchema),
  ).rejects.toMatchObject({ status: 403 });
  expect(
    (await fetch(`${config.baseUrl}/report-exports/${x.id}/download`)).status,
  ).toBe(403);
});
it("developer access requires business AND member entitlement and is independent of banking", async () => {
  db.role = "finance";
  await expect(workspace()).rejects.toMatchObject({ status: 403 });
  db.role = "developer";
  business.team.members.find(
    (m) => m.id === "member_developer",
  )!.developerSandbox = false;
  await expect(workspace()).rejects.toMatchObject({ status: 403 });
  business.team.members.find(
    (m) => m.id === "member_developer",
  )!.developerSandbox = true;
  expect((await workspace()).productionEnabled).toBe(false);
  await expect(report()).rejects.toMatchObject({ status: 403 });
  business.team.developerSandbox = false;
  await expect(workspace()).rejects.toMatchObject({ status: 403 });
});
it("application create/update validates versions and has no production capability", async () => {
  const body = {
    name: "Accounting worker",
    description: "Daily account reconciliation worker",
    scopes: ["accounts:read"],
  };
  const a = await post("/developers/apps", body, appSchema, "app-once");
  expect((await post("/developers/apps", body, appSchema, "app-once")).id).toBe(
    a.id,
  );
  expect(a.environment).toBe("Sandbox");
  await expect(
    post(
      "/developers/apps",
      { ...body, name: "Changed" },
      appSchema,
      "app-once",
    ),
  ).rejects.toMatchObject({ status: 409 });
  const updated = await post(
    `/developers/apps/${a.id}/update`,
    { ...body, version: a.version, status: "Suspended" },
    appSchema,
  );
  expect(updated.version).toBe(2);
  await expect(
    post(
      `/developers/apps/${a.id}/update`,
      { ...body, version: a.version, status: "Active" },
      appSchema,
    ),
  ).rejects.toMatchObject({ status: 409 });
  expect((await workspace()).productionEnabled).toBe(false);
});
it("credential secret is revealed once and never stored/listed/replayed", async () => {
  const created = await credential("credential-once");
  expect(created.secret).toMatch(/^FURAIA_MOCK_ONLY_/);
  const replay = await credential("credential-once");
  expect(replay.credential.id).toBe(created.credential.id);
  expect(replay.secret).toBeNull();
  expect(replay.deliveredOnce).toBe(true);
  expect(JSON.stringify(await workspace())).not.toContain(created.secret!);
  expect(JSON.stringify([...platform.idempotency.values()])).not.toContain(
    created.secret!,
  );
  expect(JSON.stringify(platform.credentials)).not.toContain(created.secret!);
  const response = await fetch(`${config.baseUrl}/developers/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": "header-test",
    },
    body: JSON.stringify({
      appId: "APP-SBX-001",
      name: "Header test",
      scopes: ["accounts:read"],
    }),
  });
  expect(response.headers.get("Cache-Control")).toBe("no-store");
});
it("rotation revokes previous credential; retry never leaks another secret; revocation persists", async () => {
  const c = (await credential()).credential;
  const body = { version: c.version };
  const next = await post(
    `/developers/credentials/${c.id}/rotate`,
    body,
    credentialCreated,
    "rotate-once",
  );
  expect(next.credential.replaces).toBe(c.id);
  expect(next.secret).toBeTruthy();
  expect(platform.credentials.find((x) => x.id === c.id)!.status).toBe(
    "Revoked",
  );
  expect(
    (
      await post(
        `/developers/credentials/${c.id}/rotate`,
        body,
        credentialCreated,
        "rotate-once",
      )
    ).secret,
  ).toBeNull();
  await expect(
    post(`/developers/credentials/${c.id}/rotate`, body, credentialCreated),
  ).rejects.toMatchObject({ status: 409 });
  const revoked = await post(
    `/developers/credentials/${next.credential.id}/revoke`,
    { version: next.credential.version },
    credentialCreated,
  );
  expect(revoked.secret).toBeNull();
  expect(revoked.credential.status).toBe("Revoked");
});
it("app narrowing/suspension revokes dependent keys and pauses webhooks without restoring them on resume", async () => {
  await credential();
  await hook();
  const a = platform.apps[0];
  await post(
    `/developers/apps/${a.id}/update`,
    {
      name: a.name,
      description: a.description,
      scopes: ["accounts:read"],
      version: a.version,
      status: "Active",
    },
    appSchema,
  );
  expect(platform.credentials[0].status).toBe("Revoked");
  expect(platform.webhooks[0].status).toBe("Paused");
  await expect(credential()).rejects.toMatchObject({ status: 422 });
  const latest = platform.apps[0];
  await post(
    `/developers/apps/${latest.id}/update`,
    { ...latest, status: "Suspended" },
    appSchema,
  );
  await expect(
    post(
      "/developers/credentials",
      { appId: a.id, name: "Another key", scopes: ["accounts:read"] },
      credentialCreated,
    ),
  ).rejects.toMatchObject({ status: 422 });
});
it("webhook URLs are test-only and subscription events fit application scopes", async () => {
  for (const url of [
    "http://receiver.example.test/hook",
    "https://127.0.0.1/hook",
    "https://receiver.example.test/hook?secret=value",
    "https://user:password@receiver.example.test/hook",
    "https://actual.example.com/hook",
  ]) {
    expect(
      webhookInput.safeParse({
        appId: "APP-SBX-001",
        name: "Receiver",
        url,
        events: ["payment.confirmed"],
      }).success,
    ).toBe(false);
  }
  const a = await post(
    "/developers/apps",
    {
      name: "Read-only account app",
      description: "Read-only account scope test",
      scopes: ["accounts:read"],
    },
    appSchema,
  );
  await expect(
    post(
      "/developers/webhooks",
      {
        appId: a.id,
        name: "Denied receiver",
        url: "https://receiver.example.test/hook",
        events: ["payment.confirmed"],
      },
      webhookSchema,
    ),
  ).rejects.toMatchObject({ status: 422 });
});
it("failed webhook retries retain event ID and attempts, are idempotent and never move money", async () => {
  const cash = structuredClone(db.accounts);
  const { d } = await testEvent();
  expect(d.status).toBe("Failed");
  const body = { outcome: "success", attempt: 1 };
  const done = await post(
    `/developers/deliveries/${d.id}/retry`,
    body,
    deliverySchema,
    "retry-once",
  );
  expect(done.eventId).toBe(d.eventId);
  expect(done.attempts.map((a) => a.status)).toEqual([500, 200]);
  expect(done.status).toBe("Delivered");
  expect(
    (
      await post(
        `/developers/deliveries/${d.id}/retry`,
        body,
        deliverySchema,
        "retry-once",
      )
    ).attempts,
  ).toHaveLength(2);
  await expect(
    post(
      `/developers/deliveries/${d.id}/retry`,
      { outcome: "success", attempt: 2 },
      deliverySchema,
    ),
  ).rejects.toMatchObject({ status: 409 });
  expect(db.accounts).toEqual(cash);
});
it("webhook retry limits, paused endpoints and unsubscribed events reject dispatch", async () => {
  const { w, d } = await testEvent("timeout");
  expect(d.attempts[0].status).toBe(504);
  for (const attempt of [1, 2])
    await post(
      `/developers/deliveries/${d.id}/retry`,
      { outcome: "failure", attempt },
      deliverySchema,
    );
  await expect(
    post(
      `/developers/deliveries/${d.id}/retry`,
      { outcome: "success", attempt: 3 },
      deliverySchema,
    ),
  ).rejects.toMatchObject({ status: 409 });
  await expect(
    post(
      `/developers/webhooks/${w.id}/test`,
      { event: "payout.completed", outcome: "success" },
      deliverySchema,
    ),
  ).rejects.toMatchObject({ status: 422 });
  await post(
    `/developers/webhooks/${w.id}/update`,
    { ...w, status: "Paused" },
    webhookSchema,
  );
  await expect(
    post(
      `/developers/webhooks/${w.id}/test`,
      { event: "invoice.issued", outcome: "success" },
      deliverySchema,
    ),
  ).rejects.toMatchObject({ status: 409 });
});
it("production request requires prerequisites/admin, stays pending and cannot grant live access", async () => {
  const body = {
    appId: "APP-SBX-001",
    useCase: "Automated supplier and invoice reconciliation for the business.",
    contactEmail: "developer@example.test",
    securityPlan:
      "Use secure server-held credentials, signed event verification and reconciliation.",
    acknowledged: true,
  };
  await expect(
    post("/developers/production-requests", body, productionSchema),
  ).rejects.toMatchObject({ status: 409 });
  await credential();
  await testEvent("success");
  db.role = "developer";
  business.team.members.find(
    (m) => m.id === "member_developer",
  )!.developerSandbox = true;
  await expect(
    post("/developers/production-requests", body, productionSchema),
  ).rejects.toMatchObject({ status: 403 });
  db.role = "admin";
  const p = await post(
    "/developers/production-requests",
    body,
    productionSchema,
    "production-once",
  );
  expect(p.status).toBe("Pending review");
  expect(
    (
      await post(
        "/developers/production-requests",
        body,
        productionSchema,
        "production-once",
      )
    ).id,
  ).toBe(p.id);
  expect((await workspace()).productionEnabled).toBe(false);
  expect(business.onboarding.productionApi).toBe(false);
});
it("logs redact credentials and customer payloads; reset restores all modules together", async () => {
  const c = await credential();
  await testEvent();
  expect(JSON.stringify((await workspace()).logs)).not.toContain(c.secret!);
  expect(
    (await workspace()).logs.every((l) => !l.detail.includes("Authorization:")),
  ).toBe(true);
  reset();
  expect(platform.credentials).toHaveLength(0);
  expect(platform.webhooks).toHaveLength(0);
  expect(platform.exports.size).toBe(0);
  expect(platform.apps).toHaveLength(1);
  expect(platform.production).toHaveLength(0);
});
