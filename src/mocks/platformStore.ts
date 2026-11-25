import type { z } from "zod";
import type {
  DeveloperApp,
  Credential,
  Webhook,
  Delivery,
  ReportExport,
  productionSchema,
  logSchema,
} from "../api/platformContracts";
const at = "2026-10-21T08:00:00.000Z";
const initial = () => ({
  apps: [
    {
      id: "APP-SBX-001",
      version: 1,
      name: "Webworks Commerce Gateway",
      description: "Demo billing and account reconciliation integration",
      scopes: [
        "accounts:read",
        "transactions:read",
        "invoices:read",
        "payments:read",
      ],
      status: "Active",
      environment: "Sandbox",
      createdAt: at,
    },
  ] as DeveloperApp[],
  credentials: [] as Credential[],
  webhooks: [] as Webhook[],
  deliveries: [] as Delivery[],
  production: [] as z.infer<typeof productionSchema>[],
  logs: [
    {
      id: "REQ-MOCK-001",
      appId: "APP-SBX-001",
      method: "GET",
      path: "/proposed/accounts",
      status: 200,
      at,
      detail:
        "Synthetic sample only; no credential, IP, request body or customer data retained.",
    },
  ] as z.infer<typeof logSchema>[],
  exports: new Map<
    string,
    { value: ReportExport; csv: string; polls: number; failOnce: boolean }
  >(),
  idempotency: new Map<string, { body: string; id: string; type: string }>(),
  next: 1,
});
export const platform = initial();
export function resetPlatform() {
  Object.assign(platform, initial());
}
