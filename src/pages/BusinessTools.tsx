import { PrivateDocumentView } from "../documents/FinancialPaper";
import { SettingsNav } from "../components/BusinessForms";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import { useState, type ReactNode } from "react";
import {
  Link,
  useParams,
  useSearchParams,
  useNavigate,
} from "react-router-dom";
import {
  useForm,
  type FieldValues,
  type Path,
  type DefaultValues,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useTools,
  useToolsAction,
  useCustomerStatement,
  useRegistration,
  usePayeeOptions,
} from "../application/enterprise";
import { useAccounts, useSession } from "../application/queries";
import { useContacts } from "../application/billing";
import {
  orderInput,
  supplierInput,
  employeeInput,
  terminalInput,
  loanInput,
  registrationSchema,
  challengeSchema,
  type Tools,
} from "../api/enterpriseContracts";
import { request } from "../api/http";
import { authAdapter, can } from "../auth/adapter";
import { rememberMockIdentity } from "../auth/mockIdentity";
import { useQueryClient } from "@tanstack/react-query";
import { keys } from "../application/queries";
import { money } from "../domain/money";
import { scaled } from "../domain/billing";
import { Money } from "../components/Money";
import { StatePanel, Empty } from "../components/StatePanel";
import { Button } from "../components/ui/button";
import { Freshness } from "../components/Freshness";
import { config } from "../api/config";
import { csvCell } from "../domain/statements";
type Choice = { value: string; label: string };
type InputField = {
  name: string;
  label: string;
  type?: string;
  options?: Choice[];
  value?: string;
};
const moneyInput = z
  .string()
  .regex(
    /^\d{1,12}(?:\.\d{1,2})?$/,
    "Use an exact amount, up to two decimal places",
  )
  .refine(
    (v) => /^\d{1,12}(?:\.\d{1,2})?$/.test(v) && scaled(v, 2) > 0n,
    "Enter an amount above zero",
  );
