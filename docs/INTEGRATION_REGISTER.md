> Current 0.10.1 additions and verification: [Restoration register](RESTORATION_REGISTER.md). Historical batch details below remain for context.

# API contract and dependency register — F1–F7

Business endpoints and fields remain PROPOSED and awaiting backend confirmation. The latest uploaded previous frontend now supplies an identity OpenAPI, retained in contracts/previous-platform.openapi.json and explicitly distinguished under AUTH-01 below. Earlier F1–F7 inspection had no supplied contract. Types are inferred from Zod response schemas in src/api/contracts.ts and src/api/businessContracts.ts. F2 evolves the unconfirmed F1 contracts; it does not claim compatibility with an unseen backend.

| ID | Proposed API or decision | Implemented mock contract | Backend confirmation / dependency |
|---|---|---|---|
| API-01 | GET /session | memberId, name, business, effective role and permissions; F3 adds business/team/security scopes | Secure sessions, tenancy, exact permission/scoping names, real login/logout and CSRF |
| API-02 | GET /business/overview | asOf/stale, accounts, confirmed KES monthly flows, six-month cashflow, receivables, recent transactions, pending-approval summaries | Authoritative aggregation windows, reporting timezone, receivables/approval permissions |
| API-03 | GET /accounts | F2 wrapper {asOf,stale,items}; separate ledger/held/available strings | Confirm response wrapper, ownership, currency exponent, account pagination |
| API-04 | GET /accounts/:id | account, holds (reference/amount/reason/state), read-only daily/monthly limits and mandate, freshness | Real account metadata; no invented SWIFT/bank partner, edit or release-hold endpoint |
| API-05 | GET /transactions | page/search/account/currency/status/rail/from/to/sort; filter before paginate; 6 rows/page; filtered confirmed totals for one currency only | Offset vs cursor, status/rail vocabularies, EAT day boundaries, independent filters and totals |
| API-06 | GET /transactions/:id | transaction, reference, ledgerImpactMinor, events, freshness | Authoritative lifecycle/ledger posting; fees, audit proofs and inquiries need confirmed contract |
| API-07 | GET /statements | {asOf,stale,items}; bank export jobs shared with detail views | Listing scope, retention, pagination and job execution worker |
| API-08 | POST /statements | accountId/from/to/format=csv/includeUnresolved; required Idempotency-Key; 202 job | Authorization, CSRF, idempotency lifetime and snapshot/transaction isolation |
| API-09 | GET /statements/:id | Queued → Generating → Ready / Failed / Expired; attempt, rowCount, expiry/errorCode | Server worker drives real jobs; polling only simulates job ticks in mocks |
| API-10 | POST /statements/:id/retry | Only Failed; same id and immutable snapshot; attempt increments | Real retry policy, idempotency/concurrency and audit trail |
| API-11 | GET /statements/:id/download | Authenticated text/csv; 403 without scope, 409 before Ready, 410 after expiry | Real expiry enforcement, safe filename, content MIME and resource authorization |
| API-12 | Financial serialization | Integer minor-unit strings and BigInt calculations; KES/USD only (2 decimals) | Expand currency exponent registry before adding currencies; backend remains totals authority |
| API-13 | Errors | Generic status errors with optional X-Request-Id; 401/403/404/409/410/422/503 handled without mock fallback | Final error envelope, retry policy, rate limits and correlations |
| DEV-01 | POST /__mock/scenario and /__mock/reset | In-memory scenarios/role; reset clears jobs/idempotency/data | Development only; never implement on real API; handlers excluded from release |
| SEC-01 | Separate entitlements | statements:create controls creation/retry/download; developer:read is sandbox read only | Server authorization on each object, cross-business negative tests and independent production approval |
| UI-01 | Design adjustments | Currency selector replaces unexplained FX consolidation; no live banking/certification claims | Confirm real product capabilities and approved wording |
| UI-02 | CSV-only statements | Consistent ledger snapshot, original references, unresolved posted movement = 0, formula-safe text, UTF-8 BOM | Certified PDF renderer, attestation, fees/taxes and statement verification contract |

## Confirmed mock invariants

