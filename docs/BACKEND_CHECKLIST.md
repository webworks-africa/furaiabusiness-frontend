> Current 0.10.1 additions and verification: [Restoration register](RESTORATION_REGISTER.md). Historical batch details below remain for context.

# Backend integration checklist

- [ ] Confirm API-01–API-13, permissions and business tenancy against actual backend; import its versioned OpenAPI source and generate TS types instead of treating proposals as final.
- [ ] Agree secure session/BFF, CSRF, CORS, logout/expiry and request-correlation behavior. Keep secrets out of browser storage/logs.
- [ ] Enable real mode against a local/test backend first; verify non-2xx and schema failures do not trigger fixtures.
- [ ] Server-authorize every read and write, object ownership and production entitlement. Frontend checks are usability only.
- [ ] Define authoritative totals, exact quantity/rate rounding, currencies and integer minor units. Do not move balances from invoice issue events.
- [ ] Test immutable issued versions, linked quote conversion, partial allocations, credit note vs refund separation, and pending/UNKNOWN preservation.
- [ ] Test idempotency, separate approval/execution, holds and inquiry before uncertain-payment retry.
- [ ] Verify reveal-once secrets and credential rotation/revocation; never persist secrets to browser storage. Verify webhook delivery attempts/failures.
- [ ] Validate all public redirect targets; browser redirect must never mark an invoice paid.
- [ ] Verify statement/export download authorization, signed-URL expiry and data scoping.
- [ ] Run real-backend contract/browser checks and record endpoint/schema version, evidence and date before marking API-integrated.
- [ ] Run deployed staging checks with real session/rails as authorized, accessibility review and full journey tests before marking staging-verified.


## F2 additions before real integration

- [ ] Confirm F2 wrappers and accountId on transactions; replace proposed Zod-derived TS contracts with generated types from confirmed OpenAPI.
- [ ] Confirm statement snapshot isolation, exact period opening/closing balances, read-only scope, inclusion of unresolved records and cursor/pagination semantics.
- [ ] Enforce export permissions, tenant ownership and CSRF server-side for create/retry; reject conflicting idempotency-key reuse.
- [ ] Drive generation in a real backend worker; mock request ticks are not a scheduler. Confirm retry concurrency and audit history.
- [ ] Enforce expiry at download time; validate MIME/disposition and error handling. Client currently accepts authenticated CSV and refuses redirects.
- [ ] Confirm certified PDF rendering/attestation, supported formats and any official statements/rail claims before enabling those capabilities.
- [ ] Apply spreadsheet-formula protection to real CSV text values; mock CSV escaping is not a substitute for server-side export sanitation.


## F3 additions before real integration

- [ ] Confirm API-14–API-24, business/member IDs, role scopes, team/activity pagination and version/conflict semantics from OpenAPI.
- [ ] Confirm jurisdiction/entity/representative/beneficial-owner fields, checklist/declaration requirements and immutable submission/review snapshots.
- [ ] Enforce file limits before buffering; quarantine/scan/encrypt uploaded evidence with tenant-authorized retention/download/delete policies. Current magic-header mock checks are insufficient for production.
- [ ] Connect authoritative review events, account eligibility and separately idempotent provisioning; no approval creates funds or production API access.
- [ ] Implement invitation delivery/acceptance tokens, expiry/revocation, resend limits, anti-enumeration and cross-tenant negative tests. No emails were sent by this frontend.
- [ ] Enforce last-admin/self-lockout policy and immediate permission/session invalidation server-side; keep member sandbox, business eligibility and production application approval separate.
- [ ] Connect real MFA enrollment/recovery, idle-session enforcement and scoped revocation/current-session logout via the secure session adapter/BFF; replace all mock policy labels.
- [ ] Validate stale writes, duplicate account requests, concurrent membership changes and replayed external review/provisioning events against the actual backend.


## F4 additions before real integration

