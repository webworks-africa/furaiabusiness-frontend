> Current 0.10.1 additions and verification: [Restoration register](RESTORATION_REGISTER.md). Historical batch details below remain for context.

# Development scenarios and reset — F3

Copy .env.example to .env.local and run npm run dev. The header states DEVELOPMENT · MOCK DATA. MSW intercepts the same typed fetch boundary as real mode; there are no page-local fixture arrays or fallback-to-mock behavior. MSW request logging is suppressed. Unknown /api requests fail loudly in development.

## Scenarios

| Scenario | Behavior |
|---|---|
| Normal | Banking data, currency-specific cashflow and statement generation/download |
| Empty | No accounts or transactions; no fabricated balance and no statement source |
| Service unavailable | 503 on data requests; retained references are not retried as new actions |
| Stale data | Freshness warning across overview, accounts, transaction list/detail |
| Expired session | 401; development controls permit reset; no operational login is invented |
| Permission denied | 403 on protected data |
| Export fails once | New statement Queued → Generating → Failed; retry same reference → Ready |
| Export download expired | Statement completes as Expired; no download button; HTTP download returns 410 |

F3 adds four named identity fixtures. David is administrator, Michael finance, Amina developer and Sarah viewer initially. Base scopes are shown in the Team role matrix. Only David initially has member sandbox entitlement; business sandbox eligibility is independent. Amina needs an explicit entitlement before developer navigation appears, and her role has no banking scope. Viewer can read banking/business/team and own security sessions but cannot mutate business/team/policy or export statements. No role grants production approval. Switching identity selects a fixture member, whose effective role may have been changed through Team; it does not force that role anew.

Open bottom-page Development tools, choose scenario and identity, then Apply scenario. This sends a validated network mutation and invalidates related Query caches. Reset mock data resets the scenario/identity, two seeded accounts, transactions, export jobs, onboarding/profile, team/invitations, policies/sessions, account requests, audit records, IDs and idempotency records. Full page reload reconstructs the in-memory fixture store; client-side navigation preserves it. No localStorage is used. This is a single-business simulation, not multi-user isolation. Browser tests run one worker at a time.

## Deterministic fixtures and clock

The clock is fixed at 21 October 2026, 11:00 EAT. Dates/future-range checks use this snapshot, not the host clock. There are 24 transactions (22 KES, 2 USD), six rows/page, history from May–October. TXN-90234 is a pending KES utility payout with zero posted movement; its linked hold remains reserved. A failed payout also has zero posted movement. Cashflow/monthly summaries derive from the same confirmed transaction set. Receivables and pending approvals are separate read-only business fixtures.

Session responses delay 100ms; banking/job requests delay 200ms. Statement detail polls every 500ms while Queued/Generating. Mock generation advances a deterministic tick per job-detail request; there is no background worker. List views show persisted state; opening a job advances it. A normal job reaches Ready after two status reads. Generated CSV/row count are snapshots captured at creation. Retrying a Failed job retains that snapshot/id and increments attempt. Poll failures stop automatic polling and expose retry/refresh. Terminal jobs do not continue polling.

Statement downloads include UTF-8 BOM, masked account, currency, EAT date range, exact opening/closing integer minor units and original transaction references. Pending/failed rows are either excluded or show zero posted movement. CSV text is protected against spreadsheet-formula injection. These are mock CSVs, not certified bank or tax documents. Normal simulated expiry is 22 October 2026; Export download expired explicitly exercises expiry at the frozen clock.

F4 implements contact/quotation/invoice mutations below. F5 collection allocations are described below; disbursement execution, credential creation and webhook mutation remain scheduled. Reset never contacts or changes a real backend.

## F3 scenarios and state transitions

| Scenario | Behavior / prerequisite |
|---|---|
| Document upload failure | Upload returns 503; chosen file remains available for retry; no metadata is created |
| Review requests address document | Only In review → Changes requested; address evidence must be replaced before resubmission |
| Review approves submitted application | Only In review → Approved; permits account request, creates no account or funds |
| Review rejects submitted application | Only In review → Rejected; shows review reason; no unsupported self-approval/reopen action |
| Provision pending account with zero balance | Only after approval and a Pending review request; creates linked account with ledger/held/available 0 and no transactions |
| Expire pending invitations | Pending → Expired; resend records a new attempt/expiry; revoke prevents acceptance |
| Accept one pending invitation | First Pending → Accepted plus member; sandbox flag false; no real acceptance/email/token flow |
| Remove business sandbox entitlement | Removes developer navigation/access even for entitled admin/developer; restore with reset |