- Creating a statement never moves money, issues an invoice, approves or executes a payment.
- Pending confirmation / Failed retain their attempted amounts and original references, with zero posted ledger movement.
- Ledger = available + held for the supplied accounts. UNKNOWN-related holds are retained; refresh never releases or settles them.
- Filters apply before summary/pagination; mixed currencies have no unexplained summed total.
- CSV snapshots and row counts are captured at creation and survive source-data changes and job retries. Only completed movements affect opening/closing balances.
- Same idempotency key/body returns the original job. A different body with that key returns 409. Download/retry require role permissions at the mock server as well as UI.

## Deferred families

Real KYB, secure document storage, invitation delivery and auth enforcement remain unintegrated F3 dependencies. F4 contact/quotation/invoice contracts are proposed and implemented as mocks below. F5 collection contracts are proposed and implemented below. F6: beneficiary and payment idempotency, holds, approval vs execution, cards. F7: reports, developer eligibility, credential reveal-once/rotation/revocation, webhooks, production access. F6–F7 workflows remain scheduled, without simulated successful actions.

## F3 proposed contracts — awaiting backend confirmation

| ID | API / decision | Implemented mock behavior | Required confirmation |
|---|---|---|---|
| API-14 | GET/PATCH /business/profile | Versioned display/contact/operating fields; registered legal name read-only | Legal-change process, validation, tenant ownership and audit scope |
| API-15 | GET /onboarding; PATCH /onboarding/draft | Six-step values, version, status, document metadata, history and separate eligibility | Jurisdictions/entity types, representatives/beneficial owners, evidence checklist and legal declarations |
| API-16 | POST /onboarding/documents; DELETE /onboarding/documents/:id | Multipart file/kind/version; 5 MiB limit; PDF/PNG/JPEG MIME plus magic-header check; replacement resets metadata status | Upload transport limits, quarantine, scanning, encryption, retention, private download authorization; never rely on browser validation |
| API-17 | POST /onboarding/submit | Validates all sections/documents/declaration; locks In review; request changes permit replacement/resubmission | Backend review/version snapshots, duplicate prevention, reviewer event delivery and rejection/reapplication policy |
| API-18 | GET/POST /account-requests | Separate eligibility-gated request with Idempotency-Key; Pending review → Opened only via external dev event | Account provisioning workers, legal agreements, currency availability, account IDs and reconciliation |
| API-19 | GET /team; POST /team/invitations | Team version, members, invitations; duplicate email rejected; no mail sent | Actual email delivery, token security/expiry, accept flow, seats, pagination and tenancy |
| API-20 | POST /team/invitations/:id/resend or /revoke | Version checked, terminal states respected, resend increments attempt | Rate limits, revoke/token invalidation, race/idempotency policy |
| API-21 | PATCH /team/members/:id | Team/member versions; role/status/member sandbox entitlement; self-demotion/suspension and last-admin removal blocked | Exact role/scope model, permission-change audit, immediate session revocation, organization lockout policy |
| API-22 | GET /security; PATCH /security/policy | Mock MFA requirement/15–60 minute idle policy; mock enrollment label; no actual enforcement | Identity provider/BFF enrollment, step-up auth, recovery and secure policy enforcement |
| API-23 | DELETE /security/sessions/:id | Only actor's other mock sessions; rejects current session and others' records | Real scoped session inventory, revocation, logout/current-session behavior, privacy and device metadata |
| API-24 | GET /business/activity | Mock actor/action timestamps, no uploaded contents or submitted secret values | Audit retention/integrity, scope, pagination and security review |
| SEC-02 | Role × member entitlement × business entitlement | Admin/developer role AND both sandbox flags required for developer:read; production always false | Separate server-side application/credential/production permissions in F7 |
| UI-03 | Eligibility fixture separation | Existing banking demo fixtures coexist with Draft onboarding; new account must be approved/requested/provisioned and starts at zero | Real business lifecycle must supply authoritative eligibility/account state |

