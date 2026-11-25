# Furaia dashboard platform — v0.11.0

Delivery objective: 63 primary pages and their documented workflows across three independent apps. Delivered batches include the shared identity foundation and Operations read workflows for accounts, transactions, holds, journals, collections, payouts, customers, onboarding and reconciliation, plus reports and verified CSV exports. D2f adds audit verification/export, staff access previews, adapter certification evidence, alert acknowledgement and personal governance preferences. D2g adds the source-derived Operations overview, per-source freshness/restrictions and scoped outbox evidence. Governed mutations and remaining surfaces follow the roadmap; route entries do not count as completion. Frontend checks exercise mocks. Real Laravel integration and staging verification remain pending.

## Windows PowerShell

Install Node.js 24 LTS, then extract the repository and open PowerShell in furaia-frontend:

```powershell
node --version
npm ci
npm run contracts:generate
npm run contracts:check
npm run typecheck
npm run lint
npm run test
npx playwright install chromium
npm run test:e2e
npm run build
npm run build:check
```

Run each application in its own PowerShell terminal:

```powershell
npm run dev:ops
```

```powershell
npm run dev:customer
```

```powershell
npm run dev:partner
```

Visit http://localhost:5173/ops, http://localhost:5174/app and http://localhost:5175/partners. Mock mode is explicitly configured in development; production uses real mode. Synthetic sign-in identifiers: Operations `operator@staff.sandbox`; Account Holder `customer@customer.sandbox`; Partner `developer@partner.sandbox`. Challenge for each: `246810`. Use the Session and access navigation entry to exercise D1b controls; its step-up simulator code is also `246810`. No registration, real SSO or financial workflow is claimed in this batch. A page reload resets the in-memory simulator session.

Independent builds:

```powershell
npm run build --workspace @furaia/ops
npm run build --workspace @furaia/customer
npm run build --workspace @furaia/partner
```

Deployable outputs require a configured /api gateway or an explicit VITE_API_BASE_URL override. They do not include mock data or mock workers.

## Project map

apps/ops, apps/customer, apps/partner: independent Vite apps.
packages/ui: customized shared controls and financial table foundation.
packages/contracts: generated API types and full route inventory.
packages/api: HTTP client, identity services, safe money utilities.
packages/platform: independently instantiated auth contexts and shells.
packages/mocks: deterministic MSW network handlers, development/tests only.
contracts/openapi.json: executable foundation slice and domain schema seeds.
docs/page-inventory.md + JSON: complete extracted pages/actions/acceptance.
docs/contract-register.md + JSON: all specified target endpoint dependencies.
docs/traceability.md: page/route/permission/batch coverage.
docs/architecture.md: decisions, gaps and complete workflow module inventory.
docs/roadmap.md: measurable batch exits and completion status.
docs/integration-guide.md: backend requirements and environment expectations.
docs/verification.md: actual observed checks and limitations.

## Reproducibility

Dependencies and generated API types are locked and committed. On intentional contract edits regenerate types and commit the diff. Production must never activate MSW or fall back to fixtures. Mock tests cannot prove actual backend authorization. Each subsequent related batch must update page status and actual test/staging evidence before moving to its dependent work.

D2a: open Accounts or Transactions in Operations. These mock read projections preserve integer money strings and UNKNOWN holds. See docs/D2a-Windows-Instructions.md and docs/traceability.md. Current expected suite: 63 API/component tests and 23 browser journeys.

D2b adds Holds and Ledger and journals read screens with independently authorized transaction/account links. Their exports and exceptional proposals remain scheduled; all 63 primary pages retain their documented objective. See docs/Browser-Quick-Start.md for URLs and simulator identities.


Current v0.5.0 adds Collections/Payouts read slices, sanitized rail evidence and mock PDF receipts. Holds/Journals include PROCESSING payout reservations and unmatched suspense entries. Verification: 76 API/component and 28 browser tests; see docs/verification.md. Full governed page workflows, real integration and staging remain pending. Apply the guarded D2c update with docs/D2c-Windows-Instructions.md; close Vite before installation.


D2d v0.6.0 adds masked Customers and Onboarding review read slices, consent/KYC history, quarantined evidence denial and independent document permissions. Full action workflows remain D5; real integration/staging pending. Windows installer/check commands: docs/D2d-Windows-Instructions.md. Dependency versions unchanged.


D2e v0.7.0 adds reconciliation read evidence, report catalog/close assessment and asynchronous financial/filtered-ledger CSV exports with action-bound verification, immutable retries and checksum verification. O10 ingestion/exception actions remain D5; O17 target CSV/report/assessment workflow is frontend complete against mocks. Integration/staging pending. Windows commands: docs/D2e-Windows-Instructions.md. No dependency changes.


D3a Account Holder journeys: open /app/register to create a synthetic profile/contact challenge, then /app/verification for policy draft/evidence/review/remediation and /app/accounts/open for reviewed zero-balance opening. Existing mock login customer@customer.sandbox/challenge246810 has no account or verified KYC automatically. Use synthetic files only. First synthetic review asks for updated address; resubmit the updated draft for server-controlled sandbox verification. The customer UI cannot mark VERIFIED. Recovery/closure/statement/support and money activity are assigned to later slices; the complete63-page objective remains open.

D3b1: /app/recovery supports anonymous contact continuation and server identity review before one-effect session restoration/revocation. Account detail now includes step-up closure requests and server approval/BLOCKED evidence. /app/profile shows masked contact and mandatory notices; edit/optional-consent workflows remain D3c. Statements/receipts are next D3b2. User-requested cards/homepage summaries are recorded in docs/cards-and-homepage.md for D4; no issued cards are fabricated.
