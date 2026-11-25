import { useEffect, useRef, useState } from "react";
import {
  Link,
  NavLink,
  useNavigate,
  useParams,
  useLocation,
} from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import { Code, KeyRound, ShieldCheck } from "lucide-react";
import {
  useDeveloper,
  usePlatformWrite,
  credentialAction,
} from "../application/platform";
import { useSession } from "../application/queries";
import {
  appInput,
  appSchema,
  apiScope,
  credentialInput,
  webhookInput,
  webhookSchema,
  eventType,
  deliverySchema,
  productionInput,
  productionSchema,
  type DeveloperApp,
  type Credential,
  type Webhook,
  type CredentialCreated,
  developerSchema,
} from "../api/platformContracts";
import { can } from "../auth/adapter";
import { StatePanel, Empty } from "../components/StatePanel";
import { Freshness, StatusBadge } from "../components/Freshness";
import {
  Field,
  MutationMessage,
  VersionNotice,
} from "../components/BusinessForms";
import { BillingTable } from "../components/BillingTable";
import { Button } from "../components/ui/button";
import { DeveloperDocumentation } from "./DeveloperDocumentation";
const links = [
  ["", "Overview"],
  ["applications", "Applications"],
  ["credentials", "API credentials"],
  ["webhooks", "Webhooks"],
  ["logs", "Request logs"],
  ["docs", "Documentation"],
  ["production-access", "Production access"],
];
export function DeveloperNav() {
  return (
    <nav className="page-tabs developer-tabs" aria-label="Developer sections">
      {links.map(([path, label]) => (
        <NavLink
          key={path}
          end={!path}
          to={`/developers${path ? "/" + path : ""}`}
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
type Workspace = z.infer<typeof developerSchema>;
export function DeveloperPage() {
  const q = useDeveloper();
  const session = useSession();
  const location = useLocation();
  const { id = "", delivery = "" } = useParams();
  const page = location.pathname.split("/")[2] ?? "";
  if (q.isPending) return <StatePanel />;
  if (q.error)
    return <StatePanel error={q.error} retry={() => void q.refetch()} />;
  const permissions = session.data?.permissions ?? [];
  const write = !q.data.stale && can(permissions, "developer:manage");
  return (
    <>
      <div className="developer-banner">
        <Code size={18} />
        <strong>Developer sandbox</strong>
        <span>Simulated integrations · Production access not granted</span>
      </div>
      <DeveloperNav />
      <Freshness {...q.data} refresh={() => void q.refetch()} />
      {page === "" ? (
        <DeveloperOverview data={q.data} />
      ) : page === "applications" ? (
        id ? (
          q.data.apps.some((a) => a.id === id) ? (
            <ApplicationEditor
              key={id}
              app={q.data.apps.find((a) => a.id === id)}
              allowed={write}
            />
          ) : (
            <Empty
              title="Application not found"
              detail="Choose an application from the inventory."
            />
          )
        ) : (
          <Applications data={q.data} allowed={write} />
        )
      ) : page === "credentials" ? (
        <Credentials
          key={`${session.data?.memberId}:${can(permissions, "developer:credentials")}:${q.data.stale}`}
          data={q.data}
          allowed={!q.data.stale && can(permissions, "developer:credentials")}
        />
      ) : page === "webhooks" ? (
        delivery ? (
          <DeliveryDetail
            data={q.data}
            id={delivery}
            hookId={id}
            allowed={!q.data.stale && can(permissions, "developer:webhooks")}
          />
        ) : (
          <Webhooks
            data={q.data}
            allowed={!q.data.stale && can(permissions, "developer:webhooks")}
          />
        )
      ) : page === "logs" ? (
        <RequestLogs data={q.data} />
      ) : page === "docs" ? (
        <DeveloperDocumentation />
      ) : page === "production-access" ? (
        <ProductionAccess
          data={q.data}
          allowed={
            !q.data.stale && can(permissions, "developer:production-request")
          }
        />
      ) : (
        <Empty
          title="Developer page not found"
          detail="Choose a developer section above."
        />
      )}
    </>
  );
}
function DeveloperOverview({ data }: { data: Workspace }) {
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Developer platform & API overview</h1>
          <p>
            Manage entitled sandbox applications, credentials and event
            subscriptions.
          </p>
        </div>
        <Link className="button button-primary" to="/developers/applications">
          Register application
        </Link>
      </div>
      <div className="payment-metrics">
        <section className="panel">
          <small>Sandbox applications</small>
          <h2>{data.apps.filter((a) => a.status === "Active").length}</h2>
          <p>
            {data.credentials.filter((c) => c.status === "Active").length}{" "}
            active credentials
          </p>
        </section>
        <section className="panel">
          <small>Webhook delivery tests</small>
          <h2>
            {data.deliveries.filter((d) => d.status === "Delivered").length}{" "}
            delivered
          </h2>
          <p>
            {data.deliveries.filter((d) => d.status === "Failed").length} failed
            · simulated receiver outcomes
          </p>
        </section>
        <section className="panel">
          <small>Production access</small>
          <h2>Not enabled</h2>
          <p>
            {data.production.length} review requests. Sandbox entitlement never
            grants live access.
          </p>
        </section>
      </div>
      <div className="two-grid">
        <section className="panel">
          <h2>Sandbox setup</h2>
          <ol className="workflow-steps">
            <li>
              <Link to="/developers/applications">
                Register an application and select least-privilege scopes.
              </Link>
            </li>
            <li>
              <Link to="/developers/credentials">
                Create a credential; save its one-time mock secret.
              </Link>
            </li>
            <li>
              <Link to="/developers/webhooks">
                Configure subscriptions and test receiver failures/retries.
              </Link>
            </li>
            <li>
              <Link to="/developers/production-access">
                Request a separate production review.
              </Link>
            </li>
          </ol>
        </section>
        <section className="panel">
          <ShieldCheck />
          <h2>Independent permissions</h2>
          <p>
            Developer access requires both business and member sandbox
            entitlement. Finance/banking membership alone does not grant it.
            Real authorization and issuer/rail integration remain backend
            responsibilities.
          </p>
          <Link to="/developers/docs">Read proposed integration guide →</Link>
        </section>
      </div>
    </>
  );
}
function Applications({
  data,
  allowed,
}: {
  data: Workspace;
  allowed: boolean;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const items = data.apps.filter((a) =>
    `${a.name} ${a.id}`.toLowerCase().includes(search.toLowerCase()),
  );
  const columns: ColumnDef<DeveloperApp>[] = [
    {
      accessorKey: "name",
      header: "Application",
      cell: ({ row }) => (
        <Link to={`/developers/applications/${row.original.id}`}>
          {row.original.name}
        </Link>
      ),
    },
    { accessorKey: "id", header: "Client ID" },
    {
      accessorKey: "scopes",
      header: "Granted scopes",
      cell: ({ row }) => row.original.scopes.join(" · "),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
  ];
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Applications & sandbox clients</h1>
          <p>
            Application-scoped permissions; no OAuth server or live client
            access is implied.
          </p>
        </div>
      </div>
      <div className="f7-split">
        <section className="panel">
          <h2>Registered applications</h2>
          <label>
            Search applications
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </label>
          {items.length ? (
            <BillingTable
              items={items.slice((page - 1) * 6, page * 6)}
              columns={columns}
              label="Sandbox applications"
              page={page}
              pages={Math.max(1, Math.ceil(items.length / 6))}
              total={items.length}
              onPage={setPage}
            />
          ) : (
            <Empty
              title="No applications"
              detail="Register an entitled sandbox application to begin."
            />
          )}
        </section>
        <ApplicationEditor allowed={allowed} />
      </div>
    </>
  );
}
function ApplicationEditor({
  app,
  allowed,
}: {
  app?: DeveloperApp;
  allowed: boolean;
}) {
  const [version, setVersion] = useState(app?.version);
  const [status, setStatus] = useState(app?.status ?? "Active");
  const [key, setKey] = useState(() => crypto.randomUUID());
  const mutation = usePlatformWrite(appSchema);
  const navigate = useNavigate();
  const form = useForm<z.infer<typeof appInput>>({
    resolver: zodResolver(appInput),
    defaultValues: app
      ? { name: app.name, description: app.description, scopes: app.scopes }
      : { name: "", description: "", scopes: [] },
  });
  return (
    <section className="panel">
      {app ? <h1>{app.name}</h1> : <h2>Register application</h2>}
      {app && version !== undefined && (
        <VersionNotice
          local={version}
          server={app.version}
          reload={() => {
            form.reset(app);
            setVersion(app.version);
            setStatus(app.status);
          }}
        />
      )}
      <form
        onSubmit={form.handleSubmit(async (v) => {
          try {
            const a = await mutation.mutateAsync({
              path: app
                ? `/developers/apps/${app.id}/update`
                : "/developers/apps",
              body: app ? { ...v, version, status } : v,
              key,
            });
            setVersion(a.version);
            setKey(crypto.randomUUID());
            navigate(`/developers/applications/${a.id}`);
          } catch {
            /* Error below. */
          }
        })}
      >
        <fieldset
          className="plain-fieldset"
          disabled={
            !allowed || mutation.isPending || !!(app && app.version !== version)
          }
        >
          <Field
            id="app-name"
            label="Application name"
            error={form.formState.errors.name?.message}
          >
            <input id="app-name" {...form.register("name")} />
          </Field>
          <Field
            id="app-description"
            label="Application purpose"
            error={form.formState.errors.description?.message}
          >
            <textarea id="app-description" {...form.register("description")} />
          </Field>
          <fieldset className="scope-options">
            <legend>Application scopes</legend>
            {apiScope.options.map((s) => (
              <label className="checkbox-label" key={s}>
                <input type="checkbox" value={s} {...form.register("scopes")} />
                {s}
              </label>
            ))}
          </fieldset>
          {form.formState.errors.scopes && (
            <p className="field-error" role="alert">
              {form.formState.errors.scopes.message}
            </p>
          )}
          {app && (
            <label>
              Application status
              <select
                aria-label="Application status"
                value={status}
                onChange={(e) => setStatus(e.target.value as typeof status)}
              >
                <option>Active</option>
                <option>Suspended</option>
              </select>
            </label>
          )}
          <p>
            Suspension revokes active credentials. Removing scopes revokes
            credentials that exceed the new scope. Reactivation does not restore
            revoked credentials.
          </p>
          <Button>
            {app ? "Save application" : "Create sandbox application"}
          </Button>
        </fieldset>
        <MutationMessage
          error={mutation.error}
          success={mutation.isSuccess ? "Application saved." : undefined}
        />
      </form>
      {app && (
        <div className="action-row">
          <Link to="/developers/credentials">Manage credentials →</Link>
          <Link to="/developers/applications">All applications →</Link>
        </div>
      )}
    </section>
  );
}
function Credentials({ data, allowed }: { data: Workspace; allowed: boolean }) {
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [secret, setSecret] = useState<CredentialCreated>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const controller = useRef<AbortController | undefined>(undefined);
  const [key, setKey] = useState(() => crypto.randomUUID());
  const form = useForm<z.infer<typeof credentialInput>>({
    resolver: zodResolver(credentialInput),
    defaultValues: { appId: "", name: "", scopes: [] },
  });
  const app = data.apps.find((a) => a.id === form.watch("appId"));
  useEffect(() => {
    const clear = () => {
      controller.current?.abort();
      setSecret(undefined);
      setBusy(false);
    };
    const hidden = () => {
      if (document.hidden) clear();
    };
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      controller.current?.abort();
      window.removeEventListener("blur", clear);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, []);
  useEffect(() => {
    if (!secret) return;
    const timer = setTimeout(() => setSecret(undefined), 60000);
    return () => clearTimeout(timer);
  }, [secret]);
  async function run(path: string, body: unknown, requestKey: string) {
    if (!allowed) return;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setBusy(true);
    setError(null);
    setSecret(undefined);
    try {
      const value = await credentialAction(
        path,
        body,
        requestKey,
        abort.signal,
      );
      if (abort.signal.aborted) return;
      setSecret(value);
      if (path === "/developers/credentials")
        form.reset({ appId: value.credential.appId, name: "", scopes: [] });
      setBusy(false);
      setKey(crypto.randomUUID());
      await client.invalidateQueries({ queryKey: ["developer-workspace"] });
    } catch (e) {
      if (!abort.signal.aborted) {
        setBusy(false);
        setError(e as Error);
        void client.invalidateQueries({ queryKey: ["developer-workspace"] });
      }
    }
  }
  const columns: ColumnDef<Credential>[] = [
    {
      accessorKey: "name",
      header: "Credential",
      cell: ({ row }) => (
        <>
          <strong>{row.original.name}</strong>
          <small className="cell-note">
            {row.original.id} · {row.original.prefix}
          </small>
        </>
      ),
    },
    { accessorKey: "appId", header: "Application" },
    {
      accessorKey: "scopes",
      header: "Scopes",
      cell: ({ row }) => row.original.scopes.join(" · "),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) =>
        row.original.status === "Active" && (
          <div className="action-row">
            <Button
              variant="outline"
              disabled={!allowed || busy}
              onClick={() =>
                void run(
                  `/developers/credentials/${row.original.id}/rotate`,
                  { version: row.original.version },
                  crypto.randomUUID(),
                )
              }
            >
              Rotate credential
            </Button>
            <Button
              variant="outline"
              disabled={!allowed || busy}
              onClick={() =>
                void run(
                  `/developers/credentials/${row.original.id}/revoke`,
                  { version: row.original.version },
                  crypto.randomUUID(),
                )
              }
            >
              Revoke credential
            </Button>
          </div>
        ),
    },
  ];
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>API credentials & secrets</h1>
          <p>
            Sandbox-only credentials. Secrets are returned once and cannot be
            reopened.
          </p>
        </div>
      </div>
      {secret && (
        <section
          className="panel secret-panel"
          aria-label="One-time credential secret"
        >
          <KeyRound />
          <h2>
            {secret.secret
              ? "API secret generated — reveal once"
              : "Credential state updated"}
          </h2>
          <p>
            {secret.credential.id} · {secret.credential.appId} ·{" "}
            {secret.credential.scopes.join(" · ")}
          </p>
          {secret.secret ? (
            <>
              <p>
                Non-functional development secret. Closing, leaving, switching
                windows or 60 seconds removes this display.
              </p>
              <code className="secret-value">{secret.secret}</code>
            </>
          ) : (
            <p>
              {secret.credential.status === "Revoked"
                ? "Credential revoked."
                : "The secret was already delivered. It cannot be retrieved again; rotate if needed."}
            </p>
          )}
          <Button variant="outline" onClick={() => setSecret(undefined)}>
            Done & close secret
          </Button>
        </section>
      )}
      <div className="f7-split">
        <section className="panel">
          <h2>Credential inventory</h2>
          {data.credentials.length ? (
            <BillingTable
              items={data.credentials.slice((page - 1) * 6, page * 6)}
              columns={columns}
              label="API credentials"
              page={page}
              pages={Math.max(1, Math.ceil(data.credentials.length / 6))}
              total={data.credentials.length}
              onPage={setPage}
            />
          ) : (
            <Empty
              title="No credentials"
              detail="Create a scoped sandbox credential for an active application."
            />
          )}
        </section>
        <section className="panel">
          <h2>Create credential</h2>
          <form
            onSubmit={form.handleSubmit((v) =>
              run("/developers/credentials", v, key),
            )}
          >
            <fieldset className="plain-fieldset" disabled={!allowed || busy}>
              <Field
                id="key-app"
                label="Credential application"
                error={form.formState.errors.appId?.message}
              >
                <select
                  id="key-app"
                  {...form.register("appId", {
                    onChange: () => form.setValue("scopes", []),
                  })}
                >
                  <option value="">Select application</option>
                  {data.apps
                    .filter((a) => a.status === "Active")
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                </select>
              </Field>
              <Field
                id="key-name"
                label="Credential name"
                error={form.formState.errors.name?.message}
              >
                <input id="key-name" {...form.register("name")} />
              </Field>
              <fieldset className="scope-options">
                <legend>Credential scopes</legend>
                {apiScope.options.map((s) => (
                  <label key={s} className="checkbox-label">
                    <input
                      disabled={!app?.scopes.includes(s)}
                      type="checkbox"
                      value={s}
                      {...form.register("scopes")}
                    />
                    {s}
                  </label>
                ))}
              </fieldset>
              {form.formState.errors.scopes && (
                <p role="alert" className="field-error">
                  {form.formState.errors.scopes.message}
                </p>
              )}
              <Button>Create one-time credential</Button>
            </fieldset>
          </form>
        </section>
      </div>
      <MutationMessage error={error} />
      <div className="notice">
        Rotating immediately revokes the previous credential in this simulation.
        Backend overlap/expiry and secure step-up policies await confirmation.
        No mock secret authenticates a real API.
      </div>
    </>
  );
}
function Webhooks({ data, allowed }: { data: Workspace; allowed: boolean }) {
  const [page, setPage] = useState(1);
  const mutation = usePlatformWrite(webhookSchema);
  const [key, setKey] = useState(() => crypto.randomUUID());
  const form = useForm<z.infer<typeof webhookInput>>({
    resolver: zodResolver(webhookInput),
    defaultValues: {
      name: "",
      appId: "",
      url: "https://receiver.example.test/furaia",
      events: [],
    },
  });
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Webhook endpoints & subscriptions</h1>
          <p>
            Simulate receiver acknowledgements, failures and manual retries. No
            outbound requests are sent.
          </p>
        </div>
      </div>
      <div className="f7-split">
        <div>
          {data.webhooks.length ? (
            data.webhooks
              .slice((page - 1) * 6, page * 6)
              .map((w) => (
                <WebhookEditor
                  key={w.id}
                  webhook={w}
                  data={data}
                  allowed={allowed}
                />
              ))
          ) : (
            <section className="panel">
              <Empty
                title="No webhook endpoints"
                detail="Register a simulated endpoint and choose events."
              />
            </section>
          )}
          <div className="action-row">
            <Button
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous endpoints
            </Button>
            <span>Page {page}</span>
            <Button
              variant="outline"
              disabled={page * 6 >= data.webhooks.length}
              onClick={() => setPage(page + 1)}
            >
              Next endpoints
            </Button>
          </div>
        </div>
        <section className="panel">
          <h2>Add webhook endpoint</h2>
          <form
            onSubmit={form.handleSubmit(async (v) => {
              try {
                await mutation.mutateAsync({
                  path: "/developers/webhooks",
                  body: v,
                  key,
                });
                form.reset();
                setKey(crypto.randomUUID());
              } catch {
                /* Error below. */
              }
            })}
          >
            <fieldset
              disabled={!allowed || mutation.isPending}
              className="plain-fieldset"
            >
              <Field
                id="hook-app"
                label="Webhook application"
                error={form.formState.errors.appId?.message}
              >
                <select id="hook-app" {...form.register("appId")}>
                  <option value="">Select application</option>
                  {data.apps
                    .filter((a) => a.status === "Active")
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                </select>
              </Field>
              <Field
                id="hook-name"
                label="Webhook name"
                error={form.formState.errors.name?.message}
              >
                <input id="hook-name" {...form.register("name")} />
              </Field>
              <Field
                id="hook-url"
                label="Receiver URL"
                error={form.formState.errors.url?.message}
              >
                <input id="hook-url" type="url" {...form.register("url")} />
              </Field>
              <p>
                Use HTTPS *.example.test addresses for simulations. URLs with
                credentials, query parameters or fragments are rejected.
              </p>
              <fieldset className="scope-options">
                <legend>Subscribed events</legend>
                {eventType.options.map((s) => (
                  <label key={s} className="checkbox-label">
                    <input
                      type="checkbox"
                      value={s}
                      {...form.register("events")}
                    />
                    {s}
                  </label>
                ))}
              </fieldset>
              {form.formState.errors.events && (
                <p role="alert" className="field-error">
                  {form.formState.errors.events.message}
                </p>
              )}
              <Button>Add simulated webhook</Button>
            </fieldset>
            <MutationMessage
              error={mutation.error}
              success={
                mutation.isSuccess
                  ? "Webhook endpoint saved; no connection was made."
                  : undefined
              }
            />
          </form>
        </section>
      </div>
    </>
  );
}
function WebhookEditor({
  webhook: w,
  data,
  allowed,
}: {
  webhook: Webhook;
  data: Workspace;
  allowed: boolean;
}) {
  const [version, setVersion] = useState(w.version);
  const [status, setStatus] = useState(w.status);
  const [events, setEvents] = useState(w.events);
  const [outcome, setOutcome] = useState("failure");
  const [event, setEvent] = useState(w.events[0]);
  const save = usePlatformWrite(webhookSchema);
  const test = usePlatformWrite(deliverySchema);
  const navigate = useNavigate();
  return (
    <section className="panel">
      <div className="section-heading">
        <h2>{w.name}</h2>
        <StatusBadge status={w.status} />
      </div>
      <p className="break-word">{w.url}</p>
      <p>
        {w.appId} · {w.id}
      </p>
      <VersionNotice
        local={version}
        server={w.version}
        reload={() => {
          setVersion(w.version);
          setStatus(w.status);
          setEvents(w.events);
          setEvent(w.events[0]);
        }}
      />
      <fieldset
        disabled={!allowed || save.isPending || version !== w.version}
        className="plain-fieldset"
      >
        <label>
          Webhook status
          <select
            aria-label="Webhook status"
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
          >
            <option>Active</option>
            <option>Paused</option>
          </select>
        </label>
        <fieldset className="scope-options">
          <legend>Edit event subscriptions</legend>
          {eventType.options.map((s) => (
            <label className="checkbox-label" key={s}>
              <input
                type="checkbox"
                checked={events.includes(s)}
                onChange={(e) =>
                  setEvents(
                    e.target.checked
                      ? [...events, s]
                      : events.filter((x) => x !== s),
                  )
                }
              />
              {s}
            </label>
          ))}
        </fieldset>
        <Button
          variant="outline"
          disabled={!events.length}
          onClick={async () => {
            try {
              const x = await save.mutateAsync({
                path: `/developers/webhooks/${w.id}/update`,
                body: { ...w, version, status, events },
                key: crypto.randomUUID(),
              });
              setVersion(x.version);
              setEvent(x.events[0]);
            } catch {
              /* Error below. */
            }
          }}
        >
          Save webhook settings
        </Button>
      </fieldset>
      <MutationMessage error={save.error} />
      <h3>Test dispatcher</h3>
      <div className="report-filters">
        <label>
          Test event
          <select
            aria-label="Test event"
            value={event}
            onChange={(e) => setEvent(e.target.value as typeof event)}
          >
            {w.events.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          Simulated receiver outcome
          <select
            aria-label="Simulated receiver outcome"
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
          >
            <option value="failure">HTTP 500 failure</option>
            <option value="timeout">HTTP 504 timeout</option>
            <option value="success">HTTP 200 acknowledgement</option>
          </select>
        </label>
      </div>
      <Button
        disabled={!allowed || w.status !== "Active" || test.isPending}
        onClick={async () => {
          try {
            const d = await test.mutateAsync({
              path: `/developers/webhooks/${w.id}/test`,
              body: { event, outcome },
              key: crypto.randomUUID(),
            });
            navigate(`/developers/webhooks/${w.id}/deliveries/${d.id}`);
          } catch {
            /* Error below. */
          }
        }}
      >
        Send simulated event
      </Button>
      <MutationMessage error={test.error} />
      <h3>Delivery history</h3>
      {data.deliveries.filter((d) => d.webhookId === w.id).length ? (
        <ul className="delivery-links">
          {data.deliveries
            .filter((d) => d.webhookId === w.id)
            .map((d) => (
              <li key={d.id}>
                <Link to={`/developers/webhooks/${w.id}/deliveries/${d.id}`}>
                  {d.id} · {d.event} · {d.status} · {d.attempts.length} attempts
                </Link>
              </li>
            ))}
        </ul>
      ) : (
        <p>No test deliveries yet.</p>
      )}
    </section>
  );
}
function DeliveryDetail({
  data,
  id,
  hookId,
  allowed,
}: {
  data: Workspace;
  id: string;
  hookId: string;
  allowed: boolean;
}) {
  const d = data.deliveries.find((d) => d.id === id && d.webhookId === hookId);
  const [outcome, setOutcome] = useState("success");
  const retry = usePlatformWrite(deliverySchema);
  if (!d)
    return (
      <Empty
        title="Delivery not found"
        detail="The event may be unavailable or belong to a different endpoint."
      />
    );
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Webhook delivery {d.id}</h1>
          <p>
            {d.eventId} · {d.event}
          </p>
        </div>
        <StatusBadge status={d.status} />
      </div>
      <div className="two-grid">
        <section className="panel">
          <h2>Transmission attempts</h2>
          <p>
            The original event ID is preserved. Maximum three simulated
            attempts; retries do not re-execute a payment.
          </p>
          <ol className="activity-list">
            {d.attempts.map((a) => (
              <li key={a.number}>
                <strong>
                  Attempt {a.number} · HTTP {a.status}
                </strong>
                <p>{a.detail}</p>
                <small>
                  {new Date(a.at).toLocaleString("en-GB", {
                    timeZone: "Africa/Nairobi",
                  })}{" "}
                  EAT
                </small>
              </li>
            ))}
          </ol>
          {d.status === "Failed" && (
            <>
              <label>
                Retry outcome
                <select
                  aria-label="Retry outcome"
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                >
                  <option value="success">HTTP 200 acknowledgement</option>
                  <option value="failure">HTTP 500 failure</option>
                </select>
              </label>
              <Button
                disabled={!allowed || retry.isPending || d.attempts.length >= 3}
                onClick={() =>
                  retry.mutate({
                    path: `/developers/deliveries/${d.id}/retry`,
                    body: { outcome, attempt: d.attempts.length },
                    key: crypto.randomUUID(),
                  })
                }
              >
                Retry original delivery
              </Button>
            </>
          )}
          <MutationMessage error={retry.error} />
          <Link to="/developers/webhooks">All webhook endpoints →</Link>
        </section>
        <section className="panel">
          <h2>Redacted event payload</h2>
          <pre className="code-sample">
            {JSON.stringify(d.payload, null, 2)}
          </pre>
          <p>
            Receiver acknowledgements and timestamps are simulated. No
            signature, HMAC verification or outbound HTTPS/mTLS connection is
            fabricated.
          </p>
          <Link to="/developers/docs?topic=webhooks">
            Webhook integration guide →
          </Link>
        </section>
      </div>
    </>
  );
}
function RequestLogs({ data }: { data: Workspace }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [app, setApp] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string>();
  const filtered = data.logs.filter(
    (l) =>
      (!search ||
        `${l.id} ${l.path}`.toLowerCase().includes(search.toLowerCase())) &&
      (!status || Math.floor(l.status / 100) === Number(status)) &&
      (!app || l.appId === app),
  );
  const columns: ColumnDef<Workspace["logs"][number]>[] = [
    {
      accessorKey: "id",
      header: "Request",
      cell: ({ row }) => (
        <button
          className="text-action"
          onClick={() => setSelected(row.original.id)}
        >
          {row.original.id}
        </button>
      ),
    },
    { accessorKey: "method", header: "Method" },
    { accessorKey: "path", header: "Resource / control action" },
    { accessorKey: "status", header: "HTTP status" },
    { accessorKey: "appId", header: "Application" },
  ];
  const entry = filtered.find((l) => l.id === selected);
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>API request logs & telemetry</h1>
          <p>
            Synthetic samples and sandbox control actions; no real traffic or
            gateway SLA is asserted.
          </p>
        </div>
      </div>
      <section className="panel">
        <div className="report-filters">
          <label>
            Search request logs
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <label>
            Log status
            <select
              aria-label="Log status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              <option value="2">2xx success</option>
              <option value="4">4xx error</option>
              <option value="5">5xx error</option>
            </select>
          </label>
          <label>
            Log application
            <select
              aria-label="Log application"
              value={app}
              onChange={(e) => {
                setApp(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All applications</option>
              {data.apps.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {filtered.length ? (
          <BillingTable
            items={filtered.slice((page - 1) * 6, page * 6)}
            columns={columns}
            label="Request log entries"
            page={page}
            pages={Math.max(1, Math.ceil(filtered.length / 6))}
            total={filtered.length}
            onPage={setPage}
          />
        ) : (
          <Empty
            title="No matching logs"
            detail="Change filters or perform a sandbox control action."
          />
        )}
      </section>
      {entry && (
        <section className="panel">
          <h2>Request {entry.id}</h2>
          <p>
            {entry.method} · {entry.path} · HTTP {entry.status}
          </p>
          <p>{entry.detail}</p>
          <p>
            Authorization, cookies, secrets, raw customer payloads and source
            IPs are omitted.
          </p>
        </section>
      )}
    </>
  );
}
function ProductionAccess({
  data,
  allowed,
}: {
  data: Workspace;
  allowed: boolean;
}) {
  const mutation = usePlatformWrite(productionSchema);
  const [key] = useState(() => crypto.randomUUID());
  const form = useForm<z.infer<typeof productionInput>>({
    resolver: zodResolver(productionInput),
    defaultValues: {
      appId: "",
      useCase: "",
      contactEmail: "",
      securityPlan: "",
    },
  });
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Production access & live API review</h1>
          <p>
            Production is not enabled. Only an independently approved backend
            process can grant live access.
          </p>
        </div>
      </div>
      <div className="notice warning">
        Sandbox credentials and business membership never authorize production
        APIs. This form records a simulated review request; it does not send an
        email, approve a business or issue live credentials.
      </div>
      <div className="f7-split">
        <section className="panel">
          <h2>Request review</h2>
          <p>
            Prerequisites: active application, active credential and a
            successful test delivery on an active endpoint. A business
            administrator must submit.
          </p>
          <form
            onSubmit={form.handleSubmit((v) =>
              mutation
                .mutateAsync({
                  path: "/developers/production-requests",
                  body: v,
                  key,
                })
                .then(() => undefined)
                .catch(() => undefined),
            )}
          >
            <fieldset
              className="plain-fieldset"
              disabled={!allowed || mutation.isPending}
            >
              <Field
                id="prod-app"
                label="Production review application"
                error={form.formState.errors.appId?.message}
              >
                <select id="prod-app" {...form.register("appId")}>
                  <option value="">Select application</option>
                  {data.apps
                    .filter((a) => a.status === "Active")
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                </select>
              </Field>
              <Field
                id="prod-use"
                label="Commercial use case"
                error={form.formState.errors.useCase?.message}
              >
                <textarea id="prod-use" {...form.register("useCase")} />
              </Field>
              <Field
                id="prod-email"
                label="Technical contact email"
                error={form.formState.errors.contactEmail?.message}
              >
                <input
                  id="prod-email"
                  type="email"
                  {...form.register("contactEmail")}
                />
              </Field>
              <Field
                id="prod-security"
                label="Security and integration plan"
                error={form.formState.errors.securityPlan?.message}
              >
                <textarea
                  id="prod-security"
                  {...form.register("securityPlan")}
                />
              </Field>
              <label className="checkbox-label">
                <input type="checkbox" {...form.register("acknowledged")} /> I
                understand this request does not grant live access.
              </label>
              {form.formState.errors.acknowledged && (
                <p className="field-error" role="alert">
                  {form.formState.errors.acknowledged.message}
                </p>
              )}
              <Button>Submit production review request</Button>
            </fieldset>
            <MutationMessage
              error={mutation.error}
              success={
                mutation.isSuccess
                  ? "Request recorded as Pending review. Production remains unavailable."
                  : undefined
              }
            />
          </form>
          {!allowed && (
            <p className="notice">
              Your role cannot submit production reviews.
            </p>
          )}
        </section>
        <section className="panel">
          <h2>Review status</h2>
          {data.production.length ? (
            data.production.map((p) => (
              <article className="review-block" key={p.id}>
                <h3>{p.id}</h3>
                <StatusBadge status={p.status} />
                <p>{p.appId}</p>
                <p>
                  No production credential or rail access has been provisioned.
                </p>
              </article>
            ))
          ) : (
            <Empty
              title="No production requests"
              detail="Complete sandbox prerequisites before requesting review."
            />
          )}
          <h3>Backend dependencies</h3>
          <p>
            Actual business review, commercial approval, security evidence,
            issuer/rail eligibility, contract acceptance and production
            provisioning remain separate backend workflows. No internal Furaia
            review console is included.
          </p>
        </section>
      </div>
    </>
  );
}