Mutations with version fields reject stale writes with 409. The UI retains entered values and offers explicit reload of saved values. All scopes are checked at the mock network boundary as well as in navigation/forms. This is not backend authorization. Kenya-only fields, fixed document categories, policy values, one business/representative and fixed roles are reversible assumptions, not confirmed requirements. F3 pagination for team/activity is deferred pending real list contracts; current deterministic fixtures are small.

## F4 proposed contracts — awaiting backend confirmation

No backend/OpenAPI source was supplied to this frontend workspace. These routes are target proposals, **not assertions that the separate backend implements them**. Existing backend business-finance APIs must be inspected and mapped/generated before real mode is declared integrated.

| ID | Proposed boundary | Mock behavior | Backend dependency |
|---|---|---|---|
| API-25 | GET/POST /contacts; GET/PATCH /contacts/:id | Versioned name/person/email/address/terms/archive; duplicate email rejected; list search/status/page, 6 rows/page, separate KES/USD receivables | Existing contact/customer schemas, tenancy, duplicate rules, list wrappers, archive/version semantics |
| API-26 | GET /contacts/options | Active contact selector (small fixture set) with derived balances | Real search/autocomplete pagination and selection authorization |
| API-27 | GET/POST /billing/quotations or /billing/invoices | Filter/search/currency/contact/page, exact currency-scoped outstanding; idempotent creation via Idempotency-Key | Map to actual business-finance route families, numbering, idempotency lifetime/replay policy |
| API-28 | GET/PATCH /billing/:kind/:id | Versioned draft values, customer snapshot, totals, events; Draft-only edit, 409 stale write | Server totals, optimistic concurrency, tenant ownership and status vocabularies |
| API-29 | POST /billing/quotations/:id/share or /revise | Share captures immutable commercial snapshot and creates recipient capability; revise revokes old link and starts editable draft; no email | Real recipient capability issuance/hash/expiry/revocation, dispatch/outbox, rate limits and audit |
| API-30 | GET /public/quotations/:token; POST .../respond | Snapshot-only view, name/consent and version-bound accept/decline; idempotent same response, conflicting response 409 | Actual recipient authentication/capability contract, CSRF/origin controls, privacy, evidence/legal signature requirements and anti-replay |
| API-31 | POST /billing/quotations/:id/convert | Accepted only; one linked draft invoice; replay returns existing invoice, both references linked | Transactional uniqueness, exact accepted snapshot binding, conversion idempotency and account permissions |
| API-32 | POST /billing/invoices/:id/issue | Draft-only, immutable issuer/customer/line/totals snapshot, Outstanding amount; existing bank balances unchanged | Fiscal numbering/tax rules, immutable version hash/storage, issue authority, account-receivable ledger and certified documents |
| FIN-01 | Exact decimal line policy | Quantity ≤3 decimals, rate ≤2; discounts/taxes ≤2 and 0–100%; 1–30 lines; KES/USD exponent 2 | Currency exponents, precision/range, authoritative rounding/tax inclusivity/discount policy |
| SEC-03 | billing:read / billing:write | Admin+finance read/write; viewer read; developer neither. UI and mock guard both check | Actual fine-grained contact, quote, issue and conversion scopes; backend authorization mandatory |
| UI-04 | Missing invoice/customer/public screens | Extend approved quotation/customer tokens; no unconfirmed tax/network/delivery claims | Product approval and final invoice/legal wording |

Exact calculation: round half-up quantity × unit-price into minor units **per line**; round percentage discount on gross; net = gross − discount; round tax on net; line total = net + tax. Aggregate rounded integer line amounts. Inputs stay decimal strings and API amounts integer minor-unit strings. All arithmetic uses BigInt, not binary floating money. The mock shares this helper with the UI preview; a real backend must remain authoritative. New line tax defaults zero; 16% fixture examples are not tax advice or verified classifications.

Draft/share/accept/convert create no receivable or cash. Only issue creates outstanding receivable. Overview and contact totals derive from issued invoices of that currency; they replace earlier disconnected F2 receivable fixtures. Pending/UNKNOWN payments never appear as paid; F4 records no payment at all. F5 extends this with collection allocations, credit notes and separate refunds below. Customer snapshot is copied on document save and frozen on share/issue; later contact edits do not rewrite it. Issued invoices cannot be edited/reissued through these routes. Revision revokes the prior quote token. Public links contain test-only random capabilities and must not be logged, cached or persisted as real secrets.

