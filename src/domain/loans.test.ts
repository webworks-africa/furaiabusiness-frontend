import { it, expect } from "vitest";
import { loanSchedule } from "./loans";
it("flat monthly schedule preserves principal pennies and clamps month-end due dates", () => {
  const s = loanSchedule("100000", "1.5", 3, "2026-01-31");
  expect(s.map((r) => r.date)).toEqual([
    "2026-01-31",
    "2026-02-28",
    "2026-03-31",
  ]);
  expect(s.map((r) => r.principalMinor)).toEqual(["33333", "33333", "33334"]);
  expect(s.map((r) => r.interestMinor)).toEqual(["1500", "1500", "1500"]);
  expect(s.reduce((n, r) => n + BigInt(r.totalMinor), 0n)).toBe(104500n);
});
it("large principal arithmetic stays exact and invalid schedule terms are rejected", () => {
  const p = "9007199254740993";
  const s = loanSchedule(p, "0.01", 12, "2028-01-31");
  expect(s.reduce((n, r) => n + BigInt(r.principalMinor), 0n)).toBe(BigInt(p));
  expect(s[1].date).toBe("2028-02-29");
  expect(() => loanSchedule("1", "1", 0, "2026-01-01")).toThrow();
  expect(() => loanSchedule("1", "1", 1, "2026-02-31")).toThrow();
});
