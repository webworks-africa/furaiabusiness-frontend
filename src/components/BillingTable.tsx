import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { Button } from "./ui/button";
export function BillingTable<T>({
  items,
  columns,
  label,
  page,
  pages,
  total,
  onPage,
}: {
  items: T[];
  columns: ColumnDef<T>[];
  label: string;
  page: number;
  pages: number;
  total: number;
  onPage: (page: number) => void;
}) {
  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });
  return (
    <>
      <div
        className="table-scroll"
        role="region"
        aria-label={label}
        tabIndex={0}
      >
        <table className="billing-table">
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
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="section-heading billing-pagination">
        <span>
          {total} records · Page {page} of {pages}
        </span>
        <div className="action-row">
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
          >
            Previous page
          </Button>
          <Button
            variant="outline"
            disabled={page >= pages}
            onClick={() => onPage(page + 1)}
          >
            Next page
          </Button>
        </div>
      </div>
    </>
  );
}
