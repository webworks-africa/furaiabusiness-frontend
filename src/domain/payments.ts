import { z } from "zod";
export const decimalAmount = z
  .string()
  .trim()
  .regex(
    /^\d{1,12}(\.\d{1,2})?$/,
    "Enter an amount with up to two decimal places",
  )
  .refine(
    (v) =>
      /^\d+(\.\d{1,2})?$/.test(v) && BigInt(v.replace(".", "") || "0") > 0n,
    "Enter a positive amount",
  );
export function toMinor(value: string): string {
  const parsed = decimalAmount.parse(value);
  const [whole, fraction = ""] = parsed.split(".");
  return (BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"))).toString();
}
export function fromMinor(value: string): string {
  const n = BigInt(value);
  return `${n / 100n}.${(n % 100n).toString().padStart(2, "0")}`;
}
