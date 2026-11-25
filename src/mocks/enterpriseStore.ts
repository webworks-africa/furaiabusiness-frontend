import type { z } from "zod";
import type {
  brandingSchema,
  mandateSchema,
  orderSchema,
  supplierSchema,
  lpoSchema,
  employeeSchema,
  payrollSchema,
  terminalSchema,
  saleSchema,
  loanSchema,
} from "../api/enterpriseContracts";
export const enterprise = {
  mandate: { version: 1, approvals: 1, foreignAccounts: true } as z.infer<
    typeof mandateSchema
  >,
  branding: {
    version: 1,
    template: "classic",
    logo: "",
    footer: "Thank you for your business.",
    accent: "forest",
  } as z.infer<typeof brandingSchema>,
  orders: [] as z.infer<typeof orderSchema>[],
  suppliers: [] as z.infer<typeof supplierSchema>[],
  lpos: [] as z.infer<typeof lpoSchema>[],
  employees: [] as z.infer<typeof employeeSchema>[],
  payroll: [] as z.infer<typeof payrollSchema>[],
  terminals: [] as z.infer<typeof terminalSchema>[],
  sales: [] as z.infer<typeof saleSchema>[],
  loans: [] as z.infer<typeof loanSchema>[],
  challenges: new Map<
    string,
    {
      orderId: string;
      memberId: string;
      version: number;
      expires: number;
      attempts: number;
      used: boolean;
    }
  >(),
  idempotency: new Map<string, { body: string; kind: string; id: string }>(),
  next: 1,
  registration: null as null | { email: string; name: string },
};
export function resetEnterprise() {
  enterprise.mandate = { version: 1, approvals: 1, foreignAccounts: true };
  enterprise.branding = {
    version: 1,
    template: "classic",
    logo: "",
    footer: "Thank you for your business.",
    accent: "forest",
  };
  for (const key of [
    "orders",
    "suppliers",
    "lpos",
    "employees",
    "payroll",
    "terminals",
    "sales",
    "loans",
  ] as const)
    enterprise[key].length = 0;
  enterprise.challenges.clear();
  enterprise.idempotency.clear();
  enterprise.next = 1;
  enterprise.registration = null;
}
