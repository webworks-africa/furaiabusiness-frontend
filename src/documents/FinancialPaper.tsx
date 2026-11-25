import { useRef, useState } from "react";
import type { FinancialDocument } from "../api/documentContracts";
import { exportSchema, deliverySchema } from "../api/documentContracts";
import {
  useDocumentModel,
  useDocumentWorkspace,
  useDocumentCommand,
} from "../application/documents";
import { downloadBinary } from "../api/http";
import { useSession } from "../application/queries";
import { can } from "../auth/adapter";
import { config } from "../api/config";
import { Button } from "../components/ui/button";
import { StatePanel } from "../components/StatePanel";
import { money } from "../domain/money";
import { documentQr } from "./qr";
import { printDocument } from "./print";
export function FinancialPaper({ model: m }: { model: FinancialDocument }) {
  const qr = m.tax.qrPayload ? documentQr(m.tax.qrPayload) : null;
  return (
    <article
      className={`panel billing-paper financial-paper invoice-${m.template} accent-${m.accent} ${m.kind === "receipt" ? "receipt-paper" : ""}`}
      data-document-id={m.id}
    >
      <header className="document-masthead">
        <div className="document-issuer">
          {m.logo && /^data:image\/(png|jpeg);base64,/.test(m.logo) && (
            <img
              className="invoice-logo"
              src={m.logo}
              alt={`${m.issuer.name} logo`}
            />
          )}
          <h2>{m.issuer.name}</h2>
          <p>
            {[m.issuer.address, m.issuer.email, m.issuer.phone]
              .filter(Boolean)
              .join("\n")}
          </p>
        </div>
        <div className="document-heading">
          <span>{m.kind === "lpo" ? "Purchase order" : m.kind}</span>
          <strong>{m.id}</strong>
          <small>
            {m.status} · Revision {m.revision}
          </small>
        </div>
      </header>
      <div className="document-parties">
        <section>
          <span className="document-label">
            {m.kind === "lpo"
              ? "Supplier"
              : m.kind === "receipt"
                ? "Received from"
                : "Bill to"}
          </span>
          <h3>{m.recipient.name}</h3>
          <p>
            {[m.recipient.address, m.recipient.email]
              .filter(Boolean)
              .join("\n")}
          </p>
        </section>
        <dl>
          <div>
            <dt>Date</dt>
            <dd>{m.date}</dd>
          </div>
          {m.due && (
            <div>
              <dt>
                {m.kind === "quotation"
                  ? "Valid until"
                  : m.kind === "lpo"
                    ? "Delivery date"
                    : "Due date"}
              </dt>
              <dd>{m.due}</dd>
            </div>
          )}
          <div>
            <dt>Currency</dt>
            <dd>{m.currency}</dd>
          </div>
        </dl>
      </div>
      {m.kind === "receipt" ? (
        <>
          <div className="document-received">
            <span>CONFIRMED PAYMENT RECEIVED</span>
            <strong>{money(m.totalMinor, m.currency)}</strong>
          </div>
          <dl className="receipt-details">
            {[
              ["Invoice", m.relatedReference],
              ["Payment reference", m.paymentReference],
              ["Balance after allocation", money(m.balanceMinor, m.currency)],
            ].map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </>
      ) : (
        <>
          <div
            className="table-scroll document-lines"
            tabIndex={0}
            role="region"
            aria-label={m.kind === "lpo" ? "LPO items" : "Document line items"}
          >
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Qty</th>
                  <th>Unit price</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {m.lines.map((l, i) => (
                  <tr key={i}>
                    <td>
                      {l.description}
                      <small>
                        Tax {l.tax}% · Discount {l.discount}%
                      </small>
                    </td>
                    <td>{l.quantity}</td>
                    <td>{money(l.rateMinor, m.currency)}</td>
                    <td>{money(l.totalMinor, m.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <dl className="document-totals">
            {[
              ["Subtotal", m.subtotalMinor],
              ["Discount", m.discountMinor],
              ["Tax", m.taxMinor],
              ["Grand total", m.totalMinor],
            ].map(([k, v], i) => (
              <div key={k} className={i === 3 ? "document-grand-total" : ""}>
                <dt>{k}</dt>
                <dd>{money(v, m.currency)}</dd>
              </div>
            ))}
          </dl>
        </>
      )}
      <div className="document-notes">
        {m.notes && (
          <section>
            <h3>Notes</h3>
            <p>{m.notes}</p>
          </section>
        )}
        {m.terms && (
          <section>
            <h3>Terms & payment</h3>
            <p>{m.terms}</p>
          </section>
        )}
      </div>
      {qr && (
        <section className="document-tax">
          <svg
            viewBox={`0 0 ${qr.size} ${qr.size}`}
            aria-label={m.tax.label}
            role="img"
          >
            <rect width={qr.size} height={qr.size} fill="white" />
            <path d={qr.path} fill="#123c32" />
          </svg>
          <div>
            <strong>{m.tax.label}</strong>
            <p>
              {m.tax.status} {m.tax.reference}
            </p>
            <b>DEMO — NOT A KRA TAX INVOICE</b>
          </div>
        </section>
      )}
      <footer className="document-footer">{m.footer}</footer>
    </article>
  );
}
export function PrivateDocumentView({
  kind,
  id,
}: {
  kind: FinancialDocument["kind"];
  id: string;
}) {
  const q = useDocumentModel(kind, id);
  if (q.isPending) return <StatePanel />;
  if (q.error)
    return <StatePanel error={q.error} retry={() => void q.refetch()} />;
  return <DocumentPresentation key={id} model={q.data} />;
}
export function DocumentPresentation({
  model: m,
  publicDownloadPath,
}: {
  model: FinancialDocument;
  publicDownloadPath?: string;
}) {
  const holder = useRef<HTMLDivElement>(null),
    command = useDocumentCommand(),
    [error, setError] = useState("");
  return (
    <div className="document-presentation">
      <div className="document-actions">
        <Button
          disabled={command.pending}
          onClick={async () => {
            setError("");
            try {
              if (publicDownloadPath)
                await downloadBinary(
                  publicDownloadPath,
                  `${m.kind}-${m.id}.pdf`,
                );
              else {
                const r = await command.run(
                  `/documents/${m.kind}/${m.id}/exports`,
                  exportSchema,
                  { revision: m.revision },
                );
                if (r)
                  await downloadBinary(
                    `/document-exports/${r.id}/pdf`,
                    r.filename,
                  );
              }
            } catch (e) {
              setError(e instanceof Error ? e.message : "Download unavailable");
            }
          }}
        >
          {command.pending ? "Preparing PDF…" : "Download PDF"}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            const paper =
              holder.current?.querySelector<HTMLElement>(".financial-paper");
            if (paper)
              void printDocument(paper).catch(() =>
                setError("Print preview unavailable. Use Download PDF."),
              );
          }}
        >
          Print {m.kind === "lpo" ? "LPO" : m.kind}
        </Button>
      </div>
      {(error || command.error) && (
        <p role="alert">{error || command.error?.message}</p>
      )}
      <div ref={holder}>
        <FinancialPaper model={m} />
      </div>
      {!publicDownloadPath && <DocumentEmail model={m} />}
    </div>
  );
}
function DocumentEmail({ model: m }: { model: FinancialDocument }) {
  const session = useSession(),
    q = useDocumentWorkspace(),
    a = useDocumentCommand(),
    [open, setOpen] = useState(false),
    [to, setTo] = useState(m.recipient.email),
    [subject, setSubject] = useState(`${m.kind.toUpperCase()} ${m.id}`),
    [message, setMessage] = useState(`Please find attached ${m.kind} ${m.id}.`);
  return (
    <section className="panel document-email">
      <h3>Email delivery</h3>
      <p>
        {config.mock
          ? "Development delivery simulation; no external email is sent."
          : "Uses the configured document-delivery service."}{" "}
        The PDF attachment captures the selected design and document version.
      </p>
      {can(session.data?.permissions ?? [], "billing:write") && (
        <Button variant="outline" onClick={() => setOpen(!open)}>
          {open ? "Close email form" : "Send by email"}
        </Button>
      )}
      {open && (
        <form
          className="tool-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const pdf = await a.run(
              `/documents/${m.kind}/${m.id}/exports`,
              exportSchema,
              { revision: m.revision },
            );
            if (pdf) {
              const r = await a.run("/document-deliveries", deliverySchema, {
                exportId: pdf.id,
                to,
                subject,
                message,
              });
              if (r) setOpen(false);
            }
          }}
        >
          <label>
            Recipient email
            <input
              required
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
          <label>
            Email subject
            <input
              required
              maxLength={200}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </label>
          <label>
            Message
            <textarea
              maxLength={3000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </label>
          <Button disabled={a.pending}>
            {a.pending
              ? "Preparing attachment…"
              : config.mock
                ? "Send simulated email"
                : "Send email"}
          </Button>
        </form>
      )}
      {a.error && <p role="alert">{a.error.message}</p>}
      {q.error && <StatePanel error={q.error} retry={() => void q.refetch()} />}
      <ul className="document-deliveries">
        {q.data?.deliveries
          .filter((x) => x.documentId === m.id)
          .map((r) => (
            <li key={r.id}>
              <strong>{r.to}</strong>
              <span>
                {r.status} · Attempt {r.attempt}
              </span>
              <small>
                {r.subject} · PDF {r.exportId}
              </small>
              {r.error && <p>{r.error}</p>}
              {r.status === "Failed" && r.attempt < 3 && (
                <Button
                  variant="outline"
                  disabled={a.pending}
                  onClick={() =>
                    void a.run(
                      `/document-deliveries/${r.id}/retry`,
                      deliverySchema,
                    )
                  }
                >
                  Retry delivery
                </Button>
              )}
            </li>
          ))}
      </ul>
    </section>
  );
}
