import { it, expect } from "vitest";
import { calculate, scaled } from "./billing";
import { documentFields, lineSchema, type Line } from "../api/billingContracts";
const line: Line = {
  description: "Service",
  quantity: "1",
  rate: "100.00",
  discount: "0",
  tax: "16",
};
it("uses exact decimal quantity and half-up line rounding", () => {
  expect(
    calculate([{ ...line, quantity: "0.125", rate: "0.04", tax: "0" }])
      .totalMinor,
  ).toBe("1");
  expect(scaled("3500.5", 2)).toBe(350050n);
});
it("discount is rounded before net tax, per line", () => {
  expect(
    calculate([{ ...line, quantity: "1", rate: "150000", discount: "10" }]),
  ).toMatchObject({
    grossMinor: "15000000",
    discountMinor: "1500000",
    netMinor: "13500000",
    taxMinor: "2160000",
    totalMinor: "15660000",
  });
});
it("keeps values above safe Number integers exact", () => {
  expect(
    calculate([
      { ...line, quantity: "999999.999", rate: "999999999999.99", tax: "0" },
    ]).totalMinor,
  ).toBe("99999999899999000000");
});
it("sums rounded lines instead of rounding a combined floating number", () => {
  const item = { ...line, rate: "0.03", tax: "16" };
  expect(calculate([item, item]).taxMinor).toBe("0");
  expect(calculate([{ ...item, quantity: "2" }]).taxMinor).toBe("1");
});
it("handles full discount and explicit zero tax", () => {
  expect(calculate([{ ...line, discount: "100" }]).totalMinor).toBe("0");
  expect(calculate([{ ...line, tax: "0" }]).totalMinor).toBe("10000");
});
it("rejects scientific notation, negatives, excessive precision and percent bounds", () => {
  for (const change of [
    { quantity: "0" },
    { quantity: "1e3" },
    { rate: "-1" },
    { rate: "0.001" },
    { quantity: "1.0001" },
    { discount: "100.01" },
    { tax: "101" },
  ])
    expect(lineSchema.safeParse({ ...line, ...change }).success).toBe(false);
  expect(() => scaled("0.001", 2)).toThrow();
});
it("rejects invalid calendar dates and reversed validity", () => {
  const v = {
    contactId: "one",
    currency: "KES",
    title: "Example",
    date: "2026-02-30",
    until: "2026-11-20",
    notes: "",
    terms: "",
    lines: [line],
  };
  expect(documentFields.safeParse(v).success).toBe(false);
  expect(
    documentFields.safeParse({ ...v, date: "2026-10-21", until: "2026-10-20" })
      .success,
  ).toBe(false);
});
