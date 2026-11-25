import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useDocumentCommand,
  useDocumentWorkspace,
  useSupplierDocuments,
  usePublicSupplier,
} from "../application/documents";
import { useTools } from "../application/enterprise";
import { useAccounts } from "../application/queries";
import {
  uploadLinkSchema,
  uploadSchema,
  supplierWorkspaceSchema,
  reviewSchema,
  type extractionSchema,
  type payableSchema,
} from "../api/documentContracts";
import { downloadBinary, ApiError } from "../api/http";
import { SettingsNav } from "../components/BusinessForms";
import { StatePanel } from "../components/StatePanel";
import { BillingTable } from "../components/BillingTable";
import { Button } from "../components/ui/button";
import { money } from "../domain/money";
import { scaled } from "../domain/billing";
import { dueFromTerms } from "../domain/supplierInvoices";
import { config } from "../api/config";
const ok = z.object({ ok: z.boolean() });
export function TaxSettingsPage() {
  const q = useDocumentWorkspace(),
    a = useDocumentCommand(),
    [invoice, setInvoice] = useState(""),
    [outcome, setOutcome] = useState("accepted");
  return (
    <>
      <h1>Tax integration</h1>
      <SettingsNav />
      <section className="panel">
        <h2>eTIMS integration</h2>
        <p>
          KRA electronic invoicing uses eTIMS. Live onboarding, certification
          and authority-issued references require backend integration. No KRA
          acceptance is claimed by this workspace.
        </p>
        <a
          href="https://www.kra.go.ke/business/etims-electronic-tax-invoice-management-system/learn-about-etims/etims-system-to-system-integration"
          target="_blank"
          rel="noreferrer"
        >
          KRA system-to-system integration
        </a>
        {q.isPending ? (
          <StatePanel />
        ) : q.error ? (
          <StatePanel error={q.error} retry={() => void q.refetch()} />
        ) : (
          <>
            <p>
              Connection: <strong>{q.data.taxMode}</strong>
            </p>
            <Button
              disabled={a.pending || !config.mock}
              onClick={() =>
                void a.run("/tax/demo-connection", ok, {
                  enabled: q.data.taxMode !== "Demo",
                })
              }
            >
              {q.data.taxMode === "Demo"
                ? "Disconnect demo"
                : "Enable development simulation"}
            </Button>
            <form
              className="tool-form"
              onSubmit={(e) => {
                e.preventDefault();
                void a.run(
                  `/tax/invoices/${encodeURIComponent(invoice)}/submit-demo`,
                  z.object({
                    documentId: z.string(),
                    status: z.string(),
                    reference: z.string(),
                  }),
                  { outcome },
                );
              }}
            >
              <label>
                Issued invoice reference
                <input
                  required
                  value={invoice}
                  onChange={(e) => setInvoice(e.target.value)}
                />
              </label>
              <label htmlFor="tax-outcome">Simulation outcome</label>
              <select
                id="tax-outcome"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
              >
                <option value="accepted">Accepted (demo)</option>
                <option value="rejected">Rejected (demo)</option>
              </select>
              <Button
                disabled={
                  a.pending || q.data.taxMode !== "Demo" || !config.mock
                }
              >
                {a.pending ? "Submitting demo…" : "Simulate eTIMS submission"}
              </Button>
            </form>
            <p>
              Demo QR codes contain Furaia development references. They are not
              KRA verification codes.
            </p>
            <ul>
              {q.data.tax.map((t) => (
                <li key={t.documentId}>
                  {t.documentId}: {t.status} · {t.reference}
                </li>
              ))}
            </ul>
          </>
        )}
        {a.error && <p role="alert">{a.error.message}</p>}
      </section>
    </>
  );
}
export function PublicSupplierUploadPage() {
  const { token = "" } = useParams(),
    q = usePublicSupplier(token),
    a = useDocumentCommand(),
    [file, setFile] = useState<File | null>(null),
    [result, setResult] = useState<z.infer<typeof uploadSchema> | null>(null);
  if (q.isPending) return <StatePanel />;
  if (q.error instanceof ApiError && q.error.status === 410)
    return (
      <section className="panel" role="alert">
        <h1>Upload link expired or revoked</h1>
        <p>
          Request a new upload link from the business. This visit did not submit
          an invoice or payment.
        </p>
      </section>
    );
  if (q.error)
    return <StatePanel error={q.error} retry={() => void q.refetch()} />;
  return (
    <>
      <h1>Submit supplier invoice</h1>
      <section className="panel">
        <h2>{q.data.supplierName}</h2>
        <p>
          Send an invoice to {q.data.businessName}. Link expires{" "}
          {new Date(q.data.expiresAt).toLocaleDateString()}.
        </p>
        <p>
          Development simulation: use synthetic documents only. Supported
          formats: PDF with selectable text, Word DOCX, Excel XLSX and CSV, up
          to 5 MB. Scanned PDFs require manual entry. Extraction suggestions
          must be reviewed by the business.
        </p>
        <form
          className="tool-form"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!file) return;
            const form = new FormData();
            form.append("file", file);
            const r = await a.run(
              `/public/supplier-submissions/${token}/uploads`,
              uploadSchema,
              form,
            );
            if (r) setResult(r);
          }}
        >
          <label>
            Invoice file
            <input
              required
              type="file"
              accept=".pdf,.docx,.xlsx,.csv"
              onChange={(e) => {
                setResult(null);
                setFile(e.target.files?.[0] ?? null);
              }}
            />
          </label>
          {file && file.size > 5 * 1024 * 1024 && (
            <p role="alert">The file must be 5 MB or smaller.</p>
          )}
          <Button disabled={a.pending || !file || file.size > 5 * 1024 * 1024}>
            {a.pending ? "Uploading and reading document…" : "Upload invoice"}
          </Button>
        </form>
        {a.error && (
          <p role="alert">
            Upload unavailable. Check the format and retry the original file.{" "}
            {a.error.message}
          </p>
        )}
        {result && (
          <div role="status">
            <h3>Submitted for business review</h3>
            <p>
              {result.filename} · {result.id}
            </p>
            <p>
              Suggested invoice:{" "}
              {result.extracted.invoiceNumber || "Needs review"} ·{" "}
              {result.extracted.amountMinor
                ? money(result.extracted.amountMinor, result.extracted.currency)
                : "Total needs review"}
            </p>
            <p>No payment has been approved or sent.</p>
          </div>
        )}
      </section>
    </>
  );
}
export function SupplierInvoicesPage() {
  const q = useSupplierDocuments(),
    tools = useTools(),
    accounts = useAccounts(),
    a = useDocumentCommand(),
    navigate = useNavigate(),
    [supplier, setSupplier] = useState(""),
    [path, setPath] = useState(""),
    [selected, setSelected] = useState(""),
    [downloadError, setDownloadError] = useState(""),
    [account, setAccount] = useState(""),
    [bucket, setBucket] = useState("All");
  if (q.isPending || tools.isPending || accounts.isPending)
    return <StatePanel />;
  if (q.error || tools.error || accounts.error)
    return (
      <StatePanel
        error={q.error ?? tools.error ?? accounts.error}
        retry={() => {
          void q.refetch();
          void tools.refetch();
          void accounts.refetch();
        }}
      />
    );
  const intake = q.data.intakes.find((i) => i.id === selected);
  return (
    <>
      <div className="page-heading">
        <h1>Supplier invoices & payments</h1>
        <Link to="/procurement">Suppliers & purchase orders</Link>
      </div>
      <p>
        Review the original invoice before creating a payable. Approving an
        invoice does not move cash. Payment authorization remains separate.
      </p>
      {a.error && <p role="alert">{a.error.message}</p>}
      <section className="panel">
        <h2>External supplier upload</h2>
        <form
          className="tool-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const l = await a.run(
              `/suppliers/${supplier}/upload-links`,
              uploadLinkSchema,
            );
            if (l) setPath(l.path);
          }}
        >
          <label htmlFor="upload-supplier">Supplier</label>
          <select
            id="upload-supplier"
            required
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
          >
            <option value="">Choose supplier</option>
            {tools.data.suppliers
              .filter((s) => !s.archived)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>
          <Button disabled={a.pending}>Create upload link</Button>
        </form>
        {path && (
          <div role="status">
            <p>
              Share this link only with the supplier. It is shown once; create a
              new link if lost.
            </p>
            <Link to={path} target="_blank">
              Open supplier upload
            </Link>
            <input
              aria-label="Supplier upload URL"
              readOnly
              value={new URL(path, window.location.origin).href}
            />
          </div>
        )}
        <ul>
          {q.data.links.map((l) => (
            <li key={l.id}>
              {l.supplierName} · {l.status} · Expires {l.expiresAt.slice(0, 10)}{" "}
              {l.status === "Active" && (
                <Button
                  variant="outline"
                  disabled={a.pending}
                  onClick={() =>
                    void a.run(`/supplier-upload-links/${l.id}/revoke`, ok)
                  }
                >
                  Revoke link
                </Button>
              )}
            </li>
          ))}
        </ul>
      </section>
      <section className="panel">
        <h2>Invoices awaiting review</h2>
        {!q.data.intakes.length && <p>No supplier invoices uploaded.</p>}
        <ul>
          {q.data.intakes.map((i) => (
            <li key={i.id}>
              <button onClick={() => setSelected(i.id)}>
                {i.supplierName} · {i.filename}
              </button>{" "}
              · {i.status}
            </li>
          ))}
        </ul>
        {intake && (
          <>
            <Button
              variant="outline"
              onClick={() =>
                void downloadBinary(
                  `/supplier-invoices/${intake.id}/original`,
                  intake.filename,
                  "original",
                ).catch(() =>
                  setDownloadError(
                    "The original could not be downloaded. Try again.",
                  ),
                )
              }
            >
              Download original
            </Button>
            {downloadError && <p role="alert">{downloadError}</p>}
            <p>Extraction confidence: {intake.extracted.confidence}</p>
            <ul>
              {intake.extracted.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
            <details>
              <summary>Extracted text</summary>
              <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                {intake.extracted.excerpt}
              </pre>
            </details>
            {intake.status === "Awaiting review" && (
              <InvoiceReview
                key={intake.id}
                extracted={intake.extracted}
                pending={a.pending}
                approve={(b) =>
                  a.run(
                    `/supplier-invoices/${intake.id}/approve`,
                    supplierWorkspaceSchema,
                    b,
                  )
                }
                reject={() =>
                  void a.run(
                    `/supplier-invoices/${intake.id}/reject`,
                    supplierWorkspaceSchema,
                  )
                }
              />
            )}
          </>
        )}
      </section>
      <section className="panel">
        <h2>Due supplier payments</h2>
        <p>
          Statement date: {q.data.asOf.slice(0, 10)} (deterministic development
          clock).
        </p>
        {q.data.summaries.map((s) => (
          <p key={s.currency}>
            <strong>{s.currency}</strong> · Overdue{" "}
            {money(s.overdueMinor, s.currency)} · Due today{" "}
            {money(s.dueTodayMinor, s.currency)} · Upcoming{" "}
            {money(s.upcomingMinor, s.currency)} · Paid{" "}
            {money(s.paidMinor, s.currency)}
          </p>
        ))}
        <label htmlFor="payable-filter">Filter due payments</label>
        <select
          id="payable-filter"
          value={bucket}
          onChange={(e) => setBucket(e.target.value)}
        >
          {["All", "Overdue", "Due today", "Upcoming", "Paid"].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
        <label htmlFor="payable-account">Payment account</label>
        <select
          id="payable-account"
          value={account}
          onChange={(e) => setAccount(e.target.value)}
        >
          <option value="">Choose KES account</option>
          {accounts.data.items
            .filter((x) => x.currency === "KES" && x.status === "Active")
            .map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
        </select>
        <PayablesTable
          items={q.data.payables.filter(
            (p) => bucket === "All" || p.bucket === bucket,
          )}
          action={(p) => (
            <>
              {p.latestOrderId &&
              !["Approved", "Payment failed"].includes(p.status) ? (
                <Link to={`/send-money/${p.latestOrderId}`}>
                  View original payment
                </Link>
              ) : (
                <Button
                  disabled={a.pending || !account || p.currency !== "KES"}
                  onClick={async () => {
                    const r = await a.run(
                      `/supplier-payables/${p.id}/payment`,
                      z.object({ orderId: z.string() }),
                      { accountId: account },
                    );
                    if (r) navigate(`/send-money/${r.orderId}`);
                  }}
                >
                  Prepare payment
                </Button>
              )}
              {p.currency !== "KES" && (
                <small>Foreign currency payout unavailable</small>
              )}
            </>
          )}
        />
        {!q.data.payables.length && <p>No approved supplier invoices.</p>}
      </section>
    </>
  );
}
const reviewForm = z.object({
  number: z.string().min(2).max(80),
  date: z.string().min(10),
  currency: z.enum(["KES", "USD"]),
  amount: z.string().regex(/^\d{1,14}(?:\.\d{1,2})?$/),
  terms: z.string().regex(/^\d{1,3}$/),
  reviewed: z.boolean().refine((v) => v, "Review the original document first."),
});
function InvoiceReview({
  extracted: x,
  approve,
  reject,
  pending,
}: {
  extracted: z.infer<typeof extractionSchema>;
  approve: (b: z.infer<typeof reviewSchema>) => Promise<unknown>;
  reject: () => void;
  pending: boolean;
}) {
  const f = useForm<z.infer<typeof reviewForm>>({
      resolver: zodResolver(reviewForm),
      defaultValues: {
        number: x.invoiceNumber,
        date: x.invoiceDate,
        currency: x.currency,
        amount: x.amountMinor
          ? `${BigInt(x.amountMinor) / 100n}.${(BigInt(x.amountMinor) % 100n).toString().padStart(2, "0")}`
          : "",
        terms: x.termsDays?.toString() ?? "",
        reviewed: false,
      },
    }),
    [error, setError] = useState("");
  const date = f.watch("date"),
    terms = f.watch("terms");
  let due = "";
  try {
    if (terms !== "") due = dueFromTerms(date, Number(terms));
  } catch {
    /* Field validation remains visible. */
  }
  return (
    <form
      className="tool-form"
      noValidate
      onSubmit={f.handleSubmit(async (v) => {
        setError("");
        try {
          const body = reviewSchema.parse({
            invoiceNumber: v.number,
            invoiceDate: v.date,
            currency: v.currency,
            amountMinor: scaled(v.amount, 2).toString(),
            termsDays: Number(v.terms),
            dueDate: due,
            reviewed: v.reviewed,
          });
          await approve(body);
        } catch {
          setError(
            "Check the invoice date, positive total and agreed 0–180 day terms.",
          );
        }
      })}
    >
      <label>
        Supplier invoice number
        <input {...f.register("number")} />
      </label>
      <label>
        Invoice date
        <input type="date" {...f.register("date")} />
      </label>
      <label htmlFor="review-currency">Invoice currency</label>
      <select id="review-currency" {...f.register("currency")}>
        <option>KES</option>
        <option>USD</option>
      </select>
      <label>
        Invoice total
        <input inputMode="decimal" {...f.register("amount")} />
      </label>
      <label>
        Payment terms in days (0 = due immediately)
        <input type="number" min="0" max="180" {...f.register("terms")} />
      </label>
      <p>
        Calculated due date: <strong>{due || "Complete date and terms"}</strong>
      </p>
      <label>
        <input type="checkbox" {...f.register("reviewed")} />I checked the
        original invoice, totals, currency and agreed terms.
      </label>
      {Object.values(f.formState.errors).map((e, i) => (
        <p key={i} role="alert">
          {e.message}
        </p>
      ))}
      {error && <p role="alert">{error}</p>}
      <Button disabled={pending}>Approve invoice payable</Button>
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={reject}
      >
        Reject invoice
      </Button>
    </form>
  );
}
type Payable = z.infer<typeof payableSchema>;
function PayablesTable({
  items,
  action,
}: {
  items: Payable[];
  action: (p: Payable) => import("react").ReactNode;
}) {
  const [requested, setPage] = useState(1),
    pages = Math.max(1, Math.ceil(items.length / 10)),
    page = Math.min(requested, pages);
  const columns: ColumnDef<Payable>[] = [
    {
      id: "supplier",
      header: "Supplier / invoice",
      cell: ({ row: { original: p } }) => (
        <>
          {p.supplierName}
          <br />
          {p.invoiceNumber}
        </>
      ),
    },
    {
      id: "due",
      header: "Due date",
      cell: ({ row: { original: p } }) => (
        <>
          {p.dueDate}
          <br />
          {p.bucket} · Net {p.termsDays}
        </>
      ),
    },
    {
      id: "amount",
      header: "Amount",
      cell: ({ row: { original: p } }) => (
        <span className="money-outgoing">
          {money(p.amountMinor, p.currency)}
        </span>
      ),
    },
    { accessorKey: "status", header: "Status" },
    {
      id: "payment",
      header: "Payment",
      cell: ({ row }) => action(row.original),
    },
  ];
  return (
    <BillingTable
      items={items.slice((page - 1) * 10, page * 10)}
      columns={columns}
      label="Supplier payable records"
      page={page}
      pages={pages}
      total={items.length}
      onPage={setPage}
    />
  );
}
