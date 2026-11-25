# Furaia Business Portal

React and strict TypeScript business portal using Vite, React Router, Tailwind CSS, TanStack Query, TanStack Table, React Hook Form, Zod and MSW.

## Source version

This complete **0.10.1** frontend includes onboarding, accounts, statements, contacts, quotations, invoices, checkout, payment options, OTP approvals, beneficiaries, cards, procurement, payroll, POS, lending preview, reports and permission-controlled developer tools.

New document workflows include template-based PDF downloads and printing, simulated email delivery and retries, receipt exports, demo tax QR references, external supplier invoice uploads, extraction and mandatory review, payment terms and due payables. Settings and sign out are available from the profile menu; approvals and templates use the settings area.

Financial, identity, provider, email and tax workflows remain simulated. Live M-Pesa deposits, withdrawals, B2C Hakikisha, KRA connections and staging verification remain pending backend work. Customer and internal operations applications are deferred.

## Requirements

- Node.js 22.12 or newer and npm.
- Git for repository uploads.
- Run commands from the directory containing package.json and package-lock.json.

## Start on Windows CMD

```cmd
npm ci --include=dev
if not exist .env.local copy .env.example .env.local
npm run dev -- --port 5180
```

Open http://localhost:5180/login. Keep the terminal open. The included Start-Furaia.cmd and Start-Furaia.ps1 install development dependencies and start the portal from their own directory.

## Development identities

| Role | Identifier | Challenge |
|---|---|---|
| Administrator | admin@business.sandbox | 246810 |
| Finance | finance@business.sandbox | 246810 |
| Developer fixture | developer@partner.sandbox | 246810 |
| Viewer | viewer@business.sandbox | 246810 |

These identities are development-only. OTP input uses the same challenge. The developer menu additionally requires the appropriate business/member entitlements. Finance cannot access Team & Approvals. A reload resets in-memory financial fixtures. Supplier uploads persist in local IndexedDB until the development reset is used; uncertain or lost payment references block duplicate payout attempts. Development tools include a shared scenario/reset control.

## Verification

```cmd
npm run typecheck
npm run lint
npm test
npx playwright install chromium
npm run test:e2e
npm run check:identity-contract
```

For a production build from CMD:

```cmd
set "VITE_API_MODE=real"
npm run build
npm run check:release
set "VITE_API_MODE="
```

Mock mode is blocked during production builds. Real mode calls the configured API and propagates failures rather than substituting fixtures.

## Configuration

.env.example contains development examples. .env.production contains only public build configuration for real API mode. Keep credentials out of all VITE_* variables: these variables are public browser configuration. Never commit private environment files, bearer tokens, refresh tokens, payment-provider credentials, certificates or private keys.

## Repository layout

- src/api: HTTP client and contracts.
- src/application: application hooks and services.
- src/domain: money, permissions, calculations and state rules.
- src/pages, src/components, src/app: routes, shared UI and application shell.
- src/mocks: development network handlers and stateful scenarios.
- e2e: browser journeys.
- docs: implementation status, contracts, integration register and test instructions.
- future-phases/previous-platform: archived source for later application work. It is not part of the active build.

See docs/PAGE_INVENTORY.md, docs/INTEGRATION_REGISTER.md, docs/MOCKS.md and docs/ROADMAP.md for detailed scope. Historical verification files describe their recorded runs; see docs/REPOSITORY_CHECKS.md for checks performed on this package.
