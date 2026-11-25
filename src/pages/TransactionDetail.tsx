import { Money } from "../components/Money";
import { Link, useParams, useLocation } from "react-router-dom";
import { useTransaction } from "../application/queries";
import { StatePanel } from "../components/StatePanel";
import { Freshness, StatusBadge } from "../components/Freshness";
import { Button } from "../components/ui/button";
export function TransactionDetail() {
  const { id = "" } = useParams();
  const q = useTransaction(id);
  const location = useLocation();
  const proposed = location.state?.from;
  const back =
    typeof proposed === "string" &&
    /^\/(transactions(\?|$)|accounts\/[A-Za-z0-9_-]+(\?|$))/.test(proposed)
      ? proposed
      : "/transactions";
  if (q.isPending) return <StatePanel />;
  if (q.error)
    return <StatePanel error={q.error} retry={() => void q.refetch()} />;
  const d = q.data,
    t = d.transaction;
  return (
    <>
      <div className="breadcrumbs">
        <Link to={back}>Back to transactions</Link> / {t.id}
      </div>
      <div className="page-heading">
        <div>
          <h1>Transaction {t.id}</h1>
          <p>
            {t.rail} · <StatusBadge status={t.status} />
          </p>
        </div>
        <Button
          variant="outline"
          disabled={q.isFetching}
          onClick={() => void q.refetch()}
        >
          {q.isFetching ? "Refreshing…" : "Refresh status"}
        </Button>
      </div>
      <Freshness {...d} refresh={() => void q.refetch()} />
      {t.status === "Pending confirmation" && (
        <section className="panel unresolved" role="status">
          <h2>Payment outcome unresolved</h2>
          <p>
            Pending confirmation. Preserve reference{" "}
            <strong>{d.reference}</strong>. Do not re-initiate or duplicate this
            payment. A browser redirect is not evidence of success.
          </p>
          <p>
            No ledger movement has been confirmed for this record. Refresh
            status to check for an authoritative update.
          </p>
        </section>
      )}
      {t.status === "Failed" && (
        <div className="notice danger">
          Payment failed. No ledger movement was posted.
        </div>
      )}
      <div className="two-grid">
        <section className="panel">
          <div className="eyebrow">
            {t.status === "Completed" ? "Confirmed amount" : "Attempted amount"}
          </div>
          <div className="balance">
            <Money minor={t.amountMinor} currency={t.currency} />
          </div>
          <dl className="record-fields">
            <div>
              <dt>Counterparty</dt>
              <dd>{t.counterparty}</dd>
            </div>
            <div>
              <dt>Source / destination account</dt>
              <dd>
                <Link to={`/accounts/${t.accountId}`}>View account →</Link>
              </dd>
            </div>
            <div>
              <dt>Category</dt>
              <dd>{t.category}</dd>
            </div>
            <div>
              <dt>Date / time (EAT)</dt>
              <dd>
                {new Date(t.date).toLocaleString("en-GB", {
                  timeZone: "Africa/Nairobi",
                })}
              </dd>
            </div>
          </dl>
        </section>
        <section className="panel">
          <h2>Ledger impact</h2>
          <div className="balance">
            <Money minor={d.ledgerImpactMinor} currency={t.currency} />
          </div>
          <p>
            {t.status === "Completed"
              ? "The backend reports this movement as posted."
              : "Attempted amounts are separate from confirmed ledger movements."}
          </p>
          <dl className="record-fields">
            <div>
              <dt>Original reference</dt>
              <dd className="mono">{d.reference}</dd>
            </div>
            <div>
              <dt>Payment outcome</dt>
              <dd>
                <StatusBadge status={t.status} />
              </dd>
            </div>
          </dl>
          <p>
            Fees and tax breakdowns will be shown only when the backend supplies
            them.
          </p>
        </section>
      </div>
      <section className="panel">
        <h2>Audit & Settlement Lifecycle</h2>
        <ol className="timeline">
          {d.events.map((event, i) => (
            <li key={`${event.label}-${i}`}>
              <span className="timeline-marker">{i + 1}</span>
              <div>
                <div className="section-heading">
                  <h2>{event.label}</h2>
                  <StatusBadge status={event.status} />
                </div>
                <p>{event.detail}</p>
                <small>
                  {new Date(event.at).toLocaleString("en-GB", {
                    timeZone: "Africa/Nairobi",
                  })}{" "}
                  EAT
                </small>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
