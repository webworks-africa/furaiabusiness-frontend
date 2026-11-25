# Architecture decision — F1

2026-10-21. No existing repository, OpenAPI file, tests or backend source was supplied. The upload contains standalone Stitch HTML, PNGs and DESIGN.md; it is a design source, not an application. No existing application was replaced.

UI → application query hooks → typed HTTP client → `/api` target contract. MSW intercepts fetch at that exact boundary. Zod checks responses; contract errors surface as service errors and never substitute fixtures. Query owns fetched state; React local state owns navigation/search; RHF/Zod owns the development scenario form. TanStack Table renders transactions.

React strict TypeScript / Vite, React Router, Tailwind 4, a customized shadcn-style source-owned Button (Radix Slot/CVA, not a precompiled UI framework), Lucide, Query, Table, RHF/Zod, MSW, Vitest/RTL, Playwright. Package versions are exact and package-lock.json is committed. The resolver is v5 to avoid an observed optional-peer conflict in v6. Vite 7 / TS5.9 are deliberate compatible stable choices. No React Compiler is enabled; its incompatible-library advisory is disabled for TanStack Table. No server framework.

`src/app` provides the business shell and route boundaries; `src/components/ui` can be shared by future apps. Customer and operations apps are out of scope and absent. `src/pages` reads application hooks rather than fixtures. `src/mocks` owns all deterministic test data and mutations. No API secret, session secret or financial fixture is stored in localStorage.

## Design tokens and interpretation

Source: approved DESIGN.md and actual HTML/PNG. For the shell, the actual screenshots' pale green background (#ecf6f2) takes precedence over the specification prose's gray canvas. Primary #123c32, accent #d3ea87, text #141d1b, white panels, border #dbe5e1. Inter is bundled locally; no external font service. 248px sidebar, 64px header, 32px desktop margins, 24px panel padding, 12px panel radius, 6px controls, compact 13px body and 24px page titles. Table has horizontal scrolling, not page overflow. Mobile nav is hidden until opened and cannot receive focus while hidden.

F2 supplies the cashflow chart and read-only approval/receivable summaries; invoice actions, approval execution and live card controls remain in later batches. The design card keeps 1.586 aspect ratio, uses only masked digits and carries a preview label. No network logos, real PANs/CVVs, bank backing, rail availability or regulatory claims. Fixture dates are fixed to 21 October 2026 and business values are demo data, not verified records.

## Authentication boundary

AuthAdapter resolves `/session`; real mode expects a backend-managed Secure, HttpOnly cookie and authorization on every business resource. Backend must define login/SSO, session rotation, logout, expiry/renewal, CSRF protection for mutations, allowed origins and same-site policy. A BFF may be required for cross-origin/token-based upstream APIs. Frontend stores no bearer or refresh tokens. F1 has no operational login. Developer entitlements are independent from business membership; mock admin has sandbox read only, not production approval.

Error messages never echo raw API bodies, credentials or submitted values. Request IDs may be displayed later for support; current messages are generic. No unsafe HTML renderer or external redirect is implemented. Future public redirects must use backend-approved allowlists and server-confirmed outcomes. Redirects cannot prove settlement.


## F2 implementation decisions

No dependencies or frameworks were added or replaced. Existing exact dependency versions remain locked. New banking views extend the existing tokens and shell. F2 introduces account/transaction detail routes, URL-backed server filters, reusable freshness/status components, a native modal dialog and a source-owned accessible SVG chart backed by the same transaction data. Exact chart values are available as a semantic table; BigInt-to-Number conversion is used only after scaling bar lengths into bounded visual coordinates, never to calculate money.

Statements use RHF/Zod date validation, a stable request idempotency key and Query mutations. Their backend-proposed contract captures immutable snapshots; mocks advance queued jobs through deterministic polling ticks. The list/detail/retry share the same state. Native dialog handles focus containment/Escape and blocks closing while submission is in flight. Downloads use authenticated GET, verify CSV MIME, reject redirects and sanitize the local filename. No signed redirect target or secret is stored.

Account-table data is memoized to prevent TanStack Table resetting state repeatedly after query invalidation. Sort/filter state stays in React/RHF and transaction URL parameters, not copied server state. F2 filters dates by Africa/Nairobi calendar days, preserving query state when opening/returning from transaction detail. A route-state return target is restricted to internal banking routes.