Conversion initially copies accepted commercial fields, including quotation dates/valid-until into draft invoice dates/due date. The business may edit that draft before issue. Final invoice issue-date/due-date defaults and numbering require backend/product confirmation.

## F5 proposed contracts — awaiting backend confirmation

No additional backend source/OpenAPI was supplied. The separate backend's collection, receipt and business-finance contracts must be inspected/generated/mapped before integration. All routes below are proposals.

| ID | Boundary | Mock behavior / backend dependency |
|---|---|---|
| API-33 | GET/POST /payment-links; GET /payment-links/:id; POST .../revoke | Invoice-bound, account/currency matched, expiry/partial flag, idempotent create, versioned revoke, list search/state/page. Confirm real capabilities, secure storage, expiry, delivery, list semantics and tenant scopes. |
| API-34 | GET /public/checkouts/:token; POST .../attempts | Issued snapshot, current balance, existing uncertain attempt; server validates minor-unit amount, partial rule and one unresolved attempt per invoice across links. Confirm session/capability binding, atomic reservations, rate limits and reconciliation. |
| API-35 | GET /public/collection-results/:token; POST .../inquiry | Original reference, Processing/Pending confirmation/Confirmed/Failed, scoped receipt on confirmation. Confirm real callback/inquiry adapter, idempotent posting, authenticated provider evidence and UNKNOWN vocabulary. Never trust redirect query parameters. |
| API-36 | GET /invoices/:id/settlement; GET /receipts/:id | Paid/credited/refunded/customer credit/refundable/outstanding, links/attempts/receipts/events, currency and invoice version. Immutable receipt captures allocation-time balance; confirm authoritative accounting and print/PDF metadata. |
| API-37 | POST /invoices/:id/credit-notes | Version/idempotency, positive minor units/reason, immutable note, capped at invoice total; blocked while collection unresolved. Confirm tax correction, credit-note numbering, line allocation and fiscal rules. |
| API-38 | POST /invoices/:id/refunds | Original confirmed payment, positive minor amount/reason, version/idempotency; request reserves refundable credit, confirmation is separate event. Confirm approval/execution, provider refund IDs, concurrency, retry/UNKNOWN and reconciliation. |
| FIN-02 | Collection/credit/refund display | due=max(total−confirmed payments−credits,0). Customer credit=max(payments+credits−total,0)−confirmed refunds. Refundable subtracts pending refunds too, bounded by original confirmed payment less prior/pending refunds. Confirm server accounting. |
| DEV-02 | POST /__mock/collection-outcome; POST /__mock/refunds/:id/:outcome | Development-only external event simulators, absent from release handlers/UI. They do not implement provider callbacks or business approval. |

Only confirmed collection posts a matching positive transaction and increases ledger/available; held stays unchanged. Only confirmed refund posts the separate negative transaction and reduces cash; it does not undo the invoice allocation or alter the original receipt. Credit notes change receivable/customer credit, never cash. Amounts stay integer strings/BigInt. No floating-point financial operations or cross-currency sums. Current partial-amount UI supports up to 12 whole digits and two fractional digits; backend limits must be confirmed.

One unresolved invoice attempt blocks further attempts and credit/refund mutations. Link revocation/expiry blocks new attempts, while previously initiated inquiry may still confirm. Idempotent replay precedes current state/version checks. Closed means no receivable remains; it does not imply paid if credit notes cleared it. Final invoice statuses add Partially paid, Paid and Credited without rewriting the issued snapshot. Refund approval/execution remains a required backend/F6 dependency. No fee/FX/tax/settlement partner or real legal certification is fabricated.

## PAY-OPTIONS-01 — proposed provider simulation contract

Attempt creation adds method=mpesa|pesalink|visa|mastercard|paypal; existing amount-only fixture requests default to legacy simulated for compatibility. M-Pesa requires a normalized Kenyan mobile. Responses include providerReference, maskedPhone, providerState and timestamped providerEvents. One STK dispatch event is captured at create; repeated same key/normalized request returns the same attempt, reference and event. A different phone/method/amount with that key returns 409. API guards reject M-Pesa/PesaLink outside KES.