export function ToolForm<T extends FieldValues>({
  schema,
  defaults,
  fields,
  submit,
  onSubmit,
  disabled = false,
}: {
  schema: z.ZodType<T, T>;
  defaults: DefaultValues<T>;
  fields: InputField[];
  submit: string;
  onSubmit: (v: T) => Promise<void>;
  disabled?: boolean;
}) {
  const f = useForm<T>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });
  return (
    <form className="tool-form" noValidate onSubmit={f.handleSubmit(onSubmit)}>
      {fields.map((field) => (
        <div key={field.name}>
          <label htmlFor={`field-${field.name}`}>{field.label}</label>
          {field.options ? (
            <select
              id={`field-${field.name}`}
              aria-invalid={!!f.formState.errors[field.name]}
              {...f.register(field.name as Path<T>)}
            >
              {field.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              id={`field-${field.name}`}
              type={field.type ?? "text"}
              autoComplete={
                field.type === "password" ? "one-time-code" : undefined
              }
              aria-invalid={!!f.formState.errors[field.name]}
              {...f.register(field.name as Path<T>)}
            />
          )}
          {f.formState.errors[field.name] && (
            <p className="field-error" role="alert">
              {String(
                f.formState.errors[field.name]?.message ?? "Check this field.",
              )}
            </p>
          )}
        </div>
      ))}
      <Button disabled={disabled || f.formState.isSubmitting}>
        {f.formState.isSubmitting ? "Saving…" : submit}
      </Button>
    </form>
  );
}
function Feedback({
  error,
  pending,
}: {
  error: Error | null;
  pending: boolean;
}) {
  return (
    <>
      {pending && (
        <p role="status" className="notice">
          <span className="spinner" /> Processing the original request…
        </p>
      )}
      {error && (
        <p role="alert" className="notice danger">
          {error.message} For an uncertain response, refresh and check the
          original reference before creating another request.
        </p>
      )}
    </>
  );
}
function Frame({
  title,
  children,
  note,
}: {
  title: string;
  children: ReactNode;
  note?: string;
}) {
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{title}</h1>
          <p>{note ?? "Business workspace · development simulation"}</p>
        </div>
      </div>
      {children}
    </>
  );
}
function Table({
  headers,
  rows,
  label,
}: {
  headers: string[];
  rows: ReactNode[][];
  label: string;
}) {
  const columns: ColumnDef<ReactNode[]>[] = headers.map((h, i) => ({
    id: String(i),
    header: h,
    cell: ({ row }) => row.original[i],
  }));
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });
  return rows.length ? (
    <div className="table-scroll" role="region" aria-label={label} tabIndex={0}>
      <table>
        <thead>
          {table.getHeaderGroups().map((g) => (
            <tr key={g.id}>
              {g.headers.map((h) => (
                <th key={h.id} scope="col">
                  {flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((r) => (
            <tr key={r.id}>
              {r.getVisibleCells().map((c) => (
                <td key={c.id}>
                  {flexRender(c.column.columnDef.cell, c.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <Empty
      title={`No ${label.toLowerCase()}`}
      detail="Create a record to begin this workflow."
    />
  );
}
function ToolsLoaded({
  children,
  title,
}: {
  title: string;
  children: (d: Tools) => ReactNode;
}) {
  const q = useTools();
  return (
    <Frame title={title}>
      {q.isPending ? (
        <StatePanel />
      ) : q.error ? (
        <StatePanel error={q.error} retry={() => void q.refetch()} />
      ) : (
        <>
          <Freshness {...q.data} refresh={() => void q.refetch()} />
          <Button variant="outline" onClick={() => void q.refetch()}>
            Refresh workspace
          </Button>
          {children(q.data)}
        </>
      )}
    </Frame>
  );
}
export function BusinessToolsPage({
  section,
}: {
  section: "settings" | "procurement" | "payroll" | "pos" | "loans";
}) {
  return (
    <ToolsLoaded
      title={
        {
          settings: "Business workflow settings",
          procurement: "Procurement & suppliers",
          payroll: "Payroll",
          pos: "Point of sale",
          loans: "Loan management · preview",
        }[section]
      }
    >
      {(d) =>
        section === "settings" ? (
          <WorkflowSettings d={d} />
        ) : section === "procurement" ? (
          <Procurement d={d} />
        ) : section === "payroll" ? (
          <Payroll d={d} />
        ) : section === "pos" ? (
          <Pos d={d} />
        ) : (
          <Loans d={d} />
        )
      }
    </ToolsLoaded>
  );
}
export function SendMoneyPage() {
  const { id } = useParams();
  return (
    <ToolsLoaded title={id ? "Payment authorization" : "Send money"}>
      {(d) => (id ? <OrderDetail d={d} id={id} /> : <NewOrder d={d} />)}
    </ToolsLoaded>
  );
}
function NewOrder({ d }: { d: Tools }) {
  const accounts = useAccounts(),
    beneficiaries = usePayeeOptions();
  const a = useToolsAction();
  const nav = useNavigate();
  const [mode, setMode] = useState("all");
  const [params] = useSearchParams();
  const schema = orderInput
    .omit({ amountMinor: true })
    .extend({ amount: moneyInput });
  const accountOptions = (accounts.data?.items ?? [])
    .filter((x) => x.status === "Active" && x.currency === "KES")
    .map((x) => ({
      value: x.id,
      label: `${x.name} · Available ${money(x.availableMinor, "KES")}`,
    }));
  const recipients = (beneficiaries.data?.items ?? []).filter(
    (b) =>
      mode === "all" ||
      (mode === "phone" ? b.rail === "M-Pesa B2C" : b.rail !== "M-Pesa B2C"),
  );
  if (accounts.isPending || beneficiaries.isPending) return <StatePanel />;
  if (accounts.error || beneficiaries.error)
    return (
      <StatePanel
        error={accounts.error ?? beneficiaries.error}
        retry={() => {
          void accounts.refetch();
          void beneficiaries.refetch();
        }}
      />
    );
  if (!accountOptions.length)
    return (
      <>
        <Empty
          title="No active KES account"
          detail="Complete business onboarding and request an account before sending funds."
        />
        <Link to="/onboarding/status">
          View onboarding and account requests →
        </Link>
      </>
    );
  return (
    <>
      <div className="notice">
        {d.mandate.approvals} distinct OTP authorization
        {d.mandate.approvals === 1 ? "" : "s"} required. The final authorization
        dispatches immediately. Available funds are reserved at submission;
        ledger is debited only on confirmed settlement.
      </div>
      <section className="panel">
        <div className="action-row">
          {[
            ["all", "Saved beneficiaries"],
            ["phone", "Phone / M-Pesa"],
            ["account", "Bank account"],
          ].map(([v, l]) => (
            <button
              key={v}
              className={
                mode === v ? "button button-primary" : "button button-outline"
              }
              onClick={() => setMode(v)}
            >
              {l}
            </button>
          ))}
          <Link to="/payments/beneficiaries">
            Add a person or business beneficiary →
          </Link>
        </div>
        <Feedback {...a} />
        <ToolForm
          key={mode}
          schema={schema}
          defaults={{
            accountId: "",
            beneficiaryId: params.get("beneficiary") ?? "",
            amount: "",
            reference: "",
            outcome: "confirmed",
          }}
          fields={[
            {
              name: "accountId",
              label: "Source account",
              options: [
                { value: "", label: "Choose an account" },
                ...accountOptions,
              ],
            },
            {
              name: "beneficiaryId",
              label: "Send to beneficiary",
              options: [
                { value: "", label: "Choose a person or business" },
                ...recipients.map((b) => ({
                  value: b.id,
                  label: `${b.name} · ${b.maskedDestination} · ${b.rail}`,
                })),
              ],
            },
            { name: "amount", label: "Amount (KES)" },
            { name: "reference", label: "Payment reference" },
            ...(config.mock
              ? [
                  {
                    name: "outcome",
                    label: "Simulated settlement outcome",
                    options: [
                      { value: "confirmed", label: "Confirmed settlement" },
                      { value: "pending", label: "Pending / UNKNOWN" },
                      { value: "failed", label: "Definitive failure" },
                    ],
                  },
                ]
              : []),
          ]}
          submit="Review & reserve payment"
          disabled={a.pending}
          onSubmit={async (v) => {
            if (
              await a.run("/payment-orders", {
                accountId: v.accountId,
                beneficiaryId: v.beneficiaryId,
                amountMinor: scaled(v.amount, 2).toString(),
                reference: v.reference,
                outcome: v.outcome,
              })
            ) {
              const state = await request(
                "/business-tools",
                (await import("../api/enterpriseContracts")).toolsSchema,
              );
              const o = state.orders.find(
                (o) => o.payout.reference === v.reference && o.payout.makerId,
              );
              if (o) nav(`/send-money/${o.id}`);
            }
          }}
        />
      </section>
    </>
  );
}
function OrderDetail({ d, id }: { d: Tools; id: string }) {
  const o = d.orders.find((o) => o.id === id),
    session = useSession(),
    a = useToolsAction();
  const [challenge, setChallenge] = useState<z.infer<
      typeof challengeSchema
    > | null>(null),
    [code, setCode] = useState(""),
    [error, setError] = useState("");
  if (!o)
    return (
      <Empty
        title="Payment not found"
        detail="Refresh the original reference or return to Payments."
      />
    );
  const p = o.payout,
    approved = o.approvals.some((x) => x.memberId === session.data?.memberId);
  const canApprove = can(session.data?.permissions ?? [], "payments:approve");
  return (
    <>
      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>{p.beneficiary.name}</h2>
            <p>
              {p.reference} · {o.id}
            </p>
          </div>
          <span className="badge">{p.status}</span>
        </div>
        <h2>
          <Money minor={p.amountMinor} currency="KES" direction="outgoing" />
        </h2>
        <p>
          {p.beneficiary.rail} · {p.beneficiary.maskedDestination}
        </p>
        <p>
          {o.approvals.length} of {o.required} distinct OTP approvals · reserved{" "}
          {money(p.holdMinor, "KES")}
        </p>
        <p>
          Each member can authorize once.{" "}
          {o.required === 1
            ? "Single-authorizer mode allows the initiator to confirm by OTP."
            : "Multiple-authorizer mode requires distinct active authorized members."}
        </p>
        <ul>
          {o.approvals.map((x) => (
            <li key={x.memberId}>{x.name} · OTP verified</li>
          ))}
        </ul>
        <Feedback {...a} />
        {error && <p role="alert">{error}</p>}
        {p.status === "Completed" ? (
          <div className="payment-success" role="status">
            <svg className="sent-check" viewBox="0 0 64 64" aria-hidden="true">
              <circle cx="32" cy="32" r="29" />
              <path d="m18 32 10 10 19-21" />
            </svg>
            <h2>Payment sent</h2>
            <p>
              Confirmed settlement. The account ledger and available balance
              have been updated.
            </p>
            <Link to={`/transactions/${p.transactionId}`}>
              View confirmed transaction →
            </Link>
            <Link to={`/accounts/${p.accountId}`}>View updated account →</Link>
          </div>
        ) : p.status === "Pending confirmation" ? (
          <div className="notice" role="status">
            <span className="spinner" /> Pending confirmation. Preserve {o.id};
            do not send another payment.
            <div className="action-row">
              <Button
                disabled={a.pending}
                onClick={() =>
                  void a.run(`/payment-orders/${o.id}/inquiry`, {
                    version: o.version,
                  })
                }
              >
                Check original payment
              </Button>
              {config.mock && (
                <Button
                  variant="outline"
                  disabled={a.pending}
                  onClick={() =>
                    void a.run(`/payment-orders/${o.id}/outcome`, {
                      outcome: "confirmed",
                    })
                  }
                >
                  Simulate confirmed rail outcome
                </Button>
              )}
            </div>
          </div>
        ) : p.status === "Awaiting approval" && canApprove && !approved ? (
          <>
            <Button
              disabled={a.pending}
              onClick={async () => {
                setError("");
                try {
                  setChallenge(
                    await request(
                      `/payment-orders/${o.id}/challenge`,
                      challengeSchema,
                      { method: "POST" },
                    ),
                  );
                } catch (e) {
                  setError(
                    e instanceof Error ? e.message : "Challenge unavailable",
                  );
                }
              }}
            >
              Request approval OTP
            </Button>
            {challenge && (
              <form
                className="otp-panel"
                onSubmit={async (ev) => {
                  ev.preventDefault();
                  if (
                    await a.run(`/payment-orders/${o.id}/approve`, {
                      version: o.version,
                      challengeId: challenge.id,
                      code,
                    })
                  ) {
                    setCode("");
                    setChallenge(null);
                  }
                }}
              >
                <p>
                  OTP sent to {challenge.maskedDestination}. Expires at{" "}
                  {new Date(challenge.expiresAt).toLocaleTimeString()}.
                </p>
                {config.mock && (
                  <p>
                    Development-only code: <strong>246810</strong>. No SMS is
                    sent.
                  </p>
                )}
                <label htmlFor="approval-otp">Approval OTP</label>
                <input
                  id="approval-otp"
                  type="password"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
                <Button disabled={a.pending || code.length !== 6}>
                  {a.pending
                    ? "Authorizing & sending…"
                    : o.approvals.length + 1 >= o.required
                      ? "Authorize & send payment"
                      : "Verify OTP & approve"}
                </Button>
              </form>
            )}
          </>
        ) : p.status === "Awaiting approval" ? (
          <p>
            {approved
              ? "Your approval is recorded. Another authorized member must approve."
              : "You do not have payment-approval permission."}
          </p>
        ) : (
          <p>No further dispatch is available for this final outcome.</p>
        )}
        {p.status === "Awaiting approval" &&
          p.makerId === session.data?.memberId && (
            <Button
              variant="outline"
              disabled={a.pending}
              onClick={() =>
                void a.run(`/payment-orders/${o.id}/cancel`, {
                  version: o.version,
                })
              }
            >
              Cancel before dispatch
            </Button>
          )}
        {p.status === "Awaiting approval" &&
          p.makerId !== session.data?.memberId &&
          canApprove && (
            <Button
              variant="outline"
              disabled={a.pending}
              onClick={() =>
                void a.run(`/payment-orders/${o.id}/reject`, {
                  version: o.version,
                  reason: "Rejected by authorized reviewer",
                })
              }
            >
              Reject payment
            </Button>
          )}
        <h3>Payment lifecycle</h3>
        <ol className="activity-list">
          {p.events.map((ev, i) => (
            <li key={i}>
              {ev.label}
              <small>
                {ev.actor} · {ev.at}
              </small>
            </li>
          ))}
        </ol>
      </section>
      <Link to="/payments">Back to payments →</Link>
    </>
  );
}
function WorkflowSettings({ d }: { d: Tools }) {
  const a = useToolsAction(),
    s = useSession();
  const [approvals, setApprovals] = useState(d.mandate.approvals),
    [fx, setFx] = useState(d.mandate.foreignAccounts),
    [template, setTemplate] = useState(d.branding.template),
    [accent, setAccent] = useState(d.branding.accent),
    [logo, setLogo] = useState(d.branding.logo),
    [footer, setFooter] = useState(d.branding.footer),
    [uploadError, setUploadError] = useState("");
  if (!can(s.data?.permissions ?? [], "business:manage"))
    return (
      <Empty
        title="Administrator settings"
        detail="Only an administrator can change the payment mandate and invoice branding."
      />
    );
  return (
    <>
      <>
        <SettingsNav />
        <section className="panel">
          <h2>Payment authorization mandate</h2>
          <p>
            New orders snapshot this rule. Existing orders retain their original
            required count. Single authorization dispatches after that member's
            OTP; multiple authorization dispatches after the final distinct
            member's OTP.
          </p>
          <Feedback {...a} />
          <label htmlFor="approval-count">Required distinct authorizers</label>
          <select
            id="approval-count"
            value={approvals}
            onChange={(ev) => setApprovals(Number(ev.target.value))}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n} authorizer{n === 1 ? "" : "s"}
              </option>
            ))}
          </select>
          <p>
            {d.approvers.length} eligible active members:{" "}
            {d.approvers.map((m) => m.name).join(", ")}. Add members before
            requiring a larger count.
          </p>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={fx}
              onChange={(ev) => setFx(ev.target.checked)}
            />
            Offer optional foreign-currency accounts in account requests
          </label>
          <Button
            disabled={a.pending}
            onClick={() =>
              void a.run("/business/mandate", {
                version: d.mandate.version,
                approvals,
                foreignAccounts: fx,
              })
            }
          >
            Save approval policy
          </Button>
        </section>
        <section className="panel">
          <h2>Invoice appearance & business logo</h2>
          <p>
            These defaults are snapshotted when a quotation is shared or an
            invoice issued. Issued versions do not change.
          </p>
          <div className="invoice-template-picker">
            {(["classic", "modern", "minimal"] as const).map((t) => (
              <button
                key={t}
                className={`template-choice template-${t} ${template === t ? "selected" : ""}`}
                aria-pressed={template === t}
                onClick={() => setTemplate(t)}
              >
                <span className="template-swatch" />
                <strong>{t[0].toUpperCase() + t.slice(1)}</strong>
              </button>
            ))}
          </div>
          <label htmlFor="invoice-accent">Document accent</label>
          <select
            id="invoice-accent"
            value={accent}
            onChange={(ev) => setAccent(ev.target.value as typeof accent)}
          >
            {["forest", "navy", "charcoal"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
          <label htmlFor="business-logo">
            Business logo · PNG/JPEG, up to 180 KB
          </label>
          <input
            id="business-logo"
            type="file"
            accept="image/png,image/jpeg"
            onChange={async (ev) => {
              setUploadError("");
              const f = ev.target.files?.[0];
              if (!f) return;
              if (
                f.size > 180000 ||
                !["image/png", "image/jpeg"].includes(f.type)
              ) {
                setUploadError("Choose a PNG or JPEG logo under 180 KB.");
                return;
              }
              const bytes = new Uint8Array(await f.arrayBuffer());
              const png =
                bytes[0] === 137 &&
                bytes[1] === 80 &&
                bytes[2] === 78 &&
                bytes[3] === 71;
              const jpg =
                bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
              if (!(png || jpg)) {
                setUploadError("The file does not contain a supported image.");
                return;
              }
              const reader = new FileReader();
              reader.onload = () => setLogo(String(reader.result));
              reader.readAsDataURL(f);
            }}
          />
          {uploadError && <p role="alert">{uploadError}</p>}
          {logo && (
            <>
              <img
                className="business-logo-preview"
                src={logo}
                alt="Business logo preview"
              />
              <Button variant="outline" onClick={() => setLogo("")}>
                Remove logo
              </Button>
            </>
          )}
          <label htmlFor="invoice-footer">Document footer</label>
          <textarea
            id="invoice-footer"
            maxLength={300}
            value={footer}
            onChange={(ev) => setFooter(ev.target.value)}
          />
          <Button
            disabled={a.pending || !!uploadError}
            onClick={() =>
              void a.run("/business/branding", {
                ...d.branding,
                template,
                logo,
                footer,
                accent,
              })
            }
          >
            Save invoice appearance
          </Button>
          <Link to="/invoices">Preview on an invoice draft →</Link>
        </section>
      </>
    </>
  );
}
function Procurement({ d }: { d: Tools }) {
  const a = useToolsAction(),
    b = usePayeeOptions();
  const [editing, setEditing] = useState<Tools["suppliers"][number] | null>(
    null,
  );
  const [supplier, setSupplier] = useState(""),
    [description, setDescription] = useState(""),
    [qty, setQty] = useState("1"),
    [rate, setRate] = useState(""),
    [lines, setLines] = useState<
      {
        description: string;
        quantity: string;
        rate: string;
        discount: string;
        tax: string;
      }[]
    >([]),
    [draftError, setDraftError] = useState(""),
    [due, setDue] = useState("2026-11-20");
  return (
    <>
      <nav className="action-row">
        <Link to="/procurement/invoices">Supplier invoices & due payments</Link>
      </nav>
      <section className="panel">
        <h2>Suppliers</h2>
        <Feedback {...a} />
        <ToolForm
          key={editing?.id ?? "new-supplier"}
          schema={supplierInput}
          defaults={
            editing ?? {
              name: "",
              email: "",
              phone: "",
              address: "",
              beneficiaryId: "",
            }
          }
          fields={[
            { name: "name", label: "Supplier name" },
            { name: "email", label: "Supplier email", type: "email" },
            { name: "phone", label: "Supplier phone" },
            { name: "address", label: "Supplier address" },
            {
              name: "beneficiaryId",
              label: "Payable beneficiary",
              options: [
                { value: "", label: "Choose saved payee" },
                ...(b.data?.items ?? []).map((b) => ({
                  value: b.id,
                  label: b.name,
                })),
              ],
            },
          ]}
          submit="Save supplier"
          disabled={a.pending}
          onSubmit={async (v) => {
            if (
              await a.run(
                editing ? `/suppliers/${editing.id}` : "/suppliers",
                editing ? { ...v, version: editing.version } : v,
              )
            )
              setEditing(null);
          }}
        />
        <Table
          label="Suppliers"
          headers={["Supplier", "Contact", "Status", "Actions"]}
          rows={d.suppliers.map((s) => [
            s.name,
            s.email,
            s.archived ? "Archived" : "Active",
            <div className="action-row">
              <Link to={`/send-money?beneficiary=${s.beneficiaryId}`}>
                Send payment
              </Link>
              {!s.archived && (
                <Button variant="outline" onClick={() => setEditing(s)}>
                  Edit supplier
                </Button>
              )}
              {!s.archived && (
                <Button
                  variant="outline"
                  disabled={a.pending}
                  onClick={() =>
                    void a.run(`/suppliers/${s.id}/archive`, {
                      version: s.version,
                    })
                  }
                >
                  Archive
                </Button>
              )}
            </div>,
          ])}
        />
      </section>
      <section className="panel">
        <h2>Generate local purchase order</h2>
        <p>
          An LPO is a purchase commitment. Issuing it does not debit an account
          or create a bank payment.
        </p>
        <label htmlFor="lpo-supplier">Supplier</label>
        <select
          id="lpo-supplier"
          value={supplier}
          onChange={(ev) => setSupplier(ev.target.value)}
        >
          <option value="">Choose supplier</option>
          {d.suppliers
            .filter((s) => !s.archived)
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
        </select>
        <label htmlFor="lpo-delivery">Expected delivery</label>
        <input
          id="lpo-delivery"
          type="date"
          value={due}
          onChange={(ev) => setDue(ev.target.value)}
        />
        <div className="line-editor">
          <label>
            Description
            <input
              value={description}
              onChange={(ev) => setDescription(ev.target.value)}
            />
          </label>
          <label>
            Quantity
            <input value={qty} onChange={(ev) => setQty(ev.target.value)} />
          </label>
          <label>
            Unit price (KES)
            <input value={rate} onChange={(ev) => setRate(ev.target.value)} />
          </label>
          <Button
            variant="outline"
            onClick={() => {
              setDraftError("");
              if (
                !description.trim() ||
                !/^\d{1,6}(?:\.\d{1,3})?$/.test(qty) ||
                !moneyInput.safeParse(rate).success ||
                scaled(qty, 3) <= 0n
              ) {
                setDraftError(
                  "Enter a description, positive quantity and exact unit price.",
                );
                return;
              }
              setLines([
                ...lines,
                { description, quantity: qty, rate, discount: "0", tax: "0" },
              ]);
              setDescription("");
              setRate("");
            }}
          >
            Add LPO line
          </Button>
        </div>
        {draftError && <p role="alert">{draftError}</p>}
        <Table
          label="Purchase lines"
          headers={["Description", "Quantity", "Unit price", "Remove"]}
          rows={lines.map((l, i) => [
            l.description,
            l.quantity,
            money(scaled(l.rate, 2).toString(), "KES"),
            <button onClick={() => setLines(lines.filter((_, j) => j !== i))}>
              Remove line {i + 1}
            </button>,
          ])}
        />
        <Button
          disabled={a.pending || !supplier || !lines.length}
          onClick={async () => {
            if (
              await a.run("/lpos", {
                supplierId: supplier,
                date: "2026-10-21",
                deliveryDate: due,
                notes: "",
                lines,
              })
            )
              setLines([]);
          }}
        >
          Create LPO draft
        </Button>
      </section>
      <Table
        label="Purchase orders"
        headers={["Reference", "Supplier", "Total", "Status", "Actions"]}
        rows={d.lpos.map((l) => [
          l.id,
          l.supplier.name,
          money(l.totals.totalMinor, "KES"),
          l.status,
          <div className="action-row">
            <Link to={`/procurement/${l.id}`}>View LPO</Link>
            {l.status === "Draft" && (
              <Button
                disabled={a.pending}
                onClick={() =>
                  void a.run(`/lpos/${l.id}/issue`, { version: l.version })
                }
              >
                Issue LPO
              </Button>
            )}
            {l.status === "Issued" && (
              <Button
                disabled={a.pending}
                onClick={() =>
                  void a.run(`/lpos/${l.id}/receive`, { version: l.version })
                }
              >
                Record received
              </Button>
            )}
          </div>,
        ])}
      />
    </>
  );
}
export function LpoPage() {
  const { id = "" } = useParams();
  return (
    <ToolsLoaded title="Local purchase order">
      {(d) => {
        const l = d.lpos.find((l) => l.id === id);
        return l ? (
          <PrivateDocumentView kind="lpo" id={l.id} />
        ) : (
          <Empty title="LPO not found" detail="Return to Procurement." />
        );
      }}
    </ToolsLoaded>
  );
}
function Payroll({ d }: { d: Tools }) {
  const a = useToolsAction(),
    b = usePayeeOptions(),
    accounts = useAccounts();
  const [period, setPeriod] = useState("2026-10"),
    [account, setAccount] = useState(""),
    [selected, setSelected] = useState<string[]>([]);
  const schema = z
    .object({
      name: employeeInput.shape.name,
      email: employeeInput.shape.email,
      beneficiaryId: employeeInput.shape.beneficiaryId,
      gross: moneyInput,
      deductions: z.string().regex(/^\d{1,12}(?:\.\d{1,2})?$/),
    })
    .refine(
      (v) =>
        /^\d{1,12}(?:\.\d{1,2})?$/.test(v.gross) &&
        /^\d{1,12}(?:\.\d{1,2})?$/.test(v.deductions) &&
        scaled(v.gross, 2) > scaled(v.deductions, 2),
      { path: ["deductions"], message: "Deductions must be below gross pay" },
    );
  return (
    <>
      <section className="panel">
        <h2>Employees & pay destinations</h2>
        <p>
          Gross and deductions are entered explicitly. This preview does not
          calculate statutory tax, PAYE, pension or statutory filings.
        </p>
        <Feedback {...a} />
        <ToolForm
          schema={schema}
          defaults={{
            name: "",
            email: "",
            beneficiaryId: "",
            gross: "",
            deductions: "0",
          }}
          fields={[
            { name: "name", label: "Employee name" },
            { name: "email", label: "Employee email", type: "email" },
            {
              name: "beneficiaryId",
              label: "Employee beneficiary",
              options: [
                { value: "", label: "Choose saved payee" },
                ...(b.data?.items ?? []).map((b) => ({
                  value: b.id,
                  label: b.name,
                })),
              ],
            },
            { name: "gross", label: "Gross salary (KES)" },
            { name: "deductions", label: "Deductions (KES)" },
          ]}
          submit="Add employee"
          disabled={a.pending}
          onSubmit={async (v) => {
            await a.run("/employees", {
              name: v.name,
              email: v.email,
              beneficiaryId: v.beneficiaryId,
              grossMinor: scaled(v.gross, 2).toString(),
              deductionMinor: scaled(v.deductions, 2).toString(),
            });
          }}
        />
        <Table
          label="Employees"
          headers={[
            "Select",
            "Employee",
            "Gross",
            "Deductions",
            "Net",
            "Actions",
          ]}
          rows={d.employees.map((x) => [
            <input
              aria-label={`Include ${x.name}`}
              type="checkbox"
              disabled={!x.active}
              checked={selected.includes(x.id)}
              onChange={(ev) =>
                setSelected(
                  ev.target.checked
                    ? [...selected, x.id]
                    : selected.filter((id) => id !== x.id),
                )
              }
            />,
            `${x.name}${x.active ? "" : " · Inactive"}`,
            money(x.grossMinor, "KES"),
            money(x.deductionMinor, "KES"),
            <Money
              minor={(
                BigInt(x.grossMinor) - BigInt(x.deductionMinor)
              ).toString()}
              currency="KES"
              direction="outgoing"
            />,
            x.active ? (
              <Button
                variant="outline"
                disabled={a.pending}
                onClick={() =>
                  void a.run(`/employees/${x.id}/archive`, {
                    version: x.version,
                  })
                }
              >
                Deactivate
              </Button>
            ) : (
              "Inactive"
            ),
          ])}
        />
      </section>
      <section className="panel">
        <h2>Create payroll run</h2>
        <label htmlFor="payroll-period">Pay period</label>
        <input
          id="payroll-period"
          type="month"
          value={period}
          onChange={(ev) => setPeriod(ev.target.value)}
        />
        <label htmlFor="payroll-account">Payroll account</label>
        <select
          id="payroll-account"
          value={account}
          onChange={(ev) => setAccount(ev.target.value)}
        >
          <option value="">Choose KES account</option>
          {(accounts.data?.items ?? [])
            .filter((a) => a.currency === "KES")
            .map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
        </select>
        <p>
          One run per period. Submission reserves the full selected net pay
          atomically; every employee payment follows the snapshotted OTP
          mandate. Review each payment before authorizing.
        </p>
        <Button
          disabled={!selected.length || !account || a.pending}
          onClick={() =>
            void a.run("/payroll", {
              accountId: account,
              period,
              employeeIds: selected,
            })
          }
        >
          Submit payroll for authorization
        </Button>
      </section>
      {d.payroll.map((r) => (
        <section className="panel" key={r.id}>
          <h2>
            {r.id} · {r.period}
          </h2>
          <p>Total net {money(r.totalMinor, "KES")}</p>
          <Table
            label="Payroll payments"
            headers={["Employee", "Net pay", "Payment status", "Authorization"]}
            rows={r.items.map((i) => [
              i.name,
              <Money minor={i.netMinor} currency="KES" direction="outgoing" />,
              d.orders.find((o) => o.id === i.orderId)?.payout.status ??
                "Unavailable",
              <Link to={`/send-money/${i.orderId}`}>Review payment →</Link>,
            ])}
          />
          <Button variant="outline" onClick={() => window.print()}>
            Print pay run
          </Button>
        </section>
      ))}
    </>
  );
}
function Pos({ d }: { d: Tools }) {
  const a = useToolsAction(),
    accounts = useAccounts();
  const saleInput = z.object({
    terminalId: z.string().min(1),
    amount: moneyInput,
    reference: z.string().trim().min(3).max(80),
  });
  return (
    <>
      <div className="notice">
        Development POS simulation. No physical terminal, card data, acquiring
        partner or card-network connection is configured.
      </div>
      <section className="panel">
        <h2>Terminals</h2>
        <Feedback {...a} />
        <ToolForm
          schema={terminalInput}
          defaults={{ name: "", location: "", accountId: "" }}
          fields={[
            { name: "name", label: "Terminal name" },
            { name: "location", label: "Terminal location" },
            {
              name: "accountId",
              label: "Settlement account",
              options: [
                { value: "", label: "Choose KES account" },
                ...(accounts.data?.items ?? [])
                  .filter((a) => a.currency === "KES")
                  .map((a) => ({ value: a.id, label: a.name })),
              ],
            },
          ]}
          submit="Create simulated terminal"
          disabled={a.pending || !config.mock}
          onSubmit={async (v) => {
            await a.run("/pos/terminals", v);
          }}
        />
        <Table
          label="Terminals"
          headers={["Terminal", "Location", "Status", "Control"]}
          rows={d.terminals.map((t) => [
            t.name,
            t.location,
            t.status,
            <Button
              variant="outline"
              disabled={a.pending}
              onClick={() =>
                void a.run(`/pos/terminals/${t.id}/toggle`, {
                  version: t.version,
                })
              }
            >
              {t.status === "Active" ? "Suspend" : "Activate"}
            </Button>,
          ])}
        />
      </section>
      <section className="panel">
        <h2>Simulate a sale</h2>
        <ToolForm
          schema={saleInput}
          defaults={{ terminalId: "", amount: "", reference: "" }}
          fields={[
            {
              name: "terminalId",
              label: "Terminal",
              options: [
                { value: "", label: "Choose active terminal" },
                ...d.terminals
                  .filter((t) => t.status === "Active")
                  .map((t) => ({ value: t.id, label: t.name })),
              ],
            },
            { name: "amount", label: "Sale amount (KES)" },
            { name: "reference", label: "Sale reference" },
          ]}
          submit="Create pending POS sale"
          disabled={a.pending || !config.mock}
          onSubmit={async (v) => {
            await a.run("/pos/sales", {
              terminalId: v.terminalId,
              amountMinor: scaled(v.amount, 2).toString(),
              reference: v.reference,
            });
          }}
        />
        <Table
          label="POS sales"
          headers={["Reference", "Amount", "Status", "Settlement"]}
          rows={d.sales.map((s) => [
            s.reference,
            <Money
              minor={s.amountMinor}
              currency="KES"
              direction={s.status === "Confirmed" ? "incoming" : "neutral"}
            />,
            s.status,
            s.status === "Pending confirmation" ? (
              <div className="action-row">
                <Button
                  disabled={a.pending}
                  onClick={() =>
                    void a.run(`/pos/sales/${s.id}/outcome`, {
                      outcome: "confirmed",
                    })
                  }
                >
                  Confirm simulated sale
                </Button>
                <Button
                  variant="outline"
                  disabled={a.pending}
                  onClick={() =>
                    void a.run(`/pos/sales/${s.id}/outcome`, {
                      outcome: "failed",
                    })
                  }
                >
                  Fail sale
                </Button>
              </div>
            ) : s.transactionId ? (
              <Link to={`/transactions/${s.transactionId}`}>
                View receipt / transaction →
              </Link>
            ) : (
              "No money posted"
            ),
          ])}
        />
      </section>
    </>
  );
}
function Loans({ d }: { d: Tools }) {
  const a = useToolsAction(),
    accounts = useAccounts(),
    contacts = useContacts("", 1, "All", true),
    b = usePayeeOptions();
  const schema = loanInput.omit({ principalMinor: true, months: true }).extend({
    principal: moneyInput,
    months: z.string().regex(/^(?:[1-9]|[1-5]\d|60)$/),
  });
  return (
    <>
      <div className="notice">
        Lending capability preview. This models a business loan book with
        synthetic borrower data. No underwriting, lending eligibility, contract,
        credit bureau check or real issuance is provided. Monthly interest is
        flat on original principal, not APR or a reducing-balance rate.
      </div>
      <section className="panel">
        <h2>Create a loan draft</h2>
        <Feedback {...a} />
        <ToolForm
          schema={schema}
          defaults={{
            borrowerId: "",
            beneficiaryId: "",
            accountId: "",
            principal: "",
            monthlyRate: "1.5",
            months: "3",
            firstDue: "2026-11-21",
          }}
          fields={[
            {
              name: "borrowerId",
              label: "Borrower contact",
              options: [
                { value: "", label: "Choose billing contact" },
                ...(contacts.data?.items ?? []).map((c) => ({
                  value: c.id,
                  label: c.name,
                })),
              ],
            },
            {
              name: "beneficiaryId",
              label: "Disbursement beneficiary",
              options: [
                { value: "", label: "Choose saved payee" },
                ...(b.data?.items ?? []).map((b) => ({
                  value: b.id,
                  label: b.name,
                })),
              ],
            },
            {
              name: "accountId",
              label: "Lending account",
              options: [
                { value: "", label: "Choose KES account" },
                ...(accounts.data?.items ?? [])
                  .filter((a) => a.currency === "KES")
                  .map((a) => ({ value: a.id, label: a.name })),
              ],
            },
            { name: "principal", label: "Principal (KES)" },
            { name: "monthlyRate", label: "Flat interest rate per month (%)" },
            { name: "months", label: "Repayment period (months)" },
            { name: "firstDue", label: "First repayment date", type: "date" },
          ]}
          submit="Create loan & exact schedule"
          disabled={a.pending || !config.mock}
          onSubmit={async (v) => {
            await a.run("/loans", {
              borrowerId: v.borrowerId,
              beneficiaryId: v.beneficiaryId,
              accountId: v.accountId,
              principalMinor: scaled(v.principal, 2).toString(),
              monthlyRate: v.monthlyRate,
              months: Number(v.months),
              firstDue: v.firstDue,
            });
          }}
        />
      </section>
      {d.loans.map((l) => (
        <LoanCard key={l.id} loan={l} />
      ))}
    </>
  );
}
function LoanCard({ loan: l }: { loan: Tools["loans"][number] }) {
  const a = useToolsAction();
  const [amount, setAmount] = useState(""),
    [reference, setReference] = useState("");
  const total = l.schedule.reduce((n, s) => n + BigInt(s.totalMinor), 0n),
    paid = l.schedule.reduce((n, s) => n + BigInt(s.paidMinor), 0n);
  return (
    <section className="panel">
      <h2>
        {l.id} · {l.status}
      </h2>
      <p>
        Principal {money(l.principalMinor, "KES")} · {l.monthlyRate}% flat per
        month · {l.months} months
      </p>
      <p>
        Total interest{" "}
        {money((total - BigInt(l.principalMinor)).toString(), "KES")} · Total
        payable {money(total.toString(), "KES")} · Remaining{" "}
        {money((total - paid).toString(), "KES")}
      </p>
      <Feedback {...a} />
      {l.status === "Draft" && config.mock && (
        <Button
          disabled={a.pending}
          onClick={() =>
            void a.run(`/loans/${l.id}/issue`, { version: l.version })
          }
        >
          Issue preview loan for OTP disbursement
        </Button>
      )}
      {l.orderId && (
        <Link to={`/send-money/${l.orderId}`}>
          View principal disbursement →
        </Link>
      )}
      <Table
        label="Repayment schedule"
        headers={["Due date", "Principal", "Interest", "Installment", "Paid"]}
        rows={l.schedule.map((s) => [
          s.date,
          money(s.principalMinor, "KES"),
          money(s.interestMinor, "KES"),
          money(s.totalMinor, "KES"),
          <Money minor={s.paidMinor} currency="KES" direction="incoming" />,
        ])}
      />
      {l.status === "Active" && config.mock && (
        <form
          className="tool-form"
          onSubmit={async (ev) => {
            ev.preventDefault();
            if (
              moneyInput.safeParse(amount).success &&
              reference.trim().length >= 3 &&
              (await a.run(`/loans/${l.id}/repayments`, {
                amountMinor: scaled(amount, 2).toString(),
                reference,
                confirmed: true,
              }))
            ) {
              setAmount("");
              setReference("");
            }
          }}
        >
          <label>
            Confirmed simulated repayment (KES)
            <input
              value={amount}
              onChange={(ev) => setAmount(ev.target.value)}
            />
          </label>
          <label>
            Repayment reference
            <input
              value={reference}
              onChange={(ev) => setReference(ev.target.value)}
            />
          </label>
          <p>
            Explicit external-confirmation simulation. Only confirmed money
            increases cash. Overpayments are rejected; allocations go to the
            oldest outstanding installment.
          </p>
          <Button
            disabled={
              a.pending ||
              !moneyInput.safeParse(amount).success ||
              reference.trim().length < 3
            }
          >
            Confirm simulated repayment
          </Button>
        </form>
      )}
      <ul>
        {l.repayments.map((r) => (
          <li key={r.id}>
            {r.reference} · {money(r.amountMinor, "KES")} · {r.at}
          </li>
        ))}
      </ul>
    </section>
  );
}
export function CustomerStatementPage() {
  const { id = "" } = useParams();
  const [params, set] = useSearchParams();
  const q = useCustomerStatement(id, params);
  return (
    <Frame
      title="Customer statement of account"
      note="Running receivable ledger · issued invoices, confirmed allocations, credit notes and refunds"
    >
      <section className="panel">
        <div className="action-row">
          <label>
            Statement currency
            <select
              aria-label="Statement currency"
              value={params.get("currency") ?? "KES"}
              onChange={(ev) =>
                set((p) => {
                  p.set("currency", ev.target.value);
                  return p;
                })
              }
            >
              <option>KES</option>
              <option>USD</option>
            </select>
          </label>
          <label>
            From
            <input
              aria-label="Statement from"
              type="date"
              value={params.get("from") ?? ""}
              onChange={(ev) =>
                set((p) => {
                  if (ev.target.value) p.set("from", ev.target.value);
                  else p.delete("from");
                  return p;
                })
              }
            />
          </label>
          <label>
            To
            <input
              aria-label="Statement to"
              type="date"
              value={params.get("to") ?? "2026-10-21"}
              onChange={(ev) =>
                set((p) => {
                  p.set("to", ev.target.value);
                  return p;
                })
              }
            />
          </label>
        </div>
        {q.isPending ? (
          <StatePanel />
        ) : q.error ? (
          <StatePanel error={q.error} />
        ) : (
          <>
            <h2>{q.data.customer}</h2>
            <Freshness {...q.data} refresh={() => void q.refetch()} />
            <p>
              Opening {money(q.data.openingMinor, q.data.currency)} · Closing{" "}
              {money(q.data.closingMinor, q.data.currency)}
            </p>
            <Table
              label="Customer statement"
              headers={[
                "Date",
                "Reference",
                "Entry",
                "Debit",
                "Credit",
                "Running balance",
              ]}
              rows={q.data.rows.map((r) => [
                r.date,
                <Link to={`/invoices/${r.invoiceId}`}>{r.reference}</Link>,
                r.kind,
                r.debitMinor === "0" ? (
                  "—"
                ) : (
                  <Money
                    minor={r.debitMinor}
                    currency={q.data.currency}
                    direction={r.kind === "Refund" ? "outgoing" : "neutral"}
                  />
                ),
                r.creditMinor === "0" ? (
                  "—"
                ) : (
                  <Money
                    minor={r.creditMinor}
                    currency={q.data.currency}
                    direction={r.kind === "Payment" ? "incoming" : "neutral"}
                  />
                ),
                money(r.balanceMinor, q.data.currency),
              ])}
            />
            <div className="action-row">
              <Button onClick={() => window.print()}>Print statement</Button>
              <Button
                variant="outline"
                onClick={() => {
                  const data = q.data;
                  const rows = [
                    [
                      "Date",
                      "Reference",
                      "Type",
                      "DebitMinor",
                      "CreditMinor",
                      "BalanceMinor",
                      "Currency",
                    ],
                    ...data.rows.map((r) => [
                      r.date,
                      r.reference,
                      r.kind,
                      r.debitMinor,
                      r.creditMinor,
                      r.balanceMinor,
                      data.currency,
                    ]),
                  ];
                  const url = URL.createObjectURL(
                    new Blob(
                      [
                        "\ufeff" +
                          rows
                            .map((r) => r.map(csvCell).join(","))
                            .join("\r\n"),
                      ],
                      { type: "text/csv" },
                    ),
                  );
                  const el = document.createElement("a");
                  el.href = url;
                  el.download = `${id}-${data.currency}-statement.csv`;
                  el.click();
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                }}
              >
                Download statement CSV
              </Button>
            </div>
            <p>
              Positive balance is owed by the customer; negative balance is
              customer credit. Pending payments are excluded. Currencies remain
              separate.
            </p>
          </>
        )}
      </section>
    </Frame>
  );
}
export function BusinessRegistrationPage() {
  const r = useRegistration(),
    cache = useQueryClient(),
    navigate = useNavigate();
  const schema = registrationSchema.omit({ accept: true }).extend({
    accept: z
      .string()
      .refine((v) => v === "yes", "Confirm the development-only registration"),
  });
  return (
    <div className="registration-page">
      <Frame
        title="Create your business workspace"
        note="Development business signup · no real identity verification or account is created"
      >
        <section className="panel">
          <Feedback error={r.error} pending={r.pending} />
          <p>
            Verify your contact, create a business profile, then complete the
            onboarding documents and review. Banking and developer access are
            not granted at signup.
          </p>
          {config.mock ? (
            <>
              <p className="notice">
                Development-only verification challenge: 246810. No SMS or email
                is sent.
              </p>
              <ToolForm
                schema={schema}
                defaults={{
                  businessName: "",
                  name: "",
                  email: "",
                  phone: "",
                  challenge: "",
                  accept: "",
                }}
                fields={[
                  { name: "businessName", label: "Registered business name" },
                  { name: "name", label: "Your full name" },
                  { name: "email", label: "Business email", type: "email" },
                  { name: "phone", label: "Kenyan mobile (2547… or 2541…)" },
                  {
                    name: "challenge",
                    label: "Signup verification challenge",
                    type: "password",
                  },
                  {
                    name: "accept",
                    label: "Development registration acknowledgement",
                    options: [
                      { value: "", label: "Choose acknowledgement" },
                      {
                        value: "yes",
                        label:
                          "I understand this creates a simulated business only",
                      },
                    ],
                  },
                ]}
                submit="Verify & begin business onboarding"
                disabled={r.pending}
                onSubmit={async (v) => {
                  if (await r.register({ ...v, accept: true })) {
                    const session = await authAdapter.login({
                      identifier: v.email,
                      challenge: v.challenge,
                    });
                    await cache.cancelQueries();
                    cache.clear();
                    cache.setQueryData(keys.session, session);
                    rememberMockIdentity(session.role);
                    navigate("/onboarding");
                  }
                }}
              />
            </>
          ) : (
            <p>
              Registration requires the confirmed backend contact-verification
              and onboarding contract. It is unavailable until configured in
              real API mode.
            </p>
          )}
          <Link to="/login">Already have a business? Sign in →</Link>
        </section>
      </Frame>
    </div>
  );
}