Certified PDF, FX aggregation, tax/fee/attestation claims, dispatch proof and actual bank partnerships are deliberately unavailable without backend support. General report exports in F7 will extend the bank-statement job center instead of replacing it.

## F3 implementation decisions

No dependencies changed. F3 routes are lazy-loaded with Suspense inside the shared shell. Reusable Field, inline mutation feedback, version-conflict notice, settings navigation and audit list extend existing tokens. RHF/Zod keeps draft/form state; Query remains the source of saved server state. Multipart uploads pass through the same typed HTTP client (browser supplies the multipart Content-Type boundary); MSW intercepts that request without a page-local fake upload.

Business contracts are isolated in businessContracts.ts pending OpenAPI confirmation. Shared access.ts defines readable role scope labels and the role/member/business intersection for sandbox access. Backend-style mock guards validate every request, active member, permission and mutable version. Shell guards suppress banking routes for nonbanking members before rendering cached content. Effective session identity follows the selected fixture member rather than a hard-coded role. Production entitlement is false independently of onboarding approval.

The review/provisioning/acceptance simulators exist solely in development controls. Upload metadata and simulated audit records are deterministic; no document bytes, auth tokens or API secrets are persisted. AuthAdapter remains the integration seam; policy/session UI does not manufacture an operational identity provider. Team/payment approvals are separate future workflows.

## F4 implementation decisions

No dependencies/framework changes. Billing contracts, application hooks, exact calculation helper and stateful mock store/handlers are separate modules. Pages use the same typed HTTP client and Query boundary. Contact and document lists use a reusable TanStack Table with server-side filters/pagination; URL parameters preserve list filters. RHF/Zod and useFieldArray manage document line fields; a stable idempotency key protects draft creation. Version notices retain stale form edits rather than silently replacing them.

Billing routes are lazy. Authenticated pages use the same shell and billing permission guard; public quotation uses the minimal public shell without loading staff session/team/banking data. Public tokens are URL capabilities; no redirect or unsafe HTML is rendered. Accepted/shared/issued snapshots use structured copies, and only explicit Draft writes are allowed. The mock boundary calculates saved totals and state transitions; UI preview is advisory. New application scopes extend the readable Team matrix. Contact and overview receivables derive from the same issued invoices, without mutating banking fixtures. Existing payment pending/UNKNOWN rules are unchanged.

## F5 implementation decisions

No dependencies changed. Collection contracts/hooks/stateful handlers extend the same typed HTTP/MSW boundary. A separate collection store tracks links, attempts, immutable receipts, credits and refund reservations. Issued billing snapshots remain untouched; only settlement status/outstanding/version/event metadata changes. Confirmed mock events update the same bank/transaction store used by overview/accounts/statements, and Query invalidates related screens. All financial arithmetic uses BigInt. Client forms retain stable idempotency keys, rotate after successful new adjustment, and refetch conflicts without silent fallback.

Public checkout/result use the minimal shell and capability-scoped routes. They expose no phone/card/PIN fields or external redirects. Simulator UI is conditional on DEV+mock and its handlers are excluded from releases. Confirmation is driven by inquiry against the API, never browser query parameters. Authenticated billing guard covers links/receipts, while server-style mock guards independently check scopes. Backend session/capability/CSRF, approval and real authorization remain mandatory integration work.


Provider simulation extension: shared method labels and Kenyan phone normalization, typed attempt metadata, masked event records and per-attempt external outcomes reuse the existing HTTP/MSW boundary. Web Crypto hashes normalized phone only for in-memory idempotency matching. Raw numbers stay out of attempt/receipt records and logs. Approval/cancellation simulation and financial inquiry are separate state transitions; exact allocation remains centralized. No dependency was added.

## F6 payment and issuer boundaries

paymentContracts.ts defines proposed response/input schemas and new scopes; application/payments.ts supplies Query reads and typed mutations through request(). paymentStore/paymentHandlers own deterministic beneficiaries, payout lifecycle, cards, outcomes and scoped idempotency. No page contains fixture account/card/payment arrays. New routes are lazy loaded inside the existing shell. Lists reuse the TanStack BillingTable; payment/issuer forms use RHF/Zod, integer minor strings and BigInt decimal conversion. Native labelled inputs and shared Field associate validation errors programmatically.

