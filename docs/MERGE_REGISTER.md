# Uploaded platform + Business integration — 24 October 2026

## Inspection and source preservation

Inspected the uploaded v0.11.0 monorepo, app entry points, package versions/lockfile, platform auth/login/HTTP services, OpenAPI/generated types, page inventory and test instructions before editing. Its partner implementation was a general integration surface; its Customer and Operations implementations are prior-phase source, not the approved Business shell. Business v0.7.0 already contains F1–F7 and meaningful financial-state tests.

The active root remains React/strict TypeScript/Vite with its pinned compatible dependency set; no second active framework, new dependency, upgrade or Node server was introduced. The uploaded monorepo source is preserved under future-phases/previous-platform, excluding dependencies, builds, test output, evidence screenshots and the Git bundle. PREVIOUS_SOURCE_MANIFEST.json lists SHA-256 hashes for every retained source file and the original archive. Its own package.json/lockfile remain unchanged and outside root builds/checks. Customer and Super Admin are deferred and inaccessible from Business. No previous code is silently discarded.

## Adopted and adapted

- Adopted uploaded LoginRequest/Session contract, partner boundary GET/POST/DELETE /partner/v1/sessions, identifier/challenge flow and split sign-in layout. The unchanged generated types and full supplied OpenAPI are retained.
- Adapted identity into the approved Business shell, query cache lifecycle, permission routes and existing business member projection. Session CSRF metadata is memory-only, sent on writes; cookies use credentials:include. Logout and expiry clear cache/identity and remask secret pages through unmount.
- /session remains the proposed Business permission/member projection after identity validation. This needs backend confirmation; a supplied contract is not evidence of an operational endpoint. Wrong-surface sessions, expired deadlines and missing active scope are rejected. No client role or mock marker authorizes a real API.
- Root /login is canonical. /partners and /partners/login bridge old entry links; developer application/credential/webhook/doc aliases map to Business destinations. Old generic partner quotas/settlement/registration/recovery are not claimed implemented by this merge.
- Preserved F1–F7 Business banking, onboarding, team, billing, collections, cards, reports and developer workflows. Retained black credit preview and temporary synthetic card disclosure.
- Incoming movements green (#166534), outgoing red (#b42318), with explicit labels, signs and unchanged outcome statuses. Available/held/ledger balances and unpaid receivables are neutral. Cashflow bars/legend/exact table share the same direction convention. Colour indicates direction, never proof of payment.
- Existing approvals now exercised through actual simulated logout/login as separate business members. Approval remains separate from execution; UNKNOWN never releases a hold or invites a duplicate attempt.

## Limits and next phase

Mock sign-in is not operational authentication/MFA or a secure session implementation. The mock challenge is fixed and non-secret; sessionStorage holds only a development role marker to resume a demo, never a real token. Fixture money and one-time secrets are memory-only. A browser reload resets financial state; switch members using Sign out/Sign in within the SPA to retain the original payment. The mock session has a 30-minute expiry; real idle/absolute deadlines, policy enforcement, rate limiting, BFF/CSRF, tenant binding, refresh and session revocation require backend integration. Credentials and card secrets must never be stored in browser persistence.

Next: complete F8 accessibility/performance/integration preparation, then Customer and Super Admin using the retained source. Neither AWS nor a completed backend is required to review mock Business journeys. No feature is API-integrated or staging-verified.
