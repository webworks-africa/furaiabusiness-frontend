> Current 0.10.1 additions and verification: [Restoration register](RESTORATION_REGISTER.md). Historical batch details below remain for context.

# Page inventory

All 41 uploaded HTML files were structurally inspected; every PNG was reviewed in a contact sheet. The overview PNG was also inspected at full size. References remain in the development repository under `design/references/stitch_furaia_business_banking_portal/`; the compact source download omits those reference-only assets. F1–F7 are mock-complete within documented boundaries; F8 is next. The 12 F7 references were also inspected at full size. No feature is API-integrated or staging-verified.

| Approved reference folder | Target route | Batch | Current implementation |
|---|---|---|---|
| `account_detail_primary_kes_settlement_furaia_business_portal` | `/accounts/:id` | F2 | Mock-complete masked identifiers, separate balances, holds, read-only limits/mandate, filtered activity and statement entry |
| `accounts_furaia_business_portal` | `/accounts` | F2 | Mock-complete account list, currency-scoped balances, name filter and sort |
| `api_credentials_furaia_business_portal` | `/developers/credentials` | F7 | Mock-complete; see F7_CHANGELOG for implemented workflow and limits |
| `api_request_logs_furaia_business_portal` | `/developers/logs` | F7 | Mock-complete; see F7_CHANGELOG for implemented workflow and limits |
| `applications_furaia_business_portal` | `/developers/applications` | F7 | Mock-complete; see F7_CHANGELOG for implemented workflow and limits |
| `beneficiaries_furaia_business_portal` | `/payments/beneficiaries` | F6 | Mock-complete masked destinations, search/pagination, create/archive and payment selection; no verified-name claim |
| `business_self_onboarding_flow_furaia_business_portal` | `/onboarding` | F3 | Mock-complete six-step save/resume, validated test uploads, review lock and requested-document resubmission |
| `card_controls_request_new_card_furaia_business_portal` | `/cards/request` | F6 | Mock-complete active-member debit request, separate approval/issuer event, spending/channel controls |
| `cards_overview_furaia_business_portal` | `/cards` | F6 | Mock-complete realistic card portfolio, masked identifiers, status/spend filters, paginated table |
| `cash_movement_report_furaia_business_portal` | `/reports/cash-movement` | F7 | Mock-complete; see F7_CHANGELOG for implemented workflow and limits |
| `convert_quotation_to_invoice_furaia_business_portal` | `/quotations/:id/convert` | F4 | Mock-complete review/convert action; creates linked draft invoice, issue stays separate |
| `create_payment_link_furaia_business_portal` | `/payment-links/new` | F5 | Mock-complete invoice/account/currency/expiry/partial configuration |
| `credit_card_detail_design_preview_furaia_business_portal` | `/cards/CARD-PREVIEW` | F6 | Design preview with illustrative limit; issuance, statements and repayments unavailable |
| `customer_detail_twiga_foods_supply_chain_ltd_furaia_business_portal` | `/customers/:id` | F4 | Mock-complete versioned profile/edit/archive and linked-document filters |
| `customers_furaia_business_portal` | `/customers` | F4 | Mock-complete searchable paginated contact table and separate KES/USD receivables |
| `debit_card_detail_furaia_business_portal` | `/cards/:id` | F6 | Mock-complete linked account, spending controls, freeze/unfreeze, replacement, activity and lifecycle |
| `developer_documentation_furaia_business_portal` | `/developers/docs` | F7 | Mock-complete; see F7_CHANGELOG for implemented workflow and limits |
| `developer_overview_furaia_business_portal` | `/developers` | F7 | Mock-complete; see F7_CHANGELOG for implemented workflow and limits |
| `export_status_panel_furaia_business_portal` | `/reports/exports` | F2/F7 | Mock-complete immutable report CSV jobs, polling, retry, expiry and download; bank statements remain /statements |
| `financial_reports_furaia_business_portal` | `/reports` | F7 | Mock-complete; see F7_CHANGELOG for implemented workflow and limits |
| `invoice_collection_report_furaia_business_portal` | `/reports/invoice-collection` | F7 | Mock-complete; see F7_CHANGELOG for implemented workflow and limits |
| `onboarding_status_service_eligibility_furaia_business_portal` | `/onboarding/status` | F3 | Mock-complete timeline/eligibility, separate account request and simulated zero-balance provisioning |
| `overview_furaia_business_portal` | `/` | F1/F2 | Mock-complete banking overview, KES cashflow, receivables and approval summaries; F4 supplies linked billing receivables; F6 connects actual payment requests and approvals |
| `pay_invoice_inv_2025_089_furaia_secure_checkout` | `/public/invoices/:token` | F5 | Mock-complete issued invoice summary, partial amount, pending attempt lock and link states |
| `payment_link_detail_lnk_live_89104_furaia_business_portal` | `/payment-links/:id` | F5 | Mock-complete state, revoke, checkout entry and related allocation events |
| `payment_links_furaia_business_portal` | `/payment-links` | F5 | Mock-complete searchable/state-filtered paginated invoice links |
| `payment_result_states_furaia_secure_checkout` | `/public/payments/:reference` | F5 | Mock-complete processing/pending/confirmed/failed inquiry and immutable receipt |
| `payment_review_confirmation_furaia_business_portal` | `/payments/:id` | F6 | Mock-complete versioned draft review/edit, submit/reserve, different-member approval, separate execution |
| `payment_status_furaia_business_portal` | `/payments/:id` | F6 | Mock-complete original-reference inquiry; UNKNOWN retains hold; confirmed/failed outcomes update ledger and transaction once |
| `payments_disbursements_furaia_business_portal` | `/payments` | F6 | Mock-complete search/status/pagination, account-scoped liquidity, approvals and linked destinations |
| `production_access_furaia_business_portal` | `/developers/production-access` | F7 | Mock-complete; see F7_CHANGELOG for implemented workflow and limits |
| `quotation_detail_q_2025_089_furaia_business_portal` | `/quotations/:id` | F4 | Mock-complete revision snapshots, recipient response and linked conversion |
| `quotation_editor_q_2025_089_furaia_business_portal` | `/quotations/:id/edit` | F4 | Mock-complete exact decimal line editor, validation and draft save |
| `quotations_furaia_business_portal` | `/quotations` | F4 | Mock-complete currency/status/customer/search filters and pagination |
| `receivables_aging_report_furaia_business_portal` | `/reports/receivables-aging` | F7 | Mock-complete; see F7_CHANGELOG for implemented workflow and limits |
| `send_money_furaia_business_portal` | `/payments/new` | F6 | Mock-complete KES source/destination/amount/reference validation, review before reservation |
| `statement_export_dialog_furaia_business_portal` | `/accounts/:id/statements` | F2 | Mock-complete CSV form, date presets, validation, idempotent creation and permission gates; certified PDF awaits backend |
| `transaction_detail_txn_90240_furaia_business_portal` | `/transactions/:id` | F2 | Mock-complete Completed, Pending confirmation and Failed details, original reference, refresh and audit timeline; fees/proof require backend fields |
| `transactions_furaia_business_portal` | `/transactions` | F2 | Mock-complete server filters, EAT dates, sorting, URL state, pagination and linked details |
| `webhook_delivery_detail_furaia_business_portal` | `/developers/webhooks/:id/deliveries/:delivery` | F7 | Mock-complete; see F7_CHANGELOG for implemented workflow and limits |
| `webhook_endpoints_furaia_business_portal` | `/developers/webhooks` | F7 | Mock-complete; see F7_CHANGELOG for implemented workflow and limits |

