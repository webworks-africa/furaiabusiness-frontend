# Page-to-contract and permission traceability

All routes are target routes. O04/O05 have partial read functionality against mocks; other primary page functionality is pending. D1 shell tests are recorded separately and do not count as page completion. Real backend integration and staging evidence: none. Full content/actions/acceptance and nested view obligations are in page-inventory.json.

| Page | Frontend route | Target permission(s) | Batch | Evidence |
|---|---|---|---|---|
|O01|`/ops`|operations.view, governance.view|D2|Pending|
|O02|`/ops/customers`|customers.view, pii.reveal|D2|Pending|
|O03|`/ops/onboarding`|kyc.review|D2|Pending|
|O04|`/ops/accounts`|accounts.view|D2|D2a reads tested; governed actions pending|
|O05|`/ops/operations`|operations.view|D2|D2a reads tested; related evidence/inquiry pending|
|O06|`/ops/collections`|operations.view|D2|Pending|
|O07|`/ops/payouts`|operations.view|D2|Pending|
|O08|`/ops/holds`|holds.view|D2|D2b read lifecycle tested; exceptional proposals pending|
|O09|`/ops/ledger`|ledger.view, reports.export|D2|D2b journal reads tested; export/case workflow pending|
|O10|`/ops/reconciliation`|reconciliation.view|D2|Pending|
|O11|`/ops/reconciliation/exceptions`|reconciliation.view, reconciliation.resolve.propose|D5|Pending|
|O12|`/ops/approvals`|cases.approve, cases.reject|D5|Pending|
|O13|`/ops/adjustments`|adjustments.propose|D5|Pending|
|O14|`/ops/disputes`|disputes.manage (target extension)|D5|Pending|
|O15|`/ops/partners`|partners.review|D5|Pending|
|O16|`/ops/products`|policies.propose|D5|Pending|
|O17|`/ops/reports`|reports.export|D2|Pending|
|O18|`/ops/audit`|audit.view|D2|Pending|
|O19|`/ops/staff`|staff.access.propose|D2|Pending|
|O20|`/ops/integrations`|integrations.view (target extension)|D2|Pending|
|O21|`/ops/alerts`|alerts.view, alerts.acknowledge (target extensions)|D2|Pending|
|O22|`/ops/settings`|governance.view|D2|Pending|
|C01|`/app/register`|public anti-abuse|D3|Pending|
|C02|`/app/login`|public identity challenge|D3|Pending|
|C03|`/app/verification`|kyc.submit|D3|Pending|
|C04|`/app/accounts/open`|accounts.open|D3|Pending|
|C05|`/app`|balances.view|D3|Pending|
|C06|`/app/accounts`|balances.view|D3|Pending|
|C07|`/app/activity`|operations.view (customer target extension)|D4|Pending|
|C08|`/app/payments/transfer`|transfers.create|D4|Pending|
|C09|`/app/beneficiaries`|beneficiaries.manage (target extension)|D4|Pending|
|C10|`/app/payments/collect`|collections.create|D4|Pending|
|C11|`/app/payments/payout`|payouts.create|D4|Pending|
|C12|`/app/statements`|statements.export|D3|Pending|
|C13|`/app/profile`|profile.manage|D3|Pending|
|C14|`/app/security`|security.manage (target extension)|D3|Pending|
|C15|`/app/notifications`|notifications.manage (target extension)|D3|Pending|
|C16|`/app/support`|disputes.create|D3|Pending|
|C17|`/app/business/team`|business.team.manage (target extension)|D9|Pending|
|C18|`/app/business/approvals`|business.payments.propose, business.payments.approve (target extensions)|D9|Pending|
|P01|`/partners/register`|public anti-abuse|D6|Pending|
|P02|`/partners/login`|public identity challenge|D6|Pending|
|P03|`/partners/onboarding/organization`|organization.manage|D6|Pending|
|P04|`/partners/onboarding/verification`|organization.manage|D6|Pending|
|P05|`/partners/onboarding/status`|organization.manage|D6|Pending|
|P06|`/partners`|usage.view|D7|Pending|
|P07|`/partners/applications`|applications.manage|D7|Pending|
|P08|`/partners/credentials`|credentials.issue, credentials.rotate, credentials.revoke|D7|Pending|
|P09|`/developers/api`|public reviewed contracts|D6|Pending|
|P10|`/developers/guides`|public versioned guides|D6|Pending|
|P11|`/partners/sandbox`|sandbox.run (target extension)|D7|Pending|
|P12|`/partners/webhooks`|webhooks.manage|D7|Pending|
|P13|`/partners/webhooks/deliveries`|webhooks.manage|D7|Pending|
|P14|`/partners/logs`|logs.view|D7|Pending|
|P15|`/partners/usage`|usage.view|D7|Pending|
|P16|`/partners/customers`|customers.delegated.view (target extension)|D8|Pending|
|P17|`/partners/transactions`|finance.view|D8|Pending|
|P18|`/partners/reconciliation`|finance.view|D8|Pending|
|P19|`/partners/team`|team.manage|D7|Pending|
|P20|`/partners/billing`|finance.view|D8|Pending|
|P21|`/partners/production-access`|production_access.submit|D8|Pending|
|P22|`/partners/support`|support.manage (target extension)|D8|Pending|
|P23|`/partners/security`|organization.security.manage, audit.view (partner target extensions)|D7|Pending|

