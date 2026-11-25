import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAccount, useSession } from "../application/queries";
import { StatePanel } from "../components/StatePanel";
import { Freshness, StatusBadge } from "../components/Freshness";
import { TransactionBrowser } from "../components/TransactionBrowser";
import { StatementDialog } from "../components/StatementDialog";
import { Button } from "../components/ui/button";
import { money } from "../domain/money";
import { can } from "../auth/adapter";
export function AccountDetail() {
  const { id = "" } = useParams();
  const q = useAccount(id);
  const session = useSession();
  const [exportOpen, setExportOpen] = useState(false);
  if (q.isPending) return <StatePanel />;
  if (q.error)
    return <StatePanel error={q.error} retry={() => void q.refetch()} />;
  const { account: a } = q.data;
  return (
    <>
      <div className="breadcrumbs">
        <Link to="/accounts">Accounts</Link> / {a.maskedNumber}
      </div>
      <div className="page-heading">
        <div>
          <h1>Account details</h1>
          <p>
            {a.name} · <StatusBadge status={a.status} />
          </p>
        </div>
        <Button
          disabled={!can(session.data?.permissions ?? [], "statements:create")}
          onClick={() => setExportOpen(true)}
        >
          Generate statement
        </Button>
      </div>
      <Freshness {...q.data} refresh={() => void q.refetch()} />
      <div className="three-grid">
        {[
          ["Available balance", a.availableMinor],
          ["Ledger balance", a.ledgerMinor],
          ["Held reserve", a.heldMinor],
        ].map(([label, amount]) => (
          <section className="panel" key={label}>
            <div className="eyebrow">{label}</div>
            <div className="balance">{money(amount, a.currency)}</div>
          </section>
        ))}
      </div>
      <div className="two-grid">
        <section className="panel">
          <h2>Account identifiers & settlement</h2>
          <dl className="record-fields">
            <div>
              <dt>Account</dt>
              <dd>{a.name}</dd>
            </div>
            <div>
              <dt>Masked identifier</dt>
              <dd className="mono">{a.maskedNumber}</dd>
            </div>
            <div>
              <dt>Currency</dt>
              <dd>{a.currency}</dd>
            </div>
          </dl>
          <p>
            Only masked account information is exposed. Payment instructions and
            settlement partners await backend confirmation.
          </p>
        </section>
        <section className="panel">
          <h2>Limits & authorization mandate</h2>
          <dl className="record-fields">
            <div>
              <dt>Daily limit (mock)</dt>
              <dd>{money(q.data.dailyLimitMinor, a.currency)}</dd>
            </div>
            <div>
              <dt>Monthly limit (mock)</dt>
              <dd>{money(q.data.monthlyLimitMinor, a.currency)}</dd>
            </div>
          </dl>
          <p>{q.data.mandate}</p>
          <Link to="/team-and-approvals">Team & approval policies →</Link>
        </section>
      </div>
      <section className="panel">
        <h2>Active holds</h2>
        <p>
          Unresolved payment holds remain reserved until the authoritative
          outcome is known.
        </p>
        <div className="hold-list">
          {q.data.holds.map((hold) => (
            <div className="hold-item" key={hold.reference}>
              <div>
                <strong>{hold.reference}</strong>
                <p>{hold.reason}</p>
              </div>
              <div>
                <strong>{money(hold.amountMinor, a.currency)}</strong>
                <div>
                  <StatusBadge status={hold.status} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
      <div className="section-heading">
        <h2>Account Activity & Settlement Journal</h2>
        <Link to="/statements">View statement exports →</Link>
      </div>
      <TransactionBrowser accountId={a.id} />
      {exportOpen && (
        <StatementDialog
          accountId={a.id}
          onClose={() => setExportOpen(false)}
        />
      )}
    </>
  );
}
