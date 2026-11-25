import type { Line } from "../api/billingContracts";
// Decimal parsing and arithmetic stay exact. Round half up at each documented line stage.
export function scaled(value: string, places: number): bigint {
  if (!new RegExp("^\\d+(?:\\.\\d{1," + places + "})?$").test(value))
    throw new Error("Invalid decimal");
  const [whole, fraction = ""] = value.split(".");
  return (
    BigInt(whole) * 10n ** BigInt(places) + BigInt(fraction.padEnd(places, "0"))
  );
}
const rounded = (numerator: bigint, denominator: bigint) =>
  (numerator + denominator / 2n) / denominator;
export function calculate(lines: Line[]) {
  const results = lines.map((l) => {
    const gross = rounded(scaled(l.quantity, 3) * scaled(l.rate, 2), 1000n);
    const discount = rounded(gross * scaled(l.discount, 2), 10000n);
    const net = gross - discount;
    const tax = rounded(net * scaled(l.tax, 2), 10000n);
    return {
      grossMinor: gross.toString(),
      discountMinor: discount.toString(),
      netMinor: net.toString(),
      taxMinor: tax.toString(),
      totalMinor: (net + tax).toString(),
    };
  });
  const sum = (key: keyof (typeof results)[number]) =>
    results.reduce((v, l) => v + BigInt(l[key]), 0n).toString();
  return {
    grossMinor: sum("grossMinor"),
    discountMinor: sum("discountMinor"),
    netMinor: sum("netMinor"),
    taxMinor: sum("taxMinor"),
    totalMinor: sum("totalMinor"),
    lines: results,
  };
}
