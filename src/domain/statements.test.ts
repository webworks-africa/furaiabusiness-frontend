import { describe, it, expect } from "vitest";
import {
  statementFormSchema,
  statementBalances,
  statementRows,
  makeStatementCsv,
  csvCell,
} from "./statements";
import {
  transactionFiltersSchema,
  defaultFilters,
  dayInNairobi,
} from "./filters";
import { db } from "../mocks/store";
const input = {
  accountId: "acc_kes",
  from: "2026-10-01",
  to: "2026-10-21",
  format: "csv" as const,
  includeUnresolved: true,
};
describe("exact statement and filter rules", () => {
  it("rejects impossible dates, reversed ranges and overlong exports", () => {
    expect(
      statementFormSchema.safeParse({ ...input, from: "2026-02-31" }).success,
    ).toBe(false);
    expect(
      statementFormSchema.safeParse({ ...input, from: "2026-11-01" }).success,
    ).toBe(false);
    expect(
      statementFormSchema.safeParse({ ...input, from: "2024-01-01" }).success,
    ).toBe(false);
  });
  it("filters dates by EAT, not UTC date", () =>
    expect(dayInNairobi("2026-10-20T22:30:00.000Z")).toBe("2026-10-21"));
  it("rejects invalid transaction filter values and page numbers", () => {
    expect(
      transactionFiltersSchema.safeParse({ ...defaultFilters, status: "Paid" })
        .success,
    ).toBe(false);
    expect(
      transactionFiltersSchema.safeParse({ ...defaultFilters, page: 0 })
        .success,
    ).toBe(false);
  });
  it("statement closing equals opening plus completed movements only", () => {
    const a = db.accounts[0];
    const balances = statementBalances(
      a,
      db.transactions,
      input.from,
      input.to,
    );
    const rows = statementRows(db.transactions, input);
    const posted = rows
      .filter((t) => t.status === "Completed")
      .reduce((s, t) => s + BigInt(t.amountMinor), 0n);
    expect((BigInt(balances.opening) + posted).toString()).toBe(
      balances.closing,
    );
    expect(balances.closing).toBe(a.ledgerMinor);
    expect(rows.some((t) => t.status === "Pending confirmation")).toBe(true);
  });
  it("can exclude unresolved records without changing opening or closing balances", () => {
    const rows = statementRows(db.transactions, {
      ...input,
      includeUnresolved: false,
    });
    expect(rows.every((t) => t.status === "Completed")).toBe(true);
    expect(rows).toHaveLength(10);
  });
  it("CSV preserves references and makes unresolved posted movement zero", () => {
    const csv = makeStatementCsv(db.accounts[0], db.transactions, input);
    expect(csv).toContain('"TXN-90234"');
    expect(csv).toMatch(/"Pending confirmation","-?\d+","0"/);
    expect(csv).toContain("NOT CERTIFIED");
  });
  it("neutralizes spreadsheet formulas while preserving signed integer amounts", () => {
    const value = csvCell('=HYPERLINK("bad")');
    expect(value.startsWith('"' + "'" + "=")).toBe(true);
    expect(value).toContain('""bad""');
    expect(csvCell(" @SUM(A1)")).toContain("' @SUM");
    expect(csvCell("-125000")).toBe('"-125000"');
  });
  it("keeps large integer statement arithmetic exact", () => {
    const account = { ...db.accounts[0], ledgerMinor: "900719925474099312" };
    const values = statementBalances(account, [], input.from, input.to);
    expect(values.opening).toBe("900719925474099312");
    expect(values.closing).toBe(values.opening);
  });
});
