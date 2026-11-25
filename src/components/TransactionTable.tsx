import { Money } from "./Money";
import { Link, useLocation } from "react-router-dom";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import type { Transaction } from "../api/contracts";
import { Empty } from "./StatePanel";
const columns: ColumnDef<Transaction>[] = [
  {
    accessorKey: "counterparty",
    header: "Counterparty & rail",
    cell: ({ row }) => (
      <>
        <strong>
          <TransactionLink transaction={row.original} />
        </strong>
        <small>
          {row.original.rail} · {row.original.id}
        </small>
      </>
    ),
  },
  { accessorKey: "category", header: "Category" },
  {
    accessorKey: "date",
    header: "Date / time",
    cell: ({ getValue }) =>
      new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Africa/Nairobi",
      }).format(new Date(getValue<string>())),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ getValue }) => (
      <span
        className={`badge ${getValue() === "Completed" ? "success" : getValue() === "Failed" ? "danger" : "warning"}`}
      >
        {getValue<string>()}
      </span>
    ),
  },
  {
    accessorKey: "amountMinor",
    header: "Amount",
    cell: ({ row }) => (
      <Money
        minor={row.original.amountMinor}
        currency={row.original.currency}
      />
    ),
  },
];
export function TransactionTable({ data }: { data: Transaction[] }) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });
  if (!data.length)
    return (
      <Empty
        title="No transactions"
        detail="Transactions will appear here after activity is recorded."
      />
    );
  return (
    <div
      className="table-scroll"
      tabIndex={0}
      role="region"
      aria-label="Transactions"
    >
      <table>
        <thead>
          {table.getHeaderGroups().map((g) => (
            <tr key={g.id}>
              {g.headers.map((h) => (
                <th key={h.id} scope="col">
                  {flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((r) => (
            <tr key={r.id}>
              {r.getVisibleCells().map((c) => (
                <td key={c.id}>
                  {flexRender(c.column.columnDef.cell, c.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TransactionLink({ transaction }: { transaction: Transaction }) {
  const location = useLocation();
  return (
    <Link
      to={`/transactions/${transaction.id}`}
      state={{ from: location.pathname + location.search }}
    >
      {transaction.counterparty}
    </Link>
  );
}
