import {
  PrivateDocumentView,
  DocumentPresentation,
} from "../documents/FinancialPaper";
import { snapshotDocument } from "../documents/models";
import { useBranding } from "../application/enterprise";
import { InvoiceCollections } from "./Collections";
import { useMemo, useRef, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import {
  documentFields,
  type DocumentFields,
  type BillingDocument,
  type PublicQuote,
} from "../api/billingContracts";
import {
  useBillingList,
  useBillingDocument,
  useSaveDocument,
  useDocumentAction,
  useContacts,
  usePublicQuote,
  useQuoteResponse,
  useDocumentAppearance,
  type Kind,
} from "../application/billing";
import { useSession } from "../application/queries";
import { can } from "../auth/adapter";
import { money } from "../domain/money";
import { calculate, scaled } from "../domain/billing";
import { Button } from "../components/ui/button";
import { StatePanel, Empty } from "../components/StatePanel";
import { Freshness, StatusBadge } from "../components/Freshness";
import {
  Field,
  MutationMessage,
  VersionNotice,
} from "../components/BusinessForms";
import { BillingTable } from "../components/BillingTable";
const name = (kind: Kind) => (kind === "quotations" ? "Quotation" : "Invoice");
export function BillingListPage({ kind }: { kind: Kind }) {
  const [params, set] = useSearchParams();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const search = params.get("search") ?? "";
  const currency = params.get("currency") ?? "KES";
  const status = params.get("status") ?? "All";
  const contactId = params.get("contactId") ?? "";
  const q = useBillingList(kind, search, page, currency, status, contactId);
  const session = useSession();
  const columns = useMemo<ColumnDef<BillingDocument>[]>(
    () => [
      {
        header: "Reference / project",
        accessorKey: "id",
        cell: ({ row }) => (
          <>
            <Link to={`/${kind}/${row.original.id}`}>
              <strong>{row.original.id}</strong>
            </Link>
            <small className="block">{row.original.values.title}</small>
          </>
        ),
      },
      { header: "Customer", accessorFn: (d) => d.customer.name },
      {
        header: "Status",
        accessorKey: "status",
        cell: ({ getValue }) => <StatusBadge status={String(getValue())} />,
      },
      {
        header: kind === "quotations" ? "Valid until" : "Due date",
        accessorFn: (d) => d.values.until,
      },
      {
        header: "Total",
        accessorFn: (d) => money(d.totals.totalMinor, d.values.currency),
      },
      {
        header: kind === "invoices" ? "Balance due" : "Linked invoice",
        accessorFn: (d) =>
          kind === "invoices"
            ? money(d.outstandingMinor, d.values.currency)
            : (d.linkedId ?? "—"),
      },
    ],
    [kind],
  );
  function update(key: string, value: string) {
    set((p) => {
      p.set(key, value);
      p.delete("page");
      return p;
    });
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{kind === "quotations" ? "Quotations" : "Invoices"}</h1>
          <p>
            {kind === "quotations"
              ? "Commercial proposals, revisions and recipient responses"
              : "Drafts and immutable issued receivables"}
          </p>
        </div>
        {can(session.data?.permissions ?? [], "billing:write") && (
          <Button asChild>
            <Link to={`/${kind}/new`}>New {name(kind).toLowerCase()}</Link>
          </Button>
        )}
      </div>
      {contactId && (
        <p className="notice">
          Filtered to one customer.{" "}
          <Link to={`/${kind}`}>Clear customer filter</Link>
        </p>
      )}
      {q.data && (
        <div className="two-grid">
          <section className="panel">
            <span className="eyebrow">{currency} documents</span>
            <h2>{q.data.summary.count}</h2>
            <p>Drafts do not create receivables or cash.</p>
          </section>
          <section className="panel">
            <span className="eyebrow">Issued balance due · {currency}</span>
            <h2>{money(q.data.summary.outstandingMinor, currency)}</h2>
            <p>Receivables are separate from bank balances.</p>
          </section>
        </div>
      )}
      <section className="panel">
        <div className="billing-filters">
          <label>
            Search {kind}
            <input
              value={search}
              onChange={(e) => update("search", e.target.value)}
            />
          </label>
          <label>
            Document currency
            <select
              value={currency}
              onChange={(e) => update("currency", e.target.value)}
            >
              <option>KES</option>
              <option>USD</option>
            </select>
          </label>
          <label>
            Document status
            <select
              value={status}
              onChange={(e) => update("status", e.target.value)}
            >
              {[
                "All",
                ...(kind === "quotations"
                  ? [
                      "Draft",
                      "Sent",
                      "Accepted",
                      "Declined",
                      "Expired",
                      "Converted",
                    ]
                  : [
                      "Draft",
                      "Outstanding",
                      "Partially paid",
                      "Paid",
                      "Credited",
                    ]),
              ].map((s) => (
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
            {!q.data.items.length ? (
              <Empty
                title="No documents found"
                detail="Create a draft or change the filters."
              />
            ) : (
              <BillingTable
                label={kind}
                columns={columns}
                items={q.data.items}
                page={page}
                pages={q.data.pages}
                total={q.data.total}
                onPage={(n) =>
                  set((p) => {
                    p.set("page", String(n));
                    return p;
                  })
                }
              />
            )}
          </>
        )}
      </section>
    </>
  );
}
const blank: DocumentFields = {
  contactId: "",
  currency: "KES",
  title: "",
  date: "2026-10-21",
  until: "2026-11-20",
  notes: "",
  terms: "Payment due within 30 days of invoice issue.",
  lines: [
    { description: "", quantity: "1", rate: "0.00", discount: "0", tax: "0" },
  ],
};
export function DocumentEditorPage({ kind }: { kind: Kind }) {
  const { id = "new" } = useParams();
  const q = useBillingDocument(kind, id === "new" ? "" : id);
  if (id !== "new" && q.isPending) return <StatePanel />;
  if (q.error)
    return <StatePanel error={q.error} retry={() => void q.refetch()} />;
  return (
    <DocumentEditor
      key={`${kind}-${id}`}
      kind={kind}
      document={id === "new" ? undefined : q.data}
    />
  );
}
function DocumentEditor({
  kind,
  document: d,
}: {
  kind: Kind;
  document?: BillingDocument;
}) {
  const session = useSession();
  const allowed =
    can(session.data?.permissions ?? [], "billing:write") &&
    (!d || d.status === "Draft");
  const contacts = useContacts("", 1, "All", true);
  const mutation = useSaveDocument(kind);
  const navigate = useNavigate();
  const key = useRef(crypto.randomUUID());
  const [version, setVersion] = useState(d?.version ?? 1);
  const form = useForm<DocumentFields>({
    resolver: zodResolver(documentFields),
    defaultValues: d?.values ?? blank,
  });
  const rows = useFieldArray({ control: form.control, name: "lines" });
  const values = form.watch();
  const parsed = documentFields.safeParse(values);
  const totals = parsed.success ? calculate(parsed.data.lines) : null;
  async function save(values: DocumentFields) {
    try {
      const saved = await mutation.mutateAsync({
        id: d?.id,
        version,
        values,
        key: key.current,
      });
      setVersion(saved.version);
      navigate(`/${kind}/${saved.id}`);
    } catch {
      /* Inline error. */
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{d ? `Edit ${d.id}` : `New ${name(kind).toLowerCase()}`}</h1>
          <p>Explicit decimal inputs · totals confirmed by the API on save</p>
        </div>
        <Link to={d ? `/${kind}/${d.id}` : `/${kind}`}>
          Back to {name(kind).toLowerCase()}s →
        </Link>
      </div>
      {!allowed && (
        <p className="notice">
          This document is read-only. Only drafts can be edited.
        </p>
      )}
      {d && (
        <VersionNotice
          local={version}
          server={d.version}
          reload={() => {
            setVersion(d.version);
            form.reset(d.values);
          }}
        />
      )}
      <form noValidate onSubmit={form.handleSubmit(save)}>
        <fieldset
          className="plain-fieldset"
          disabled={!allowed || mutation.isPending}
        >
          <section className="panel">
            <h2>{name(kind)} parameters</h2>
            <div className="form-grid">
              <Field
                id="document-customer"
                label="Customer"
                error={form.formState.errors.contactId?.message}
              >
                <select
                  id="document-customer"
                  {...form.register("contactId")}
                  value={values.contactId}
                >
                  <option value="">Choose a customer</option>
                  {contacts.data?.items.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field id="document-currency" label="Operating currency">
                <select id="document-currency" {...form.register("currency")}>
                  <option>KES</option>
                  <option>USD</option>
                </select>
              </Field>
              <Field
                id="document-title"
                label="Project / scope"
                error={form.formState.errors.title?.message}
              >
                <input id="document-title" {...form.register("title")} />
              </Field>
              <Field
                id="document-date"
                label="Document date"
                error={form.formState.errors.date?.message}
              >
                <input
                  id="document-date"
                  type="date"
                  {...form.register("date")}
                />
              </Field>
              <Field
                id="document-until"
                label={kind === "quotations" ? "Valid until" : "Due date"}
                error={form.formState.errors.until?.message}
              >
                <input
                  id="document-until"
                  type="date"
                  {...form.register("until")}
                />
              </Field>
            </div>
            {contacts.error && (
              <StatePanel
                error={contacts.error}
                retry={() => void contacts.refetch()}
              />
            )}
            <Link to="/customers/new">
              Create a customer before starting this draft →
            </Link>
          </section>
          <section className="panel">
            <h2>Milestones & billable deliverables</h2>
            <p>
              Quantity: up to 3 decimals. Rates: 2 decimals. Discount and tax:
              0–100%, up to 2 decimals. Tax is user-entered, not a configured
              legal determination.
            </p>
            <div className="line-editor-list">
              {rows.fields.map((row, index) => (
                <article
                  className="line-editor"
                  key={row.id}
                  aria-label={`Line ${index + 1}`}
                >
                  <div className="section-heading">
                    <h3>Line {index + 1}</h3>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={rows.fields.length === 1}
                      onClick={() => rows.remove(index)}
                    >
                      Remove line {index + 1}
                    </Button>
                  </div>
                  <div className="line-fields">
                    {(
                      [
                        "description",
                        "quantity",
                        "rate",
                        "discount",
                        "tax",
                      ] as const
                    ).map((field) => (
                      <Field
                        key={field}
                        id={`line-${index}-${field}`}
                        label={
                          {
                            description: "Description",
                            quantity: "Quantity",
                            rate: "Unit price",
                            discount: "Discount %",
                            tax: "Tax %",
                          }[field]
                        }
                        error={
                          form.formState.errors.lines?.[index]?.[field]?.message
                        }
                      >
                        <input
                          id={`line-${index}-${field}`}
                          inputMode={
                            field === "description" ? "text" : "decimal"
                          }
                          {...form.register(`lines.${index}.${field}`)}
                        />
                      </Field>
                    ))}
                  </div>
                </article>
              ))}
            </div>
            <Button
              variant="outline"
              type="button"
              disabled={rows.fields.length >= 30}
              onClick={() => rows.append({ ...blank.lines[0] })}
            >
              Add line item
            </Button>
          </section>
          <div className="two-grid">
            <section className="panel">
              <Field
                id="document-notes"
                label="Engagement notes"
                error={form.formState.errors.notes?.message}
              >
                <textarea
                  id="document-notes"
                  rows={5}
                  {...form.register("notes")}
                />
              </Field>
              <Field
                id="document-terms"
                label="Commercial terms"
                error={form.formState.errors.terms?.message}
              >
                <textarea
                  id="document-terms"
                  rows={5}
                  {...form.register("terms")}
                />
              </Field>
            </section>
            <section className="panel">
              <h2>Financial summary</h2>
              {totals ? (
                <Totals totals={totals} currency={values.currency} />
              ) : (
                <p>
                  Complete valid customer, dates and line items to preview
                  totals.
                </p>
              )}
              <p className="notice">
                Preview uses the proposed line rounding policy. The backend
                remains authoritative. This is not a tax-certified document.
              </p>
              <Button disabled={!allowed || mutation.isPending}>
                Save draft
              </Button>
            </section>
          </div>
        </fieldset>
        {Object.keys(form.formState.errors).length > 0 && (
          <p role="alert" className="field-error">
            Check the labelled fields and line items before saving.
          </p>
        )}
        <MutationMessage error={mutation.error} />
      </form>
    </>
  );
}
function Totals({
  totals,
  currency,
}: {
  totals: BillingDocument["totals"];
  currency: string;
}) {
  return (
    <dl className="billing-totals">
      {(
        [
          ["Gross subtotal", "grossMinor"],
          ["Discounts", "discountMinor"],
          ["Net subtotal", "netMinor"],
          ["Tax", "taxMinor"],
          ["Total", "totalMinor"],
        ] as const
      ).map(([label, key]) => (
        <div key={key}>
          <dt>{label}</dt>
          <dd>{money(totals[key], currency)}</dd>
        </div>
      ))}
    </dl>
  );
}
export function DocumentBody({
  snapshot,
}: {
  snapshot: NonNullable<BillingDocument["snapshot"]>;
}) {
  const { values, customer, totals } = snapshot;
  return (
    <section
      className={`panel billing-paper invoice-${snapshot.branding?.template ?? "classic"} accent-${snapshot.branding?.accent ?? "forest"}`}
    >
      {snapshot.branding?.logo &&
        /^data:image\/(png|jpeg);base64,/.test(snapshot.branding.logo) && (
          <img
            src={snapshot.branding.logo}
            className="invoice-logo"
            alt={`${snapshot.issuerName} logo`}
          />
        )}
      <div className="section-heading">
        <div>
          <span className="eyebrow">
            {snapshot.issuerName} · Commercial document
          </span>
          <h2>{values.title}</h2>
        </div>
        <span>{values.currency}</span>
      </div>
      <div className="two-grid">
        <div className="billing-address">
          <span className="eyebrow">Prepared for</span>
          <h3>{customer.name}</h3>
          <p>
            {customer.person}
            <br />
            {customer.email}
            <br />
            {customer.address}
          </p>
        </div>
        <div className="billing-address">
          <span className="eyebrow">Document dates</span>
          <p>
            Document: {values.date}
            <br />
            Due / valid until: {values.until}
            <br />
            Terms: Net {customer.termsDays}
          </p>
        </div>
      </div>
      <div
        className="table-scroll"
        tabIndex={0}
        role="region"
        aria-label="Document line items"
      >
        <table className="billing-table">
          <thead>
            <tr>
              {[
                "Item / description",
                "Qty",
                "Unit price",
                "Discount",
                "Tax",
                "Line total",
              ].map((x) => (
                <th key={x} scope="col">
                  {x}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {values.lines.map((line, i) => (
              <tr key={i}>
                <td>{line.description}</td>
                <td>{line.quantity}</td>
                <td>
                  {money(scaled(line.rate, 2).toString(), values.currency)}
                </td>
                <td>{line.discount}%</td>
                <td>{line.tax}%</td>
                <td>{money(totals.lines[i].totalMinor, values.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Totals totals={totals} currency={values.currency} />
      {snapshot.branding?.footer && (
        <p className="invoice-footer">{snapshot.branding.footer}</p>
      )}
      <h3>Engagement notes</h3>
      <p className="preserve-lines">{values.notes || "No additional notes."}</p>
      <h3>Commercial terms</h3>
      <p className="preserve-lines">{values.terms || "No additional terms."}</p>
      <p className="notice">
        Not tax-authority certified. No settlement, payment or legal e-signature
        certification is implied.
      </p>
    </section>
  );
}
export function DocumentDetailPage({ kind }: { kind: Kind }) {
  const branding = useBranding();
  const { id = "" } = useParams();
  const q = useBillingDocument(kind, id);
  const session = useSession();
  const mutation = useDocumentAction(kind, id);
  const appearance = useDocumentAppearance(kind, id);
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);
  async function action(action: string) {
    if (!q.data) return;
    try {
      const saved = await mutation.mutateAsync({
        action,
        version: q.data.version,
      });
      if (action === "convert") navigate(`/invoices/${saved.id}`);
    } catch {
      /* Inline error. */
    }
  }
  if (q.isPending) return <StatePanel />;
  if (q.error)
    return <StatePanel error={q.error} retry={() => void q.refetch()} />;
  const d = q.data;
  const allowed = can(session.data?.permissions ?? [], "billing:write");
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>
            {name(kind)} {d.id}
          </h1>
          <p>
            Version {d.version} · {d.customer.name}
          </p>
        </div>
        <StatusBadge status={d.status} />
      </div>
      <Freshness {...d} refresh={() => void q.refetch()} />
      <div className="billing-document-layout">
        <div className="document-view-column">
          {d.status === "Draft" && allowed && (
            <section className="panel">
              <label htmlFor="document-template">
                Invoice / quotation template
              </label>
              <select
                id="document-template"
                disabled={appearance.isPending}
                value={
                  d.appearance?.template ?? branding.data?.template ?? "classic"
                }
                onChange={(ev) =>
                  appearance.mutate({
                    version: d.version,
                    template: ev.target.value as
                      | "classic"
                      | "modern"
                      | "minimal",
                  })
                }
              >
                <option value="classic">Classic</option>
                <option value="modern">Modern</option>
                <option value="minimal">Minimal</option>
              </select>
              <MutationMessage error={appearance.error} />
              <p>
                Choose this document's layout before issue. Business logo and
                footer are captured in its issued version.
              </p>
            </section>
          )}
          <PrivateDocumentView
            kind={kind === "invoices" ? "invoice" : "quotation"}
            id={id}
          />
        </div>
        <aside>
          <section className="panel">
            <h2>Workflow</h2>
            {allowed && d.status === "Draft" && (
              <div className="action-stack">
                <Button asChild variant="outline">
                  <Link to={`/${kind}/${id}/edit`}>Edit draft</Link>
                </Button>
                {kind === "quotations" ? (
                  <Button
                    disabled={mutation.isPending}
                    onClick={() => void action("share")}
                  >
                    Create recipient link
                  </Button>
                ) : (
                  <>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={confirm}
                        onChange={(e) => setConfirm(e.target.checked)}
                      />
                      I confirm this invoice will become immutable on issue.
                    </label>
                    <Button
                      disabled={!confirm || mutation.isPending}
                      onClick={() => void action("issue")}
                    >
                      Issue invoice
                    </Button>
                  </>
                )}
              </div>
            )}
            {allowed &&
              kind === "quotations" &&
              ["Sent", "Declined", "Expired"].includes(d.status) && (
                <Button
                  variant="outline"
                  disabled={mutation.isPending}
                  onClick={() => void action("revise")}
                >
                  Create revision
                </Button>
              )}
            {allowed && d.status === "Accepted" && (
              <>
                <p>
                  Conversion creates a linked draft invoice. Issue is a separate
                  action.
                </p>
                <Button
                  disabled={mutation.isPending}
                  onClick={() => void action("convert")}
                >
                  Convert to invoice
                </Button>
              </>
            )}
            {d.publicToken && (
              <p>
                <Link to={`/public/quotations/${d.publicToken}`}>
                  Open recipient quotation →
                </Link>
              </p>
            )}
            {d.linkedId && (
              <p>
                <Link
                  to={`/${kind === "quotations" ? "invoices" : "quotations"}/${d.linkedId}`}
                >
                  Linked {kind === "quotations" ? "invoice" : "quotation"} →
                </Link>
              </p>
            )}
            {kind === "invoices" && (
              <>
                <p>Balance due</p>
                <h2>{money(d.outstandingMinor, d.values.currency)}</h2>
                <p>
                  {d.status === "Draft"
                    ? "Drafts create no receivable."
                    : "Issued snapshot remains immutable. Collections, credits and refunds are tracked below."}
                </p>
              </>
            )}
            <MutationMessage
              error={mutation.error}
              success={
                mutation.isSuccess ? "Saved workflow state updated." : undefined
              }
            />
          </section>
          <section className="panel">
            <h2>Revision history</h2>
            {d.revisions.length ? (
              d.revisions.map((rev, i) => (
                <details key={i}>
                  <summary>
                    Revision {rev.revision} ·{" "}
                    {money(rev.totals.totalMinor, rev.values.currency)}
                  </summary>
                  <p>
                    {rev.values.title} · {rev.at}
                  </p>
                  <ul>
                    {rev.values.lines.map((l, j) => (
                      <li key={j}>
                        {l.description} · {l.quantity} × {l.rate}
                      </li>
                    ))}
                  </ul>
                </details>
              ))
            ) : (
              <p>No shared or issued versions yet.</p>
            )}
          </section>
          <section className="panel">
            <h2>Activity</h2>
            <ol className="activity-list">
              {d.events.map((e, i) => (
                <li key={i}>
                  <strong>{e.label}</strong>
                  <small>{e.at}</small>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
      {kind === "invoices" && d.status !== "Draft" && (
        <InvoiceCollections invoiceId={id} />
      )}
    </>
  );
}
export function PublicQuotationPage() {
  const { token = "" } = useParams();
  const q = usePublicQuote(token);
  if (q.isPending) return <StatePanel />;
  if (q.error)
    return <StatePanel error={q.error} retry={() => void q.refetch()} />;
  return <PublicQuotation key={token} token={token} quote={q.data} />;
}
function PublicQuotation({
  token,
  quote: q,
}: {
  token: string;
  quote: PublicQuote;
}) {
  const mutation = useQuoteResponse(token);
  const [signer, setSigner] = useState("");
  const [consent, setConsent] = useState(false);
  async function respond(decision: "accept" | "decline") {
    try {
      await mutation.mutateAsync({
        version: q.version,
        name: signer,
        consent,
        decision,
      });
    } catch {
      /* Inline error. */
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Quotation {q.id}</h1>
          <p>Recipient view · {q.snapshot.customer.name}</p>
        </div>
        <StatusBadge status={q.status} />
      </div>
      <p className="notice">
        Development simulation. A typed acknowledgement here is not a verified
        legal e-signature. No email or payment is sent.
      </p>
      <DocumentPresentation
        model={snapshotDocument(q.snapshot, q.id, q.status, "quotation")}
        publicDownloadPath={`/public/quotations/${token}/pdf`}
      />
      <section className="panel">
        <h2>Recipient response</h2>
        {q.status === "Sent" ? (
          <>
            <Field id="recipient-name" label="Your full name">
              <input
                id="recipient-name"
                value={signer}
                maxLength={100}
                onChange={(e) => setSigner(e.target.value)}
              />
            </Field>
            <label className="checkbox-label">
              <input
                checked={consent}
                type="checkbox"
                onChange={(e) => setConsent(e.target.checked)}
              />
              I am authorized to respond to this quotation and have reviewed its
              terms.
            </label>
            <div className="action-row">
              <Button
                disabled={
                  !consent || signer.trim().length < 2 || mutation.isPending
                }
                onClick={() => void respond("accept")}
              >
                Accept quotation
              </Button>
              <Button
                variant="outline"
                disabled={
                  !consent || signer.trim().length < 2 || mutation.isPending
                }
                onClick={() => void respond("decline")}
              >
                Decline quotation
              </Button>
            </div>
          </>
        ) : (
          <p>
            {q.status === "Expired"
              ? "This quotation has expired. Request a new revision from the business."
              : `Response state: ${q.status}. ${q.signer ? "Acknowledged by " + q.signer + "." : ""}`}
          </p>
        )}
        <MutationMessage error={mutation.error} />
      </section>
    </>
  );
}
