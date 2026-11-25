import { useState } from "react";
import { StatementDialog } from "../components/StatementDialog";
import { Cashflow } from "../components/Cashflow";
import { Freshness } from "../components/Freshness";
import { useSession } from "../application/queries";
import { can } from "../auth/adapter";
import { PaymentCardPreview } from "../components/PaymentCardPreview";
import { Link } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  ArrowRight,
} from "lucide-react";
import { useOverview } from "../application/queries";
import { StatePanel, Empty } from "../components/StatePanel";
import { TransactionTable } from "../components/TransactionTable";
import { Button } from "../components/ui/button";
import { money } from "../domain/money";
export function Overview() {
  const query = useOverview();
  const session = useSession();
  const [exportOpen, setExportOpen] = useState(false);
  if (query.isPending) return <StatePanel />;
  if (query.error)
    return (
      <StatePanel error={query.error} retry={() => void query.refetch()} />
    );
  const d = query.data,
    account = d.accounts.find((a) => a.currency === "KES");
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Good morning, {session.data?.name.split(" ")[0] ?? "there"}</h1>
          <p>
            <strong>{session.data?.business ?? "Business workspace"}</strong> ·
            Primary KES Operating Account
          </p>
        </div>
        <div className="action-row">
          <Button
            disabled={
              !can(session.data?.permissions ?? [], "statements:create") ||
              !account
            }
            onClick={() => setExportOpen(true)}
          >
            Generate statement
          </Button>
          <Button asChild variant="outline">
            <Link to="/accounts">
              View accounts <ArrowRight size={15} />
            </Link>
          </Button>
        </div>
      </div>
      <Freshness {...d} refresh={() => void query.refetch()} />
      {!account ? (
        <section className="panel">
          <Empty
            title="No accounts yet"
            detail="Your accounts will appear here once provisioned. No balance is available."
          />
        </section>
      ) : (
        <>
          <div className="metrics">
            <Metric
              label="Available balance"
              value={money(account.availableMinor, "KES")}
              detail="Ledger less held funds"
            />
            <Metric
              label="Incoming this month"
              value={money(d.incomingMinor, "KES")}
              detail="KES · confirmed collections"
              icon={<ArrowDownLeft size={17} />}
            />
            <Metric
              label="Outgoing this month"
              value={money(d.outgoingMinor, "KES")}
              detail="KES · confirmed disbursements"
              icon={<ArrowUpRight size={17} />}
            />
            <Metric
              label="Outstanding invoices"
              value={money(d.receivableMinor, "KES")}
              detail={`${d.unpaidCount} unpaid invoices · ${d.overdueCount} overdue`}
            />
          </div>
          <div className="treasury-grid">
            <section className="panel account-panel">
              <div className="section-heading">
                <div className="inline">
                  <span className="icon-box">
                    <Landmark size={21} />
                  </span>
                  <div>
                    <h2>{account.name}</h2>
                    <small>Operational settlement ledger · mock account</small>
                  </div>
                </div>
                <span className="badge success">{account.status}</span>
              </div>
              <div className="balance-surface">
                <p className="mono">{account.maskedNumber}</p>
                <p className="eyebrow">Available to spend</p>
                <div className="balance">
                  {money(account.availableMinor, account.currency)}
                </div>
                <p className="muted">
                  Ledger balance:{" "}
                  <span className="amount">
                    {money(account.ledgerMinor, account.currency)}
                  </span>
                </p>
                <p className="muted">
                  Held reserve:{" "}
                  <span className="amount">
                    {money(account.heldMinor, account.currency)}
                  </span>
                </p>
              </div>
              <Button asChild variant="outline">
                <Link to="/accounts/acc_kes">
                  Account details <ArrowRight size={15} />
                </Link>
              </Button>
              <div className="notice">
                Balances represent cash. Outstanding invoices are separate
                receivables.
              </div>
            </section>
            <section className="panel card-panel">
              <div className="section-heading">
                <h2>Corporate Payment Card</h2>
                <span className="badge">Design preview</span>
              </div>
              <PaymentCardPreview />
              <p className="muted">
                Masked design reference. Manage simulated debit cards and
                spending controls in Cards.
              </p>
              <Link to="/cards">Manage cards →</Link>
            </section>
          </div>
        </>
      )}
      <div className="overview-detail-grid">
        <Cashflow points={d.cashflow} />
        <section className="panel">
          <div className="section-heading">
            <h2>Receivables & Invoicing</h2>
            <span className="badge">KES</span>
          </div>
          <div className="notice danger">
            <div>
              <strong>
                {money(
                  d.overdue
                    .reduce((sum, item) => sum + BigInt(item.amountMinor), 0n)
                    .toString(),
                  "KES",
                )}{" "}
                overdue
              </strong>
              <p>{d.overdueCount} overdue invoices</p>
            </div>
          </div>
          {d.overdue.map((item) => (
            <div className="receivable-row" key={item.name}>
              <div>
                {item.name}
                <small>{item.days} days overdue</small>
              </div>
              <strong>{money(item.amountMinor, "KES")}</strong>
            </div>
          ))}
          <p>
            Receivables are not bank balances. Issued invoices and confirmed
            allocations update this workspace.
          </p>
          <Link to="/invoices">View invoicing workspace →</Link>
        </section>
      </div>
      <div className="overview-detail-grid">
        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>Recent Transactions</h2>
              <p>Confirmed and unresolved activity shown separately</p>
            </div>
            <Link to="/transactions">View all transactions →</Link>
          </div>
          <TransactionTable data={d.recent} />
        </section>
        <section className="panel">
          <div className="section-heading">
            <h2>Pending Approvals</h2>
            <span className="badge warning">{d.pendingApprovals.length}</span>
          </div>
          <p>
            Approval is separate from execution. These requests have not moved
            money.
          </p>
          {d.pendingApprovals.length ? (
            d.pendingApprovals.map((item) => (
              <div className="approval-summary" key={item.reference}>
                <strong>{item.name}</strong>
                <p className="money-outgoing">
                  {money(item.amountMinor, item.currency)}
                </p>
                <small>{item.reference} · Awaiting authorization</small>
              </div>
            ))
          ) : (
            <Empty
              title="No pending approvals"
              detail="No requests currently await review."
            />
          )}
          <Link to="/payments/approvals">View approval workspace →</Link>
          <p className="footnote">Approval does not execute a payment.</p>
        </section>
      </div>
      <p className="footnote">
        Snapshot:{" "}
        {new Date(d.asOf).toLocaleString("en-GB", {
          timeZone: "Africa/Nairobi",
        })}{" "}
        EAT · Each currency remains separate.
      </p>
      {exportOpen && (
        <StatementDialog
          accountId={account?.id}
          onClose={() => setExportOpen(false)}
        />
      )}
    </>
  );
}
function Metric({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon?: React.ReactNode;
}) {
  return (
    <section className="panel metric">
      <div className="section-heading">
        <span className="eyebrow">{label}</span>
        {icon}
      </div>
      <div
        className={`metric-value ${label.toLowerCase().includes("incoming") ? "money-incoming" : label.toLowerCase().includes("outgoing") ? "money-outgoing" : ""}`}
      >
        {value}
      </div>
      <small>{detail}</small>
    </section>
  );
}
