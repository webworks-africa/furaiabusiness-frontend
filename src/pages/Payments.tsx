import { SendMoneyPage } from "./BusinessTools";
import { Money } from "../components/Money";
import { useState } from "react";
import { Link, NavLink, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import { Send, ShieldCheck, Users } from "lucide-react";
import {
  useBeneficiaries,
  usePayouts,
  usePayout,
  usePaymentWrite,
} from "../application/payments";
import { useAccounts, useSession } from "../application/queries";
import {
  beneficiaryInput,
  beneficiarySchema,
  payoutSchema,
  payoutStatus,
  type Beneficiary,
  type Payout,
} from "../api/paymentContracts";
import { can } from "../auth/adapter";
import { config } from "../api/config";
import { ApiError } from "../api/http";
import { money } from "../domain/money";
import { decimalAmount, toMinor, fromMinor } from "../domain/payments";
import {
  Field,
  MutationMessage,
  VersionNotice,
} from "../components/BusinessForms";
import { StatePanel, Empty } from "../components/StatePanel";
import { Freshness, StatusBadge } from "../components/Freshness";
import { BillingTable } from "../components/BillingTable";
import { Button } from "../components/ui/button";
export function PaymentsNav() {
  return (
    <nav className="page-tabs" aria-label="Payment sections">
      <NavLink to="/payments" end>
        Payments
      </NavLink>
      <NavLink to="/payments/beneficiaries">Beneficiaries</NavLink>
      <NavLink to="/payments/approvals">Approvals</NavLink>
    </nav>
  );
}
export function PaymentsPage({ approvals = false }: { approvals?: boolean }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const q = usePayouts(search, page, approvals ? "Awaiting approval" : status);
  const accounts = useAccounts();
  const session = useSession();
  const columns: ColumnDef<Payout>[] = [
    {
      accessorKey: "id",
      header: "Reference",
      cell: ({ row }) => (
        <Link to={`/payments/${row.original.id}`}>{row.original.id}</Link>
      ),
    },
    {
      accessorKey: "beneficiary.name",
      header: "Beneficiary",
      cell: ({ row }) => (
        <>
          <strong>{row.original.beneficiary.name}</strong>
          <small className="cell-note">
            {row.original.beneficiary.rail} ·{" "}
            {row.original.beneficiary.maskedDestination}
          </small>
        </>
      ),
    },
    { accessorKey: "reference", header: "Payment reference" },
    {
      accessorKey: "amountMinor",
      header: "Amount",
      cell: ({ row }) => (
        <Money
          minor={row.original.amountMinor}
          currency={row.original.currency}
          direction="outgoing"
        />
      ),
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
          <h1>
            {approvals ? "Payment approvals" : "Payments & disbursements"}
          </h1>
          <p>
            Review mandates, reserve funds and track the original payment
            reference.
          </p>
        </div>
        <div className="action-row">
          <Link className="button button-outline" to="/payments/beneficiaries">
            <Users size={16} /> Beneficiaries
          </Link>
          {can(session.data?.permissions ?? [], "payments:write") && (
            <Link className="button button-primary" to="/payments/new">
              <Send size={16} /> Send money
            </Link>
          )}
        </div>
      </div>
      <PaymentsNav />
      <div className="notice">
        <ShieldCheck size={18} /> Mock mandate: every payment requires approval
        by a different active team member. Approval does not execute a payment.
      </div>
      {accounts.data && (
        <div className="payment-metrics">
          {accounts.data.items.map((a) => (
            <section key={a.id} className="panel">
              <small>{a.name}</small>
              <h2>{money(a.availableMinor, a.currency)}</h2>
              <p>Available · held {money(a.heldMinor, a.currency)}</p>
            </section>
          ))}
        </div>
      )}
      <section className="panel">
        <h2>
          {approvals ? "Awaiting a separate approver" : "Single payments"}
        </h2>
        <div className="filter-bar">
          <label>
            Search payments
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Reference or beneficiary"
            />
          </label>
          {!approvals && (
            <label>
              Payment status
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All statuses</option>
                {payoutStatus.options.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
          )}
        </div>
        {q.isPending ? (
          <StatePanel />
        ) : q.error ? (
          <StatePanel error={q.error} retry={() => void q.refetch()} />
        ) : (
          <>
            <Freshness {...q.data} refresh={() => void q.refetch()} />
            {!q.data.items.length ? (
              <Empty
                title={
                  approvals
                    ? "No payments awaiting approval"
                    : "No matching payments"
                }
                detail="Create a payment draft or change the filters."
              />
            ) : (
              <BillingTable
                items={q.data.items}
                columns={columns}
                label="Business payments"
                page={page}
                pages={Math.max(1, Math.ceil(q.data.total / 6))}
                total={q.data.total}
                onPage={setPage}
              />
            )}
          </>
        )}
      </section>
    </>
  );
}
export function BeneficiariesPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const q = useBeneficiaries(search, page);
  const session = useSession();
  const write = usePaymentWrite(beneficiarySchema);
  const archive = usePaymentWrite(beneficiarySchema);
  const [key, setKey] = useState(() => crypto.randomUUID());
  const allowed =
    can(session.data?.permissions ?? [], "payments:write") && !q.data?.stale;
  const form = useForm<z.infer<typeof beneficiaryInput>>({
    resolver: zodResolver(beneficiaryInput),
    defaultValues: {
      name: "",
      institution: "",
      rail: "PesaLink",
      destination: "",
    },
  });
  const cols: ColumnDef<Beneficiary>[] = [
    { accessorKey: "name", header: "Beneficiary" },
    { accessorKey: "rail", header: "Rail" },
    { accessorKey: "institution", header: "Institution" },
    { accessorKey: "maskedDestination", header: "Destination" },
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
            {allowed && (
              <>
                <Link to={`/payments/new?beneficiary=${row.original.id}`}>
                  Pay
                </Link>
                <Button
                  variant="outline"
                  disabled={archive.isPending}
                  onClick={() =>
                    archive.mutate({
                      path: `/beneficiaries/${row.original.id}/archive`,
                      body: { version: row.original.version },
                      key: crypto.randomUUID(),
                    })
                  }
                >
                  Archive
                </Button>
              </>
            )}
          </div>
        ),
    },
  ];
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Beneficiaries</h1>
          <p>Saved destinations for business disbursements.</p>
        </div>
      </div>
      <PaymentsNav />
      <div className="notice">
        Development fixtures only. Saving a beneficiary does not verify
        ownership, perform a bank-name match or send a notification.
      </div>
      <div className="f6-split">
        <section className="panel">
          <h2>Saved beneficiaries</h2>
          <label>
            Search beneficiaries
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </label>
          {q.isPending ? (
            <StatePanel />
          ) : q.error ? (
            <StatePanel error={q.error} retry={() => void q.refetch()} />
          ) : (
            <>
              <Freshness {...q.data} refresh={() => void q.refetch()} />
              {q.data.items.length ? (
                <BillingTable
                  items={q.data.items}
                  columns={cols}
                  label="Beneficiaries"
                  page={page}
                  pages={Math.max(1, Math.ceil(q.data.total / 6))}
                  total={q.data.total}
                  onPage={setPage}
                />
              ) : (
                <Empty
                  title="No beneficiaries"
                  detail="Add a test destination to begin."
                />
              )}
            </>
          )}
          <MutationMessage error={archive.error} />
        </section>
        <section className="panel">
          <h2>Add beneficiary</h2>
          <form
            onSubmit={form.handleSubmit(async (v) => {
              try {
                await write.mutateAsync({
                  path: "/beneficiaries",
                  body: v,
                  key,
                });
                form.reset();
                setKey(crypto.randomUUID());
              } catch {
                /* Render error. */
              }
            })}
          >
            <fieldset
              className="plain-fieldset"
              disabled={!allowed || write.isPending}
            >
              <Field
                id="ben-name"
                label="Beneficiary name"
                error={form.formState.errors.name?.message}
              >
                <input id="ben-name" {...form.register("name")} />
              </Field>
              <Field id="ben-rail" label="Destination rail">
                <select id="ben-rail" {...form.register("rail")}>
                  <option>PesaLink</option>
                  <option>M-Pesa B2C</option>
                  <option>RTGS</option>
                </select>
              </Field>
              <Field
                id="ben-bank"
                label="Institution / wallet"
                error={form.formState.errors.institution?.message}
              >
                <input id="ben-bank" {...form.register("institution")} />
              </Field>
              <Field
                id="ben-destination"
                label="Test account / mobile number"
                error={form.formState.errors.destination?.message}
              >
                <input
                  id="ben-destination"
                  inputMode="numeric"
                  autoComplete="off"
                  {...form.register("destination")}
                  aria-describedby="ben-hint"
                />
              </Field>
              <p id="ben-hint">
                M-Pesa: 2547… or 2541… format. Use test details only. KES
                destinations in this batch.
              </p>
              <Button>Save beneficiary</Button>
            </fieldset>
            <MutationMessage
              error={write.error}
              success={
                write.isSuccess
                  ? "Beneficiary saved and available for payments."
                  : undefined
              }
            />
            {!allowed && (
              <p className="notice">
                Editing requires payment permissions and fresh data.
              </p>
            )}
          </form>
        </section>
      </div>
    </>
  );
}
const paymentForm = z.object({
  accountId: z.string().min(1, "Select an account"),
  beneficiaryId: z.string().min(1, "Select a beneficiary"),
  amount: decimalAmount,
  reference: z.string().trim().min(3).max(80),
});
export function NewPaymentPage() {
  const { id = "" } = useParams();
  const query = usePayout(id);
  if (id && query.isPending) return <StatePanel />;
  if (id && query.error)
    return (
      <StatePanel error={query.error} retry={() => void query.refetch()} />
    );
  if (id && query.data?.status !== "Draft")
    return <StatePanel error={new ApiError(409, null)} />;
  return (
    <PaymentEditor key={id || "new"} initial={id ? query.data : undefined} />
  );
}
function PaymentEditor({ initial }: { initial?: Payout }) {
  const [revision, setRevision] = useState(initial?.version);
  const [search, setSearch] = useState(
    () =>
      initial?.beneficiary.id ??
      new URLSearchParams(location.search).get("beneficiary") ??
      "",
  );
  const [page, setPage] = useState(1);
  const beneficiaries = useBeneficiaries(search, page, "Active");
  const accounts = useAccounts();
  const session = useSession();
  const mutation = usePaymentWrite(payoutSchema);
  const navigate = useNavigate();
  const [key] = useState(() => crypto.randomUUID());
  const [selected, setSelected] = useState<Beneficiary | undefined>(
    initial?.beneficiary,
  );
  const form = useForm<z.infer<typeof paymentForm>>({
    resolver: zodResolver(paymentForm),
    defaultValues: {
      accountId: initial?.accountId ?? "",
      beneficiaryId:
        initial?.beneficiary.id ??
        new URLSearchParams(location.search).get("beneficiary") ??
        "",
      amount: initial ? fromMinor(initial.amountMinor) : "",
      reference: initial?.reference ?? "",
    },
  });
  const canWrite = can(session.data?.permissions ?? [], "payments:write");
  if (!canWrite && session.data)
    return <StatePanel error={new ApiError(403, null)} />;
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{initial ? "Edit payment draft" : "Send money"}</h1>
          <p>Create a draft, then review it before reserving funds.</p>
        </div>
      </div>
      <PaymentsNav />
      <div className="f6-split">
        <section className="panel">
          <h2>Payment details</h2>
          {initial && revision !== undefined && (
            <VersionNotice
              local={revision}
              server={initial.version}
              reload={() => {
                form.reset({
                  accountId: initial.accountId,
                  beneficiaryId: initial.beneficiary.id,
                  amount: fromMinor(initial.amountMinor),
                  reference: initial.reference,
                });
                setRevision(initial.version);
                setSelected(initial.beneficiary);
                setSearch(initial.beneficiary.id);
              }}
            />
          )}
          {accounts.isPending ? (
            <StatePanel />
          ) : accounts.error ? (
            <StatePanel
              error={accounts.error}
              retry={() => void accounts.refetch()}
            />
          ) : (
            <form
              onSubmit={form.handleSubmit(async (v) => {
                try {
                  const p = await mutation.mutateAsync({
                    path: initial
                      ? `/payments/${initial.id}/edit`
                      : "/payments",
                    body: {
                      ...(initial ? { version: revision } : {}),
                      accountId: v.accountId,
                      beneficiaryId: v.beneficiaryId,
                      amountMinor: toMinor(v.amount),
                      reference: v.reference,
                    },
                    key,
                  });
                  navigate(`/payments/${p.id}`);
                } catch {
                  /* Render error. */
                }
              })}
            >
              <fieldset
                className="plain-fieldset"
                disabled={
                  mutation.isPending ||
                  accounts.data.stale ||
                  beneficiaries.data?.stale ||
                  !canWrite ||
                  !!(initial && revision !== initial.version) ||
                  !!initial?.stale ||
                  !!(initial && initial.makerId !== session.data?.memberId)
                }
              >
                <Field
                  id="pay-account"
                  label="Source account"
                  error={form.formState.errors.accountId?.message}
                >
                  <select id="pay-account" {...form.register("accountId")}>
                    <option value="">Select account</option>
                    {accounts.data.items
                      .filter(
                        (a) => a.currency === "KES" && a.status === "Active",
                      )
                      .map((a) => (
                        <option value={a.id} key={a.id}>
                          {a.name} · {money(a.availableMinor, a.currency)}
                        </option>
                      ))}
                  </select>
                </Field>
                <label>
                  Find beneficiary
                  <input
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search saved destinations"
                  />
                </label>
                {beneficiaries.isPending ? (
                  <StatePanel />
                ) : beneficiaries.error ? (
                  <StatePanel
                    error={beneficiaries.error}
                    retry={() => void beneficiaries.refetch()}
                  />
                ) : (
                  <>
                    <Field
                      id="pay-ben"
                      label="Beneficiary"
                      error={form.formState.errors.beneficiaryId?.message}
                    >
                      <select
                        id="pay-ben"
                        {...form.register("beneficiaryId", {
                          onChange: (e) =>
                            setSelected(
                              beneficiaries.data.items.find(
                                (b) => b.id === e.target.value,
                              ),
                            ),
                        })}
                      >
                        <option value="">Select beneficiary</option>
                        {selected &&
                          !beneficiaries.data.items.some(
                            (b) => b.id === selected.id,
                          ) && (
                            <option value={selected.id}>{selected.name}</option>
                          )}
                        {beneficiaries.data.items.map((b) => (
                          <option value={b.id} key={b.id}>
                            {b.name} · {b.rail} · {b.maskedDestination}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <div className="action-row">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={page === 1}
                        onClick={() => setPage(page - 1)}
                      >
                        Previous beneficiaries
                      </Button>
                      <span>
                        {page} /{" "}
                        {Math.max(1, Math.ceil(beneficiaries.data.total / 6))}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={page * 6 >= beneficiaries.data.total}
                        onClick={() => setPage(page + 1)}
                      >
                        Next beneficiaries
                      </Button>
                    </div>
                  </>
                )}
                <Field
                  id="pay-amount"
                  label="Amount (KES)"
                  error={form.formState.errors.amount?.message}
                >
                  <input
                    id="pay-amount"
                    inputMode="decimal"
                    {...form.register("amount")}
                  />
                </Field>
                <Field
                  id="pay-ref"
                  label="Business payment reference"
                  error={form.formState.errors.reference?.message}
                >
                  <input id="pay-ref" {...form.register("reference")} />
                </Field>
                <Button disabled={!beneficiaries.data || !!beneficiaries.error}>
                  Review payment
                </Button>
              </fieldset>
              <MutationMessage error={mutation.error} />
            </form>
          )}
        </section>
        <aside className="panel">
          <ShieldCheck />
          <h2>Approval before execution</h2>
          <ol className="workflow-steps">
            <li>Create and review the draft.</li>
            <li>Submit to reserve funds.</li>
            <li>A different member approves the mandate.</li>
            <li>An authorized member executes the approved payment.</li>
            <li>Inquiry confirms the outcome under the original reference.</li>
          </ol>
          <p>
            All rails are simulated. Fee: KES 0.00 in this fixture. Real fees,
            limits and rail eligibility must come from the backend.
          </p>
          <Link to="/payments/beneficiaries">Add a beneficiary →</Link>
        </aside>
      </div>
    </>
  );
}
export function PaymentDetailPage() {
  const { id = "" } = useParams();
  return id.startsWith("PAY-ORDER-") ? (
    <SendMoneyPage />
  ) : (
    <LegacyPaymentDetailPage />
  );
}
function LegacyPaymentDetailPage() {
  const { id = "" } = useParams();
  const q = usePayout(id);
  const accounts = useAccounts();
  const session = useSession();
  const mutation = usePaymentWrite(payoutSchema);
  const [note, setNote] = useState("");
  const [attest, setAttest] = useState(false);
  if (q.isPending) return <StatePanel />;
  if (q.error)
    return <StatePanel error={q.error} retry={() => void q.refetch()} />;
  const p = q.data;
  const scopes = session.data?.permissions ?? [];
  const self = session.data?.memberId === p.makerId;
  const a = accounts.data?.items.find((a) => a.id === p.accountId);
  const disabled = mutation.isPending || p.stale;
  const action = (action: string) =>
    mutation.mutate({
      path: `/payments/${p.id}/${action}`,
      body: { version: p.version, ...(action === "reject" ? { note } : {}) },
      key: crypto.randomUUID(),
    });
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>
            {p.status === "Draft"
              ? "Review & authorize payment"
              : "Payment status"}
          </h1>
          <p>
            {p.id} · {p.reference}
          </p>
        </div>
        <StatusBadge status={p.status} />
      </div>
      <PaymentsNav />
      <Freshness {...p} refresh={() => void q.refetch()} />
      <section className="panel payout-review">
        <div className="payout-total">
          <small>Total payment debit</small>
          <h2>
            <Money
              minor={p.amountMinor}
              currency={p.currency}
              direction="outgoing"
            />
          </h2>
          <p>
            Principal{" "}
            <Money
              minor={p.amountMinor}
              currency={p.currency}
              direction="outgoing"
            />{" "}
            · Simulated fee {money(p.feeMinor, p.currency)}
          </p>
        </div>
        <div className="two-grid">
          <div className="review-block">
            <small>Source account</small>
            <h2>{a?.name ?? p.accountId}</h2>
            <p>{a?.maskedNumber}</p>
            {a && (
              <>
                <p>Available: {money(a.availableMinor, a.currency)}</p>
                <p>
                  Ledger: {money(a.ledgerMinor, a.currency)} · Held:{" "}
                  {money(a.heldMinor, a.currency)}
                </p>
              </>
            )}
            <p>This payment’s reservation: {money(p.holdMinor, p.currency)}</p>
          </div>
          <div className="review-block">
            <small>Destination beneficiary</small>
            <h2>{p.beneficiary.name}</h2>
            <p>
              {p.beneficiary.maskedDestination} · {p.beneficiary.institution}
            </p>
            <p>{p.beneficiary.rail} · KES · Mock only</p>
          </div>
        </div>
        <div className="review-block">
          <h2>Mandate authorization</h2>
          <p>Maker: {p.makerName}</p>
          <p>
            Approver:{" "}
            {p.approverName ?? "A different authorized member is required"}
          </p>
          <p>Execution: {p.executorId ?? "Not executed"}</p>
          {p.status === "Awaiting approval" && self && (
            <p className="notice">
              You created this payment and cannot approve it. In development
              tools, switch to Finance to review it as another member.
            </p>
          )}
          <div className="action-row">
            {p.status === "Draft" && self && can(scopes, "payments:write") && (
              <>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={attest}
                    onChange={(e) => setAttest(e.target.checked)}
                  />{" "}
                  I have reviewed the beneficiary and amount.
                </label>
                <Button
                  disabled={disabled || !attest}
                  onClick={() => action("submit")}
                >
                  Submit for approval
                </Button>
                <Link
                  className="button button-outline"
                  to={`/payments/${p.id}/edit`}
                >
                  Edit details
                </Link>
              </>
            )}
            {p.status === "Awaiting approval" &&
              !self &&
              can(scopes, "payments:approve") && (
                <>
                  <Button disabled={disabled} onClick={() => action("approve")}>
                    Approve payment
                  </Button>
                  <label>
                    Rejection reason
                    <input
                      maxLength={200}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                  </label>
                  <Button
                    variant="outline"
                    disabled={disabled || !note.trim()}
                    onClick={() => action("reject")}
                  >
                    Reject payment
                  </Button>
                </>
              )}
            {p.status === "Approved" && can(scopes, "payments:execute") && (
              <Button disabled={disabled} onClick={() => action("execute")}>
                Execute approved payment
              </Button>
            )}
            {["Draft", "Awaiting approval", "Approved"].includes(p.status) &&
              self &&
              can(scopes, "payments:write") && (
                <Button
                  variant="outline"
                  disabled={disabled}
                  onClick={() => action("cancel")}
                >
                  Cancel payment
                </Button>
              )}
            {p.status === "Pending confirmation" &&
              can(scopes, "payments:read") && (
                <Button disabled={disabled} onClick={() => action("inquiry")}>
                  Check original payment
                </Button>
              )}
          </div>
          <MutationMessage error={mutation.error} />
        </div>
        {p.status === "Pending confirmation" && (
          <div className="notice warning">
            Pending confirmation. Preserve {p.id}. Funds remain held. Do not
            create a duplicate payment or release its hold based on a timeout.
          </div>
        )}
        {import.meta.env.DEV &&
          config.mock &&
          p.status === "Pending confirmation" &&
          can(scopes, "payments:execute") && <PayoutSimulator id={p.id} />}
        <h2>Payment activity</h2>
        <ol className="activity-list">
          {p.events.map((e, i) => (
            <li key={i}>
              <strong>{e.label}</strong>
              <small>
                {e.actor} ·{" "}
                {new Date(e.at).toLocaleString("en-GB", {
                  timeZone: "Africa/Nairobi",
                })}{" "}
                EAT
              </small>
            </li>
          ))}
        </ol>
        {p.transactionId && (
          <Link to={`/transactions/${p.transactionId}`}>
            View linked bank transaction →
          </Link>
        )}
      </section>
    </>
  );
}
function PayoutSimulator({ id }: { id: string }) {
  const [outcome, setOutcome] = useState("pending");
  const mutation = usePaymentWrite(z.object({ ok: z.boolean() }));
  return (
    <section className="provider-simulator">
      <h2>Development rail outcome</h2>
      <p>
        This sets a simulated external event. Inquiry must still confirm it
        before balances change.
      </p>
      <label htmlFor="payout-outcome">Simulated payout outcome</label>
      <select
        id="payout-outcome"
        value={outcome}
        onChange={(e) => setOutcome(e.target.value)}
      >
        <option value="pending">UNKNOWN / pending</option>
        <option value="confirmed">Confirmed</option>
        <option value="failed">Definitive failure</option>
      </select>
      <Button
        variant="outline"
        disabled={mutation.isPending}
        onClick={() =>
          mutation.mutate({
            path: `/__mock/payouts/${id}/outcome`,
            body: { outcome },
            key: crypto.randomUUID(),
          })
        }
      >
        Set simulated payout outcome
      </Button>
      <MutationMessage
        error={mutation.error}
        success={
          mutation.isSuccess
            ? "Outcome set. Check the original payment to reconcile it."
            : undefined
        }
      />
    </section>
  );
}