- [ ] Inspect existing backend business-finance/OpenAPI contracts and replace/map API-25–API-32 proposals; generate types, retain runtime response validation and confirm versions.
- [ ] Confirm numbering, precision, rounding, tax basis/classification, due/validity dates, currencies and issuer/customer snapshot fields. Enforce all totals server-side.
- [ ] Prove immutable share/accepted/issued versions and conversion uniqueness atomically; concurrency/idempotency must be backend enforced, not just UI guarded.
- [ ] Bind recipient tokens to the correct revision/customer, store capabilities securely, enforce expiry/revocation/origin/anti-abuse and remove them from logs/referrers/error reports. Confirm evidence/legal-signature requirements.
- [ ] Connect real dispatch/outbox and preserve delivery/acceptance as different events; never treat a generated link as a sent email.
- [ ] Derive receivables from issued documents, never bank balances. F5 must allocate only confirmed payments; test partial/pending/UNKNOWN, credit-note and refund events independently.
- [ ] Implement real contact/autocomplete pagination, business ownership and issue/convert scopes; test viewer/developer/other-tenant negative requests.
- [ ] Enable fiscal/PDF/export/withholding/credit-limit features only after confirmed contracts; these controls are not implemented in F4.


## F5 integration requirements

- [ ] Map API-33–API-38 to actual OpenAPI and generate types; confirm capability/session/CSRF, expiry/revocation, paging and granular permissions.
- [ ] Enforce invoice amount/currency/account matching, one unresolved attempt, reservation/concurrency and idempotency atomically on the backend.
- [ ] Verify signed callbacks/inquiry/reconciliation evidence before confirmed allocation/ledger posting; browser redirects and return queries cannot confirm payment.
- [ ] Confirm partial allocations, overpayments, fees, rounding, tax credit rules and immutable allocation-time receipts.
- [ ] Keep credit notes and refunds separate; confirm refund approval/execution, original payment limits, reserved customer credit, UNKNOWN handling and once-only posting.
- [ ] Enforce audit/retention and sensitive capability redaction, provider error sanitation and no public leakage of other customer attempts.
- [ ] Integrate legal/fiscal receipt rendering only after confirmed requirements; current browser print is not certified PDF.


- [ ] Confirm enabled payment methods per merchant/currency; replace static simulator capabilities with authoritative eligibility.
- [ ] Connect real STK dispatch/acknowledgement, authenticated callbacks and inquiry with once-only ledger allocation and original references; do not use frontend approval as provider evidence.
- [ ] Integrate provider-hosted card/3DS and PayPal orders/capture securely; never add real PAN/CVV/PIN/password fields to this mock UI.
- [ ] Enforce provider idempotency, phone privacy/log redaction, timeout/UNKNOWN and cross-method duplicate prevention server-side.

## F6 integration requirements

- [ ] Map API-39–API-44 and new scopes to authoritative OpenAPI; generate types and retain runtime validation. Confirm tenancy, per-account mandates/limits, backend-calculated fees/taxes/currency and rail eligibility.
- [ ] Enforce different maker/checker, required approver count, active mandates and revocation rechecks atomically. Approval must never automatically dispatch unless explicitly specified by a confirmed contract.
- [ ] Use the real ledger/hold write gateway for reservations, dispatch, signed outcome/inquiry and once-only posting. Test duplicate events, concurrency, stale versions, insufficient funds and definitive failure. Preserve UNKNOWN references/holds; no timeout may prove failure/success.
- [ ] Define cancellation/beneficiary-archive/approval-expiry races, reconciliation, outbox/inbox and immutable audit evidence. Durable records must survive workers/reloads; MSW in-memory durability is deliberately absent.
- [ ] Tokenize/encrypt real beneficiary destinations, enforce access and log/error redaction, verify destination ownership/name through actual bank/rail services, and define privacy/retention. Current masks/hashes do not implement real account storage or verification.
- [ ] Connect issuer-owned masked cards, active holder/account eligibility, asynchronous request/approval/issuance/replacement states, spend/activity/statements and actual enforcement of controls. Require secure step-up for sensitive operations as specified by issuer contracts.
- [ ] Keep sensitive reveal/PAN/CVV/PIN/delivery outside these mocked forms; use an approved secure issuer component if ever required. Confirm global/MCC/cross-border policy and certified card exports separately.
- [ ] Keep credit issuance, limits, statements and repayments unavailable until actual backend capability/eligibility exists. Never use illustrative credit amounts as approved funding or add them to cash.
- [ ] Replace DEV payout/issuer controls with authenticated provider evidence and preserve release guards; no M-Pesa/card/PayPal secret belongs in VITE_ or localStorage. Complete staging, Windows and cross-browser checks before claiming verification.

