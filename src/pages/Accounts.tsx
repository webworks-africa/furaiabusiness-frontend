import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import { useAccounts, useSession } from "../application/queries";
import type { Account } from "../api/contracts";
import { StatePanel, Empty } from "../components/StatePanel";
import { Freshness, StatusBadge } from "../components/Freshness";
import { StatementDialog } from "../components/StatementDialog";
import { Button } from "../components/ui/button";
import { can } from "../auth/adapter";
import { money } from "../domain/money";
const columns: ColumnDef<Account>[] = [
  {
    header: "Account details",
    accessorKey: "name",
    cell: ({ row }) => (
      <>
        <Link to={`/accounts/${row.original.id}`}>{row.original.name}</Link>
        <small>{row.original.currency} · Settlement ledger</small>
      </>
    ),
  },
  { header: "Identifier", accessorKey: "maskedNumber" },
  {
    header: "Status",
    accessorKey: "status",
    cell: ({ getValue }) => <StatusBadge status={getValue<string>()} />,
  },
  {
    header: "Available balance",
    accessorKey: "availableMinor",
    cell: ({ row }) =>
      money(row.original.availableMinor, row.original.currency),
  },
  {
    header: "Held amount",
    accessorKey: "heldMinor",
    cell: ({ row }) => money(row.original.heldMinor, row.original.currency),
  },
  {
    header: "Ledger balance",
    accessorKey: "ledgerMinor",
    cell: ({ row }) => money(row.original.ledgerMinor, row.original.currency),
  },
];
export function Accounts() {
  const q = useAccounts();
  const session = useSession();
  const [currency, setCurrency] = useState<"KES" | "USD">("KES");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("asc");
  const [exportOpen, setExportOpen] = useState(false);
  const data = useMemo(
    () =>
      (q.data?.items ?? [])
        .filter((a) =>
          `${a.name} ${a.maskedNumber}`
            .toLowerCase()
            .includes(search.toLowerCase()),
        )
        .sort((a, b) =>
          sort === "asc"
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name),
        ),
    [q.data?.items, search, sort],
  );
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });
  if (q.isPending) return <StatePanel />;
  if (q.error)
    return <StatePanel error={q.error} retry={() => void q.refetch()} />;
  const totals = q.data.items
    .filter((a) => a.currency === currency)
    .reduce(
      (v, a) => ({
        ledger: v.ledger + BigInt(a.ledgerMinor),
        available: v.available + BigInt(a.availableMinor),
        held: v.held + BigInt(a.heldMinor),
      }),
      { ledger: 0n, available: 0n, held: 0n },
    );
  return (
    <>
      <div className="breadcrumbs">Workspace / Accounts</div>
      <div className="page-heading">
        <div>
          <h1>Treasury & Operational Accounts</h1>
          <p>
            Available, held and ledger balances remain distinct. No currency
            conversion is applied.
          </p>
        </div>
        <div className="action-row">
          <Button asChild variant="outline">
            <Link to="/statements">Statement exports</Link>
          </Button>
          <Button
            disabled={
              !can(session.data?.permissions ?? [], "statements:create") ||
              !q.data.items.length
            }
            onClick={() => setExportOpen(true)}
          >
            Generate statement
          </Button>
        </div>
      </div>
      <Freshness {...q.data} refresh={() => void q.refetch()} />
      {!q.data.items.length ? (
        <section className="panel">
          <Empty
            title="No accounts yet"
            detail="Accounts will appear here after provisioning."
          />
        </section>
      ) : (
        <>
          <label className="currency-picker">
            Summary currency
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as "KES" | "USD")}
            >
              <option>KES</option>
              <option>USD</option>
            </select>
          </label>
          <div className="three-grid">
            <section className="panel dark-panel">
              <div className="eyebrow">Treasury ledger · {currency}</div>
              <div className="balance">
                {money(totals.ledger.toString(), currency)}
              </div>
              <p>Posted balance before holds</p>
            </section>
            <section className="panel">
              <div className="eyebrow">Immediate availability · {currency}</div>
              <div className="balance">
                {money(totals.available.toString(), currency)}
              </div>
              <p>Ledger less reserved funds</p>
            </section>
            <section className="panel">
              <div className="eyebrow">Held reserve · {currency}</div>
              <div className="balance">
                {money(totals.held.toString(), currency)}
              </div>
              <p>Reserved funds are not available to spend</p>
            </section>
          </div>
          <section className="panel">
            <div className="section-heading">
              <h2>Designated Accounts</h2>
              <span className="badge">
                {q.data.items.length} accounts · separate currencies
              </span>
            </div>
            <div className="account-toolbar">
              <label>
                Filter accounts
                <input
                  placeholder="Name or masked identifier"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <label>
                Sort by name
                <select value={sort} onChange={(e) => setSort(e.target.value)}>
                  <option value="asc">A–Z</option>
                  <option value="desc">Z–A</option>
                </select>
              </label>
            </div>
            {!data.length ? (
              <Empty
                title="No matching accounts"
                detail="Change the name or identifier filter."
              />
            ) : (
              <div
                className="table-scroll"
                tabIndex={0}
                role="region"
                aria-label="Accounts"
              >
                <table>
                  <thead>
                    {table.getHeaderGroups().map((g) => (
                      <tr key={g.id}>
                        {g.headers.map((h) => (
                          <th key={h.id} scope="col">
                            {flexRender(
                              h.column.columnDef.header,
                              h.getContext(),
                            )}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {table.getRowModel().rows.map((row) => (
                      <tr key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
      {exportOpen && <StatementDialog onClose={() => setExportOpen(false)} />}
    </>
  );
}
