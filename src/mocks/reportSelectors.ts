import type { ReportFilters, ReportRow } from "../api/platformContracts";
import { db, fixedDate } from "./store";
import { billing } from "./billingStore";
import { financials } from "./collectionStore";
import { dayInNairobi } from "../domain/filters";
import { statementBalances, csvCell } from "../domain/statements";
import { freshness } from "./selectors";
export function agingBucket(due: string, asOf: string) {
  const days = Math.floor((Date.parse(asOf) - Date.parse(due)) / 86400000);
  return days <= 0
    ? "Current"
    : days <= 30
      ? "1–30 days"
      : days <= 60
        ? "31–60 days"
        : days <= 90
          ? "61–90 days"
          : "90+ days";
}
export function selectReport(f: ReportFilters) {
  const empty = db.scenario === "empty";
  const transactions = empty
    ? []
    : db.transactions.filter((t) => t.currency === f.currency);
  const inRange = (date: string) => date >= f.from && date <= f.to;
  let rows: ReportRow[] = [];
  let summary: { label: string; minor: string }[] = [];
  if (f.kind === "cash-movement") {
    rows = transactions
      .filter((t) => t.status === "Completed" && inRange(dayInNairobi(t.date)))
      .map((t) => ({
        id: t.id,
        name: t.counterparty,
        date: dayInNairobi(t.date),
        status: t.status,
        rail: t.rail,
        amountMinor: t.amountMinor,
        paidMinor: "0",
        creditedMinor: "0",
        outstandingMinor: "0",
        bucket: "",
      }));
    const incoming = rows.reduce(
      (n, r) => n + (BigInt(r.amountMinor) > 0n ? BigInt(r.amountMinor) : 0n),
      0n,
    );
    const outgoing = rows.reduce(
      (n, r) => n + (BigInt(r.amountMinor) < 0n ? -BigInt(r.amountMinor) : 0n),
      0n,
    );
    const opening = (
      empty ? [] : db.accounts.filter((a) => a.currency === f.currency)
    ).reduce(
      (n, a) =>
        n + BigInt(statementBalances(a, db.transactions, f.from, f.to).opening),
      0n,
    );
    summary = [
      { label: "Opening ledger", minor: opening.toString() },
      { label: "Confirmed inflows", minor: incoming.toString() },
      { label: "Confirmed outflows", minor: outgoing.toString() },
      {
        label: "Closing ledger",
        minor: (opening + incoming - outgoing).toString(),
      },
    ];
  } else {
    rows = (empty ? [] : billing.documents)
      .filter(
        (d) =>
          d.kind === "invoices" &&
          d.snapshot &&
          (f.kind === "receivables-aging" || inRange(d.snapshot.values.date)) &&
          d.values.currency === f.currency,
      )
      .map((d) => {
        const v = financials(d.id);
        return {
          id: d.id,
          name: d.customer.name,
          date: d.snapshot!.values.until,
          status: d.status,
          rail: "",
          amountMinor: d.snapshot!.totals.totalMinor,
          paidMinor: v.paid.toString(),
          creditedMinor: v.credited.toString(),
          outstandingMinor: v.due.toString(),
          bucket: agingBucket(d.snapshot!.values.until, fixedDate.slice(0, 10)),
        };
      })
      .filter(
        (r) =>
          f.kind !== "receivables-aging" || BigInt(r.outstandingMinor) > 0n,
      );
    if (f.kind === "receivables-aging")
      summary = [
        "Current",
        "1–30 days",
        "31–60 days",
        "61–90 days",
        "90+ days",
      ].map((label) => ({
        label,
        minor: rows
          .filter((r) => r.bucket === label)
          .reduce((n, r) => n + BigInt(r.outstandingMinor), 0n)
          .toString(),
      }));
    else
      summary = [
        {
          label: "Issued value",
          minor: rows
            .reduce((n, r) => n + BigInt(r.amountMinor), 0n)
            .toString(),
        },
        {
          label: "Confirmed allocations",
          minor: rows.reduce((n, r) => n + BigInt(r.paidMinor), 0n).toString(),
        },
        {
          label: "Credit notes",
          minor: rows
            .reduce((n, r) => n + BigInt(r.creditedMinor), 0n)
            .toString(),
        },
        {
          label: "Outstanding receivables",
          minor: rows
            .reduce((n, r) => n + BigInt(r.outstandingMinor), 0n)
            .toString(),
        },
      ];
  }
  if (f.kind === "receivables-aging")
    summary.unshift({
      label: "Total outstanding",
      minor: rows
        .reduce((n, r) => n + BigInt(r.outstandingMinor), 0n)
        .toString(),
    });
  const filtered = rows
    .filter(
      (r) =>
        (!f.search ||
          `${r.name} ${r.id}`.toLowerCase().includes(f.search.toLowerCase())) &&
        (!f.bucket || r.bucket === f.bucket),
    )
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  return {
    ...freshness(),
    kind: f.kind,
    currency: f.currency,
    from: f.from,
    to: f.to,
    items: filtered.slice((f.page - 1) * 6, f.page * 6),
    total: filtered.length,
    page: f.page,
    pages: Math.max(1, Math.ceil(filtered.length / 6)),
    summary,
    excludedUnconfirmed: transactions.filter(
      (t) => t.status !== "Completed" && inRange(dayInNairobi(t.date)),
    ).length,
    note:
      f.kind === "cash-movement"
        ? "Confirmed bank movements only; fees are not separately classified. Ledger opening is reconstructed from the current fixture balance and posted history."
        : f.kind === "receivables-aging"
          ? "Current issued receivables as of the fixture snapshot; historical aging is unavailable. Date filters do not restrict this snapshot."
          : "Issued invoices in the selected issue-date range, with their current confirmed allocations and credits. Allocations are not net bank cash or accounting revenue; refunds are separate cash events.",
    allRows: filtered,
  };
}
export function reportCsv(f: ReportFilters) {
  const r = selectReport(f);
  return {
    rowCount: r.allRows.length,
    csv:
      "\uFEFF" +
      [
        ["FURAIA MOCK REPORT — NOT CERTIFIED"],
        ["Kind", f.kind, "Currency", f.currency, "From", f.from, "To", f.to],
        [r.note],
        ...r.summary.map((s) => [s.label, s.minor + " minor units"]),
        [
          "Reference",
          "Name",
          "Date",
          "Status",
          "Rail",
          "Amount minor",
          "Allocated minor",
          "Credit minor",
          "Outstanding minor",
          "Aging bucket",
        ],
        ...r.allRows.map((x) => [
          x.id,
          x.name,
          x.date,
          x.status,
          x.rail,
          x.amountMinor,
          x.paidMinor,
          x.creditedMinor,
          x.outstandingMinor,
          x.bucket,
        ]),
      ]
        .map((row) => row.map(csvCell).join(","))
        .join("\r\n"),
  };
}
