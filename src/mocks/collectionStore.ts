import type {
  PaymentLink,
  Attempt,
  Credit,
  Refund,
} from "../api/collectionContracts";
import { billing } from "./billingStore";
import { db, fixedDate } from "./store";
export const collections: {
  links: PaymentLink[];
  attempts: Attempt[];
  credits: Credit[];
  refunds: Refund[];
  next: number;
  outcome: "pending" | "confirmed" | "failed";
  providerOutcomes: Record<string, "pending" | "confirmed" | "failed">;
} = {
  links: [],
  attempts: [],
  credits: [],
  refunds: [],
  next: 1,
  outcome: "pending",
  providerOutcomes: {},
};
export function resetCollections() {
  collections.links = [];
  collections.attempts = [];
  collections.credits = [];
  collections.refunds = [];
  collections.next = 1;
  collections.outcome = "pending";
  collections.providerOutcomes = {};
}
export function financials(id: string) {
  const d = billing.documents.find((d) => d.id === id)!;
  const payments = collections.attempts.filter(
    (p) => p.invoiceId === id && p.status === "Confirmed",
  );
  const sum = (items: { amountMinor: string }[]) =>
    items.reduce((n, x) => n + BigInt(x.amountMinor), 0n);
  const paid = sum(payments);
  const credited = sum(collections.credits.filter((c) => c.invoiceId === id));
  const refunded = sum(
    collections.refunds.filter(
      (c) => c.invoiceId === id && c.status === "Confirmed",
    ),
  );
  const due = BigInt(d.totals.totalMinor) - paid - credited;
  const credit = due < 0n ? -due : 0n;
  const reserved = sum(
    collections.refunds.filter(
      (c) => c.invoiceId === id && c.status === "Pending confirmation",
    ),
  );
  return {
    paid,
    credited,
    refunded,
    due: due > 0n ? due : 0n,
    customerCredit: credit - refunded,
    refundable: credit - refunded - reserved,
  };
}
export function updateInvoice(id: string) {
  const d = billing.documents.find((d) => d.id === id)!;
  const f = financials(id);
  d.outstandingMinor = f.due.toString();
  d.status =
    f.credited === BigInt(d.totals.totalMinor)
      ? "Credited"
      : f.due === 0n
        ? "Paid"
        : f.paid > 0n
          ? "Partially paid"
          : "Outstanding";
  d.version++;
  d.events.push({
    label: "Billing allocations updated; issued snapshot retained",
    at: fixedDate,
  });
  collections.links.filter((l) => l.invoiceId === id).forEach(updateLink);
}
export function updateLink(l: PaymentLink) {
  const d = billing.documents.find((d) => d.id === l.invoiceId)!;
  l.outstandingMinor = d.outstandingMinor;
  if (l.status !== "Revoked") {
    l.status =
      l.expires < fixedDate.slice(0, 10)
        ? "Expired"
        : d.outstandingMinor === "0"
          ? "Closed"
          : "Active";
  }
  return l;
}
export function postMovement(
  accountId: string,
  amount: bigint,
  reference: string,
  invoiceId: string,
) {
  const a = db.accounts.find((a) => a.id === accountId)!;
  a.ledgerMinor = (BigInt(a.ledgerMinor) + amount).toString();
  a.availableMinor = (BigInt(a.availableMinor) + amount).toString();
  db.transactions.unshift({
    id: reference,
    accountId,
    counterparty: billing.documents.find((d) => d.id === invoiceId)!.customer
      .name,
    category: amount > 0n ? "Invoice collection" : "Customer refund",
    rail: "Simulated collection",
    date: fixedDate,
    amountMinor: amount.toString(),
    currency: a.currency,
    status: "Completed",
  });
}