Development-only POST /__mock/provider/:token/approve or /cancel records a per-attempt authorization outcome, without posting cash. Original payment inquiry then confirms/fails through the existing guarded allocation path. No response/redirect itself proves payment, and pending blocks duplicate requests across methods. Raw phone is transient request input; only masked destination and SHA-256 request fingerprint are retained by these mocks. Attempt references/provider history remain after confirmation/refund.

Awaiting backend confirmation: merchant enabled methods, currency/amount limits and fees; real M-Pesa STK request/acknowledgement/callback IDs, phone validation, callback signature/authenticity, timeout/UNKNOWN and inquiry; PesaLink instructions/reconciliation; hosted PCI-compliant card tokenization/3DS and Visa/Mastercard eligibility; PayPal order/capture/approval/webhooks; secure session/origin/CSRF, PII retention/redaction and capability authorization. No live credentials or operational partner access is invented. Mock currency flags are assumptions, not real provider capability promises.

## F6 target contracts — awaiting backend confirmation

All routes below are proposals implemented only by MSW, not claims about existing backend endpoints. No supplied OpenAPI contract covers this batch. Preserve the existing ledger single-write gateway and durable hold/UNKNOWN semantics when mapping these proposals.

| ID | Proposed boundary | Mock behavior / required confirmation |
|---|---|---|
| API-39 | GET/POST /beneficiaries; POST /beneficiaries/:id/archive | Search/status/page, six rows/page; name/rail/institution/test destination input; response only masked destination/version/status/Mock only. Confirm tenant ownership, secure destination references, actual verification/beneficiary approval, duplicates, activation/revocation and routing metadata. |
| API-40 | GET/POST /payments; GET /payments/:id; POST /payments/:id/edit | Versioned maker-owned Draft, immutable destination snapshot after submission, integer minor-unit amount/currency/fee, source account and business reference; idempotent create/edit. Confirm payload names, limits, authoritative fees/taxes/eligibility, durable versions, list cursors and transaction IDs. |
| API-41 | POST /payments/:id/submit, approve, reject, cancel, execute, inquiry | Version + Idempotency-Key; rejection reason; submit reserves principal, different-member approval, separate dispatch, UNKNOWN retains hold; confirmed inquiry posts once. Confirm actual mandate thresholds/signatory counts/roles, cancellation races, backend journal/hold gateway, callback/inquiry/reconciliation, fee lifecycle and revalidation on entitlement changes. |
| API-42 | GET /cards; GET /cards/:id; GET /cards/:id/activity | Masked last4 only; debit/credit-preview/form/holder/business/account/status/limits/spend and events; existing illustrative card activity. Confirm issuer-owned IDs, list/filter/page and authorized activity/statement feeds. No PAN/CVV/PIN in proposed frontend response. |
| API-43 | POST /cards/requests; POST /cards/:id/approve or reject | Active team member and active KES source, format/name/limits; Pending approval → Approved for issuance, not issued; another approver required. Confirm issuer eligibility, approval authority, cancellation, physical delivery and eventual activation events. |
| API-44 | POST /cards/:id/freeze, unfreeze, controls, replace | Version/idempotency; monthly/daily/single minor limits plus online/contactless flags; limit hierarchy/spend floor. Replacement freezes original and creates linked request. Confirm step-up authentication, authorization propagation, lifecycle terminal states, issuer cancellation/failure, MCC/global policy and concurrency. |
| SEC-03 | payments:read/write/approve/execute; cards:manage | Admin/finance scoped mutations, viewer reads, developer no banking. Checker must differ from maker ID; roles alone do not override this. Confirm exact backend scopes/delegation, per-account mandates, session revocation and multi-approver requirements. |
| FIN-03 | Payout reservation and posting | Draft no cash effect. Submit: held += principal, available = ledger − held. Approval no posting. Dispatch adds Pending transaction only. Confirmed: ledger −= principal, release this hold; definitive failure/reject/pre-execution cancellation release only this hold. Never release UNKNOWN automatically. Confirm atomic DB semantics, fees, audit/outbox/inbox and reconciliation. |
| DEV-03 | POST /__mock/payouts/:id/outcome; POST /__mock/cards/:id/issue | Dev-only external event controls; real production bundles exclude them. Setting a payout outcome does not itself post cash. Issuer event creates only last4 for a separately approved test request. Never treat these frontend events as production evidence. |