## D1b supporting traceability

All 63 primary pages remain pending. Supplemental /ops/access, /app/access and /partners/access screens share foundation controls and do not create a 64th primary page. They support future C14/P23 security work and O19 governed staff access without completing their documented workflows.

| Shared dependency | Target operations per surface | Enforcement | Evidence |
|---|---|---|---|
| Session lifecycle | GET /session; POST /session/extensions | identity boundary, CSRF, idle/absolute policy | hardening.test.ts; hardening.spec.ts expiry/revalidation |
| Scoped history | GET /me/sessions | principal ownership, capability, context, cursor binding | hardening.test.ts; shared-controls.test.tsx; 3 browser surfaces |
| Privileged session action | POST /step-up/challenges; POST /step-up/challenges/{id}/verifications; DELETE /me/sessions/{id} | version, capability, CSRF, action/resource/session binding, single use | tests/hardening.test.ts; browser cancellation and current/other revocation |
| Session CSV | POST /exports; GET /exports/{id}; GET /exports/{id}/download | immutable snapshot, idempotency, single-use grant, ownership, authorization and expiry | tests/hardening.test.ts; real CSV download in each mock browser |
| Interrupted financial command | future GET /operations/{id}; shared recovery helper | UNKNOWN inquiry only, preserved original key/payload | hardening.test.ts helper only; D4 workflow pending |

OpenAPI contains 42 executable foundation operations across 36 paths. The original register retains 141 documented page dependencies; supplemental contracts are specified in OpenAPI and this table. Actual Laravel mappings and staging evidence remain absent.


## D2a implementation evidence

| Page | Executable target contracts | Delivered read behavior | Remaining |
|---|---|---|---|
| O04 Accounts | GET /ops/v1/accounts; GET /ops/v1/accounts/{id}; OpsAccount/List | Server filters, 25/100 pagination, entity/environment/capability checks, masked owner, exact posted/held/available balance, policy version, linked transaction query, current snapshot label | Controlled suspension, closure and limit proposal workflows D5; primary page partial |
| O05 Transactions | GET /ops/v1/operations; GET /ops/v1/operations/{id}; OpsOperation/List | Kind/state/account/reference/provider/date filters, timelines, provider/request/correlation IDs, UNKNOWN retained hold, independent account authorization | Journal/hold/callback document links D2b/c; authorized inquiry/investigation D5; primary page partial |

Evidence: tests/operations.test.ts (7), tests/operations-ui.test.tsx (3), tests/e2e/operations.spec.ts (4). No real route mapping or staging evidence. Global contract check now verifies 46 executable operations, 40 paths and the unchanged 141 documented dependencies. Other primary page functionality remains pending.


## D2b financial evidence traceability

| Page | Typed target paths | Delivered | Remaining |
|---|---|---|---|
| O08 | GET /ops/v1/holds; GET /ops/v1/holds/{id}; OpsHold/List | State/expiry/account/operation/currency/date filters; immutable lifecycle; retained UNKNOWN hold; capture journal and independently authorized account/transaction links | Exceptional hold proposal actions D5 |
| O09 | GET /ops/v1/journals; GET /ops/v1/journals/{id}; OpsJournal/List, JournalLine | Template/reference/account/operation/currency/period filters; snapshot pagination; balanced lines and server-total consistency; PT-15 case/maker/checker/digest references | Filtered export D2e; full governed case detail D5 |
| O05 | Existing operation detail | Query links to scoped holds/journals; UNKNOWN yields no settlement journal | Callback documents D2c; inquiry command D5 |

Evidence: ledger.test.ts (8), ledger-ui.test.tsx (3), ledger.spec.ts (4). Ledger/hold endpoints independently require ledger.view/holds.view, do not inherit operation access, and repeat entity/environment authorization. These two capabilities are granted only to the synthetic Operations identity. Contract totals: 44 paths, 50 executable operations, original 141 page dependencies retained. No additional primary pages. O08/O09 remain partial and do not count as fully delivered pages.


## D2c rail evidence

