import { http, HttpResponse } from "msw";
import { z } from "zod";
import { guard, mockError } from "./handlers";
import { db, fixedDate } from "./store";
import { platform } from "./platformStore";
import { actorSession, record } from "./businessStore";
import { freshness } from "./selectors";
import { selectReport, reportCsv } from "./reportSelectors";
import {
  reportFilters,
  appInput,
  credentialInput,
  webhookInput,
  eventType,
  eventRequiredScope,
  productionInput,
  type Credential,
  type Delivery,
} from "../api/platformContracts";
import type { Permission } from "../api/contracts";
const json = (v: object) => HttpResponse.json({ ...v, ...freshness() });
async function write(scope: Permission) {
  const e = await guard(scope);
  return e ?? (db.scenario === "stale" ? mockError(409) : undefined);
}
const actor = () => actorSession(db.role).memberId;
const version = z.object({ version: z.number().int().positive() });
function replay(request: Request, body: unknown, type: string) {
  const key = request.headers.get("Idempotency-Key");
  if (!key || key.length > 128) return { error: mockError(422) };
  const scope = actor() + ":" + new URL(request.url).pathname + ":" + key;
  const serialized = JSON.stringify(body);
  const existing = platform.idempotency.get(scope);
  if (existing) {
    if (existing.body !== serialized || existing.type !== type)
      return { error: mockError(409) };
    const value =
      type === "app"
        ? platform.apps.find((a) => a.id === existing.id)
        : type === "credential"
          ? platform.credentials.find((c) => c.id === existing.id)
          : type === "webhook"
            ? platform.webhooks.find((w) => w.id === existing.id)
            : type === "delivery"
              ? platform.deliveries.find((d) => d.id === existing.id)
              : type === "production"
                ? platform.production.find((p) => p.id === existing.id)
                : platform.exports.get(existing.id)?.value;
    return {
      error: value
        ? type === "credential"
          ? HttpResponse.json(
              { credential: value, secret: null, deliveredOnce: true },
              { headers: { "Cache-Control": "no-store" } },
            )
          : json(value)
        : mockError(409),
    };
  }
  return {
    save: (id: string) =>
      platform.idempotency.set(scope, { body: serialized, id, type }),
  };
}
function activity(appId: string, path: string, status = 200) {
  platform.logs.unshift({
    id: `REQ-MOCK-${platform.next++}`,
    appId,
    method: "POST",
    path,
    status,
    at: fixedDate,
    detail:
      "Synthetic control-plane action. Secrets and request bodies are omitted.",
  });
  record(db.role, `Developer ${appId}: ${path}`);
}
function credential(
  appId: string,
  name: string,
  scopes: Credential["scopes"],
  replaces: string | null = null,
) {
  const c: Credential = {
    id: `KEY-SBX-${platform.next++}`,
    version: 1,
    appId,
    name,
    scopes,
    status: "Active",
    prefix: "mock_only_…",
    createdAt: fixedDate,
    replaces,
  };
  platform.credentials.unshift(c);
  return c;
}
function secretResponse(c: Credential) {
  return HttpResponse.json(
    {
      credential: c,
      secret: "FURAIA_MOCK_ONLY_" + crypto.randomUUID(),
      deliveredOnce: false,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
export const platformHandlers = [
  http.get("*/api/reports/data", async ({ request }) => {
    const e = await guard("reports:read");
    if (e) return e;
    const f = reportFilters.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (!f.success || f.data.to > fixedDate.slice(0, 10)) return mockError(422);
    const { allRows: _, ...data } = selectReport(f.data);
    void _;
    return json(data);
  }),
  http.get("*/api/report-exports", async () => {
    const e = await guard("reports:read");
    return (
      e ??
      json({
        items:
          db.scenario === "empty"
            ? []
            : [...platform.exports.values()].map((x) => x.value).reverse(),
      })
    );
  }),
  http.post("*/api/report-exports", async ({ request }) => {
    const e = await write("reports:export");
    if (e) return e;
    const v = reportFilters.safeParse(await request.json());
    if (!v.success || v.data.to > fixedDate.slice(0, 10)) return mockError(422);
    const k = replay(request, v.data, "export");
    if (k.error) return k.error;
    const snapshot = reportCsv(v.data);
    const id = `REPORT-MOCK-${platform.next++}`;
    const value = {
      ...freshness(),
      id,
      kind: v.data.kind,
      currency: v.data.currency,
      from: v.data.from,
      to: v.data.to,
      status: "Queued" as const,
      attempt: 1,
      rowCount: snapshot.rowCount,
      createdAt: fixedDate,
      error: null,
    };
    platform.exports.set(id, {
      value,
      csv: snapshot.csv,
      polls: 0,
      failOnce: db.scenario === "export-failure",
    });
    k.save!(id);
    return json(value);
  }),
  http.get("*/api/report-exports/:id", async ({ params }) => {
    const e = await guard("reports:read");
    if (e) return e;
    const job = platform.exports.get(String(params.id));
    if (!job) return mockError(404);
    if (["Queued", "Generating"].includes(job.value.status)) {
      job.polls++;
      if (job.polls === 1) job.value.status = "Generating";
      else if (job.failOnce) {
        job.failOnce = false;
        job.value.status = "Failed";
        job.value.error = "Simulated generation failure";
      } else
        job.value.status =
          db.scenario === "export-expired" ? "Expired" : "Ready";
    }
    return json(job.value);
  }),
  http.post("*/api/report-exports/:id/retry", async ({ params }) => {
    const e = await write("reports:export");
    if (e) return e;
    const job = platform.exports.get(String(params.id));
    if (!job) return mockError(404);
    if (job.value.status !== "Failed") return mockError(409);
    job.value.status = "Queued";
    job.value.attempt++;
    job.value.error = null;
    job.polls = 0;
    return json(job.value);
  }),
  http.get("*/api/report-exports/:id/download", async ({ params }) => {
    const e = await guard("reports:export");
    if (e) return e;
    const job = platform.exports.get(String(params.id));
    if (!job) return mockError(404);
    if (job.value.status === "Expired") return mockError(410);
    if (job.value.status !== "Ready") return mockError(409);
    return new HttpResponse(job.csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${job.value.id}.csv"`,
      },
    });
  }),
  http.get("*/api/developers/workspace", async () => {
    const e = await guard("developer:read");
    return (
      e ??
      json({
        apps: db.scenario === "empty" ? [] : platform.apps,
        credentials: db.scenario === "empty" ? [] : platform.credentials,
        webhooks: db.scenario === "empty" ? [] : platform.webhooks,
        deliveries: db.scenario === "empty" ? [] : platform.deliveries,
        production: db.scenario === "empty" ? [] : platform.production,
        logs: db.scenario === "empty" ? [] : platform.logs,
        productionEnabled: false,
      })
    );
  }),
  http.post("*/api/developers/apps", async ({ request }) => {
    const e = await write("developer:manage");
    if (e) return e;
    const v = appInput.safeParse(await request.json());
    if (!v.success) return mockError(422);
    const k = replay(request, v.data, "app");
    if (k.error) return k.error;
    if (
      platform.apps.some(
        (a) => a.name.toLowerCase() === v.data.name.toLowerCase(),
      )
    )
      return mockError(409);
    const a = {
      ...v.data,
      id: `APP-SBX-${platform.next++}`,
      version: 1,
      status: "Active" as const,
      environment: "Sandbox" as const,
      createdAt: fixedDate,
    };
    platform.apps.unshift(a);
    k.save!(a.id);
    activity(a.id, "Application registered");
    return json(a);
  }),
  http.post("*/api/developers/apps/:id/update", async ({ params, request }) => {
    const e = await write("developer:manage");
    if (e) return e;
    const v = appInput
      .extend({
        version: z.number().int(),
        status: z.enum(["Active", "Suspended"]),
      })
      .safeParse(await request.json());
    if (!v.success) return mockError(422);
    const k = replay(request, v.data, "app");
    if (k.error) return k.error;
    const a = platform.apps.find((a) => a.id === params.id);
    if (!a) return mockError(404);
    if (a.version !== v.data.version) return mockError(409);
    if (
      platform.apps.some(
        (x) =>
          x.id !== a.id && x.name.toLowerCase() === v.data.name.toLowerCase(),
      )
    )
      return mockError(409);
    Object.assign(a, v.data, { version: a.version + 1 });
    for (const c of platform.credentials.filter(
      (c) => c.appId === a.id && c.status === "Active",
    )) {
      if (
        a.status === "Suspended" ||
        c.scopes.some((s) => !a.scopes.includes(s))
      ) {
        c.status = "Revoked";
        c.version++;
      }
    }
    for (const w of platform.webhooks.filter((w) => w.appId === a.id)) {
      if (
        a.status === "Suspended" ||
        w.events.some((e) => !a.scopes.includes(eventRequiredScope[e]))
      ) {
        if (w.status !== "Paused") {
          w.status = "Paused";
          w.version++;
        }
      }
    }
    k.save!(a.id);
    activity(
      a.id,
      "Application updated; dependent credentials and webhooks revalidated",
    );
    return json(a);
  }),
  http.post("*/api/developers/credentials", async ({ request }) => {
    const e = await write("developer:credentials");
    if (e) return e;
    const v = credentialInput.safeParse(await request.json());
    if (!v.success) return mockError(422);
    const k = replay(request, v.data, "credential");
    if (k.error) return k.error;
    const a = platform.apps.find(
      (a) => a.id === v.data.appId && a.status === "Active",
    );
    if (!a || v.data.scopes.some((s) => !a.scopes.includes(s)))
      return mockError(422);
    const c = credential(a.id, v.data.name, v.data.scopes);
    k.save!(c.id);
    activity(a.id, "Credential created; one-time secret omitted from history");
    return secretResponse(c);
  }),
  http.post(
    "*/api/developers/credentials/:id/:action",
    async ({ params, request }) => {
      const e = await write("developer:credentials");
      if (e) return e;
      const v = version.safeParse(await request.json());
      if (!v.success) return mockError(422);
      const k = replay(request, v.data, "credential");
      if (k.error) return k.error;
      const c = platform.credentials.find((c) => c.id === params.id);
      if (!c) return mockError(404);
      if (c.version !== v.data.version || c.status !== "Active")
        return mockError(409);
      const action = String(params.action);
      if (!["rotate", "revoke"].includes(action)) return mockError(404);
      if (
        action === "rotate" &&
        !platform.apps.some((a) => a.id === c.appId && a.status === "Active")
      )
        return mockError(409);
      c.status = "Revoked";
      c.version++;
      const result =
        action === "rotate" ? credential(c.appId, c.name, c.scopes, c.id) : c;
      k.save!(result.id);
      activity(
        c.appId,
        action === "rotate"
          ? "Credential rotated; previous credential revoked"
          : "Credential revoked",
      );
      return action === "rotate"
        ? secretResponse(result)
        : HttpResponse.json({
            credential: result,
            secret: null,
            deliveredOnce: true,
          });
    },
  ),
  http.post("*/api/developers/webhooks", async ({ request }) => {
    const e = await write("developer:webhooks");
    if (e) return e;
    const v = webhookInput.safeParse(await request.json());
    if (!v.success) return mockError(422);
    const k = replay(request, v.data, "webhook");
    if (k.error) return k.error;
    if (
      !platform.apps.some((a) => a.id === v.data.appId && a.status === "Active")
    )
      return mockError(409);
    if (
      platform.webhooks.some(
        (w) => w.appId === v.data.appId && w.url === v.data.url,
      )
    )
      return mockError(409);
    if (
      v.data.events.some(
        (e) =>
          !platform.apps
            .find((a) => a.id === v.data.appId)!
            .scopes.includes(eventRequiredScope[e]),
      )
    )
      return mockError(422);
    const w = {
      ...v.data,
      id: `WH-SBX-${platform.next++}`,
      version: 1,
      status: "Active" as const,
    };
    platform.webhooks.unshift(w);
    k.save!(w.id);
    activity(w.appId, "Webhook registered (no external connection)");
    return json(w);
  }),
  http.post(
    "*/api/developers/webhooks/:id/update",
    async ({ params, request }) => {
      const e = await write("developer:webhooks");
      if (e) return e;
      const v = webhookInput
        .extend({
          version: z.number().int(),
          status: z.enum(["Active", "Paused"]),
        })
        .safeParse(await request.json());
      if (!v.success) return mockError(422);
      const k = replay(request, v.data, "webhook");
      if (k.error) return k.error;
      const w = platform.webhooks.find((w) => w.id === params.id);
      if (!w) return mockError(404);
      if (w.version !== v.data.version || v.data.appId !== w.appId)
        return mockError(409);
      if (!platform.apps.some((a) => a.id === w.appId && a.status === "Active"))
        return mockError(409);
      if (
        v.data.events.some(
          (e) =>
            !platform.apps
              .find((a) => a.id === w.appId)!
              .scopes.includes(eventRequiredScope[e]),
        )
      )
        return mockError(422);
      Object.assign(w, v.data, { version: w.version + 1 });
      k.save!(w.id);
      activity(w.appId, "Webhook subscriptions/status updated");
      return json(w);
    },
  ),
  http.post(
    "*/api/developers/webhooks/:id/test",
    async ({ params, request }) => {
      const e = await write("developer:webhooks");
      if (e) return e;
      const v = z
        .object({
          event: eventType,
          outcome: z.enum(["success", "failure", "timeout"]),
        })
        .safeParse(await request.json());
      if (!v.success) return mockError(422);
      const k = replay(request, v.data, "delivery");
      if (k.error) return k.error;
      const w = platform.webhooks.find(
        (w) => w.id === params.id && w.status === "Active",
      );
      if (
        !w ||
        !platform.apps.some((a) => a.id === w.appId && a.status === "Active")
      )
        return mockError(409);
      if (
        !w.events.includes(v.data.event) ||
        !platform.apps
          .find((a) => a.id === w.appId)!
          .scopes.includes(eventRequiredScope[v.data.event])
      )
        return mockError(422);
      const success = v.data.outcome === "success";
      const d: Delivery = {
        id: `DLV-MOCK-${platform.next++}`,
        webhookId: w.id,
        eventId: `EVT-MOCK-${platform.next++}`,
        event: v.data.event,
        status: success ? "Delivered" : "Failed",
        payload: {
          event: v.data.event,
          reference: "REDACTED-TEST-REFERENCE",
          simulated: true,
        },
        attempts: [
          {
            number: 1,
            status: success ? 200 : v.data.outcome === "timeout" ? 504 : 500,
            at: fixedDate,
            detail: success
              ? "Simulated receiver acknowledgement; no outbound HTTP"
              : "Simulated receiver failure; no outbound HTTP",
          },
        ],
      };
      platform.deliveries.unshift(d);
      k.save!(d.id);
      activity(w.appId, "Webhook test recorded", success ? 200 : 500);
      return json(d);
    },
  ),
  http.post(
    "*/api/developers/deliveries/:id/retry",
    async ({ params, request }) => {
      const e = await write("developer:webhooks");
      if (e) return e;
      const v = z
        .object({
          outcome: z.enum(["success", "failure"]),
          attempt: z.number().int(),
        })
        .safeParse(await request.json());
      if (!v.success) return mockError(422);
      const k = replay(request, v.data, "delivery");
      if (k.error) return k.error;
      const d = platform.deliveries.find((d) => d.id === params.id);
      if (!d) return mockError(404);
      const w = platform.webhooks.find((w) => w.id === d.webhookId);
      if (
        !w ||
        w.status !== "Active" ||
        !platform.apps.some((a) => a.id === w.appId && a.status === "Active")
      )
        return mockError(409);
      if (
        d.status !== "Failed" ||
        d.attempts.length !== v.data.attempt ||
        d.attempts.length >= 3
      )
        return mockError(409);
      const success = v.data.outcome === "success";
      d.attempts.push({
        number: d.attempts.length + 1,
        status: success ? 200 : 500,
        at: fixedDate,
        detail: "Manual simulated retry; original event ID retained",
      });
      d.status = success ? "Delivered" : "Failed";
      k.save!(d.id);
      activity(w.appId, "Webhook delivery retried", success ? 200 : 500);
      return json(d);
    },
  ),
  http.post("*/api/developers/production-requests", async ({ request }) => {
    const e = await write("developer:production-request");
    if (e) return e;
    const v = productionInput.safeParse(await request.json());
    if (!v.success) return mockError(422);
    const k = replay(request, v.data, "production");
    if (k.error) return k.error;
    const a = platform.apps.find(
      (a) => a.id === v.data.appId && a.status === "Active",
    );
    if (!a || platform.production.some((p) => p.appId === a.id))
      return mockError(409);
    const hooks = platform.webhooks.filter(
      (w) => w.appId === a.id && w.status === "Active",
    );
    if (
      !platform.credentials.some(
        (c) => c.appId === a.id && c.status === "Active",
      ) ||
      !platform.deliveries.some(
        (d) =>
          hooks.some((w) => w.id === d.webhookId) && d.status === "Delivered",
      )
    )
      return mockError(409);
    const p = {
      ...v.data,
      id: `PROD-REQUEST-${platform.next++}`,
      status: "Pending review" as const,
      at: fixedDate,
    };
    platform.production.unshift(p);
    k.save!(p.id);
    activity(a.id, "Production review requested; no live access granted");
    return json(p);
  }),
];
