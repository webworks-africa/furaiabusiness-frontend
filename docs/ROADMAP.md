> Current 0.10.1 additions and verification: [Restoration register](RESTORATION_REGISTER.md). Historical batch details below remain for context.

# Implementation roadmap

| Batch | Status | Delivered / next completion target |
|---|---|---|
| F1 | Mock-complete | Design tokens, shared/public shells, router, typed HTTP layer, MSW, identity adapter, scenarios and release guards |
| F2 | Mock-complete banking reads and CSV statements | Overview cashflow and summaries; account list/detail, holds, read-only limits, transaction filters/details; statement create/status/fail/retry/expire/download |
| F3 | Mock-complete | Six-step onboarding, review/resubmission, separate account request/provisioning, business profile, scoped mock sessions/policy, invitations and role/entitlement management |
| F4 | Mock-complete | Versioned contacts, quotation drafts/share/recipient response/revision, linked conversion, immutable invoice issue and currency-specific receivables |
| F5 | Mock-complete | Invoice-bound links, public checkout, pending inquiry, exact partial allocations, immutable receipts, credit notes and separately simulated refunds |
| F6 | Mock-complete within documented boundaries | Beneficiary create/archive/select, versioned payment drafts/review/edit, reserve/approve/reject/cancel/execute/inquiry; masked debit cards, controls/freeze/replacement/request/issuer state and credit preview |
| F7 | Mock-complete within documented boundaries | Currency-specific reports and immutable CSV jobs; gated sandbox apps, one-time credentials, rotation/revocation, webhook attempts, redacted logs, proposed docs and pending production review |
| F8 | Next | Full responsive/a11y review, confirmed generated contracts and integration preparation |

No feature is API-integrated or staging-verified. AWS is not a prerequisite for mock development. Continue this repository and preserve its working code and pinned dependencies.

## F2 boundaries and dependencies

Certified PDF generation/attestation, fees/tax details, proofs of dispatch, actual bank/rail metadata, balance-file exports and mutations to account limits await their backend contracts. The UI does not fabricate these capabilities. The statement dialog explicitly marks PDF unavailable. F3 adds separate account requests and development-only zero-balance provisioning after simulated eligibility approval. F4 connects overview billing to issued receivables; pending approvals remain read-only until F6, with no approve/execute shortcut.

F2 fixtures contain 24 transactions: 22 KES and 2 USD, including a pending utility payment and a failed payment. Cashflow uses confirmed KES movements; held reserves and receivables remain separate. Statement snapshots and bank balances do not change on export generation or retry.

F8 performance follow-up: split route/form code, measure first-load performance and set a budget; F3 lazy-loads new business routes, while the production entry remains about 578 kB minified / 176 kB gzip. No SLA is claimed from the build result.

## F3 boundaries

Review decisions and invitation acceptance are external-event simulations in development controls. Upload bytes are discarded after header validation; no real KYB, registry check, malware scan or email is performed. Security policy is stored mock configuration, not an authentication provider. Current-session logout and operational login remain dependent on the secure session adapter/BFF contract. Approval/execution remains F6; developer credential workflows and production access remain F7. F4 adds contacts/quotations/invoices; F5 adds checkout, allocations and receipts; proceed to F6 payments/cards/approvals while retaining scoped permissions and the exact-money boundary.

## F4 boundaries

Recipient acknowledgement is a mock capability flow, not a verified legal e-signature or operational invitation/email. Sharing preserves a snapshot and revision; accepted quotes convert into a linked draft exactly once. Invoice issue is separate, immutable, and changes receivables only. No payment, tax-authority certification, bank balance, receipt, credit note or refund is fabricated. Contact limits, credit scoring, bulk exports, PDF rendering and tax classifications await confirmed contracts. F5 must add payment outcomes/allocations to this model without rewriting issued snapshots.

## F5 boundaries