Every F6 payment requires another checker; no amount threshold is guessed. KES-only PesaLink/RTGS/M-Pesa B2C, zero-fee fixture, active member rules and separate card issuance are reversible assumptions. Internal/FX/bulk payments, cut-off schedules, real rail integrations, card authorization enforcement, provider/issuer secrets, real statements and credit issuance/limits/statements/repayments are dependencies. Refund approvals remain separate from payout approvals.

Mutation idempotency is scoped by member + operation path + key; replay precedes version/state checks. Versions prevent stale changes. Beneficiary full destinations exist transiently in requests; only a mask plus SHA-256 idempotency fingerprint is retained in this mock. Confirm real encrypted/tokenized destination storage, logs, privacy/retention and metadata redaction. Do not copy mock in-memory state into production storage.

## Card disclosure update — 0.6.1

| ID | Boundary | Behavior / integration dependency |
|---|---|---|
| DEV-04 | POST /__mock/cards/:id/details | DEV-only no-store display values, number prefix 0000 / CVV 000 / expiry 12/30. Requires cards:reveal, active identity, fresh data and issued debit or credit design preview; unknown/unissued records rejected. No issued credit/real credentials are created. No production route is assumed. |
| SEC-04 | cards:reveal and secure issuer integration | Existing Admin/Finance mock roles can reveal; Viewer/Developer cannot. React component state only; no shared query cache or local/session storage. Mask on explicit hide, 60 seconds, blur/hidden tab, navigation, version/identity/permission change. Real mode is unavailable until issuer-hosted/secure reveal, server-side authorization/step-up, no-store/redaction, audit and lifecycle contracts are confirmed. |

The 0000 display prefix and fixed CVV/expiry are intentionally non-payable development placeholders, not a supported card network’s test PAN. They do not assert bank/network/issuer eligibility or operational CVV retrieval. The approved black business credit face is a design preview, not an issued facility. This update supersedes earlier descriptions that only masked mock data can ever be displayed; real sensitive reveal remains unimplemented.

## F7 proposed contracts — awaiting backend confirmation

Schemas: src/api/platformContracts.ts. No supplied OpenAPI was invented.

| ID | Proposed endpoint/decision | Mock implementation and confirmation needed |
|---|---|---|
| API-45 | GET /reports/data | Currency/date/kind/search/bucket/page; scoped summaries and six-row pages. Confirm authoritative report semantics, clock/timezone and historical aging. |
| API-46 | GET/POST /report-exports; detail/retry/download | Immutable CSV snapshots, queued/generating/ready/failed/expired. Confirm persistence, retention and authorized downloads. |
| API-47 | GET /developers/workspace | Metadata-only sandbox inventory, redacted logs, productionEnabled=false. Small fixture lists client-paginated; confirm bounded/cursor APIs. |
| API-48 | POST/update developer applications | Versioned names, purposes, read scopes, suspension. Confirm entitlement and cascading key/hook policy. |
| API-49 | Create/rotate/revoke credentials | No-store once-only synthetic secret; idempotent replay metadata only. Confirm secure server storage, authorization and lost-response recovery. |
| API-50 | Create/update/test webhooks | HTTPS *.example.test only; event scope checks; no outbound HTTP. Confirm real URL/SSRF/signature and dispatch policies. |
| API-51 | Delivery detail/retry | Same event ID, max three attempts, explicit simulated failure/timeout/success. Confirm durable attempts, backoff and receiver authentication. |
| API-52 | POST production review | Entitled Admin, active app/key, successful delivery prerequisites; Pending review only. Confirm actual review workflow and separate production grant. |
| SEC-05 | Developer grants and scope boundaries | Business plus member sandbox entitlement, role permission and app read scopes required. No automatic production access; server authorization remains authoritative. |
| FIN-04 | Report interpretation | Aging current snapshot; collection issue-date cohort/current allocations and credits, refunds separate; confirmed cash only. Receivables never increase ledger merely on issue. |

