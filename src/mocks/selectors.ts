import type { Transaction } from "../api/contracts";
import type { TransactionFilters } from "../domain/filters";
import { dayInNairobi } from "../domain/filters";
import { db, fixedDate } from "./store";
export const freshness = () => ({
  asOf: fixedDate,
  stale: db.scenario === "stale",
});
export const visibleTransactions = () =>
  db.scenario === "empty" ? [] : db.transactions;
export function selectTransactions(filters: TransactionFilters): Transaction[] {
  return visibleTransactions()
    .filter(
      (t) =>
        (!filters.search ||
          `${t.id} ${t.counterparty}`
            .toLowerCase()
            .includes(filters.search.toLowerCase())) &&
        (!filters.account || t.accountId === filters.account) &&
        (!filters.currency || t.currency === filters.currency) &&
        (!filters.status || t.status === filters.status) &&
        (!filters.rail || t.rail === filters.rail) &&
        (!filters.from || dayInNairobi(t.date) >= filters.from) &&
        (!filters.to || dayInNairobi(t.date) <= filters.to),
    )
    .sort((a, b) =>
      filters.sort === "oldest"
        ? a.date.localeCompare(b.date) || a.id.localeCompare(b.id)
        : b.date.localeCompare(a.date) || b.id.localeCompare(a.id),
    );
}
export function movement(items: Transaction[]) {
  return items.reduce(
    (v, t) => {
      if (t.status === "Completed") {
        const amount = BigInt(t.amountMinor);
        if (amount > 0n) v.incoming += amount;
        else v.outgoing -= amount;
      }
      return v;
    },
    { incoming: 0n, outgoing: 0n },
  );
}
export function cashflow() {
  return Array.from({ length: 6 }, (_, i) => {
    const month = `2026-${String(i + 5).padStart(2, "0")}`;
    const sums = movement(
      visibleTransactions().filter(
        (t) => t.currency === "KES" && dayInNairobi(t.date).startsWith(month),
      ),
    );
    return {
      month,
      incomingMinor: sums.incoming.toString(),
      outgoingMinor: sums.outgoing.toString(),
    };
  });
}