Payment creation starts Processing, explicit inquiry returns Pending confirmation by default. Only a confirmed simulated external outcome allocates funds and posts a matching bank transaction. Refund requests reserve refundable customer credit and remain Pending confirmation until a separate development event; payment approvals/maker-checker remain F6. Credit notes never move cash. No real payment provider, approval authority, legal receipt certification, PDF renderer, email or refund rail is integrated. F6 extends these invariants to disbursement approvals/cards; refund execution remains a separate backend dependency.


F5 payment options update (0.5.1): provider selection, simulated M-Pesa STK/phone authorization, PesaLink transfer, Visa/Mastercard hosted authorization and PayPal approval now extend F5. All remain mock-complete; actual provider/merchant eligibility and secure callback/inquiry integration are pending. F6 is now delivered below; F7 is next.

## F6 delivered (0.6.0)

Separate payment contracts/application hooks/MSW store now back payment and beneficiary lists and the approval queue. Draft review/edit has no balance effect. Submission reserves principal; another active member approves without execution. Explicit execution creates one pending transaction. UNKNOWN retains its original reference and reservation; inquiry against a confirmed simulated event debits ledger once and releases the reservation. Definitive failure, pre-execution cancellation and rejection release only this payment’s hold. Overview approvals and accounts/transactions/statements use the same updated store.

Debit cards have masked identities, illustrative activity, versioned channel/limit controls, freeze/unfreeze and linked replacement requests. Every new/replacement request needs another member’s approval and separate development issuer confirmation. No real card/order/secret/credit facility is created. Credit issuance/limits/statements/repayment remain preview dependencies. All F6 rails are KES-only, fees are explicitly zero in fixtures, and every payment needs a different approver; actual policy, fees, rails, account limits and eligibility await backend confirmation. Internal/FX/bulk payouts, global issuer policy, card statements/export, delivery/PIN/reveal, real-name verification and refund approval/execution remain dependencies. Next: F7 reports and permission-gated developer workflows.

F6 card refinement (0.6.1): shared Show/Hide disclosure, temporary non-payable test fields and scoped no-store mock endpoint; explicit/automatic masking and restored approved black credit design. No actual card credentials or credit facility is provided. F7 remains next.

## F7 delivered (0.7.0)

Reports derive confirmed cash movements and issued receivables from the same state as accounts/invoices. Exports capture immutable CSV snapshots with queued/generating/ready/failure/retry/expiry states. Aging is a current snapshot; collection reports use invoice issue-date cohorts and current allocations, not revenue recognition. Currencies stay separate.

Developer tools require business AND member sandbox entitlement in addition to role permissions. Apps have versioned read scopes; narrowing or suspension revokes incompatible keys and pauses hooks. Secret disclosure is once-only, temporary and outside Query caches. Webhook deliveries preserve event IDs and bounded attempts. Production requests remain Pending review and never enable live access. F8 must confirm backend contracts, complete accessibility/performance review, and verify real staging integrations.

## Integrated Business release 0.8.0

User-requested integration batch delivered ahead of remaining F8 review: uploaded partner identity contract/design adapted into login/protected Business/sign-out/expiry; all cash direction colours aligned; maker/checker tested through two simulated logins; previous Customer/Operations source preserved for next phase. No new dependency. F8 is still open; Customer and Super Admin are deferred.

## Business expansion 0.9.0

Delivered the user-requested related batches: OTP mandates and automatic dispatch with confirmed shared-ledger deductions; Finance team restriction and entitled Developer fixture; running customer statement; invoice logo/default/per-document templates; main/settings dropdowns; procurement and LPO; payroll net-pay reservations; POS event simulation; loan-book issuance/repayment preview; optional USD request policy; public documentation hub and clean signup into onboarding. See BUSINESS_EXPANSION.md for boundaries. F8 and Customer/Super Admin remain next-phase work; none is integrated or staging-verified.

## 0.10.1 delivery

Document exports, simulated email, demo tax references, profile settings and reviewed supplier intake/payables rebuilt. Next: execute bundled Playwright journeys on an unrestricted local browser, complete responsive/accessibility review, confirm endpoint contracts and connect real backend services. No staging verification completed.
