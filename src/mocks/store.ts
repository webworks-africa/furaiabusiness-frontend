import { resetDocuments } from "./documentStore";
import { resetEnterprise } from "./enterpriseStore";
import { resetPlatform } from "./platformStore";
import { resetPayments } from "./paymentStore";
import { resetCollections } from "./collectionStore";
import { resetBilling } from "./billingStore";
import { resetBusiness } from "./businessStore";
import type {
  Account,
  Scenario,
  Transaction,
  StatementJob,
  Role,
} from "../api/contracts";
export const fixedDate = "2026-10-21T08:00:00.000Z";
const accounts: Account[] = [
  {
    id: "acc_kes",
    name: "Primary KES Treasury Account",
    currency: "KES",
    maskedNumber: "0112 •••• •••• 9042",
    ledgerMinor: "1512040000",
    heldMinor: "27745000",
    availableMinor: "1484295000",
    status: "Active",
  },
  {
    id: "acc_usd",
    name: "USD Trade Account",
    currency: "USD",
    maskedNumber: "0224 •••• •••• 7012",
    ledgerMinor: "2540000",
    heldMinor: "40000",
    availableMinor: "2500000",
    status: "Active",
  },
];
const counterparties = [
  "Safaricom Telecommunications",
  "Amazon Web Services EMEA",
  "KRA iTax e-Slip",
  "Twiga Foods Supply Chain",
  "Nairobi Tech Hub Ltd",
  "Google Workspace & Cloud",
  "Kenya Power",
  "Regional Services Ltd",
  "Acacia Consulting",
  "Bluewater Logistics",
  "Mara Supplies",
  "East Africa Design",
];
export function freshTransactions(): Transaction[] {
  return counterparties.map((counterparty, i) => ({
    id: `TXN-${90240 - i}`,
    counterparty,
    accountId: "acc_kes",
    category: i % 2 || i === 6 ? "Supplier disbursement" : "Client payment",
    rail: i % 2 || i === 6 ? "Bank transfer" : "Collection",
    date: `2026-10-${String(21 - Math.floor(i / 2)).padStart(2, "0")}T07:30:00.000Z`,
    amountMinor:
      i === 0
        ? "45000000"
        : i === 6
          ? "-12540000"
          : String((i % 2 ? -1 : 1) * (12540000 + i * 10000)),
    currency: "KES",
    status: i === 6 ? "Pending confirmation" : i === 9 ? "Failed" : "Completed",
  }));
}
export type MockJob = {
  value: StatementJob;
  polls: number;
  failOnce: boolean;
  csv: string;
  rowCount: number;
};
export function allTransactions(): Transaction[] {
  const history: Transaction[] = Array.from({ length: 10 }, (_, i) => ({
    id: `TXN-HIST-${i + 1}`,
    accountId: "acc_kes",
    counterparty:
      i % 2 ? "Monthly vendor services" : "Monthly client collection",
    category: i % 2 || i === 6 ? "Supplier disbursement" : "Client payment",
    rail: i % 2 || i === 6 ? "Bank transfer" : "Collection",
    date: `2026-${String(5 + Math.floor(i / 2)).padStart(2, "0")}-15T08:30:00.000Z`,
    amountMinor: String(
      (i % 2 ? -1 : 1) * (i % 2 ? 130000000 : 220000000) + i * 1000000,
    ),
    currency: "KES",
    status: "Completed",
  }));
  const usd: Transaction[] = [
    {
      id: "TXN-USD-001",
      accountId: "acc_usd",
      counterparty: "Regional Export Customer",
      category: "Export collection",
      rail: "Bank transfer",
      date: "2026-10-14T09:00:00.000Z",
      amountMinor: "500000",
      currency: "USD",
      status: "Completed",
    },
    {
      id: "TXN-USD-002",
      accountId: "acc_usd",
      counterparty: "Cross-border Supplier",
      category: "Supplier disbursement",
      rail: "Bank transfer",
      date: "2026-10-13T09:00:00.000Z",
      amountMinor: "-125000",
      currency: "USD",
      status: "Completed",
    },
  ];
  return [...freshTransactions(), ...usd, ...history].sort(
    (a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id),
  );
}
export const db: {
  scenario: Scenario;
  role: Role;
  memberId: string | null;
  accounts: Account[];
  transactions: Transaction[];
  statements: Map<string, MockJob>;
  idempotency: Map<string, { body: string; id: string }>;
  nextStatementId: number;
} = {
  scenario: "normal",
  role: "admin",
  memberId: null,
  accounts: structuredClone(accounts),
  transactions: allTransactions(),
  statements: new Map(),
  idempotency: new Map(),
  nextStatementId: 1,
};
export function reset() {
  resetDocuments();
  resetEnterprise();
  db.memberId = null;
  resetPlatform();
  resetPayments();
  resetBusiness();
  resetBilling();
  resetCollections();
  db.scenario = "normal";
  db.role = "admin";
  db.accounts = structuredClone(accounts);
  db.transactions = allTransactions();
  db.statements.clear();
  db.idempotency.clear();
  db.nextStatementId = 1;
}
