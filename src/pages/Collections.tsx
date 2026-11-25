import { DocumentPresentation } from "../documents/FinancialPaper";
import { receiptDocument } from "../documents/models";
import { Money } from "../components/Money";
import { Smartphone, Landmark, CreditCard, Wallet } from "lucide-react";
import {
  paymentMethods,
  normalizeKenyanMobile,
  methodName,
} from "../domain/paymentMethods";
import { useMemo, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import {
  usePaymentLinks,
  usePaymentLink,
  useSettlement,
  useCheckout,
  useAttempt,
  useReceipt,
  useCollectionWrite,
} from "../application/collections";
import { useBillingList, useBillingDocument } from "../application/billing";
import { useAccounts, useSession } from "../application/queries";
import {
  linkInput,
  linkSchema,
  attemptSchema,
  paymentMethodSchema,
  settlementSchema,
  type PaymentLink,
  type Receipt,
} from "../api/collectionContracts";
import { money } from "../domain/money";
import { scaled } from "../domain/billing";
import { can } from "../auth/adapter";
import { config } from "../api/config";
import { Button } from "../components/ui/button";
import { Field, MutationMessage } from "../components/BusinessForms";
import { Freshness, StatusBadge } from "../components/Freshness";
import { StatePanel, Empty } from "../components/StatePanel";
import { BillingTable } from "../components/BillingTable";
export function PaymentLinksPage() {
  const [p, set] = useSearchParams();
  const search = p.get("search") ?? "",
    status = p.get("status") ?? "All",
    page = Math.max(1, Number(p.get("page")) || 1);
  const q = usePaymentLinks(search, page, status);
  const session = useSession();
  const columns = useMemo<ColumnDef<PaymentLink>[]>(
    () => [
      {
        header: "Link reference",
        accessorKey: "id",
        cell: ({ row }) => (
          <Link to={`/payment-links/${row.original.id}`}>
            {row.original.id}
          </Link>
        ),
      },
      {
        header: "Invoice / customer",
        accessorKey: "invoiceId",
        cell: ({ row }) => (
          <>
            {row.original.customer}
            <small className="block">{row.original.invoiceId}</small>
          </>
        ),
      },
      {
        header: "Balance due",
        accessorFn: (l) => money(l.outstandingMinor, l.currency),
      },
      { header: "Valid through", accessorKey: "expires" },
      {
        header: "State",
        accessorKey: "status",
        cell: ({ getValue }) => <StatusBadge status={String(getValue())} />,
      },
    ],
    [],
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Payment links</h1>
          <p>Checkout links tied to immutable issued invoices</p>
        </div>
        {can(session.data?.permissions ?? [], "billing:write") && (
          <Button asChild>
            <Link to="/payment-links/new">Create payment link</Link>
          </Button>
        )}
      </div>
      <section className="panel">
        <div className="billing-filters">
          <label>
            Search payment links
            <input
              value={search}
              onChange={(e) => set({ search: e.target.value, status })}
            />
          </label>
          <label>
            Link state
            <select
              value={status}
              onChange={(e) => set({ search, status: e.target.value })}
            >
              {["All", "Active", "Expired", "Revoked", "Closed"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>
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
                columns={columns}
                label="Payment links"
                page={page}
                pages={q.data.pages}
                total={q.data.total}
                onPage={(n) => set({ search, status, page: String(n) })}
              />
            ) : (
              <Empty
                title="No payment links"
                detail="Create a link for an issued invoice with an outstanding balance."
              />
            )}
          </>
        )}
      </section>
    </>
  );
}
export function NewPaymentLinkPage() {
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Create payment link</h1>
          <p>Select the issued invoice and matching settlement account</p>
        </div>
        <Link to="/payment-links">All payment links →</Link>
      </div>
      <LinkForm />
    </>
  );
}
function LinkForm({ invoiceId }: { invoiceId?: string }) {
  const session = useSession();
  const allowed = can(session.data?.permissions ?? [], "billing:write");
  const [currency, setCurrency] = useState("KES");
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoicePage, setInvoicePage] = useState(1);
  const invoices = useBillingList(
    "invoices",
    invoiceSearch,
    invoicePage,
    currency,
    "All",
  );
  const scoped = useBillingDocument("invoices", invoiceId ?? "");
  const accounts = useAccounts();
  const mutation = useCollectionWrite(linkSchema);
  const [key] = useState(() => crypto.randomUUID());
  const navigate = useNavigate();
  const form = useForm<z.infer<typeof linkInput>>({
    resolver: zodResolver(linkInput),
    defaultValues: {
      invoiceId: invoiceId ?? "",
      accountId: "",
      expires: "2026-11-20",
      partial: true,
    },
  });
  async function submit(values: z.infer<typeof linkInput>) {
    try {
      const saved = await mutation.mutateAsync({
        path: "/payment-links",
        body: values,
        key,
      });
      navigate("/payment-links/" + saved.id);
    } catch {
      /* Inline error. */
    }
  }
  return (
    <section className="panel">
      <h2>Checkout configuration</h2>
      <label>
        Invoice currency
        <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
          <option>KES</option>
          <option>USD</option>
        </select>
      </label>
      <form noValidate onSubmit={form.handleSubmit(submit)}>
        <fieldset
          className="plain-fieldset"
          disabled={!allowed || mutation.isPending}
        >
          <Field
            id="link-invoice"
            label="Issued invoice"
            error={form.formState.errors.invoiceId?.message}
          >
            <select
              id="link-invoice"
              {...form.register("invoiceId")}
              value={form.watch("invoiceId")}
            >
              <option value="">Choose an invoice</option>
              {(scoped.data ? [scoped.data] : (invoices.data?.items ?? []))
                .filter(
                  (d) => d.status !== "Draft" && d.outstandingMinor !== "0",
                )
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.id} · {money(d.outstandingMinor, d.values.currency)}
                  </option>
                ))}
            </select>
          </Field>
          {!invoiceId && (
            <div className="billing-filters">
              <label>
                Find issued invoice
                <input
                  value={invoiceSearch}
                  onChange={(e) => {
                    setInvoiceSearch(e.target.value);
                    setInvoicePage(1);
                  }}
                />
              </label>
              <Button
                type="button"
                variant="outline"
                disabled={invoicePage <= 1}
                onClick={() => setInvoicePage((n) => n - 1)}
              >
                Previous invoices
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!invoices.data || invoicePage >= invoices.data.pages}
                onClick={() => setInvoicePage((n) => n + 1)}
              >
                Next invoices
              </Button>
            </div>
          )}
          <Field
            id="link-account"
            label="Settlement account"
            error={form.formState.errors.accountId?.message}
          >
            <select id="link-account" {...form.register("accountId")}>
              <option value="">Choose a matching account</option>
              {accounts.data?.items
                .filter(
                  (a) =>
                    a.currency === (scoped.data?.values.currency ?? currency) &&
                    a.status === "Active",
                )
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} · {a.currency}
                  </option>
                ))}
            </select>
          </Field>
          <Field
            id="link-expiry"
            label="Valid through"
            error={form.formState.errors.expires?.message}
          >
            <input id="link-expiry" type="date" {...form.register("expires")} />
          </Field>
          <label className="checkbox-label">
            <input type="checkbox" {...form.register("partial")} />
            Allow partial payments
          </label>
          <p>
            The API confirms the remaining amount before accepting an attempt.
            Creating a link sends no email.
          </p>
          <Button disabled={!allowed || mutation.isPending}>
            Generate checkout link
          </Button>
        </fieldset>
        <MutationMessage error={mutation.error} />
      </form>
      {invoices.error && (
        <StatePanel
          error={invoices.error}
          retry={() => void invoices.refetch()}
        />
      )}
      {accounts.error && (
        <StatePanel
          error={accounts.error}
          retry={() => void accounts.refetch()}
        />
      )}
    </section>
  );
}
export function PaymentLinkDetailPage() {
  const { id = "" } = useParams();
  const q = usePaymentLink(id);
  const session = useSession();
  const action = useCollectionWrite(linkSchema);
  if (q.isPending) return <StatePanel />;
  if (q.error)
    return <StatePanel error={q.error} retry={() => void q.refetch()} />;
  const l = q.data;
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Payment link {l.id}</h1>
          <p>
            {l.customer} · {l.invoiceId}
          </p>
        </div>
        <StatusBadge status={l.status} />
      </div>
      <div className="two-grid">
        <section className="panel">
          <h2>{money(l.outstandingMinor, l.currency)}</h2>
          <p>Remaining invoice balance · valid through {l.expires}</p>
          <p>
            {l.partial ? "Partial payments allowed" : "Full balance required"}
          </p>
          <div className="action-row">
            <Button asChild>
              <Link to={`/public/invoices/${l.token}`}>Open checkout</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={`/invoices/${l.invoiceId}`}>View invoice</Link>
            </Button>
          </div>
          {can(session.data?.permissions ?? [], "billing:write") &&
            l.status === "Active" && (
              <Button
                variant="outline"
                disabled={action.isPending}
                onClick={() =>
                  action.mutate({
                    path: `/payment-links/${l.id}/revoke`,
                    body: { version: l.version },
                  })
                }
              >
                Revoke link
              </Button>
            )}
          <MutationMessage error={action.error} />
          <p>
            Revoking this link prevents new attempts. An existing uncertain
            payment keeps its original reference and inquiry path.
          </p>
        </section>
        <section className="panel">
          <h2>Distribution</h2>
          <p>
            Development links work within this browser tab. Full reload resets
            mock records. Real delivery requires the backend.
          </p>
          <p className="preserve-lines">/public/invoices/{l.token}</p>
        </section>
      </div>
      <InvoiceCollections invoiceId={l.invoiceId} />
    </>
  );
}
const adjustmentInput = z.object({
  amount: z
    .string()
    .regex(
      /^\d{1,12}(\.\d{1,2})?$/,
      "Enter a positive amount, up to 2 decimals",
    )
    .refine((v) => /[1-9]/.test(v), "Amount must be greater than zero"),
  reason: z.string().trim().min(5).max(300),
  paymentId: z.string(),
});
export function InvoiceCollections({ invoiceId }: { invoiceId: string }) {
  const q = useSettlement(invoiceId);
  const session = useSession();
  const [show, setShow] = useState(false);
  if (q.isPending) return <StatePanel />;
  if (q.error)
    return <StatePanel error={q.error} retry={() => void q.refetch()} />;
  const d = q.data;
  const currency = d.currency;
  return (
    <section className="panel">
      <div className="section-heading">
        <h2>Collections, credits & refunds</h2>
        <Button variant="outline" onClick={() => void q.refetch()}>
          Refresh collections
        </Button>
      </div>
      <Freshness {...d} refresh={() => void q.refetch()} />
      <p>
        Confirmed allocations only reduce balance due. Credit notes and cash
        refunds remain separate records.
      </p>
      <dl className="billing-totals">
        {Object.entries({
          paidMinor: "Confirmed payments",
          creditedMinor: "Credit notes",
          refundedMinor: "Confirmed refunds",
          customerCreditMinor: "Customer credit",
          outstandingMinor: "Balance due",
        }).map(([key, label]) => (
          <div key={key}>
            <dt>{label}</dt>
            <dd>
              {currency ? (
                <Money
                  minor={d[key as "paidMinor"]}
                  currency={currency}
                  direction={
                    key === "paidMinor"
                      ? "incoming"
                      : key === "refundedMinor"
                        ? "outgoing"
                        : "neutral"
                  }
                />
              ) : (
                `${d[key as "paidMinor"]} minor units`
              )}
            </dd>
          </div>
        ))}
      </dl>
      {can(session.data?.permissions ?? [], "billing:write") && (
        <>
          <Button variant="outline" onClick={() => setShow(!show)}>
            {show ? "Hide link configuration" : "Create invoice checkout link"}
          </Button>
          {show && <LinkForm invoiceId={invoiceId} />}
          <div className="two-grid">
            <AdjustmentForm mode="credit" data={d} />
            <AdjustmentForm mode="refund" data={d} />
          </div>
        </>
      )}
      <h3>Payment links</h3>
      {!d.links.length ? (
        <p>No checkout links yet.</p>
      ) : (
        d.links.map((l) => (
          <p key={l.id}>
            <Link to={`/payment-links/${l.id}`}>{l.id}</Link> · {l.status}
          </p>
        ))
      )}
      <h3>Payment attempts & receipts</h3>
      {!d.attempts.length ? (
        <p>No payment attempts.</p>
      ) : (
        d.attempts.map((p) => (
          <article key={p.id} className="invitation-item">
            <strong>
              {p.id} ·{" "}
              <Money
                minor={p.amountMinor}
                currency={p.currency}
                direction={p.status === "Confirmed" ? "incoming" : "neutral"}
              />
            </strong>
            <p>
              {methodName(p.method)} · {p.status}
            </p>
            {p.receipt && (
              <Link to={`/receipts/${p.receipt.id}`}>
                View receipt {p.receipt.id} →
              </Link>
            )}
          </article>
        ))
      )}
      <h3>Issued credit notes</h3>
      {d.credits.map((c) => (
        <article key={c.id} className="invitation-item">
          <strong>
            {c.id} · {money(c.amountMinor, currency)}
          </strong>
          <p>
            {c.reason} · {c.at}
          </p>
          <small>
            Immutable credit event. No cash was returned by issuing this note.
          </small>
        </article>
      ))}
      {!d.credits.length && <p>No credit notes issued.</p>}
      <h3>Refund events</h3>
      {d.refunds.map((f) => (
        <article key={f.id} className="invitation-item">
          <strong>
            {f.id} ·{" "}
            <Money
              minor={f.amountMinor}
              currency={currency}
              direction="outgoing"
            />
          </strong>
          <p>
            {f.status} · {f.reason}
          </p>
          {import.meta.env.DEV &&
            config.mock &&
            f.status === "Pending confirmation" && (
              <DevelopmentRefund id={f.id} />
            )}
        </article>
      ))}
      {!d.refunds.length && <p>No refund requests.</p>}
    </section>
  );
}
function AdjustmentForm({
  mode,
  data,
}: {
  mode: "credit" | "refund";
  data: z.infer<typeof settlementSchema>;
}) {
  const mutation = useCollectionWrite(settlementSchema);
  const [key, setKey] = useState(() => crypto.randomUUID());
  const form = useForm<z.infer<typeof adjustmentInput>>({
    resolver: zodResolver(adjustmentInput),
    defaultValues: { amount: "", reason: "", paymentId: "" },
  });
  const [confirm, setConfirm] = useState(false);
  async function submit(v: z.infer<typeof adjustmentInput>) {
    try {
      await mutation.mutateAsync({
        path: `/invoices/${data.invoiceId}/${mode === "credit" ? "credit-notes" : "refunds"}`,
        body: {
          version: data.version,
          amountMinor: scaled(v.amount, 2).toString(),
          reason: v.reason,
          ...(mode === "refund" ? { paymentId: v.paymentId } : {}),
        },
        key,
      });
      setKey(crypto.randomUUID());
      form.reset();
      setConfirm(false);
    } catch {
      /* Inline error. */
    }
  }
  return (
    <form
      className="adjustment-form"
      noValidate
      onSubmit={form.handleSubmit(submit)}
    >
      <h3>{mode === "credit" ? "Issue credit note" : "Request cash refund"}</h3>
      <p>
        {mode === "credit"
          ? "Reduces invoice receivable; any overpayment becomes customer credit."
          : "Requires a confirmed payment and refundable customer credit. Confirmation is a separate external event."}
      </p>
      <Field
        id={`${mode}-amount`}
        label={`${mode === "credit" ? "Credit" : "Refund"} amount`}
        error={form.formState.errors.amount?.message}
      >
        <input
          id={`${mode}-amount`}
          inputMode="decimal"
          {...form.register("amount")}
        />
      </Field>
      <Field
        id={`${mode}-reason`}
        label={`${mode === "credit" ? "Credit" : "Refund"} reason`}
        error={form.formState.errors.reason?.message}
      >
        <input id={`${mode}-reason`} {...form.register("reason")} />
      </Field>
      {mode === "refund" && (
        <Field id="refund-payment" label="Original confirmed payment">
          <select id="refund-payment" {...form.register("paymentId")}>
            <option value="">Select a confirmed payment</option>
            {data.attempts
              .filter((p) => p.status === "Confirmed")
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id}
                </option>
              ))}
          </select>
        </Field>
      )}
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={confirm}
          onChange={(e) => setConfirm(e.target.checked)}
        />
        I confirm this{" "}
        {mode === "credit"
          ? "credit note is immutable and does not return cash."
          : "request does not prove money has been returned."}
      </label>
      <Button
        disabled={
          !confirm ||
          mutation.isPending ||
          data.attempts.some((p) =>
            ["Processing", "Pending confirmation"].includes(p.status),
          )
        }
      >
        {mode === "credit" ? "Issue credit note" : "Request refund"}
      </Button>
      <MutationMessage
        error={mutation.error}
        success={mutation.isSuccess ? "Saved event recorded." : undefined}
      />
    </form>
  );
}
function DevelopmentRefund({ id }: { id: string }) {
  const m = useCollectionWrite(settlementSchema);
  return (
    <div className="dev-outcome">
      <p>Development event simulator · no real refund or approval</p>
      <Button
        variant="outline"
        disabled={m.isPending}
        onClick={() => m.mutate({ path: `/__mock/refunds/${id}/confirmed` })}
      >
        Simulate confirmed refund
      </Button>
      <Button
        variant="outline"
        disabled={m.isPending}
        onClick={() => m.mutate({ path: `/__mock/refunds/${id}/failed` })}
      >
        Simulate failed refund
      </Button>
      <MutationMessage error={m.error} />
    </div>
  );
}
export function PublicCheckoutPage() {
  const { token = "" } = useParams();
  const q = useCheckout(token);
  if (q.isPending) return <StatePanel />;
  if (q.error)
    return <StatePanel error={q.error} retry={() => void q.refetch()} />;
  return (
    <Checkout
      key={token}
      token={token}
      data={q.data}
      recheck={async () => {
        const result = await q.refetch();
        return !result.error;
      }}
    />
  );
}
const payInput = z
  .object({
    method: paymentMethodSchema,
    phone: z.string().max(40),
    amount: z
      .string()
      .regex(/^\d{1,12}(\.\d{1,2})?$/, "Enter up to two decimals")
      .refine((v) => /[1-9]/.test(v), "Amount must be greater than zero"),
  })
  .superRefine((v, ctx) => {
    if (v.method === "mpesa" && !normalizeKenyanMobile(v.phone))
      ctx.addIssue({
        code: "custom",
        path: ["phone"],
        message: "Enter a Kenyan mobile number: 07…, 01… or +254…",
      });
  });
