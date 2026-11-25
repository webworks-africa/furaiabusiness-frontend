import { it, expect } from "vitest";
import { toMinor, fromMinor, decimalAmount } from "./payments";
it("converts decimal amounts exactly without floating point", () => {
  expect(toMinor("0.29")).toBe("29");
  expect(toMinor("999999999999.99")).toBe("99999999999999");
  expect(toMinor("10.1")).toBe("1010");
  expect(fromMinor("12345")).toBe("123.45");
});
it("rejects zero, negatives, exponent notation and extra decimal precision", () => {
  for (const value of [
    "0",
    "0.00",
    "-1",
    "1e5",
    "12.345",
    "NaN",
    "",
    "9999999999999",
  ])
    expect(decimalAmount.safeParse(value).success).toBe(false);
});
