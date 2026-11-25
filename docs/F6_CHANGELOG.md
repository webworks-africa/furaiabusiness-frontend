# F6 — Payments, beneficiaries, approvals and cards

Version 0.6.0, 23 October 2026. Continues the F1–F5 React project; no dependency/framework replacement or new project dependencies. All described behaviors are mock-complete only. No API integration or staging verification is claimed.

## Delivered

- Beneficiary create/archive, masked destination, search and six-row server pagination. New destinations are immediately selectable for payments. M-Pesa destinations validate 2547…/2541… format; test inputs only. No ownership/name-match attestation is fabricated.
- KES PesaLink, M-Pesa B2C and RTGS payout drafts, versioned edit, review with account/destination/fee summary, explicit attestation and submission. Drafts never change cash or holds. Archived beneficiaries cannot receive a new/approved dispatch.
- Submission reserves principal from available funds while preserving ledger. A different active member approves/rejects; rejection needs a reason. Approval never executes. Maker cancellation is available only before execution. Execution creates exactly one linked pending transaction, with original reference and retained reservation.
- UNKNOWN inquiry never appears completed or releases its hold. A development rail event sets an outcome; a separate inquiry confirms/fails it. Confirmed debits the ledger once and releases the reservation; failure releases it without posting cash. Accounts, transactions, statement snapshots, cashflow and overview approval summaries use the same store. Transaction filters include PesaLink/M-Pesa B2C/RTGS alongside legacy rails.
- Separate payments:read/write/approve/execute and cards:manage scopes. Existing admin/finance have mutation scopes; viewer is read-only and developer has no banking/payments. Active member and permissions are checked at the mock HTTP boundary; makers cannot become their own checker by changing roles. Execution rechecks approver activity/role, source account and beneficiary availability.
- Debit portfolio/detail, realistic proportions, masked number, holder/business, type/status, linked KES account, illustrative activity, exact spending limits and online/contactless flags. Freeze/unfreeze and versioned settings persist across in-app routes. Monthly limits cannot be lowered below fixture cycle spend; single ≤ daily ≤ monthly.
- New/replacement card request → another member approval → Approved for issuance → explicit development issuer confirmation → Active masked card. Replacement freezes the original and preserves the linked request. No physical delivery, actual ordering, PAN/CVV/PIN or sensitive reveal exists.
- Credit card design preview with illustrative facility amount, clearly unavailable repayment/limit actions, no credit extension or asserted underwriting/partner access.
- Loading/empty/errors, stale reads with blocked writes, permission/session states, inline form validation, associated errors, focus styles, tablet/mobile stacking and internally scrollable tables. Existing application shell/public checkout remain consistent.

## Deliberate assumptions and dependencies

Every new F6 payment needs a different approver at all amounts; screenshot threshold/mandate values are not treated as real policy. Fees are zero and explicitly simulated. Payouts are KES-only; internal transfers, FX, bulk payment, actual cut-offs/rail limits/fees, paybill/till variants and verified-name matching require backend contracts. M-Pesa B2C payouts are separate from F5 M-Pesa STK collections. Immutable payout terms lock after submission; cancellation/rejection releases only that request’s hold. Existing F2 legacy holds remain untouched and unresolved, with no F6 dispatch actions.

Card transactions are labelled illustrative history, not another ledger feed. Global freeze/security/merchant-category policy, actual card authorization velocity enforcement, certified card statements/CSV exports, delivery, sensitive reveal/OTP/PIN and credit services await issuer contracts. Refund approval/execution remains a distinct integration dependency; this batch does not retrofit an operational refund rail into F5.

The backend must enforce tenancy, scope, maker/checker policy, atomic holds and journal posting, idempotency, durable UNKNOWN resolution, provider evidence, issuer control enforcement and sensitive-data redaction. These mocks demonstrate expected frontend behavior only.

## Verification

See VERIFICATION.md for executed results and environment limitations. README includes exact Windows PowerShell setup and checks. Mock reset restores every module together; a full reload also resets identity and in-memory records, so use in-app links during review.
