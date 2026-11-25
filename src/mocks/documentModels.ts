import type { FinancialDocument } from "../api/documentContracts";
import { financialDocumentSchema } from "../api/documentContracts";
import { snapshotDocument, receiptDocument } from "../documents/models";
import { billing } from "./billingStore";
import { enterprise } from "./enterpriseStore";
import { business } from "./businessStore";
import { collections } from "./collectionStore";
import { documents } from "./documentStore";
import { scaled } from "../domain/billing";
const issuer = () => ({
  name: business.profile.values.displayName,
  address: business.profile.values.operatingAddress,
  email: business.profile.values.contactEmail,
  phone: business.profile.values.phone,
});
export function documentModel(
  kind: FinancialDocument["kind"],
  id: string,
): FinancialDocument | null {
  if (kind === "receipt") {
    const receipt = collections.attempts
      .flatMap((p) =>
        p.status === "Confirmed" && p.receipt ? [p.receipt] : [],
      )
      .find((r) => r.id === id);
    return receipt ? receiptDocument(receipt) : null;
  }
  if (kind === "lpo") {
    const l = enterprise.lpos.find((x) => x.id === id);
    if (!l) return null;
    return financialDocumentSchema.parse({
      kind,
      id,
      revision: l.version,
      status: l.status,
      date: l.values.date,
      due: l.values.deliveryDate,
      currency: "KES",
      issuer:
        l.issuerDetails ??
        (l.status === "Draft"
          ? issuer()
          : {
              name: business.profile.values.displayName,
              address: "",
              email: "",
              phone: "",
            }),
      recipient: {
        name: l.supplier.name,
        email: l.supplier.email,
        address: l.supplier.address,
      },
      template: "classic",
      accent: "forest",
      logo: "",
      footer: "Thank you for your business.",
      ...(l.branding ?? (l.status === "Draft" ? enterprise.branding : {})),
      lines: l.values.lines.map((v, i) => ({
        description: v.description,
        quantity: v.quantity,
        rateMinor: scaled(v.rate, 2).toString(),
        discount: v.discount,
        tax: v.tax,
        totalMinor: l.totals.lines[i].totalMinor,
      })),
      subtotalMinor: l.totals.grossMinor,
      discountMinor: l.totals.discountMinor,
      taxMinor: l.totals.taxMinor,
      totalMinor: l.totals.totalMinor,
      balanceMinor: l.totals.totalMinor,
      notes: l.values.notes,
      terms:
        "Supply only against this purchase order. Quote this LPO on your supplier invoice. Issuing an LPO does not move funds.",
      relatedReference: "",
      paymentReference: "",
      tax: { status: "Not connected", reference: "", label: "", qrPayload: "" },
    });
  }
  const d = billing.documents.find(
    (x) =>
      x.id === id &&
      x.kind === (kind === "invoice" ? "invoices" : "quotations"),
  );
  if (!d) return null;
  const s =
    d.status === "Draft"
      ? {
          issuerName: issuer().name,
          issuerDetails: issuer(),
          branding: {
            ...enterprise.branding,
            template: d.appearance?.template ?? enterprise.branding.template,
          },
          revision: d.version,
          at: d.asOf,
          values: d.values,
          totals: d.totals,
          customer: d.customer,
        }
      : d.snapshot;
  if (!s) return null;
  const m = snapshotDocument(s, d.id, d.status, kind);
  m.balanceMinor = d.outstandingMinor;
  const tax = documents.tax.find((t) => t.documentId === id);
  if (kind === "invoice" && tax)
    m.tax = {
      ...tax,
      qrPayload: `FURAIA-DEMO|${id}|${tax.reference}`,
      label: "Demo eTIMS document reference",
    };
  return financialDocumentSchema.parse(m);
}
