import { z } from "zod";
import type { Account, StatementRequest, Transaction } from "../api/contracts";
import { statementRequestSchema } from "../api/contracts";
import { dateInput, dayInNairobi } from "./filters";
export const statementFormSchema = statementRequestSchema
  .extend({
    from: dateInput.refine((v) => v !== "", "From date is required"),
    to: dateInput.refine((v) => v !== "", "To date is required"),
  })
  .refine((v) => v.from <= v.to, {
    message: "From date must be on or before To date",
    path: ["to"],
  })
  .refine((v) => (Date.parse(v.to) - Date.parse(v.from)) / 86400000 <= 365, {
    message: "Choose a range of at most 366 days",
    path: ["to"],
  });
export type StatementForm = z.infer<typeof statementFormSchema>;
export function statementRows(
  transactions: Transaction[],
  request: StatementRequest,
) {
  return transactions
    .filter(
      (t) =>
        t.accountId === request.accountId &&
        dayInNairobi(t.date) >= request.from &&
        dayInNairobi(t.date) <= request.to &&
        (request.includeUnresolved || t.status === "Completed"),
    )
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}
export function statementBalances(
  account: Account,
  transactions: Transaction[],
  from: string,
  to: string,
) {
  const completed = transactions.filter(
    (t) => t.accountId === account.id && t.status === "Completed",
  );
  const afterStart = completed
    .filter((t) => dayInNairobi(t.date) >= from)
    .reduce((sum, t) => sum + BigInt(t.amountMinor), 0n);
  const period = completed
    .filter((t) => dayInNairobi(t.date) >= from && dayInNairobi(t.date) <= to)
    .reduce((sum, t) => sum + BigInt(t.amountMinor), 0n);
  const opening = BigInt(account.ledgerMinor) - afterStart;
  return {
    opening: opening.toString(),
    closing: (opening + period).toString(),
  };
}
export function csvCell(value: string) {
  const safe =
    /^[=+@\-\t\r\n]/.test(value.trimStart()) && !/^-?\d+(\.\d+)?$/.test(value)
      ? `'${value}`
      : value;
  return `"${safe.replaceAll('"', '""')}"`;
}
export function makeStatementCsv(
  account: Account,
  all: Transaction[],
  request: StatementRequest,
) {
  const rows = statementRows(all, request);
  const balances = statementBalances(account, all, request.from, request.to);
  const data = [
    ["FURAIA MOCK STATEMENT — NOT CERTIFIED"],
    ["Account", account.maskedNumber],
    ["Currency", account.currency],
    ["From", request.from, "To", request.to, "Timezone", "Africa/Nairobi"],
    ["Opening ledger (minor units)", balances.opening],
    ["Closing ledger (minor units)", balances.closing],
    [
      "Unresolved amounts do not change the ledger. All amounts are integer minor units.",
    ],
    [],
    [
      "Reference",
      "Date (EAT)",
      "Counterparty",
      "Rail",
      "Status",
      "Amount minor",
      "Posted movement minor",
    ],
    ...rows.map((t) => [
      t.id,
      dayInNairobi(t.date),
      t.counterparty,
      t.rail,
      t.status,
      t.amountMinor,
      t.status === "Completed" ? t.amountMinor : "0",
    ]),
  ];
  return "\uFEFF" + data.map((row) => row.map(csvCell).join(",")).join("\r\n");
}