Use Normal to clear failure mode without resetting records. Review decisions apply once at scenario submission and only if the application has already reached In review. Wait for that status before applying a review event. Account provisioning and invitation acceptance are dev-only external event simulations, never business-user approval buttons.

Draft save permits incomplete fields; Save & continue validates its section and final submit validates all fields, four received documents and consent. Submission prevents editing. Requested changes preserve application ID and prior history. Uploads allow only test PDF/PNG/JPEG up to 5 MiB, check MIME/signature, and discard bytes after processing. Only filename/size/status metadata survives navigation; nothing is persisted across reloads. Header checks are not malware detection or KYB. Do not upload real personal information.

Profile changes update shell/overview business name. Membership changes update effective permissions on session refetch; current-member self-demotion/suspension and last-admin removal are rejected. Invite creation never sends mail, and accepted members do not automatically gain developer entitlement. Session lists are scoped to the selected fixture owner. Current-session revocation is blocked; other-session revocation changes mock state only. Stored MFA/idle policies do not enforce real authentication. F3 requests use the existing 200ms guard delay; scenario/session calls use their existing delays. No real service is changed by reset.

## F4 billing state and reset

Seed: seven test contacts, one draft KES quotation and one issued KES support invoice for KES 34,800.00. Overview, contact list and invoice list derive their outstanding receivable from that invoice; this deliberately replaces F2's disconnected receivable sample totals. Bank account fixtures remain unchanged. Reset/full reload restores contacts/documents/revision histories/acknowledgements/links/IDs and existing idempotency maps with all F1–F3 data. No browser storage is used. IDs/clock/data are deterministic; newly created recipient tokens use crypto.randomUUID and are intentionally unpredictable test capabilities.

Contact create/edit/archive updates selectors and lists. Active options return the small fixture set unpaginated; list results paginate at six. Quote/invoice lists apply currency/contact/search/status before pagination. Normal, Empty, Service unavailable, Stale data, Expired session and Permission denied use the same network controls for authenticated billing. Public capability views are independent of staff sessions and respect unavailable service; unknown/revoked links return 404. Public expiry follows the frozen date and rejects responses after valid-until. Test expiry by setting a shared quote's until date in the state-transition test; the business UI refuses sharing an already expired draft.

Share creates a revision and recipient link but sends no email. Open the link **in the same tab** and return with browser Back to preserve this in-memory MSW store. Reload/new tab resets fixtures, invalidating generated links; this is a mock-environment limitation, not a real recipient-sharing service. Accept/decline requires a name and explicit authorization/terms consent; it is a mock acknowledgement, not verified identity or legal e-signature. Accepted → Convert creates one linked draft; replays return the same invoice. Invoice issue requires explicit confirmation, freezes snapshot and creates a receivable, never cash. Issued invoices have no edit/mark-paid action. Payment and fiscal document workflows remain F5/backend dependencies.

Authenticated billing calls delay 200ms through the common guard; public quote calls delay 200ms. No call falls back to fixtures after a real API failure. Create uses a stable client idempotency key; updates/actions use versions. Conflicting saves preserve form inputs and expose reload or refresh. Issued/contact history remains unchanged when other records are edited. Viewer cannot mutate billing, developer cannot read billing, and finance can manage billing without receiving API production access.

## F5 collection simulation

No payment links/attempts/credits/refunds are seeded. The existing issued invoice INV-MOCK-101 has KES 34,800.00 due and can receive a link to acc_kes. Reset/full reload clears all new records, IDs, outcome selection and shared idempotency keys, restores bank fixtures and the immutable issued invoice. Same-tab links preserve the in-memory store. New link/result capabilities use random test tokens; fixture IDs and fixed clock remain deterministic.

