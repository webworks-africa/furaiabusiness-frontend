import { Money } from "../components/Money";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CreditCard, ShieldCheck, Snowflake } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  useCards,
  useCard,
  useCardActivity,
  usePaymentWrite,
} from "../application/payments";
import { useAccounts, useSession } from "../application/queries";
import { useCardholders } from "../application/enterprise";
import { cardSchema, type BusinessCard } from "../api/paymentContracts";
import { can } from "../auth/adapter";
import { config } from "../api/config";
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
import { RevealableCard } from "../components/BusinessCard";
export function CardsPage() {
  const q = useCards();
  const session = useSession();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  if (q.isPending) return <StatePanel />;
  if (q.error)
    return <StatePanel error={q.error} retry={() => void q.refetch()} />;
  const items = q.data.items.filter(
    (c) =>
      `${c.name} ${c.holderName} ${c.last4 ?? ""}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (!status || c.status === status),
  );
  const debit = q.data.items.filter((c) => c.kind === "Debit");
  const total = debit.reduce((n, c) => n + BigInt(c.spentMinor), 0n).toString();
  const columns: ColumnDef<BusinessCard>[] = [
    {
      accessorKey: "name",
      header: "Card & identifier",
      cell: ({ row }) => (
        <Link to={`/cards/${row.original.id}`}>
          <strong>{row.original.name}</strong>
          <small className="cell-note">
            {row.original.last4
              ? `•••• ${row.original.last4}`
              : "No card number issued"}
          </small>
        </Link>
      ),
    },
    { accessorKey: "holderName", header: "Cardholder" },
    {
      accessorKey: "form",
      header: "Type",
      cell: ({ row }) => `${row.original.form} ${row.original.kind}`,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "spentMinor",
      header: "Spend / monthly limit",
      cell: ({ row }) =>
        row.original.kind === "Credit" ? (
          "Illustration only"
        ) : (
          <>
            <Money
              minor={row.original.spentMinor}
              currency="KES"
              direction="outgoing"
            />
            <small className="cell-note">
              / {money(row.original.limits.monthlyMinor, "KES")}
            </small>
          </>
        ),
    },
  ];
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Corporate cards</h1>
          <p>
            Physical and virtual business debit cards, controls and requests.
          </p>
        </div>
        {can(session.data?.permissions ?? [], "cards:manage") && (
          <Link className="button button-primary" to="/cards/request">
            <CreditCard size={16} /> Request new card
          </Link>
        )}
      </div>
      <Freshness {...q.data} refresh={() => void q.refetch()} />
      <div className="payment-metrics">
        <section className="panel">
          <small>Active debit cards</small>
          <h2>{debit.filter((c) => c.status === "Active").length} cards</h2>
          <p>
            {debit.filter((c) => c.form === "Physical").length} physical ·{" "}
            {debit.filter((c) => c.form === "Virtual").length} virtual
          </p>
        </section>
        <section className="panel">
          <small>Illustrative cycle spend · KES</small>
          <h2>
            <Money minor={total} currency="KES" direction="outgoing" />
          </h2>
          <p>Historical fixture spend; no new ledger posting.</p>
        </section>
        <section className="panel">
          <small>Cards requiring action</small>
          <h2>
            {
              debit.filter((c) =>
                [
                  "Frozen",
                  "Pending approval",
                  "Approved for issuance",
                ].includes(c.status),
              ).length
            }{" "}
            cards
          </h2>
          <p>Frozen cards and requests awaiting review or issuance.</p>
        </section>
      </div>
      <section aria-labelledby="portfolio">
        <h2 id="portfolio">Card portfolio</h2>
        <div className="card-portfolio">
          {q.data.items.slice(0, 6).map((c) => (
            <article key={c.id}>
              <RevealableCard card={{ ...c, stale: q.data.stale }} />
              <div className="section-heading">
                <Link to={`/cards/${c.id}`}>{c.name}</Link>
                <StatusBadge status={c.status} />
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="panel">
        <div className="filter-bar">
          <label>
            Search cards
            <input
              value={search}
              placeholder="Cardholder, name or last four"
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <label>
            Card status
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All cards</option>
              {[
                "Active",
                "Frozen",
                "Pending approval",
                "Approved for issuance",
                "Rejected",
                "Preview",
              ].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>
        {items.length ? (
          <BillingTable
            items={items.slice((page - 1) * 6, page * 6)}
            columns={columns}
            label="Business cards"
            page={page}
            pages={Math.max(1, Math.ceil(items.length / 6))}
            total={items.length}
            onPage={setPage}
          />
        ) : (
          <Empty
            title="No matching cards"
            detail="Change the filters or request a test debit card."
          />
        )}
      </section>
      <div className="notice">
        <ShieldCheck size={18} /> Debit card controls are simulated. Credit
        cards are a design preview; no credit has been extended, and no
        issuance, repayments or network partnership is represented.
      </div>
    </>
  );
}
const limitForm = z
  .object({
    monthly: decimalAmount,
    daily: decimalAmount,
    single: decimalAmount,
    online: z.boolean(),
    contactless: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (
      [v.single, v.daily, v.monthly].every(
        (x) => decimalAmount.safeParse(x).success,
      ) &&
      (BigInt(toMinor(v.single)) > BigInt(toMinor(v.daily)) ||
        BigInt(toMinor(v.daily)) > BigInt(toMinor(v.monthly)))
    )
      ctx.addIssue({
        code: "custom",
        path: ["single"],
        message: "Use limits: single ≤ daily ≤ monthly",
      });
  });
const requestForm = limitForm.safeExtend({
  name: z.string().trim().min(3).max(80),
  holderId: z.string().min(1, "Select an active cardholder"),
  accountId: z.string().min(1, "Select an account"),
  form: z.enum(["Physical", "Virtual"]),
});
const limits = (v: z.infer<typeof limitForm>) => ({
  monthlyMinor: toMinor(v.monthly),
  dailyMinor: toMinor(v.daily),
  singleMinor: toMinor(v.single),
  online: v.online,
  contactless: v.contactless,
});
function LimitFields({
  form,
}: {
  form: ReturnType<typeof useForm<z.infer<typeof limitForm>>>;
}) {
  return (
    <>
      <div className="limit-fields">
        {(["monthly", "daily", "single"] as const).map((key) => (
          <Field
            key={key}
            id={`limit-${key}`}
            label={`${key[0].toUpperCase() + key.slice(1)} limit (KES)`}
            error={form.formState.errors[key]?.message}
          >
            <input
              id={`limit-${key}`}
              inputMode="decimal"
              {...form.register(key)}
            />
          </Field>
        ))}
      </div>
      <div className="action-row">
        <label className="checkbox-label">
          <input type="checkbox" {...form.register("online")} /> Online payments
        </label>
        <label className="checkbox-label">
          <input type="checkbox" {...form.register("contactless")} />{" "}
          Contactless payments
        </label>
      </div>
      <p>
        Cash withdrawals and cross-currency spending are unavailable in this
        mock. Card settings do not reserve account funds.
      </p>
    </>
  );
}
export function CardRequestPage() {
  const team = useCardholders();
  const accounts = useAccounts();
  const session = useSession();
  const mutation = usePaymentWrite(cardSchema);
  const navigate = useNavigate();
  const [key] = useState(() => crypto.randomUUID());
  const form = useForm<z.infer<typeof requestForm>>({
    resolver: zodResolver(requestForm),
    defaultValues: {
      name: "",
      holderId: "",
      accountId: "",
      form: "Virtual",
      monthly: "250000.00",
      daily: "50000.00",
      single: "30000.00",
      online: true,
      contactless: false,
    },
  });
  const allowed = can(session.data?.permissions ?? [], "cards:manage");
  if (team.isPending || accounts.isPending) return <StatePanel />;
  if (team.error || accounts.error)
    return (
      <StatePanel
        error={team.error ?? accounts.error}
        retry={() => {
          void team.refetch();
          void accounts.refetch();
        }}
      />
    );
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Request a new card</h1>
          <p>
            Submit a debit card request for separate review and issuer
            confirmation.
          </p>
        </div>
        <Link to="/cards">Back to cards →</Link>
      </div>
      <div className="f6-split">
        <section className="panel">
          <h2>Corporate debit card application</h2>
          <form
            onSubmit={form.handleSubmit(async (v) => {
              try {
                const c = await mutation.mutateAsync({
                  path: "/cards/requests",
                  body: {
                    name: v.name,
                    holderId: v.holderId,
                    accountId: v.accountId,
                    form: v.form,
                    limits: limits(v),
                  },
                  key,
                });
                navigate(`/cards/${c.id}`);
              } catch {
                /* Error below. */
              }
            })}
          >
            <fieldset
              className="plain-fieldset"
              disabled={
                !allowed ||
                mutation.isPending ||
                team.data.stale ||
                accounts.data.stale
              }
            >
              <Field id="card-form" label="Card format">
                <select id="card-form" {...form.register("form")}>
                  <option>Virtual</option>
                  <option>Physical</option>
                </select>
              </Field>
              <Field
                id="card-holder"
                label="Authorized cardholder"
                error={form.formState.errors.holderId?.message}
              >
                <select id="card-holder" {...form.register("holderId")}>
                  <option value="">Select member</option>
                  {team.data.members
                    .filter((m) => m.status === "Active")
                    .map((m) => (
                      <option value={m.id} key={m.id}>
                        {m.name} · {m.role}
                      </option>
                    ))}
                </select>
              </Field>
              <Field
                id="card-name"
                label="Card nickname / purpose"
                error={form.formState.errors.name?.message}
              >
                <input id="card-name" {...form.register("name")} />
              </Field>
              <Field id="card-account" label="Linked treasury account">
                <select id="card-account" {...form.register("accountId")}>
                  <option value="">Select account</option>
                  {accounts.data.items
                    .filter(
                      (a) => a.currency === "KES" && a.status === "Active",
                    )
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                </select>
              </Field>
              <div className="limit-fields">
                {(["monthly", "daily", "single"] as const).map((k) => (
                  <Field
                    key={k}
                    id={`request-${k}`}
                    label={`${k[0].toUpperCase() + k.slice(1)} limit (KES)`}
                    error={form.formState.errors[k]?.message}
                  >
                    <input
                      id={`request-${k}`}
                      inputMode="decimal"
                      {...form.register(k)}
                    />
                  </Field>
                ))}
              </div>
              <label className="checkbox-label">
                <input type="checkbox" {...form.register("online")} /> Online
                payments
              </label>
              <label className="checkbox-label">
                <input type="checkbox" {...form.register("contactless")} />{" "}
                Contactless payments
              </label>
              <Button>Submit card request</Button>
            </fieldset>
            <MutationMessage error={mutation.error} />
            {!allowed && (
              <p className="notice">Your role cannot request cards.</p>
            )}
          </form>
        </section>
        <aside className="panel">
          <ShieldCheck />
          <h2>Separate approval and issuance</h2>
          <p>
            Another authorized member must approve your request. Approved
            requests remain unissued until the simulated issuer event is
            confirmed.
          </p>
          <p>
            No real card is ordered. No PAN, CVV or PIN is generated or
            revealed. Card spend limits do not create or extend credit.
          </p>
          <Link to="/cards/CARD-PREVIEW">Explore credit design preview →</Link>
        </aside>
      </div>
    </>
  );
}
export function CardDetailPage() {
  const { id = "" } = useParams();
  const q = useCard(id);
  const accounts = useAccounts();
  const session = useSession();
  const activity = useCardActivity(id);
  const mutation = usePaymentWrite(cardSchema);
  const navigate = useNavigate();
  if (q.isPending) return <StatePanel />;
  if (q.error)
    return <StatePanel error={q.error} retry={() => void q.refetch()} />;
  const c = q.data;
  const allowed =
    can(session.data?.permissions ?? [], "cards:manage") && !c.stale;
  const self = c.makerId === session.data?.memberId;
  const action = async (action: string) => {
    try {
      const next = await mutation.mutateAsync({
        path: `/cards/${c.id}/${action}`,
        body: { version: c.version },
        key: crypto.randomUUID(),
      });
      if (action === "replace") navigate(`/cards/${next.id}`);
    } catch {
      /* Error rendered. */
    }
  };
  const account = accounts.data?.items.find((a) => a.id === c.accountId);
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{c.name}</h1>
          <p>
            {c.holderName} · {c.form} {c.kind.toLowerCase()}{" "}
            {c.last4 ? `· •••• ${c.last4}` : ""}
          </p>
        </div>
        <div className="action-row">
          <StatusBadge status={c.status} />
          <Link to="/cards">All cards →</Link>
        </div>
      </div>
      <Freshness {...c} refresh={() => void q.refetch()} />
      {c.kind === "Credit" ? (
        <CreditPreview card={c} />
      ) : (
        <>
          <div className="f6-split">
            <div>
              <RevealableCard card={c} />
              <section className="panel">
                <h2>Linked treasury account</h2>
                {accounts.error ? (
                  <StatePanel
                    error={accounts.error}
                    retry={() => void accounts.refetch()}
                  />
                ) : account ? (
                  <>
                    <Link to={`/accounts/${account.id}`}>{account.name}</Link>
                    <p>
                      Available{" "}
                      {money(account.availableMinor, account.currency)}
                    </p>
                    <p>Held {money(account.heldMinor, account.currency)}</p>
                  </>
                ) : (
                  <p>{accounts.isPending ? "Loading account…" : c.accountId}</p>
                )}
              </section>
              <section className="panel">
                <h2>Card security</h2>
                <p>
                  Show/hide uses deliberately non-payable development details.
                  Real card reveal, PIN changes and delivery require secure
                  issuer integration.
                </p>
                <div className="action-row">
                  {["Active", "Frozen"].includes(c.status) && allowed && (
                    <>
                      <Button
                        variant="outline"
                        disabled={mutation.isPending}
                        onClick={() =>
                          void action(
                            c.status === "Active" ? "freeze" : "unfreeze",
                          )
                        }
                      >
                        <Snowflake size={16} />
                        {c.status === "Active"
                          ? "Freeze card"
                          : "Unfreeze card"}
                      </Button>
                      <Button
                        variant="outline"
                        disabled={mutation.isPending}
                        onClick={() => void action("replace")}
                      >
                        Request replacement
                      </Button>
                    </>
                  )}
                </div>
                <p>
                  Replacement freezes the original immediately. The replacement
                  needs separate approval and issuer confirmation.
                </p>
                <MutationMessage error={mutation.error} />
              </section>
            </div>
            <div>
              {["Active", "Frozen"].includes(c.status) ? (
                <CardControls card={c} allowed={allowed} />
              ) : (
                <section className="panel">
                  <h2>Issuance request</h2>
                  <p>
                    Request maker: {c.makerId} · Approver:{" "}
                    {c.approverId ?? "Required"}
                  </p>
                  {c.status === "Pending approval" && (
                    <>
                      {self ? (
                        <p className="notice">
                          A different authorized member must approve. Switch
                          mock identity in development tools to review as
                          Finance.
                        </p>
                      ) : (
                        allowed && (
                          <div className="action-row">
                            <Button
                              disabled={mutation.isPending}
                              onClick={() => void action("approve")}
                            >
                              Approve card request
                            </Button>
                            <Button
                              variant="outline"
                              disabled={mutation.isPending}
                              onClick={() => void action("reject")}
                            >
                              Reject card request
                            </Button>
                          </div>
                        )
                      )}
                    </>
                  )}
                  {c.status === "Approved for issuance" && (
                    <p className="notice">
                      Request approved. No card has been issued yet.
                    </p>
                  )}
                  {import.meta.env.DEV &&
                    config.mock &&
                    c.status === "Approved for issuance" &&
                    allowed && <IssuerSimulator card={c} />}
                </section>
              )}
              <section className="panel">
                <h2>Recent card activity</h2>
                <p>
                  Illustrative existing activity; no new cash movements are
                  generated by card controls.
                </p>
                {activity.isPending ? (
                  <StatePanel />
                ) : activity.error ? (
                  <StatePanel
                    error={activity.error}
                    retry={() => void activity.refetch()}
                  />
                ) : activity.data.items.length ? (
                  <div
                    className="table-scroll"
                    role="region"
                    aria-label="Card activity"
                    tabIndex={0}
                  >
                    <table>
                      <thead>
                        <tr>
                          <th scope="col">Merchant</th>
                          <th scope="col">Amount</th>
                          <th scope="col">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activity.data.items.map((a) => (
                          <tr key={a.id}>
                            <td>{a.merchant}</td>
                            <td>
                              <Money
                                minor={a.amountMinor}
                                currency={a.currency}
                                direction="outgoing"
                              />
                            </td>
                            <td>
                              <StatusBadge status={a.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty
                    title="No activity"
                    detail="Card authorizations will appear after issuer integration."
                  />
                )}
              </section>
            </div>
          </div>
          <section className="panel">
            <h2>Card lifecycle activity</h2>
            <ol className="activity-list">
              {c.events.map((e, i) => (
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
            {c.replacementOf && (
              <Link to={`/cards/${c.replacementOf}`}>
                View original frozen card →
              </Link>
            )}
          </section>
        </>
      )}
    </>
  );
}
function CardControls({
  card,
  allowed,
}: {
  card: BusinessCard;
  allowed: boolean;
}) {
  const [version, setVersion] = useState(card.version);
  const mutation = usePaymentWrite(cardSchema);
  const form = useForm<z.infer<typeof limitForm>>({
    resolver: zodResolver(limitForm),
    defaultValues: {
      monthly: fromMinor(card.limits.monthlyMinor),
      daily: fromMinor(card.limits.dailyMinor),
      single: fromMinor(card.limits.singleMinor),
      online: card.limits.online,
      contactless: card.limits.contactless,
    },
  });
  function reload() {
    form.reset({
      monthly: fromMinor(card.limits.monthlyMinor),
      daily: fromMinor(card.limits.dailyMinor),
      single: fromMinor(card.limits.singleMinor),
      online: card.limits.online,
      contactless: card.limits.contactless,
    });
    setVersion(card.version);
  }
  return (
    <section className="panel">
      <h2>Spending controls & limits</h2>
      <p>
        Cycle spend{" "}
        <Money minor={card.spentMinor} currency="KES" direction="outgoing" /> /{" "}
        {money(card.limits.monthlyMinor, "KES")} limit
      </p>
      <progress
        aria-label="Monthly spending utilization"
        max={100}
        value={
          BigInt(card.limits.monthlyMinor) > 0n
            ? Number(
                (BigInt(card.spentMinor) * 100n) /
                  BigInt(card.limits.monthlyMinor),
              )
            : 0
        }
      />
      <VersionNotice local={version} server={card.version} reload={reload} />
      <form
        onSubmit={form.handleSubmit(async (v) => {
          try {
            const saved = await mutation.mutateAsync({
              path: `/cards/${card.id}/controls`,
              body: { version, limits: limits(v) },
              key: crypto.randomUUID(),
            });
            setVersion(saved.version);
          } catch {
            /* Error below. */
          }
        })}
      >
        <fieldset
          className="plain-fieldset"
          disabled={!allowed || mutation.isPending || version !== card.version}
        >
          <LimitFields form={form} />
          <Button>Save card controls</Button>
        </fieldset>
        <MutationMessage
          error={mutation.error}
          success={mutation.isSuccess ? "Mock card controls saved." : undefined}
        />
      </form>
    </section>
  );
}
function IssuerSimulator({ card }: { card: BusinessCard }) {
  const mutation = usePaymentWrite(cardSchema);
  return (
    <section className="provider-simulator">
      <h3>Development issuer event</h3>
      <p>
        This simulates issuer activation and creates only a masked test
        identifier.
      </p>
      <Button
        variant="outline"
        disabled={mutation.isPending}
        onClick={() =>
          mutation.mutate({
            path: `/__mock/cards/${card.id}/issue`,
            key: crypto.randomUUID(),
          })
        }
      >
        Simulate issuer confirmation
      </Button>
      <MutationMessage error={mutation.error} />
    </section>
  );
}
function CreditPreview({ card }: { card: BusinessCard }) {
  return (
    <>
      <div className="notice warning">
        Design preview only. No credit facility, approved limit, issuance,
        statement or repayment service is available.
      </div>
      <div className="f6-split">
        <div>
          <RevealableCard card={card} />
          <section className="panel">
            <h2>Illustrative facility model</h2>
            <p>Example limit: {money(card.limits.monthlyMinor, "KES")}</p>
            <p>
              This is an illustration, with no impact on available cash or
              borrowing capacity.
            </p>
          </section>
        </div>
        <section className="panel">
          <h2>Capability dependencies</h2>
          <ul>
            <li>Confirmed issuer eligibility and underwriting</li>
            <li>Backend-supported issuance and credit limits</li>
            <li>Authoritative statements, interest and repayment schedules</li>
            <li>Secure repayment execution and reconciliation</li>
          </ul>
          <div className="action-row">
            <Button disabled>Make repayment — unavailable</Button>
            <Button disabled>Request credit limit — unavailable</Button>
          </div>
          <p>
            Credit capabilities will remain unavailable until confirmed by the
            backend. No issuer or network partnership is implied.
          </p>
        </section>
      </div>
    </>
  );
}
