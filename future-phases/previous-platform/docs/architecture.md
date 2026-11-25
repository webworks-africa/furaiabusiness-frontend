# Architecture and D0 decisions

One repository, npm workspaces, three independent Vite builds. `apps/ops`, `apps/customer`, `apps/partner` have distinct HTML entries, environment files and output directories. Development ports 5173, 5174, 5175; route namespaces /ops, /app, /partners. Public /developers routes belong to the partner build. The partner build must serve these public routes without requiring a human session. Production can use independent origins or a reviewed reverse proxy that maps each namespace to its corresponding build. No shared root dispatcher merges identity contexts.

Shared packages: `ui` owns styled accessible controls, status states and table primitives; `contracts` owns generated API types and the inventory; `api` owns transport and domain services; `platform` owns reusable identity mechanics and layouts instantiated independently; `mocks` owns MSW handlers and deterministic fixtures. Every app creates its own QueryClient and AuthProvider. Fixture imports are restricted to mocks and tests; product components call domain services.

All reads and writes use credentialed fetch through the HTTP client. API mode changes only network interception. Authenticated projection query keys include surface, principal, scope and environment. Logout and authorization loss clear the cache. Scope switch cancels requests and clears cache before applying the returned authorized context. Never infer permissions from a role label. Capabilities describe visible actions; backend domain authorization remains mandatory. Foundation navigation lists pending areas without claiming their workflows are implemented.

OpenAPI is authoritative for the executable D1 identity slice. Generated TypeScript types are committed; contract regeneration must produce no difference in CI. The full register preserves 141 page-to-endpoint dependencies from the document (including repeated endpoint use). Reserved shared domain schemas cover integer-string money, accounts, operation states, immutable cases, credentials, webhooks and exports. Later batches add endpoint request/response schemas and examples before feature implementation. No catch-all success response mocks.

Temporary visual palette: deep blue #132A36, teal #115E59, slate text #172F3C, background #F3F6F8, border #DCE3E8. This palette is an implementation assumption, not approved Furaia branding. Text wordmark only. System Segoe UI/Arial fallback; no font licensing or external CDN assumption. shadcn/ui button pattern customized with CVA, Radix Slot, contrast and 44px minimum targets. Tables use TanStack Table 8.21.3, a stable mature release verified with React 19; newer major APIs are unnecessary for this foundation. Charts are installed but not rendered until authoritative metrics answer a documented question.

## Product and contract gaps resolved for development

- Co-banking means internal operations; joint customer accounts, rewards, credit, FX and cross-border products remain outside this release.
- /developers pages are public, although counted in Partner's 23 pages; hosted within the independently built Partner app.
- Backend mapping cannot be performed without the separately developed repository. Target contracts and explicit unmapped status satisfy this frontend D0 adaptation; actual routes remain an integration gate.
- The specification omits staff session routes, scope-change payloads, the session projection and CSRF exchange. Target GET/POST/DELETE session routes, POST session/context, GET capabilities and GET shell-context are introduced for all three identity boundaries. These require backend agreement before integration.
- Namespace inconsistency is preserved deliberately: /ops/v1, /v1 and /partner/v1 are API prefixes, while /partners is the UI prefix.
- sandbox entitlement may precede full KYB only under approved server policy. Foundation fixture has explicit sandbox grants and no production grants; all production-switch attempts are denied.
- Several action permissions are absent from the listed capability registry. Traceability marks these as target extensions rather than inventing existing grants (disputes, integrations, alerts, business roles, beneficiary and sandbox controls).
- Mock human sessions are held only in memory in the mock network layer. Reload begins a new simulator session. This does not simulate HttpOnly cookie security, federated SSO, real MFA or challenge delivery; those remain integration requirements.
- Spec D1 contains deeper session-warning/recovery/step-up requirements. This delivery is D1a foundation. D1b hardening remains explicitly scheduled before dependent privileged workflows.

## Workflow modules to add by batch

D3: registration → contact verification → policy evidence draft → quarantined uploads → submission/review/remediation → eligible product → idempotent zero-balance account opening. Reads/profile/security/notifications/support include owned-resource details and exports.

D4: beneficiary validation → server preview → immutable confirmation → idempotent command → status inquiry. Transfers may complete; collection waits for authoritative receipt; payout may become UNKNOWN and retain held funds. No new-key resend on uncertain outcome. Poll 2–30 seconds while visible, honoring Retry-After.

D5: template-bound balanced preview → immutable proposal/digest → distinct checker decision with expected_version/reason → revalidation and execution → balanced case-linked journal. BLOCKED execution permits controlled exact retry, distinct from approval. Exception resolution is nonmonetary unless linked to a separately approved adjustment.

D6: partner registration/contact → organization/owner membership → policy KYB evidence/review → independent sandbox entitlement → status remediation. Public docs and runnable guides follow reviewed OpenAPI.

D7: sandbox app → bounded scopes → step-up → secret issuance once → rotation/expiry/revocation. Webhooks configure/challenge/subscribe → stable events → attempts/retries/dead-letter/replay. App, organization, role and environment restrictions govern all logs, usage and team changes.

D8: delegated customer onboarding and resource reads → partner R1 transactions → contract-scoped reconciliation/reports/commercial terms → reviewed production application → distinct staff approval/readiness gate → separate production credentials. No invented billing totals.

D9: business membership/account grants → immutable payment proposal → distinct business checker → funds/gate recheck → one financial effect. Last-owner and role-elevation policy enforced on server.


D3a additions: a separate Account Holder domain service, public customer-only registration boundary and customer-only protected verification/account routes. The shared HTTP client accepts browser-native multipart FormData without manually setting its Content-Type boundary; other writes remain JSON. Public continuation identity and registered customer profiles are handled at the network mock layer. Product components consume server policy, masked projections and actual workflow responses. Exact opening retry metadata uses guarded sessionStorage; credentials/PII/evidence stay out of browser storage. This is a target BFF contract, not evidence of real browser-cookie/anti-abuse/KYC/banking enforcement.

D3b1 adds customerLifecycleService for public owned recovery continuations, /v1/me and owned closure eligibility/request/detail. Shared customer write/context controllers abort and reject stale responses. Recovery remains outside protected routes until approved completion creates a customer session; the same auth invalidation clears earlier workspace caches. Closure reuses action-bound StepUpDialog with accounts.close.request and fresh server eligibility. Recovery, closure and account opening share domain records only inside the mock network layer. C05/C13 read masked profile projections independently of balance capability. Cards and recent operations remain explicit user extensions scheduled with their own typed issuer/activity services in D4.