function Checkout({
  token,
  data: d,
  recheck,
}: {
  recheck: () => Promise<boolean>;
  token: string;
  data: z.infer<typeof import("../api/collectionContracts").checkoutSchema>;
}) {
  const navigate = useNavigate();
  const mutation = useCollectionWrite(attemptSchema);
  const [key] = useState(() => crypto.randomUUID());
  const form = useForm<z.infer<typeof payInput>>({
    resolver: zodResolver(payInput),
    defaultValues: {
      method: d.link.currency === "KES" ? "mpesa" : "visa",
      phone: "",
      amount:
        (BigInt(d.link.outstandingMinor) / 100n).toString() +
        "." +
        (BigInt(d.link.outstandingMinor) % 100n).toString().padStart(2, "0"),
    },
  });
  async function submit(v: z.infer<typeof payInput>) {
    try {
      const result = await mutation.mutateAsync({
        path: `/public/checkouts/${token}/attempts`,
        body: {
          method: v.method,
          ...(v.method === "mpesa"
            ? { phone: normalizeKenyanMobile(v.phone)! }
            : {}),
          amountMinor: d.link.partial
            ? scaled(v.amount, 2).toString()
            : d.link.outstandingMinor,
        },
        key,
      });
      navigate(`/public/payments/${result.token}`);
    } catch {
      /* Inline error. */
    }
  }
  return (
    <div className="checkout">
      <p className="notice">
        TEST ENVIRONMENT · no live funds or payment rails are connected
      </p>
      <div className="checkout-banner">
        <span>{d.snapshot.issuerName}</span>
        <h1>Pay invoice {d.link.invoiceId}</h1>
        <p>{d.snapshot.customer.name}</p>
      </div>
      <section className="panel">
        <div className="section-heading">
          <div>
            <span>Balance due</span>
            <h2>{money(d.link.outstandingMinor, d.link.currency)}</h2>
          </div>
          <StatusBadge status={d.link.status} />
        </div>
        <p>
          Invoice state: {d.invoiceStatus} · link valid through {d.link.expires}
        </p>
        <details>
          <summary>View invoice breakdown</summary>
          <ul>
            {d.snapshot.values.lines.map((l, i) => (
              <li key={i}>
                {l.description} ·{" "}
                {money(d.snapshot.totals.lines[i].totalMinor, d.link.currency)}
              </li>
            ))}
          </ul>
        </details>
        {d.activeAttempt ? (
          <div role="status" className="notice warning">
            <h2>Pending confirmation</h2>
            <p>
              Keep reference {d.activeAttempt.id}. Do not attempt another
              payment while this outcome is uncertain.
            </p>
            <Button asChild>
              <Link to={`/public/payments/${d.activeAttempt.token}`}>
                View original payment
              </Link>
            </Button>
          </div>
        ) : d.link.status !== "Active" ? (
          <p role="status">
            {d.link.status === "Closed"
              ? "This invoice has no outstanding balance."
              : `This link is ${d.link.status.toLowerCase()}. Contact the business for a new link.`}
          </p>
        ) : (
          <form noValidate onSubmit={form.handleSubmit(submit)}>
            <fieldset
              className="payment-method-options"
              disabled={mutation.isPending || mutation.isError}
            >
              <legend>Choose a payment method</legend>
              <div className="payment-method-grid">
                {paymentMethods.map((m) => {
                  const Icon =
                    m.id === "mpesa"
                      ? Smartphone
                      : m.id === "pesalink"
                        ? Landmark
                        : m.id === "paypal"
                          ? Wallet
                          : CreditCard;
                  return (
                    <label
                      key={m.id}
                      className={
                        form.watch("method") === m.id
                          ? "payment-method-option selected"
                          : "payment-method-option"
                      }
                    >
                      <input
                        type="radio"
                        value={m.id}
                        disabled={m.kesOnly && d.link.currency !== "KES"}
                        {...form.register("method")}
                      />
                      <Icon size={22} aria-hidden="true" />
                      <strong>{m.label}</strong>
                      <small>
                        {m.kesOnly && d.link.currency !== "KES"
                          ? "KES only in this simulation"
                          : m.description}
                      </small>
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <div className="checkout-method">
              <strong>{methodName(form.watch("method"))} · simulated</strong>
              <p>
                {mutation.isPending ? (
                  <>
                    <span className="spinner" /> Requesting payment…
                  </>
                ) : form.watch("method") === "mpesa" ? (
                  "Send a simulated STK push to a Kenyan mobile number. An on-screen phone prompt will appear; no real handset is contacted. Never enter your M-Pesa PIN here."
                ) : form.watch("method") === "pesalink" ? (
                  "A simulated bank transfer reference will be generated. No live bank or rail is connected."
                ) : form.watch("method") === "paypal" ? (
                  "Continue to an on-screen PayPal approval simulator. No PayPal login or external redirect."
                ) : (
                  "Continue to a hosted-checkout simulator. Do not enter card numbers, expiry dates or CVVs."
                )}
              </p>
            </div>
            {form.watch("method") === "mpesa" && (
              <Field
                id="mpesa-phone"
                label="M-Pesa mobile number"
                error={form.formState.errors.phone?.message}
              >
                <input
                  id="mpesa-phone"
                  type="tel"
                  autoComplete="off"
                  placeholder="0712 345 678"
                  {...form.register("phone")}
                />
                <small>
                  Use a test number. It is masked in payment records.
                </small>
              </Field>
            )}
            <Field
              id="checkout-amount"
              label={`Payment amount (${d.link.currency})`}
              error={form.formState.errors.amount?.message}
            >
              <input
                id="checkout-amount"
                inputMode="decimal"
                readOnly={!d.link.partial}
                {...form.register("amount")}
                value={
                  d.link.partial
                    ? form.watch("amount")
                    : (BigInt(d.link.outstandingMinor) / 100n).toString() +
                      "." +
                      (BigInt(d.link.outstandingMinor) % 100n)
                        .toString()
                        .padStart(2, "0")
                }
              />
            </Field>
            <p>
              {d.link.partial
                ? "You may pay part of the remaining balance."
                : "This link requires the full remaining balance."}
            </p>
            <Button disabled={mutation.isPending || mutation.isError}>
              {mutation.isPending ? (
                <>
                  <span className="spinner" /> Requesting payment…
                </>
              ) : form.watch("method") === "mpesa" ? (
                "Send simulated STK push"
              ) : (
                "Start simulated payment"
              )}
            </Button>
            {mutation.isError && (
              <div role="status">
                <p>
                  Payment creation could not be confirmed. Recheck this checkout
                  before another attempt; the same request reference is
                  retained.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    if (await recheck()) mutation.reset();
                  }}
                >
                  Recheck checkout
                </Button>
              </div>
            )}
            <MutationMessage error={mutation.error} />
          </form>
        )}
      </section>
    </div>
  );
}
export function PublicPaymentResultPage() {
  const { reference = "" } = useParams();
  const q = useAttempt(reference);
  const inquiry = useCollectionWrite(attemptSchema);
  if (q.isPending) return <StatePanel />;
  if (q.error)
    return <StatePanel error={q.error} retry={() => void q.refetch()} />;
  const p = q.data;
  return (
    <div className="checkout">
      <section className="panel payment-result">
        <h1>
          {p.status === "Confirmed"
            ? "Payment confirmed"
            : p.status === "Failed"
              ? "Payment failed"
              : p.status === "Processing"
                ? "Payment processing"
                : "Pending confirmation"}
        </h1>
        <p>
          <Money
            minor={p.amountMinor}
            currency={p.currency}
            direction={p.status === "Confirmed" ? "incoming" : "neutral"}
          />
        </p>
        <h2>{p.id}</h2>
        <Freshness {...p} refresh={() => void q.refetch()} />
        {p.method === "mpesa" &&
          ["Processing", "Pending confirmation"].includes(p.status) && (
            <div className="stk-waiting" role="status">
              <span className="phone-pulse" />
              <div>
                <strong>Waiting for M-Pesa confirmation</strong>
                <p>
                  STK push sent. Approve the phone prompt. Keep this page open;
                  do not send another request. Never enter your M-Pesa PIN here.
                </p>
              </div>
            </div>
          )}
        <p>Original invoice: {p.invoiceId}</p>
        <section className="provider-status">
          <h3>{methodName(p.method)}</h3>
          <p>{p.providerState}</p>
          <p>Provider reference: {p.providerReference}</p>
          {p.maskedPhone && <p>Mobile number: {p.maskedPhone}</p>}
          <ol className="activity-list">
            {p.providerEvents.map((e, i) => (
              <li key={i}>
                {e.label}
                <small>{e.at}</small>
              </li>
            ))}
          </ol>
        </section>
        {import.meta.env.DEV &&
          config.mock &&
          ["Processing", "Pending confirmation"].includes(p.status) &&
          p.method !== "simulated" && <ProviderSimulator payment={p} />}

        {["Processing", "Pending confirmation"].includes(p.status) && (
          <p className="notice warning">
            Keep this reference. Do not repeat payment while confirmation is
            outstanding. Browser return URLs do not prove success.
          </p>
        )}
        {p.status === "Failed" && (
          <p>
            No confirmed allocation was recorded. Ask the business to review
            before starting another attempt.
          </p>
        )}
        <Button
          variant="outline"
          disabled={inquiry.isPending}
          onClick={() =>
            inquiry.mutate({
              path: `/public/collection-results/${reference}/inquiry`,
            })
          }
        >
          Check original payment
        </Button>
        <MutationMessage error={inquiry.error} />
        {p.receipt && (
          <ReceiptBody
            receipt={p.receipt}
            publicDownloadPath={`/public/collection-results/${p.token}/receipt.pdf`}
          />
        )}
        {import.meta.env.DEV && config.mock && p.method === "simulated" && (
          <DevelopmentOutcome />
        )}
      </section>
    </div>
  );
}
function ProviderSimulator({
  payment: p,
}: {
  payment: z.infer<typeof attemptSchema>;
}) {
  const mutation = useCollectionWrite(attemptSchema);
  const authorized = [
    "Authorized (simulated)",
    "Cancelled (simulated)",
  ].includes(p.providerState);
  const label =
    p.method === "mpesa"
      ? "Approve simulated phone prompt"
      : p.method === "pesalink"
        ? "Simulate bank transfer submitted"
        : p.method === "paypal"
          ? "Approve simulated PayPal"
          : "Authorize simulated card";
  return (
    <section className="provider-simulator">
      <h3>
        {p.method === "mpesa"
          ? "Simulated M-Pesa phone prompt"
          : p.method === "pesalink"
            ? "PesaLink transfer simulator"
            : p.method === "paypal"
              ? "PayPal approval simulator"
              : "Hosted card simulator"}
      </h3>
      <p>
        {p.method === "mpesa"
          ? `STK push request sent to ${p.maskedPhone}. Approve or cancel this on-screen test prompt. No real notification or PIN is involved.`
          : p.method === "pesalink"
            ? `Submit a simulated transfer using ${p.id} as the original reference.`
            : "This is an on-screen test approval. No account credentials or real card data are used."}
      </p>
      <Button
        disabled={authorized || mutation.isPending}
        onClick={() =>
          mutation.mutate({ path: `/__mock/provider/${p.token}/approve` })
        }
      >
        {label}
      </Button>
      <Button
        variant="outline"
        disabled={authorized || mutation.isPending}
        onClick={() =>
          mutation.mutate({ path: `/__mock/provider/${p.token}/cancel` })
        }
      >
        Cancel simulated authorization
      </Button>
      <p>
        Authorization alone does not record payment. Check the original payment
        for confirmation.
      </p>
      <MutationMessage error={mutation.error} />
    </section>
  );
}
function DevelopmentOutcome() {
  const mutation = useCollectionWrite(z.object({ ok: z.boolean() }));
  return (
    <div className="dev-outcome">
      <h3>Development outcome simulator</h3>
      <p>
        Choose an external outcome, then check the original payment. No real
        rails are called.
      </p>
      {(["pending", "confirmed", "failed"] as const).map((outcome) => (
        <Button
          key={outcome}
          variant="outline"
          disabled={mutation.isPending}
          onClick={() =>
            mutation.mutate({
              path: "/__mock/collection-outcome",
              body: { outcome },
            })
          }
        >
          Simulate {outcome}
        </Button>
      ))}
      <MutationMessage
        error={mutation.error}
        success={
          mutation.isSuccess
            ? "Simulation configured. Check original payment."
            : undefined
        }
      />
    </div>
  );
}
function ReceiptBody({
  receipt: r,
  publicDownloadPath,
}: {
  receipt: Receipt;
  publicDownloadPath?: string;
}) {
  return (
    <DocumentPresentation
      model={receiptDocument(r)}
      publicDownloadPath={publicDownloadPath}
    />
  );
}
export function ReceiptPage() {
  const { id = "" } = useParams();
  const q = useReceipt(id);
  if (q.isPending) return <StatePanel />;
  if (q.error)
    return <StatePanel error={q.error} retry={() => void q.refetch()} />;
  return (
    <>
      <div className="page-heading">
        <h1>Receipt {id}</h1>
        <Link to={`/invoices/${q.data.invoiceId}`}>View invoice →</Link>
      </div>
      <section className="panel">
        <ReceiptBody receipt={q.data} />
      </section>
    </>
  );
}
