# Integrated Business delivery — 0.8.0

24 October 2026. The active application combines the approved F1–F7 Business workflows with an adapted sign-in entry from the uploaded previous platform. It remains mock-complete only. Customer and Super Admin are deferred.

## Changes

- Sign-in identifier/challenge validation, temporary challenge visibility, safe original-route continuation, role-specific identity, protected routes, sign-out and session expiry. Public checkout/documents remain anonymous.
- Existing uploaded partner identity OpenAPI/types retained, checked for snapshot integrity and adapted to the proposed Business member/permission projection. Required verification, wrong surface and missing business scope cannot enter. CSRF stays in memory and accompanies writes; real cookies/BFF/IdP remain dependencies.
- Outgoing amounts red and confirmed incoming amounts green across cash activity, transactions/details, payments/approvals, card spend, allocations, refunds, receipts and reports. Labels, signs and statuses remain explicit. Balances/limits/unpaid receivables/credits are neutral. Pending incoming attempts remain neutral.
- Realistic mock maker/checker journey across separate sign-ins. Submission reserves funds; approval does not execute; UNKNOWN retains its reference/hold; confirmation posts once. Existing rejection/cancellation and independent refund flows retained.
- Black credit preview, Show/Hide disclosure and all previous Business features retained.
- 156 prior source/config/test/document files retained with original hashes in future-phases; Customer/Operations code is not part of the active build and is not claimed newly tested. Browser evidence, dependencies and build artifacts excluded.
- Complete package with lockfile, Start-Furaia.ps1, Verify-Furaia.ps1, README, merge register, page inventory, contracts, mocks/reset and backend checklist.

## Limits

No real login/MFA/SSO, financial rail, issuer, production API entitlement or backend integration is claimed. Mock role resume is development-only; switching users via Sign out/Sign in preserves in-memory payment records, while a full reload resets financial fixtures. Real secure session policy/refresh/revocation and durable business storage require backend support. The broader F8 accessibility/performance/integration review remains open.