Start creates Processing only. Check original payment performs inquiry, defaulting to Pending confirmation. The development result-page controls configure pending/confirmed/failed for the next inquiry; they never mark payment via a URL or browser redirect. Confirmed inquiry posts/allocates once and creates a receipt; repeated inquiries preserve IDs and balances. Failed records have no allocation/receipt. Other links for the same invoice expose the original unresolved reference and block duplicates. Global unavailable scenario also affects public checkout/inquiry; UI retains original references.

Credit-note issue is immutable and moves no cash. Refund request requires paid customer credit and a confirmed original payment; it reserves the refundable amount and remains pending. Separate development controls on the invoice can simulate confirmed/failed refund events. Confirmation posts once; failure releases the reservation. Current receipt/invoice snapshots do not change. Partial payments retain exact balance due. Viewer reads only; developer cannot read billing; admin/finance manage collections. All ordinary collection requests retain the common 200ms delay; no scenario sends real money or messages.

Frozen clock remains 21 October 2026, 11:00 EAT, even when host date advances. Link expiry checks use that clock. Receipts are print views, not certified fiscal documents. Approval and provider execution are not implemented by mock controls.

## Provider-specific payment simulations

M-Pesa: select method, enter a test 07/01/+254 mobile, send simulated STK push, inspect masked destination/STK reference, then approve/cancel the on-screen phone prompt. One event is sent per idempotent create; no real phone receives anything, and there is no resend action during uncertainty. Approval records Authorized (simulated); cash stays unchanged until Check original payment returns Confirmed. Cancellation becomes Failed on inquiry, with no receipt/posting. Leave unapproved and inquire for Pending confirmation.

PesaLink: submit simulated transfer with original payment reference. Visa/Mastercard: authorize test hosted checkout with no card-number/CVV input. PayPal: approve on-screen without credentials or external redirects. Provider outcomes are per-attempt and cannot authorize another attempt. Legacy generic outcome controls remain only for legacy simulated attempts. Reset clears provider outcomes/events alongside all F5 state. Nothing logs full phone numbers; responses and records contain masked values and request fingerprints.

## F6 payments/cards scenarios and reset

Fixtures add three active masked KES beneficiaries, no F6 payout initially, two debit cards (one Active physical, one Frozen virtual) and one credit Design preview. Existing F2 account balances/legacy holds and all F5 provider fixtures remain unchanged until an explicit action. Card spend/activity is illustrative existing history and does not post another bank entry.

Create/review/edit a payment as Admin; submit to reserve principal. In Development tools select Finance and Apply scenario without reloading. The maker cannot approve their own payment. Finance can Approve, then separately Execute. Check original payment stays UNKNOWN by default. Development rail outcome → Confirmed/Definitive failure → Set simulated payout outcome → Check original payment resolves that same request. Outcome selection alone never changes cash. Reject with reason or maker cancellation before execution releases only its own reservation. Unknown holds never expire or release automatically.

Cards → Request new card: active member, KES account and limit hierarchy. Request starts Pending approval without last4; switch member → Approve card request → Approved for issuance → Simulate issuer confirmation → Active masked identifier. Freeze/unfreeze and limits are stored network mock actions. Replacement freezes the original and creates a linked request requiring the same sequence. Credit preview cannot mutate or issue.

Normal/empty/unavailable/stale/expired/denied scenarios apply to these APIs. Stale reads show freshness notices and reject F6 writes with 409. Viewer cannot create/approve/execute or control cards; developer cannot read banking/payment records. Insufficient available funds, archived beneficiary, stale versions, self-approval, inactive holder/approver, invalid limits and changed payload/key return explicit HTTP errors. Lists paginate at six rows with 200ms mock guard delay. Development outcome/issuer controls are excluded from release builds.

Development tools Reset or POST /api/__mock/reset restores beneficiaries/cards/payouts/idempotency/outcomes, all banking holds/transactions and the other business/billing/collection modules together. Full browser reload/new tab resets the entire in-memory worker, including identity back to Admin. Use in-app navigation to review cross-screen consistency; do not use reload as a persistence test. No storage credentials, real card/rail calls or handset notification exists.

## Card Show / Hide — 0.6.1

Admin/Finance: Cards → Show card details (or open a card detail) → see non-payable mock number, expiry and CVV → Hide card details. An automatic 60-second timer and blur/hidden-tab/navigation/context changes clear visible values. The number starts 0000; expiry 12/30 and CVV 000 are fixed placeholders. No real card is represented. Credit preview also supports this display simulation without issuing credit. Unissued requests and read-only roles cannot reveal. Mock disclosure has no cash or card lifecycle effects; reset behavior is unchanged. Real mode leaves reveal unavailable. There is no issuer credential or OTP to configure.

