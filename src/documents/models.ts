import type { BillingDocument } from "../api/billingContracts";
import type { Receipt } from "../api/collectionContracts";
import type { FinancialDocument } from "../api/documentContracts";
import { scaled } from "../domain/billing";
const defaults = {
  template: "classic" as const,
  accent: "forest" as const,
  logo: "",
  footer: "Thank you for your business.",
};
const noTax = {
  status: "Not connected" as const,
  reference: "",
  qrPayload: "",
  label: "",
};
export function snapshotDocument(
  s: NonNullable<BillingDocument["snapshot"]>,
  id: string,
  status: string,
  kind: "invoice" | "quotation",
): FinancialDocument {
  return {
    kind,
    id,
    status,
    revision: s.revision,
    date: s.values.date,
    due: s.values.until,
    currency: s.values.currency,
    issuer: {
      name: s.issuerName,
      address: "",
      email: "",
      phone: "",
      ...s.issuerDetails,
    },
    recipient: {
      name: s.customer.name,
      email: s.customer.email,
      address: s.customer.address,
    },
    ...defaults,
    ...s.branding,
    lines: s.values.lines.map((l, i) => ({
      description: l.description,
      quantity: l.quantity,
      rateMinor: scaled(l.rate, 2).toString(),
      tax: l.tax,
      discount: l.discount,
      totalMinor: s.totals.lines[i].totalMinor,
    })),
    subtotalMinor: s.totals.grossMinor,
    discountMinor: s.totals.discountMinor,
    taxMinor: s.totals.taxMinor,
    totalMinor: s.totals.totalMinor,
    balanceMinor: s.totals.totalMinor,
    notes: s.values.notes,
    terms: s.values.terms,
    relatedReference: "",
    paymentReference: "",
    tax:
      kind === "invoice"
        ? {
            ...noTax,
            qrPayload: `FURAIA-DEMO|${id}|ETIMS-NOT-CONNECTED`,
            label: "Document reference - eTIMS not connected",
          }
        : noTax,
  };
}
export function receiptDocument(r: Receipt): FinancialDocument {
  return {
    kind: "receipt",
    id: r.id,
    status: "Confirmed payment",
    revision: 1,
    date: r.at.slice(0, 10),
    due: "",
    currency: r.currency,
    issuer: {
      name: r.issuer,
      address: "",
      email: "",
      phone: "",
      ...r.issuerDetails,
    },
    recipient: { name: r.customer, email: "", address: "" },
    ...defaults,
    ...r.branding,
    lines: [],
    subtotalMinor: r.amountMinor,
    discountMinor: "0",
    taxMinor: "0",
    totalMinor: r.amountMinor,
    balanceMinor: r.balanceDueMinor,
    notes: `Payment method: ${r.method.toUpperCase()}\nProvider reference: ${r.providerReference}${r.maskedPhone ? "\nMobile: " + r.maskedPhone : ""}`,
    terms:
      "Confirmed allocation receipt. Credits and refunds are separate events.",
    relatedReference: r.invoiceId,
    paymentReference: r.paymentId,
    tax: {
      ...noTax,
      qrPayload: `FURAIA-DEMO-RECEIPT|${r.id}|${r.paymentId}`,
      label: "Receipt reference - demo",
    },
  };
}
