import { useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { useTransactions, useAccounts } from "../application/queries";
import {
  defaultFilters,
  filterParams,
  transactionFiltersSchema,
  type TransactionFilters,
} from "../domain/filters";
import { money } from "../domain/money";
import { TransactionTable } from "./TransactionTable";
import { StatePanel } from "./StatePanel";
import { Freshness } from "./Freshness";
import { Button } from "./ui/button";
export function TransactionBrowser({ accountId }: { accountId?: string }) {
  const [params, setParams] = useSearchParams();
  const signature = params.toString();
  const parsed = useMemo(() => {
    const p = Object.fromEntries(new URLSearchParams(signature));
    return transactionFiltersSchema.safeParse({
      ...defaultFilters,
      ...p,
      page: Number(p.page ?? 1),
      ...(accountId ? { account: accountId } : {}),
    });
  }, [signature, accountId]);
  const filters: TransactionFilters = parsed.success
    ? parsed.data
    : { ...defaultFilters, ...(accountId ? { account: accountId } : {}) };
  const q = useTransactions(filters, parsed.success);
  const accounts = useAccounts();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<
    z.input<typeof transactionFiltersSchema>,
    unknown,
    TransactionFilters
  >({
    resolver: zodResolver(transactionFiltersSchema),
    defaultValues: filters,
  });
  useEffect(() => {
    if (parsed.success) reset(parsed.data);
  }, [parsed, reset]);
  const submit = handleSubmit((values) =>
    setParams(
      filterParams({
        ...values,
        page: 1,
        ...(accountId ? { account: accountId } : {}),
      }),
    ),
  );
  function page(next: number) {
    setParams(filterParams({ ...filters, page: next }));
  }
  return (
    <section className="panel">
      <form className="transaction-filters" onSubmit={submit}>
        <label className="filter-search">
          Counterparty or reference
          <input placeholder="Search transactions…" {...register("search")} />
        </label>
        {!accountId && (
          <label>
            Account
            <select {...register("account")}>
              <option value="">All accounts</option>
              {accounts.data?.items.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          Currency
          <select {...register("currency")}>
            <option value="">All currencies</option>
            <option>KES</option>
            <option>USD</option>
          </select>
        </label>
        <label>
          Status
          <select {...register("status")}>
            <option value="">All statuses</option>
            <option>Completed</option>
            <option>Pending confirmation</option>
            <option>Failed</option>
          </select>
        </label>
        <label>
          Rail
          <select {...register("rail")}>
            <option value="">All rails</option>
            <option>Collection</option>
            <option>Bank transfer</option>
            <option>PesaLink</option>
            <option>M-Pesa B2C</option>
            <option>RTGS</option>
          </select>
        </label>
        <label>
          From date
          <input
            type="date"
            {...register("from")}
            aria-invalid={!!errors.from}
          />
        </label>
        <label>
          To date
          <input type="date" {...register("to")} aria-invalid={!!errors.to} />
        </label>
        <label>
          Sort
          <select {...register("sort")}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>
        <div className="filter-actions">
          <Button>Apply filters</Button>
          <Button
            variant="outline"
            type="button"
            onClick={() => {
              reset({
                ...defaultFilters,
                ...(accountId ? { account: accountId } : {}),
              });
              setParams(accountId ? { account: accountId } : {});
            }}
          >
            Reset filters
          </Button>
        </div>
        {Object.entries(errors).map(([field, error]) => (
          <p role="alert" className="field-error" key={field}>
            {error.message}
          </p>
        ))}
      </form>
      {accounts.error && (
        <p role="alert" className="field-error">
          Account filter could not be loaded. {accounts.error.message}
        </p>
      )}
      {!parsed.success ? (
        <div role="alert" className="notice warning">
          The URL contains invalid filters. Reset filters to continue.
        </div>
      ) : q.isPending ? (
        <StatePanel />
      ) : q.error ? (
        <StatePanel error={q.error} retry={() => void q.refetch()} />
      ) : (
        <>
          <Freshness {...q.data} refresh={() => void q.refetch()} />
          <div className="list-summary">
            {q.data.summary.currency ? (
              <>
                <span>
                  Confirmed incoming{" "}
                  <strong>
                    {money(
                      q.data.summary.incomingMinor,
                      q.data.summary.currency,
                    )}
                  </strong>
                </span>
                <span>
                  Confirmed outgoing{" "}
                  <strong>
                    {money(
                      q.data.summary.outgoingMinor,
                      q.data.summary.currency,
                    )}
                  </strong>
                </span>
              </>
            ) : (
              <span>Select one currency or account for monetary totals.</span>
            )}
            <span>
              {q.data.summary.pendingCount} pending confirmation ·{" "}
              {q.data.summary.failedCount} failed
            </span>
          </div>
          <TransactionTable data={q.data.items} />
          <div className="pagination">
            <small>
              {q.data.total} transactions · page {filters.page} of{" "}
              {Math.max(1, Math.ceil(q.data.total / q.data.pageSize))}
            </small>
            <Button
              variant="outline"
              disabled={filters.page === 1}
              onClick={() => page(filters.page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={filters.page * q.data.pageSize >= q.data.total}
              onClick={() => page(filters.page + 1)}
            >
              Next
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
