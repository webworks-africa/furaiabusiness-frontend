import { Money } from "../components/Money";
import { useState } from "react";
import {
  Link,
  NavLink,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { FileChartColumn, Download, ArrowRight } from "lucide-react";
import {
  useReport,
  useReportExports,
  useReportExport,
  usePlatformWrite,
  downloadReport,
} from "../application/platform";
import { useSession } from "../application/queries";
import {
  reportFilters,
  exportSchema,
  reportKind,
  type ReportFilters,
  type ReportRow,
  type ReportExport,
} from "../api/platformContracts";
import { money } from "../domain/money";
import { can } from "../auth/adapter";
import { StatePanel, Empty } from "../components/StatePanel";
import { Freshness, StatusBadge } from "../components/Freshness";
import { BillingTable } from "../components/BillingTable";
import { MutationMessage } from "../components/BusinessForms";
import { Button } from "../components/ui/button";
const reportNames = {
  "cash-movement": "Cash movement & liquidity",
  "receivables-aging": "Receivables aging",
  "invoice-collection": "Invoice collection & realization",
};
export function ReportsNav() {
  return (
    <nav className="page-tabs" aria-label="Report sections">
      <NavLink to="/reports" end>
        Reports
      </NavLink>
      {reportKind.options.map((k) => (
        <NavLink key={k} to={`/reports/${k}`}>
          {reportNames[k]}
        </NavLink>
      ))}
      <NavLink to="/reports/exports">Export center</NavLink>
      <Link to="/statements">Bank statements</Link>
    </nav>
  );
}
export function ReportsHome() {
  const [currency, setCurrency] = useState<"KES" | "USD">("KES");
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Financial reports & statements</h1>
          <p>
            Currency-specific cash, issued receivables and confirmed allocation
            reports.
          </p>
        </div>
        <Link className="button button-outline" to="/reports/exports">
          <Download size={16} /> Export center
        </Link>
      </div>
      <ReportsNav />
      <section className="panel">
        <label>
          Summary currency
          <select
            aria-label="Summary currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value as "KES" | "USD")}
          >
            <option>KES</option>
            <option>USD</option>
          </select>
        </label>
      </section>
      <div className="notice">
        Reports are simulated, unsigned and uncertified. Issuing an invoice
        creates a receivable; only confirmed bank events change cash.
      </div>
      <div className="two-grid">
        {reportKind.options.map((k) => (
          <ReportLauncher key={k} kind={k} currency={currency} />
        ))}
      </div>
      <section className="panel">
        <h2>Capabilities awaiting contracts</h2>
        <p>
          Regulatory/withholding certification, signed PDF/XLSX, scheduled
          delivery and historical receivable reconstruction are unavailable. CSV
          export captures an immutable mock snapshot through the export queue.
        </p>
      </section>
    </>
  );
}
function ReportLauncher({
  kind,
  currency,
}: {
  kind: ReportFilters["kind"];
  currency: "KES" | "USD";
}) {
  const q = useReport({
    kind,
    currency,
    from: "2026-10-01",
    to: "2026-10-21",
    search: "",
    bucket: "",
    page: 1,
  });
  return (
    <section className="panel report-launch">
      <FileChartColumn size={22} />
      <h2>{reportNames[kind]}</h2>
      <p>
        {kind === "cash-movement"
          ? "Confirmed bank cash movements, excluding pending/failed events."
          : kind === "receivables-aging"
            ? "Current balances on issued invoices, grouped by due-date aging."
            : "Issued invoices and their current confirmed allocations and credit notes."}
      </p>
      {q.isPending ? (
        <StatePanel />
      ) : q.error ? (
        <StatePanel error={q.error} retry={() => void q.refetch()} />
      ) : (
        <>
          <Freshness {...q.data} refresh={() => void q.refetch()} />
          <dl className="report-quick-values">
            {q.data.summary.slice(0, 2).map((s) => (
              <div key={s.label}>
                <dt>{s.label}</dt>
                <dd>
                  <Money
                    minor={s.minor}
                    currency={currency}
                    direction={reportFlow(s.label)}
                  />
                </dd>
              </div>
            ))}
          </dl>
        </>
      )}
      <Link to={`/reports/${kind}?currency=${currency}`}>
        Open report <ArrowRight size={14} />
      </Link>
    </section>
  );
}
export function ReportPage() {
  const { kind = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const parsed = reportFilters.safeParse({
    kind,
    currency: params.get("currency") ?? "KES",
    from: params.get("from") ?? "2026-10-01",
    to: params.get("to") ?? "2026-10-21",
    search: params.get("search") ?? "",
    bucket: params.get("bucket") ?? "",
    page: params.get("page") ?? 1,
  });
  if (!parsed.success) return <InvalidReport reset={() => setParams({})} />;
  return (
    <ReportBody
      filters={parsed.data}
      update={(v) =>
        setParams(
          Object.fromEntries(
            Object.entries({ ...parsed.data, ...v })
              .filter(([k]) => k !== "kind")
              .map(([k, v]) => [k, String(v)]),
          ),
        )
      }
    />
  );
}
function InvalidReport({ reset }: { reset: () => void }) {
  return (
    <section className="panel">
      <h1>Invalid report filters</h1>
      <p>Select a valid currency, date range and page.</p>
      <Button onClick={reset}>Reset report filters</Button>
      <Link to="/reports">Report center →</Link>
    </section>
  );
}
function ReportBody({
  filters,
  update,
}: {
  filters: ReportFilters;
  update: (v: Partial<ReportFilters>) => void;
}) {
  const q = useReport(filters);
  const session = useSession();
  const mutation = usePlatformWrite(exportSchema);
  const navigate = useNavigate();
  const [key] = useState(() => crypto.randomUUID());
  const columns: ColumnDef<ReportRow>[] = [
    {
      accessorKey: "id",
      header: "Reference",
      cell: ({ row }) => (
        <Link
          to={
            filters.kind === "cash-movement"
              ? `/transactions/${row.original.id}`
              : `/invoices/${row.original.id}`
          }
        >
          {row.original.id}
        </Link>
      ),
    },
    {
      accessorKey: "name",
      header: filters.kind === "cash-movement" ? "Counterparty" : "Customer",
    },
    {
      accessorKey: "date",
      header: filters.kind === "cash-movement" ? "Date (EAT)" : "Due date",
    },
    ...(filters.kind === "cash-movement"
      ? ([
          { accessorKey: "rail", header: "Rail" },
          {
            accessorKey: "amountMinor",
            header: "Posted movement",
            cell: ({ row }) => (
              <Money
                minor={row.original.amountMinor}
                currency={filters.currency}
                direction={
                  filters.kind === "cash-movement" ? "signed" : "neutral"
                }
              />
            ),
          },
        ] as ColumnDef<ReportRow>[])
      : filters.kind === "receivables-aging"
        ? ([
            { accessorKey: "bucket", header: "Aging band" },
            {
              accessorKey: "outstandingMinor",
              header: "Outstanding",
              cell: ({ row }) =>
                money(row.original.outstandingMinor, filters.currency),
            },
          ] as ColumnDef<ReportRow>[])
        : ([
            {
              accessorKey: "amountMinor",
              header: "Issued value",
              cell: ({ row }) => (
                <Money
                  minor={row.original.amountMinor}
                  currency={filters.currency}
                  direction={
                    filters.kind === "cash-movement" ? "signed" : "neutral"
                  }
                />
              ),
            },
            {
              accessorKey: "paidMinor",
              header: "Confirmed allocations",
              cell: ({ row }) => (
                <Money
                  minor={row.original.paidMinor}
                  currency={filters.currency}
                  direction="incoming"
                />
              ),
            },
            {
              accessorKey: "creditedMinor",
              header: "Credits",
              cell: ({ row }) =>
                money(row.original.creditedMinor, filters.currency),
            },
            {
              accessorKey: "outstandingMinor",
              header: "Outstanding",
              cell: ({ row }) =>
                money(row.original.outstandingMinor, filters.currency),
            },
          ] as ColumnDef<ReportRow>[])),
  ];
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{reportNames[filters.kind]}</h1>
          <p>Single-currency reporting · {filters.currency}</p>
        </div>
        <Button
          disabled={
            !q.data ||
            !!q.error ||
            q.data.stale ||
            mutation.isPending ||
            !can(session.data?.permissions ?? [], "reports:export")
          }
          onClick={async () => {
            try {
              const x = await mutation.mutateAsync({
                path: "/report-exports",
                body: filters,
                key,
              });
              navigate(`/reports/exports/${x.id}`);
            } catch {
              /* Error below. */
            }
          }}
        >
          <Download size={16} /> Generate CSV snapshot
        </Button>
      </div>
      <ReportsNav />
      <section className="panel">
        <div className="report-filters">
          <label>
            Report currency
            <select
              aria-label="Report currency"
              value={filters.currency}
              onChange={(e) =>
                update({ currency: e.target.value as "KES" | "USD", page: 1 })
              }
            >
              <option>KES</option>
              <option>USD</option>
            </select>
          </label>
          <label>
            From date
            <input
              type="date"
              value={filters.from}
              disabled={filters.kind === "receivables-aging"}
              onChange={(e) => update({ from: e.target.value, page: 1 })}
            />
          </label>
          <label>
            To date
            <input
              type="date"
              value={filters.to}
              disabled={filters.kind === "receivables-aging"}
              onChange={(e) => update({ to: e.target.value, page: 1 })}
            />
          </label>
          <label>
            Search report
            <input
              value={filters.search}
              onChange={(e) => update({ search: e.target.value, page: 1 })}
            />
          </label>
          {filters.kind === "receivables-aging" && (
            <label>
              Aging band
              <select
                aria-label="Aging band"
                value={filters.bucket}
                onChange={(e) =>
                  update({
                    bucket: e.target.value as ReportFilters["bucket"],
                    page: 1,
                  })
                }
              >
                <option value="">All bands</option>
                {[
                  "Current",
                  "1–30 days",
                  "31–60 days",
                  "61–90 days",
                  "90+ days",
                ].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
          )}
        </div>
        <MutationMessage error={mutation.error} />
      </section>
      {q.isPending ? (
        <StatePanel />
      ) : q.error ? (
        <StatePanel error={q.error} retry={() => void q.refetch()} />
      ) : (
        <>
          <Freshness {...q.data} refresh={() => void q.refetch()} />
          <div className="notice">{q.data.note}</div>
          <p className="footnote">
            Summary covers the currency/date scope before search and aging-band
            filters. {q.data.excludedUnconfirmed} unresolved/failed bank records
            excluded from confirmed cash.
          </p>
          <div
            className={`payment-metrics ${filters.kind === "receivables-aging" ? "aging-metrics" : ""}`}
          >
            {q.data.summary.map((s) => (
              <section className="panel" key={s.label}>
                <small>{s.label}</small>
                <h2>
                  <Money
                    minor={s.minor}
                    currency={filters.currency}
                    direction={reportFlow(s.label)}
                  />
                </h2>
              </section>
            ))}
          </div>
          <section className="panel">
            {q.data.items.length ? (
              <BillingTable
                items={q.data.items}
                columns={columns}
                label="Report results"
                page={q.data.page}
                pages={q.data.pages}
                total={q.data.total}
                onPage={(page) => update({ page })}
              />
            ) : (
              <Empty
                title="No report results"
                detail="Change the currency, range or filters. Unconfirmed payments are excluded."
              />
            )}
          </section>
        </>
      )}
    </>
  );
}
export function ReportExportsPage() {
  const q = useReportExports();
  const [page, setPage] = useState(1);
  const columns: ColumnDef<ReportExport>[] = [
    {
      accessorKey: "id",
      header: "Export",
      cell: ({ row }) => (
        <Link to={`/reports/exports/${row.original.id}`}>
          {row.original.id}
        </Link>
      ),
    },
    {
      accessorKey: "kind",
      header: "Report",
      cell: ({ row }) => reportNames[row.original.kind],
    },
    { accessorKey: "currency", header: "Currency" },
    { accessorKey: "rowCount", header: "Snapshot rows" },
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
          <h1>Report export center</h1>
          <p>
            Immutable CSV snapshots; banking statements remain in their existing
            export list.
          </p>
        </div>
      </div>
      <ReportsNav />
      {q.isPending ? (
        <StatePanel />
      ) : q.error ? (
        <StatePanel error={q.error} retry={() => void q.refetch()} />
      ) : (
        <>
          <Freshness {...q.data} refresh={() => void q.refetch()} />
          <section className="panel">
            {q.data.items.length ? (
              <BillingTable
                items={q.data.items.slice((page - 1) * 6, page * 6)}
                columns={columns}
                label="Report exports"
                page={page}
                pages={Math.max(1, Math.ceil(q.data.items.length / 6))}
                total={q.data.items.length}
                onPage={setPage}
              />
            ) : (
              <Empty
                title="No report exports"
                detail="Open a report and generate a CSV snapshot."
              />
            )}
          </section>
        </>
      )}
    </>
  );
}
export function ReportExportPage() {
  const { id = "" } = useParams();
  const q = useReportExport(id);
  const session = useSession();
  const retry = usePlatformWrite(exportSchema);
  const [error, setError] = useState<Error | null>(null);
  const [downloading, setDownloading] = useState(false);
  if (q.isPending) return <StatePanel />;
  if (q.error)
    return <StatePanel error={q.error} retry={() => void q.refetch()} />;
  const x = q.data;
  const allowed =
    can(session.data?.permissions ?? [], "reports:export") && !x.stale;
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Report export {x.id}</h1>
          <p>
            {reportNames[x.kind]} · {x.currency} · {x.from} to {x.to}
          </p>
        </div>
        <StatusBadge status={x.status} />
      </div>
      <ReportsNav />
      <Freshness {...x} refresh={() => void q.refetch()} />
      <section className="panel">
        <h2>CSV snapshot</h2>
        <p>
          {x.rowCount} rows · Attempt {x.attempt}. Contents were captured when
          requested and do not change on retry.
        </p>
        {x.error && <p role="alert">{x.error}</p>}
        {["Queued", "Generating"].includes(x.status) && (
          <p role="status">Generating your report…</p>
        )}
        {x.status === "Expired" && (
          <p className="notice">
            This snapshot download has expired. Generate a new report.
          </p>
        )}
        <div className="action-row">
          {x.status === "Ready" && (
            <Button
              disabled={!allowed || downloading}
              onClick={async () => {
                setError(null);
                setDownloading(true);
                try {
                  await downloadReport(x.id);
                } catch (e) {
                  setError(e as Error);
                } finally {
                  setDownloading(false);
                }
              }}
            >
              Download report CSV
            </Button>
          )}
          {x.status === "Failed" && (
            <Button
              disabled={!allowed || retry.isPending}
              onClick={() =>
                retry.mutate({
                  path: `/report-exports/${x.id}/retry`,
                  key: crypto.randomUUID(),
                })
              }
            >
              Retry report generation
            </Button>
          )}
          <Link to="/reports/exports">All report exports →</Link>
        </div>
        <MutationMessage error={error ?? retry.error} />
      </section>
    </>
  );
}

function reportFlow(label: string) {
  return label === "Confirmed outflows"
    ? ("outgoing" as const)
    : ["Confirmed inflows", "Confirmed allocations"].includes(label)
      ? ("incoming" as const)
      : ("neutral" as const);
}
