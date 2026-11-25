// API amounts are integer minor-unit decimal strings. Never coerce them to Number.
export function money(minor: string, currency: string): string {
  if (!/^-?\d+$/.test(minor) || !/^[A-Z]{3}$/.test(currency))
    throw new Error("Invalid money");
  const amount = BigInt(minor);
  const absolute = amount < 0n ? -amount : amount;
  const whole = (absolute / 100n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${amount < 0n ? "–" : ""}${currency}\u00a0${whole}.${(absolute % 100n).toString().padStart(2, "0")}`;
}
export function availableBalance(ledger: string, held: string): string {
  return (BigInt(ledger) - BigInt(held)).toString();
}