| Page | Contracts | Delivered | Remaining |
|---|---|---|---|
| O06 | GET /ops/v1/collections; /collections/{id}; /collections/{id}/receipt; /provider-events/{id} | Masked payer, filters/cursors, gross/fee/net amounts, real mock PDF, duplicate delivery with one journal, unmatched suspense and sanitized evidence | Governed exception resolution D5 |
| O07 | GET /ops/v1/payouts; /payouts/{id}; /provider-events/{id} | Masked destination, ageing/date filters, submission/inquiry timeline, UNKNOWN retained hold, independent record links | Investigation and authorized inquiry command D5 |
| O05/O08/O09 | Existing detail contracts | Rail links, PROCESSING payout holds, unmatched receipt suspense journals, collection fee/net balanced entries | Existing governed/export dependencies |

Evidence: rails.test.ts (10), rails-ui.test.tsx (3), rails.spec.ts (5). Full suite 76 tests and 28 browser journeys. No backend/staging evidence. Both primary pages remain partial.


## D2d customer and KYC read traceability

| Page | Executable paths | Read behavior | Remaining |
|---|---|---|---|
| O02 | GET /ops/v1/customers; /customers/{id} | Masked search, state/risk/tenant/type filters, scoped cursor snapshot, consent/KYC history, independent account/application links | Audited PII reveal; suspension/KYC-review proposals D5 |
| O03 | GET /ops/v1/onboarding; /onboarding/{id}; /onboarding/{id}/evidence/{evidenceId} | Applicant/reviewer/age filters, policy/requirements, immutable reviewer history, CLEAN-only sanitized evidence, direct quarantine denial | Assignment; evidence requests; verification/rejection proposals D5 |
| O04 | Existing account detail | Independently authorized owner customer link | Existing governed actions |

Evidence: customers.test.ts (7), customers-ui.test.tsx (2), customers.spec.ts (4). O02/O03 primary pages remain partial. Separate auth contexts preserved. No actual backend or staging mapping.


## D2e financial reporting traceability

| Page | Contracts | Delivered | Remaining |
|---|---|---|---|
| O10 | GET /ops/v1/reconciliation/runs; /runs/{id} | Scoped filters/cursors, immutable revision/ingestion identity, prior run, matches/unmatched/UNKNOWN/amendment observations, equation totals, alert decision | Authorized ingestion requests and exception resolution D5 |
| O17 | GET /ops/v1/reports; /daily-close; POST /exports; GET /exports/{id}; /exports/{id}/download | Scoped CSV report catalog, read-only close assessment, exact currency totals/holds/UNKNOWN ageing/blockers, asynchronous exports with immutable retry identity, step-up, expiry/failure, checksum verified before download | Real integration and staging; frontend complete against mocks for target report types |
| O09 | Existing filtered journal list + financial exports | Export all matching journal lines at watermark, filters consistent with list, independent ledger.export permission | Governed adjustment/case workflows D5 |

Evidence: reports.test.ts11, reports-ui.test.tsx2, financial-export-ui.test.tsx4, reports.spec.ts4. No per-row fetches. Exceptions route remains explicitly scheduled D5. Model signatures/digests are synthetic; browser mocks do not establish backend authorization or accounting certification.


## D2f operational control traceability

| Page | Typed contracts | Delivered | Remaining |
|---|---|---|---|
| O18 | GET audit-events/list/detail; GET/POST audit-verifications; GET verification/{id}; shared export jobs | Actor/action/resource/outcome/date filters, frozen cursor snapshot, sanitized immutable detail, pinned sequence/head verification with mismatch evidence, actual filtered CSV/checksum/step-up | Real anchored audit provenance, backend/staging |
| O19 | GET staff/list/detail; GET role-matrix | Masked principal/binding/MFA/expiry/history/scope grants, role/state/scope/expiry filters, separation duties preview | Governed provisioning/grants/revocation D5 |
| O20 | GET integrations/list/detail | Provider/environment/health filters, manifest/credential reference, certification evidence, callback health/statement lag, unmistakable fake vs uncertified external adapter | Configuration/key-rotation proposals D5 |
| O21 | GET alerts/list/detail; POST acknowledgements | State/severity/type/environment filters, deduplicated occurrences, transport attempts, recovery history, own reviewed note/version, replay-safe acknowledgement with one audit effect | Incident handling and authorized delivery retry D5 |
| O22 | GET governance/settings; PATCH me/preferences | Historical gate state/age/validation, stale refuses write authority, currency registry, policy filter/procedure links, own versioned preferences, mandatory notices preserved | Actual deployment system/server enforcement, integration/staging |

Evidence: controls.test.ts12, controls-ui.test.tsx4, controls.spec.ts6. Browser coverage includes verified subset/failed full chain, actual full32-event CSV, acknowledgement→immutable audit event, disabled staff preview, fake/uncertified adapters, preferences→audit, stale gate, cursor/no-results/date validation at720px and direct CSRF/scope denial. 63 pages retained;149 explicit page dependencies;81 executable operations/74 paths. Browser mock guards do not prove real authorization, provider certification, audit completeness or accounting assurance.
