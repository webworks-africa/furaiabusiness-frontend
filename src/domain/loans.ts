import { scaled } from "./billing";
export function loanSchedule(
  principal: string,
  rate: string,
  months: number,
  firstDue: string,
) {
  const p = BigInt(principal);
  if (p <= 0n || !Number.isInteger(months) || months < 1 || months > 60)
    throw Error("Invalid loan terms");
  const first = new Date(firstDue + "T00:00:00Z");
  if (
    Number.isNaN(first.valueOf()) ||
    first.toISOString().slice(0, 10) !== firstDue
  )
    throw Error("Invalid due date");
  const interest = (p * scaled(rate, 2) + 5000n) / 10000n;
  let remaining = p;
  return Array.from({ length: months }, (_, i) => {
    const piece = i === months - 1 ? remaining : p / BigInt(months);
    remaining -= piece;
    const d = new Date(
      Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + i, 1),
    );
    const last = new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0),
    ).getUTCDate();
    d.setUTCDate(Math.min(first.getUTCDate(), last));
    return {
      date: d.toISOString().slice(0, 10),
      principalMinor: piece.toString(),
      interestMinor: interest.toString(),
      totalMinor: (piece + interest).toString(),
      paidMinor: "0",
    };
  });
}
