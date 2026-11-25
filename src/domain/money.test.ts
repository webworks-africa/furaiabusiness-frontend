import { describe, it, expect } from "vitest";
import { money, availableBalance } from "./money";
describe("exact financial display", () => {
  it("preserves amounts beyond JS safe integers", () =>
    expect(money("900719925474099312", "KES")).toBe(
      "KES 9,007,199,254,740,993.12",
    ));
  it("keeps held funds separate", () =>
    expect(availableBalance("1512040000", "27745000")).toBe("1484295000"));
  it("formats negative minor units without floats", () =>
    expect(money("-1", "USD")).toBe("–USD 0.01"));
  it("rejects decimal API amounts", () =>
    expect(() => money("1.25", "KES")).toThrow());
});