Missing backend features remain explicit dependencies: signed/certified PDFs, XLSX/scheduled reports, historical aging, operational API/SDK, signing-secret rotation, actual receiver delivery, live production approval and secure session support.

## Uploaded identity contract integration

| ID | Supplied contract or proposed extension | Status / dependency |
|---|---|---|
| AUTH-01 | GET/POST/DELETE /partner/v1/sessions; LoginRequest/Session | Supplied uploaded OpenAPI/types reused; MSW implementation only. Backend/secure cookie/CSRF/IdP confirmation pending. |
| AUTH-02 | GET /session Business member/permissions projection | Existing proposed Business shape retained after supplied identity scope validation. Confirm principal/member/business binding and permission vocabulary. |
| SEC-06 | Mock identity resume | Development-only sessionStorage role marker, not a token. Production ignores it; durable server sessions required. |
| UX-02 | Cash direction | Incoming green/outgoing red; balances/receivables neutral, outcomes separately labelled. Credit notes do not imply refunds. |

The blanket earlier statement that no OpenAPI was supplied applies to F1–F7 history. This upload now supplies a previous-platform OpenAPI; Business-specific target contracts remain awaiting confirmation. See MERGE_REGISTER.md.

## Business expansion — proposed contracts, awaiting backend confirmation

| ID | Target boundary | Mock behaviour / dependency |
|---|---|---|
| B2-01 | GET /business-tools | Finance/Admin-only fixture workspace; split granular/HR/lending scopes, pagination and retention in real backend. |
| B2-02 | GET /business/preferences; POST /business/mandate | Versioned 1–5 distinct authorizers, optional new USD requests; order snapshots preserve prior policy. Confirm initiator and eligible-role policy. |
| B2-03 | POST /payment-orders; /:id/challenge; /approve; /inquiry; /cancel; /reject | Exact reservation, bound OTP, final-threshold automatic dispatch, confirmed-only ledger debit. Outcome endpoint is mock simulation only. Legacy manual /payments API migration must enforce the same mandate. |
| B2-04 | GET/POST /business/branding; POST /billing/:kind/:id/appearance | Logo/default/per-document templates, version checks and immutable issue snapshots; real object storage/asset safety pending. |
| B2-05 | GET /customers/:id/statement | Currency/date/opening/running ledger of invoices, confirmed allocations, credits and refunds. No certified statement claim. |
| B2-06 | GET /beneficiaries/options; GET /cards/holders | Active payee selection independent of paged lists; minimal authorized cardholder metadata without Team administration. Confirm real bounds/cursors/privacy. |
| B2-07 | POST /suppliers; /:id; /archive; POST /lpos; /:id/issue,receive,cancel | Versioned supplier management and exact immutable issued LPO; no automatic stock/accounting/cash posting. |
| B2-08 | POST /employees; /:id/archive; POST /payroll | Manual gross/deductions, atomic net-pay orders, one period run; statutory payroll and bulk authorization policy pending. |
| B2-09 | POST /pos/terminals; /toggle; POST /pos/sales; /outcome | Explicit fixture confirmation creates one incoming bank movement; live device/acquirer/refund capability absent. |
| B2-10 | POST /loans; /:id/issue; /repayments | Lending preview, flat monthly exact schedule, OTP principal order, confirmed partial repayments/duplicate-reference denial; real lending entitlement/product/contracts pending. |
| B2-11 | POST /business-registration | Fixed-code development initialization, clean draft and unfunded/no-API business; operational verification/identity contract pending. |
| B2-12 | /api-banking; /docs; /developers/docs | Public education/reference structure inspired by user links. Full backend schemas, SDK/auth and runtime credentials remain unconfirmed. |

No feature is API-integrated or staging-verified. All simulation state is in memory. Existing real-mode errors never fall back to mocks; POS/lending/external outcome/signup simulations are blocked as operational actions. See BUSINESS_EXPANSION.md for scope, interpretation and gaps.