## F7 scenarios and reset

Open /reports for cash/aging/collection, /reports/exports for CSV jobs and /developers for the sandbox. Default Admin is sandbox-entitled. Finance can report/export but cannot use developer tools; Viewer reads reports without export. Developer role still requires both business and member sandbox entitlements and cannot submit production review. Use Team controls to change these; reselect a member as needed.

Use the existing development scenario/reset control to reset all state; a full page reload also restores deterministic fixtures and default identity. F7 resets apps, credentials, hooks, deliveries, logs, review requests, jobs and idempotency state together with banking/billing. Fresh credentials disclose random synthetic values once; IDs and outcomes reset deterministically. Empty, unavailable, stale and expired-session controls apply. export-failure fails the first report job attempt; retry preserves the captured CSV. export-expired prevents download.

Create an app/read scopes, create and close a credential, add an HTTPS *.example.test webhook with a permitted event, simulate failure then retry success. No receiver network request occurs. For production review, an active app/key and successful delivery on an active hook are prerequisites. Admin submission remains pending; no real access, email or operational secret is issued.

## Business sign-in and approvals

Start signed out at /login. All demo identities use non-secret challenge 246810: admin@business.sandbox, finance@business.sandbox, viewer@business.sandbox, developer@partner.sandbox. Invalid/wrong-surface identifiers fail; suspended members and expired sessions cannot access protected data. Sign out does not reset financial records. Sign in as the other member to approve an existing request without a reload. This enables review of maker/checker with one browser.

A non-secret development role marker in sessionStorage resumes a demo after reload; it is ignored by real mode. Reload still resets all financial fixtures, so no durable business state is claimed. Reset mock data restores fixtures and the Admin role; sign out/re-sign-in clears the identity marker. The expired scenario redirects to login; successful mock reauthentication clears that expiry scenario without retrying any payment. Existing scenario controls can still simulate role changes during a signed-in development session. They are not production identity controls.

## Expansion review/reset scenarios

Default policy is one authorizer; the initiating eligible member can confirm OTP 246810 and dispatch immediately. Set two in Settings → Approvals & invoice templates, authorize once as Admin, sign out/sign in as Finance, and authorize the same reference. Counts 3–5 require enough active eligible members; use existing team invitations/acceptance simulation and test email sign-in for additional members. Every order retains its original threshold when policy later changes. Challenges expire in two minutes, have three attempts, bind member/version and can be consumed once. No SMS/email is sent.

Choose confirmed/pending/failed on a new payment in mock mode. Submission reserves available cash; confirmed dispatch debits ledger once. Pending retains the reference and hold; set an explicit confirmed simulated outcome then check the original. Cancel/reject before dispatch or definitive failure releases only its hold. Success has an animated check with reduced-motion support. Public M-Pesa checkout shows a phone/waiting state until original inquiry confirms.

Create a supplier/payee and issue/receive an LPO: bank balance does not change. Payroll creates net-pay orders and reserves aggregate cash; each follows the same OTP policy. POS pending sales do not affect cash; explicit confirmation posts one incoming transaction. Loan preview issue creates a principal order; after OTP-confirmed disbursement, partial/full confirmed repayments post incoming cash and allocate the schedule. Loan monthly interest is flat on original principal. Real rails, statutory payroll, hardware POS and lending authority are not simulated as integrated services.

New signup creates a clean owner/business draft with zero accounts/funds and no developer grants, then enters onboarding. It resets the single-business fixture; use a signed-out/fresh demo. Full reload resets all finance/onboarding state. The existing Reset mock data control resets mandates, logo/templates, orders/challenges, suppliers/LPOs, employees/runs, terminals/sales and loans/repayments along with banking/billing. Old issued documents retain captured branding even if default appearance changes.

New tools honour empty/unavailable/stale/expired/permission states. Customer statements exclude pending collections and keep opening/running balances and currencies separate. Finance is denied Team; the seeded developer is explicitly sandbox-entitled, while removing either grant still denies API tools.
