import type {
  BillingDocument,
  Contact,
  DocumentFields,
} from "../api/billingContracts";
import { calculate } from "../domain/billing";
const at = "2026-10-21T08:00:00.000Z";
const names = [
  "Twiga Foods Supply Chain Ltd",
  "Safaricom Telecommunications",
  "Nairobi Tech Hub Ltd",
  "Cellulant Kenya Ltd",
  "East African Breweries Ltd",
  "Salam Life Insurance Kenya",
  "Acacia Consulting",
];
export const billing: {
  contacts: Contact[];
  documents: BillingDocument[];
  next: number;
  signers: Record<string, string>;
} = { contacts: [], documents: [], next: 100, signers: {} };
export function makeDocument(
  kind: "quotations" | "invoices",
  values: DocumentFields,
): BillingDocument {
  const customer = billing.contacts.find((c) => c.id === values.contactId)!;
  const id = `${kind === "quotations" ? "Q" : "INV"}-MOCK-${billing.next++}`;
  return {
    id,
    kind,
    version: 1,
    status: "Draft",
    values: structuredClone(values),
    customer: structuredClone(customer),
    totals: calculate(values.lines),
    snapshot: null,
    revisions: [],
    publicToken: null,
    linkedId: null,
    outstandingMinor: "0",
    events: [{ label: "Draft created", at }],
    asOf: at,
    stale: false,
  };
}
export function resetBilling() {
  billing.next = 100;
  billing.signers = {};
  billing.contacts = names.map((name, i) => ({
    id: `contact_${i + 1}`,
    version: 1,
    name,
    person: ["Peter Kamau", "Angela Mutua", "Kevin Onyamba"][i % 3],
    email: `billing${i + 1}@example.test`,
    address: "Demo Business Centre, Nairobi",
    termsDays: "30",
    archived: false,
  }));
  billing.documents = [];
  const values: DocumentFields = {
    contactId: "contact_1",
    currency: "KES",
    title: "Payment gateway integration & security review",
    date: "2026-10-21",
    until: "2026-11-20",
    notes: "Integration services and handover for the agreed project scope.",
    terms: "Payment due within 30 days of invoice issue.",
    lines: [
      {
        description: "Core payment gateway engine",
        quantity: "1",
        rate: "350000.00",
        discount: "0",
        tax: "16",
      },
      {
        description: "Enterprise security hardening",
        quantity: "1",
        rate: "150000",
        discount: "10",
        tax: "16",
      },
      {
        description: "Developer training and support",
        quantity: "1",
        rate: "55000",
        discount: "0",
        tax: "0",
      },
    ],
  };
  billing.documents.push(makeDocument("quotations", values));
  const inv = makeDocument("invoices", {
    ...values,
    title: "October support services",
    lines: [
      {
        description: "Monthly support",
        quantity: "1",
        rate: "30000",
        discount: "0",
        tax: "16",
      },
    ],
  });
  inv.status = "Outstanding";
  inv.outstandingMinor = inv.totals.totalMinor;
  inv.snapshot = {
    issuerName: "Webworks Africa Ltd",
    values: structuredClone(inv.values),
    customer: structuredClone(inv.customer),
    totals: structuredClone(inv.totals),
    at,
    revision: 1,
  };
  inv.revisions.push(structuredClone(inv.snapshot));
  inv.events.push({ label: "Immutable invoice version issued (fixture)", at });
  billing.documents.push(inv);
}
resetBilling();