## Missing or incomplete visual references

- Internal invoice list/editor/issued-detail extend quotation tokens in F4; F5 implements public invoice checkout/read.
- Contact creation/edit extends the approved customer detail/list in F4.
- Receipts, credit notes and refund management: F5.
- Team invitations/roles are conservatively extended in F3. F6 adds payment queue and separate approval/execution.
- Business profile/security settings extend tokens in F3; session-expired uses the existing error boundary. Operational login/logout awaits backend.
- Onboarding steps 1–3, 5–6, rejected/resubmission and upload failure extend the approved document/status screens conservatively in F3.
- Public quotation acknowledgement uses the minimal public shell in F4; F5 implements payment-link checkout.
- Responsive layouts and global loading/empty/error states: inferred conservatively from the design specification.

Top-level later-batch navigation resolves to an explicit scheduled-status screen. F2 detail routes are implemented. Other nested target routes remain planned contracts for navigation, not promises that those screens exist yet. Unimplemented nested authenticated routes show a 404.

## F2 routes added beyond individual reference filenames

| Route | Status |
|---|---|
| /statements | Mock-complete bank statement export list; extends the approved export queue visual language |
| /statements/:id | Mock-complete Queued, Generating, Ready, Failed/retry and Expired states |
| /reports/exports | Report export center; bank statements remain /statements |

