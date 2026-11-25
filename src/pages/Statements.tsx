import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  useAccounts,
  useStatements,
  useStatement,
  useSession,
  useRetryStatement,
  useDownloadStatement,
} from "../application/queries";
import { StatePanel, Empty } from "../components/StatePanel";
import { Freshness, StatusBadge } from "../components/Freshness";
import { StatementDialog } from "../components/StatementDialog";
import { Button } from "../components/ui/button";
import { can } from "../auth/adapter";
export function Statements() {
  const q = useStatements();
  const session = useSession();
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="breadcrumbs">
        <Link to="/accounts">Accounts</Link> / Statement exports
      </div>
      <div className="page-heading">
        <div>
          <h1>Statement Exports</h1>
          <p>Generation status, attempt history and authorized downloads</p>
        </div>
        <Button
          disabled={!can(session.data?.permissions ?? [], "statements:create")}
          onClick={() => setOpen(true)}
        >
          Generate statement
        </Button>
      </div>
      {q.isPending ? (
        <StatePanel />
      ) : q.error ? (
        <StatePanel error={q.error} retry={() => void q.refetch()} />
      ) : (
        <>
          <Freshness {...q.data} refresh={() => void q.refetch()} />
          <section className="panel">
            {!q.data.items.length ? (
              <Empty
                title="No statement exports"
                detail="Generate an account statement to create an export job."
              />
            ) : (
              <div className="export-list">
                {q.data.items.map((job) => (
                  <article key={job.id} className="export-item">
                    <div>
                      <Link to={`/statements/${job.id}`}>
                        <strong>
                          {job.id} · {job.currency} statement
                        </strong>
                      </Link>
                      <p>
                        {job.from} → {job.to} · CSV · Attempt {job.attempt}
                      </p>
                      <small>
                        {job.status === "Ready"
                          ? "Open the export to download."
                          : job.status === "Failed"
                            ? "Generation failed. Open to retry."
                            : job.status === "Expired"
                              ? "Download expired. Generate a new export."
                              : "Open the export to follow generation progress."}
                      </small>
                    </div>
                    <StatusBadge status={job.status} />
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
      {open && <StatementDialog onClose={() => setOpen(false)} />}
    </>
  );
}
export function StatementDetail() {
  const { id = "" } = useParams();
  const q = useStatement(id);
  const accounts = useAccounts();
  const session = useSession();
  const retry = useRetryStatement(id);
  const download = useDownloadStatement(id);
  const [open, setOpen] = useState(false);
  if (q.isPending) return <StatePanel />;
  if (q.error)
    return <StatePanel error={q.error} retry={() => void q.refetch()} />;
  const job = q.data;
  const allowed = can(session.data?.permissions ?? [], "statements:create");
  return (
    <>
      <div className="breadcrumbs">
        <Link to="/statements">Statement exports</Link> / {id}
      </div>
      <div className="page-heading">
        <div>
          <h1>Statement {id}</h1>
          <p>
            {job.currency} · {job.from} → {job.to} · Dates in Africa/Nairobi
          </p>
        </div>
        <StatusBadge status={job.status} />
      </div>
      <section className="panel export-detail">
        <h2>
          {job.status === "Ready"
            ? "Your statement is ready"
            : job.status === "Failed"
              ? "Statement generation failed"
              : job.status === "Expired"
                ? "Statement download expired"
                : "Preparing your statement"}
        </h2>
        <p role="status">
          {job.status === "Queued"
            ? "Queued for generation."
            : job.status === "Generating"
              ? "Generating a consistent statement snapshot…"
              : job.status === "Failed"
                ? "Generation did not complete. Retry this job without creating a duplicate."
                : job.status === "Expired"
                  ? "This download is no longer available. Generate a new export."
                  : `${job.rowCount} records included. Pending and failed amounts are never posted movements.`}
        </p>
        <dl className="record-fields">
          <div>
            <dt>Original job reference</dt>
            <dd>{id}</dd>
          </div>
          <div>
            <dt>Attempt</dt>
            <dd>{job.attempt}</dd>
          </div>
          <div>
            <dt>Account</dt>
            <dd>
              <Link to={`/accounts/${job.accountId}`}>
                {accounts.data?.items.find((a) => a.id === job.accountId)
                  ?.name ?? "View linked account"}
              </Link>
            </dd>
          </div>
          <div>
            <dt>Unresolved records</dt>
            <dd>
              {job.includeUnresolved
                ? "Included with zero ledger movement"
                : "Excluded"}
            </dd>
          </div>
          {job.expiresAt && (
            <div>
              <dt>Download expiry (EAT)</dt>
              <dd>
                {new Date(job.expiresAt).toLocaleString("en-GB", {
                  timeZone: "Africa/Nairobi",
                })}
              </dd>
            </div>
          )}
        </dl>
        <div className="action-row">
          {job.status === "Ready" && (
            <Button
              disabled={!allowed || download.isPending}
              onClick={() => download.mutate()}
            >
              {download.isPending ? "Downloading…" : "Download CSV"}
            </Button>
          )}
          {job.status === "Failed" && (
            <Button
              disabled={!allowed || retry.isPending}
              onClick={() => retry.mutate()}
            >
              {retry.isPending ? "Retrying…" : "Retry generation"}
            </Button>
          )}
          {job.status === "Expired" && (
            <Button disabled={!allowed} onClick={() => setOpen(true)}>
              Generate new statement
            </Button>
          )}
          <Button
            variant="outline"
            disabled={q.isFetching}
            onClick={() => void q.refetch()}
          >
            Refresh status
          </Button>
        </div>
        {!allowed && (
          <p className="field-error" role="alert">
            Your role cannot create or download statements.
          </p>
        )}
        {(retry.error || download.error) && (
          <p className="field-error" role="alert">
            {(retry.error || download.error)?.message}
          </p>
        )}
        {download.isSuccess && (
          <p role="status">
            Download requested. The CSV is a mock export, not a certified
            statement.
          </p>
        )}
        <div className="notice">
          Export snapshots are immutable. Retrying a failed export preserves its
          original reference and snapshot.
        </div>
      </section>
      {open && (
        <StatementDialog
          accountId={job.accountId}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