- [ ] Replace the unavailable real card-disclosure adapter only after agreeing a secure issuer-hosted reveal/step-up contract. Enforce cards:reveal server-side, card/account ownership, no-store/no sensitive logging, expiry/remasking and audited disclosure. Never treat the 0000-prefix/000/12-30 display mock as operational card credentials or add real credentials to Query/localStorage.

## F7 integration dependencies

- Confirm platformContracts.ts endpoint schemas, tenancy, scoped authorization, concurrency/versioning, idempotency, pagination and audit retention; generate types only after OpenAPI is supplied.
- Authoritatively calculate currency-specific reports, opening balances, aging cutoffs/timezone, issue-date collection semantics, allocations/refunds and immutable export snapshots. Define CSV retention/expiry and certified formats separately.
- Secure secret generation/storage/hash, one-time response delivery and lost-response rotation; no browser persistence. Confirm no-store headers and redaction throughout telemetry.
- Confirm business/member sandbox grants separately from production entitlement and administrative review. Frontend checks do not authorize API operations.
- Supply real webhook dispatcher, SSRF defenses, TLS policy, signatures/key rotation, durable event/attempt records, receiver timeouts, retry/backoff and deduplication. Mock URLs never dispatch HTTP.
- Replace synthetic logs with authorized redacted server logs and real pagination. No customer payload or sensitive header logging.
- Exercise secure sessions/BFF, backend authorization, real-mode failures and critical journeys in staging before marking any feature integrated or verified.

## Business entry integration

- Confirm supplied partner Session semantics for Business tenancy and the proposed /session member projection; never infer real permissions from a browser role marker.
- Supply secure login challenge issuance/verification or IdP/SSO, secure HttpOnly SameSite cookies, CSRF validation, idle/absolute deadlines, rate limiting, logout invalidation and session-revocation events.
- Confirm permissions/capabilities across existing business membership and uploaded scope identifiers; validate identity-to-business binding server-side.
- Verify maker/checker, concurrent execution/idempotency, approval revocation and original-reference inquiry in real staging. Preserve all integer ledger/hold invariants.
- Test anonymous public capability boundaries separately from Business authentication; redirects cannot confirm payments.

## Expansion confirmation and release gates

- Confirm the new payment-order mandate, whether initiator counts as one authorizer, allowed eligible roles/counts, future policy versions and revocation rules. Enforce authorization/dispatch atomically server-side.
- Retire legacy manual mutation endpoints or enforce the same real OTP mandate there; frontend route changes cannot close a backend bypass.
- Provide real OTP challenge issue/resend/rate limits, delivery channels, secure code verification/storage, expiry/attempt/replay/session binding and redacted auditing. No client-selected settlement outcome is authoritative.
- Confirm reservation/ledger posting/idempotency, original inquiry, timeout/UNKNOWN recovery, rail callbacks and settlement before marking payment deduction integrated.
- Confirm customer statement event/date/timezone/opening semantics, export retention/certification and issued invoice/branding/version storage. Validate and scan real logo uploads; use secure asset handling.
- Supply separately authorized/paginated supplier/LPO, payroll/HR, terminal/sale and loan projections; define salary privacy and data retention. Confirm payroll taxation/filing separately from entered deductions.
- Confirm POS terminal/acquiring capability, live transaction state, refunds and certification. No physical hardware/network partnership currently exists.
- Gate lending by actual business entitlement; confirm underwriting, approved products, rate/APR method, repayment allocation, schedule conventions, disclosures, legal agreements, disbursement, delinquency/restructuring and reporting. Preview writes are blocked in real mode.
- Provide operational business signup/contact verification, secure authentication and onboarding endpoints. Signup must never grant banking, funding, API or production access automatically.
- Confirm optional FX account eligibility/currency products and safe permissions for minimal cardholder selection when Finance cannot read Team.
- Replace documentation examples with confirmed/generated full schemas and real error/auth/callback contracts; do not copy another bank’s private-key scheme or claim regulatory partnerships.