Draft edit retains local values/version on conflict and offers explicit reload. Payout terms lock at submit. Network mock guard checks permission, active identity, version, balance and stage; approval/dispatch are different transitions. New held amounts are joined into account-detail holds; confirmed payout transactions flow into existing balances/overview/cashflow/statement selectors. Payout outcome setting is separate from inquiry and exactly-once mock posting. Historical F2 holds remain visible independently. Overview pending approvals now derive from the actual new payout store, replacing read-only sample approval rows.

Cards preserve the approved forest portfolio/detail hierarchy and aspect ratio; tablet cards stack when the sidebar narrows usable space. Versioned control settings cannot silently overwrite a changed card. Replacement, approval and issuer confirmation are separate events. Only last4 is ever generated; no real network/issuer secrets or partnership claims. New action scopes do not grant developer production access. The shell and HTTP mocks enforce the additional payments:read route boundary, though real backend authorization remains mandatory.

The DEV+mock payout and issuer simulators are dead-code excluded from production and scanned by check:release. No new dependencies/configuration were added. AuthAdapter and secure-cookie/BFF requirements are unchanged. Global card policy, live authorization/issuance, credit facility operations, real payout thresholds/fees/limits and verified-name matching remain backend dependencies. The design preview on Overview links to live mock card workflows in Cards.

## Card disclosure refinement — 0.6.1

BusinessCard.tsx owns the shared face/disclosure for portfolio and detail. The face restores black credit tokens and renders only masks unless a scoped development response exists. application/cardDetails.ts calls the typed HTTP client directly, intentionally outside Query/mutation caches. Local state is keyed by card/version/identity/permission/route; timers and lifecycle cleanup clear data and abort in-flight requests. The no-store mock handler enforces cards:reveal and state without adding details to fixtures or changing card/ledger state. Real mode disables the control; no production issuer contract/step-up implementation is fabricated. Print suppresses disclosures.

## F7 architecture

platformContracts.ts defines proposed Zod-derived contracts; application/platform.ts provides Query reads and typed HTTP writes; platformHandlers/platformStore/reportSelectors implement the same network boundary in MSW. Reports and Developers are lazy routes inside the existing shell. No dependency or framework replacement. Credential disclosure uses an abortable plain service outside Query/mutation caches and short-lived component state; list responses contain metadata only. Route guards supplement backend-style mock permission checks. All production bundles exclude MSW through the existing environment gate.

## Integrated Business authentication

The uploaded generated identity types and contract are retained. auth/adapter performs identity validation then loads the proposed Business member/permissions projection. CSRF metadata stays in auth/csrf memory; request sends it only on writes with included cookies. Shell guards deep links, reacts to unauthorized API responses/deadlines, clears Query caches and redirects to validated internal targets. Login secrets live only in the form until unmount. Public documents/checkout retain their anonymous minimal shell.

Development identity starts signed out. identityHandlers/store are MSW-only; main dynamically loads a non-secret mock role marker from sessionStorage only in development mock mode. Node tests explicitly initialize the mock session; existing authenticated browser fixtures explicitly seed this marker. New login browser tests use raw anonymous contexts and sign in through the UI. Production code has no sessionStorage identity authority. Future-phase source is outside active tsconfig/Vitest/ESLint/build scope.

## Expansion contracts and shared financial state

enterpriseContracts.ts and application/enterprise.ts define the proposed tools boundary. New MSW enterpriseHandlers/store share paymentStore payouts and account/transaction state, so holds, confirmed debits, payroll, POS receipts and loan movements propagate into existing banking/report selectors. New pages are lazy-loaded. UI tables share TanStack Table, forms use RHF/Zod, and decimal calculations use the existing exact-money domain helpers. Loan schedules live in domain/loans.ts.

OTP services bypass mutation caching, redact codes in replay metadata and bind challenges to member/order/version/expiry/attempts. Each order snapshots the required count. Final authorization and dispatch are separate events even when automatic. Invoice branding and per-draft layout are captured in immutable issue/share snapshots. Salary/lending workspace reads require financial write permission; Finance cannot read Team. A separate minimal cardholder projection preserves card requests. Existing manual payout contracts remain for historical migration regression only; all new sends use payment-orders. Backend must close legacy mutation bypasses when enforcing the real mandate.

Public developer documentation has its own minimal header and no private-session dependency. Signup is an explicit development-only initializer, followed by the existing onboarding API; real registration/contact verification needs a confirmed contract. No project dependency was added or upgraded.
