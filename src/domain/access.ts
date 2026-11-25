import type { Permission, Role } from "../api/contracts";
export const rolePermissions: Record<Role, Permission[]> = {
  admin: [
    "billing:read",
    "billing:write",
    "banking:read",
    "statements:create",
    "reports:read",
    "reports:export",
    "payments:read",
    "payments:write",
    "payments:approve",
    "payments:execute",
    "cards:manage",
    "cards:reveal",
    "business:read",
    "business:manage",
    "onboarding:write",
    "team:read",
    "team:manage",
    "security:self",
    "security:manage",
  ],
  finance: [
    "billing:read",
    "billing:write",
    "banking:read",
    "statements:create",
    "reports:read",
    "reports:export",
    "payments:read",
    "payments:write",
    "payments:approve",
    "payments:execute",
    "cards:manage",
    "cards:reveal",
    "business:read",
    "security:self",
  ],
  developer: ["business:read", "team:read", "security:self"],
  viewer: [
    "reports:read",
    "payments:read",
    "billing:read",
    "banking:read",
    "business:read",
    "team:read",
    "security:self",
  ],
};
export function permissionsFor(
  role: Role,
  memberSandbox: boolean,
  businessSandbox: boolean,
): Permission[] {
  return [
    ...rolePermissions[role],
    ...((role === "admin" || role === "developer") &&
    memberSandbox &&
    businessSandbox
      ? ([
          "developer:read",
          "developer:manage",
          "developer:credentials",
          "developer:webhooks",
          ...(role === "admin" ? ["developer:production-request"] : []),
        ] as Permission[])
      : []),
  ];
}

export const permissionLabels: Record<Permission, string> = {
  "payments:read": "Read payments and beneficiaries",
  "payments:write": "Create beneficiaries and submit payments",
  "payments:approve": "Approve payments made by another member",
  "payments:execute": "Execute approved payments and inquire",
  "cards:reveal": "Reveal simulated card details",
  "cards:manage": "Manage debit cards and requests",
  "billing:read": "Read customers, quotations and invoices",
  "billing:write": "Manage billing documents and customers",
  "banking:read": "Read bank accounts and transactions",
  "statements:create": "Generate and download statements",
  "business:read": "Read business information",
  "business:manage": "Edit business profile",
  "onboarding:write": "Manage onboarding and account requests",
  "team:read": "View team",
  "team:manage": "Manage team access",
  "security:self": "Manage own mock sessions",
  "security:manage": "Edit sign-in policy",
  "reports:read": "Read currency-specific financial reports",
  "reports:export": "Generate and download report CSVs",
  "developer:manage": "Manage entitled sandbox applications",
  "developer:credentials": "Create, rotate and revoke sandbox credentials",
  "developer:webhooks": "Manage sandbox webhooks and delivery tests",
  "developer:production-request": "Request a separate production review",
  "developer:read": "Access developer sandbox",
};