PDF certification, balance-file exports, real account opening, limit changes, fee/tax details and dispatch proofs are not simulated as working services. The bank statement path supports CSV only. This is an explicit capability boundary, not an API-integrated or certified statement implementation.

## F3 additional routes and visual assumptions

| Route | Status / visual source |
|---|---|
| /settings | Mock-complete business profile; existing shell, two-column panel/label conventions; legal identity read-only |
| /settings/security | Mock-complete stored policy and own mock session list; same settings subnavigation/panels |
| /team-and-approvals | Mock-complete members, invitations and readable role matrix; F6 links to /payments/approvals |

The document step follows the approved onboarding sidebar/content proportions. Steps without references reuse its form spacing, compact controls and status language. Kenya-only tax/phone fields, a single representative, four document categories and six steps are proposed assumptions. Settings and team have no approved screen and extend shared tokens without decorative charts. Mobile layouts stack content and preserve table scrolling. No internal operations or individual-customer dashboard is included.

## F4 additional routes and assumptions

| Route | Implementation |
|---|---|
| /customers/new | Versioned commercial contact create, duplicate email protection; no KYC claim |
| /quotations/new | Draft editor; customer selection, dates, scope, 1–30 lines, explicit discount/tax, notes/terms |
| /invoices | Currency/status/customer/search filters, pagination and exact issued outstanding total |
| /invoices/new; /invoices/:id/edit | Draft editor extending the approved quotation editor; only Draft is editable |
| /invoices/:id | Document snapshot/history and explicit immutable issue confirmation; outstanding receivable |
| /public/quotations/:token | Minimal shell, revision snapshot, explicit recipient consent/name, accept/decline; invalid/expired links surfaced |

Missing invoice screens conservatively reuse quotation hierarchy/line tables/summary. The reference's mixed tax arithmetic is replaced by a documented exact policy. Tax percentage is explicit per line and defaults to zero for new items; no tax class or statutory correctness is invented. No email/PDF/export/bulk/credit-score control is shown as working. Revision history exposes prior shared totals/scope/lines; full comparison and attachments need later contracts. Currency balances are separate, never consolidated with FX. Contacts are commercial records, not banking/KYC identities. Issued and accepted snapshots survive contact changes.

## F5 additional routes and visual assumptions

/public/payment-links/:token aliases invoice checkout. /receipts/:id is an authenticated printable immutable receipt. Credit notes/refund events live in the linked invoice collection panel; they have unique IDs, reasons and timestamps. Missing receipt/credit screens extend existing paper/financial event tokens. Checkout follows the approved narrow summary layout and forest header; unsupported regulation/rail/verification claims and card/phone credential fields are omitted. The provider selection update adds named on-screen simulators for unconnected rails. Closed links report no outstanding balance without inventing payment where credit notes cleared the invoice.


Payment options update: public checkout includes accessible provider radio tiles for M-Pesa/PesaLink/Visa/Mastercard/PayPal. The reference's M-Pesa phone/STK structure is implemented as an on-screen simulator; missing card/PayPal approval screens extend the same restrained public layout. No network logos, real partnership badges, credentials or external redirects are used. Mobile provider tiles stack in two columns. KES-only simulated mobile/bank methods are disabled on USD checkout.

