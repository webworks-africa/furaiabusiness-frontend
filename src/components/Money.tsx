import { money } from "../domain/money";
export type FlowDirection = "incoming" | "outgoing" | "signed" | "neutral";
export function moneyClass(minor: string, direction: FlowDirection = "signed") {
  const n = BigInt(minor);
  return n === 0n || direction === "neutral"
    ? "money-neutral"
    : direction === "outgoing" || (direction === "signed" && n < 0n)
      ? "money-outgoing"
      : "money-incoming";
}
export function Money({
  minor,
  currency,
  direction = "signed",
}: {
  minor: string;
  currency: string;
  direction?: FlowDirection;
}) {
  return (
    <span
      className={moneyClass(minor, direction)}
      data-flow={
        direction === "signed"
          ? BigInt(minor) < 0n
            ? "outgoing"
            : BigInt(minor) > 0n
              ? "incoming"
              : "neutral"
          : direction
      }
    >
      {money(minor, currency)}
    </span>
  );
}
