# Business expansion — 0.9.0, 24 October 2026

This is one complete source package continuing the inspected Business repository and retained previous-platform source. It introduces no dependency/framework replacement. New target contracts live in enterpriseContracts.ts; enterprise application hooks call the typed HTTP boundary; enterpriseHandlers/store implement stateful development MSW. Banking, billing, payout, account, transaction and report state is shared with existing stores. Customer/Super Admin remain deferred.

## Scope and assumptions

| Request | Delivered mock behaviour | Assumption / remaining dependency |
|---|---|---|
| Running customer statement | Invoice debit, confirmed allocation/credit-note credit, confirmed refund debit; date-filtered opening/closing; KES/USD separated; print/CSV | Receivable ledger, distinct from a bank statement. No certified PDF or legal account attestation. |
| Logo and invoice layouts | Validated small PNG/JPEG, three default designs, accent/footer and per-draft override; issued branding snapshots | Existing design language extended conservatively. No new screens supplied for these forms. Backend must validate/store/decode real assets and signed document versions. |
| Finance Team visibility | Removed team:read and navigation/direct-route access | Minimal cards/holders endpoint preserves authorized card request functionality without exposing full team administration. |
| Dropdown menu/settings | Collapsible sidebar groups and header Settings menu | Existing shell typography, spacing and forest/mint palette retained. |
| Developer menu | Demo developer fixture explicitly sandbox-entitled | Both business and member grants remain mandatory; signup never grants either automatically. |
| OTP approval mandate | 1–5 eligible distinct authorizers, per-order snapshot; two-minute member/version-bound challenges, three attempts, consume once | One authorizer may be the initiator; larger counts require distinct active eligible members. Final OTP creates an authorization event then automatic dispatch. Real SMS, rate limits, challenge delivery, replay prevention and atomic policy enforcement await backend. |
| Payment deductions | Submission reserves available cash; confirmed settlement posts one ledger debit and releases only its hold; failure/reject/cancel releases; UNKNOWN preserves hold/reference | Normal mock outcome confirms automatically after final OTP. The pending/failure options are development-only. New UI uses /payment-orders. Prior /payments manual contracts/tests are retained for historical compatibility, not used for new sends. Backend migration must retire old mutation endpoints or apply the same authoritative mandate. |
| STK waiting/success animation | Explicit request/phone waiting states; pending never paid; animated confirmed-send view, reduced-motion support | No real handset, M-Pesa PIN, rail or acquiring partnership is involved. Inquiry remains authoritative. |
| People/business payees | Saved bank/mobile beneficiaries selectable by destination; active options independent from paged management list | No verified-name claim. Billing contacts are not automatically payable beneficiaries. One-off unsaved transfers and extra rails await contracts. |
| Procurement | Versioned suppliers, edit/archive, linked payee; exact multi-line LPO draft/issue/receive; snapshot view/print | KES only. LPO does not create a payment, invoice, stock ledger or certified supplier commitment. Purchase invoices, inventory, dispatch/email and automated three-way matching are future scope. |
| Payroll | Employee payees, gross/deductions, deactivate, select employees, one run per period, atomic net-pay reservations and per-recipient OTP payments | Manual supplied deductions, not statutory PAYE/pension/tax calculation or filings. No bulk single-OTP authorization or real salary dispatch. Individual failed/pending items remain visible in shared payment status. |
| POS | Simulated terminal creation/suspension, pending sale, explicit confirmed/failed event, shared incoming transaction | No device provisioning, PAN/CVV, hardware SDK, offline capture, certified receipt, refund rail or live acquiring integration. |
| Loan book | Preview origination, exact flat monthly schedule with month-end clamp/final principal remainder, OTP principal disbursement, confirmed partial/full repayment and duplicate-reference rejection | Business lending/issuance interpretation: borrower is a billing contact linked to an explicit beneficiary. Flat monthly interest on original principal, not APR/reducing balance. No underwriting, legal agreements, limits, late fees, restructuring, bureau reporting, collateral or real lending authority. Real-mode simulation writes are blocked pending confirmed backend capability. |
| Optional foreign accounts | Gate new USD requests; existing currency balances retained | KES/USD fixtures only; FX, other currencies and eligibility remain backend dependencies. |
| Documentation | Public API banking page and grouped/searchable reference with examples and in-page navigation; private developer tools unchanged | Inspired by the supplied Choice API banking/GitBook navigation structure, not its branding, contracts, regulatory claims or private-key scheme. Supplied identity contract retained; Business APIs still proposed. |
| Business signup/onboarding | Synthetic contact challenge, clean business draft/owner, no accounts/funds/developer grant; enters existing six-step onboarding and review | Single-business in-memory simulator. Signup replaces current fixtures; use a fresh/signed-out demo. No real contact verification, identity provider, KYB or operational registration is claimed. Reload resets the demo. |

Reference pages inspected: https://choice-bank.com/api-banking and https://choice-bank.gitbook.io/choice-bank. No claim of relationship or service compatibility is implied.

## State and security boundaries

OTP codes remain transient form/service values, outside shared mutation caches; idempotency/audit metadata redacts code values. API money remains integer minor-unit strings; quantities/rates use exact decimal conversion and BigInt. Available, held and ledger amounts never collapse into one value. Logo rendering accepts image data only; no unsafe HTML/SVG is injected. Public documents/checkout retain capability isolation. Finance/viewer/developer access is enforced at the mock HTTP boundary as well as navigation.

Business tools use a bounded-fixture workspace response for this development release; real backend design must split/scoped-page procurement, salary, POS and lending reads and provide granular capabilities/retention policies. New tables share TanStack Table; substantial legacy banking/billing lists retain server pagination. No role, OTP, finance outcome or frontend capability check substitutes for backend authorization.

Real /payment-orders payloads omit the fixture outcome choice. Explicit outcome simulation, POS/lending actions and signup simulation are blocked in real mode pending confirmed backend integration. Existing supplied identity OpenAPI/generated types remain unchanged; these business extensions await backend confirmation.

## Reviewable changes

1. Financial foundation: OTP mandates, shared reserves/settlement, navigation/permissions, safe recipient options, exact statement projection, STK/success states.
2. Documents: branding/default/per-draft templates and immutable issued versions.
3. Business operations: procurement/LPO, payroll, POS and lending preview, all sharing the same financial stores.
4. Acquisition and integration: signup into onboarding, public developer documentation, proposed contracts and expanded regression checks.

All delivered workflows are mock-complete within this register. No feature is API-integrated or staging-verified. F8 performance/accessibility/integration review and the Customer/Super Admin phase remain open.