## F6 additional routes and visual assumptions

/payments/approvals filters the same payments store to Awaiting approval. /payments/:id/edit permits only the maker’s Draft with optimistic version checks. The beneficiary reference modal is presented as an inline form beside the list, using the same compact fields/forest buttons without modal overflow. At narrow widths panels/cards stack and substantial tables scroll within their container.

Payment/source/destination/total and mandate sections follow the approved Send Money and review screens. Selected beneficiary determines the rail, rather than letting an incompatible rail override a saved destination. Cards keep approximately 1.586:1 proportions and the approved forest/neutral credit treatment. Sensitive reveal/OTP/PIN fields, regulatory/name-match/partnership badges, PDF controls, waitlist emails, fees/tax claims, bulk payment and global issuer controls are omitted until contracts exist. New-card requests do not imply issuance or physical delivery. Card activity is explicitly illustrative. Credit amounts represent no approved facility.

F6 scope: KES PesaLink, M-Pesa B2C and RTGS external payouts only; the checkout STK simulation remains the separate F5 collection flow. Internal/cross-currency transfers and production card services await confirmed contracts. Conservatively every payment needs a different approver, rather than fabricating a real amount threshold. Real fees and limits are not inferred from screenshot examples. No feature is API-integrated/staging-verified.

Card refinement 0.6.1: /cards, /cards/:id and /cards/CARD-PREVIEW share Show/Hide for explicitly non-payable development number/expiry/CVV values. The business credit face retains the approved black/metallic/lime design. Hidden/default/timeout/unauthorized/unissued/error states are implemented; production sensitive reveal stays unavailable until issuer integration. See CARD_DETAILS_CHANGELOG.md.

## Integrated Business entry

| Route | Status |
|---|---|
| /login | Mock-complete identifier/challenge validation, retry errors, temporary field visibility, safe return target and role-specific sign-in |
| /partners; /partners/login | Bridges uploaded platform entry to Business/login |
| /payments/approvals | Mock-complete maker/checker, approval distinct from execution; now tested across separate sign-ins |
| /app and /ops | Deferred source retained; no active Customer/Super Admin UI in this release |

Movement colours are shared across Business transactions/details, overview/cashflow, payments, card spending, collections/refunds and cash reports. All remain simulated.

## Business expansion routes — mock-complete within BUSINESS_EXPANSION.md

| Route | Workflow / states |
|---|---|
| /register | Contact challenge, clean business profile, unfunded onboarding, validation/denial |
| /send-money; /payments/new | Saved phone/bank recipient, exact amount/reference, reserve/review |
| /send-money/:id; /payments/PAY-ORDER-* | OTP, distinct approvals, pending original inquiry, rejection/cancellation, confirmed animation |
| /settings/workflows | Administrator mandate/optional FX policy, logo/default template/accent/footer |
| /customers/:id/statement | Running ledger, dates/currency, opening/closing, print/CSV |
| /procurement; /procurement/:id | Supplier create/edit/archive, LPO lines/draft/issue/receive/print |
| /payroll | Employee payees/gross/deductions/deactivate, reserved run, linked per-employee payments |
| /pos | Terminal state, pending sale and explicit confirmed/failed settlement |
| /loans | Preview draft/schedule, OTP principal issue, active/partial/full repayments |
| /api-banking; /docs; /developers/docs | Public overview and searchable grouped reference; permission-controlled tooling stays separate |

No new approved screens were supplied. These pages extend the existing shell/form/table language conservatively. Customer and Super Admin remain deferred; loan/physical POS/operational OTP capabilities are not claimed integrated.

## Restored document and supplier pages

/settings/tax: explicit tax demo; /settings/workflows: approval mandates; invoice template settings: existing template editor; /procurement/invoices and /procurement/payables: reviewed supplier intake and due payables; /public/suppliers/:token: external scoped upload. Private and public document views share PDF/print presentation with separate access boundaries. All additions are mock-complete, awaiting API confirmation.
