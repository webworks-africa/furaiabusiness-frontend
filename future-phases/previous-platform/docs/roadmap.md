# Delivery roadmap

All 63 pages remain the delivery objective. No route stub is a completed page. Every feature exit requires list/detail/form/actions as relevant, loading/empty/no-result/error/restricted states, domain services, reviewed schemas, deterministic stateful MSW workflows, targeted tests, browser evidence and page traceability updates.

| Batch | Scope | Measurable exit | Status |
|---|---|---|---|
| D0 | Full inventory, contracts, permission and gap mapping | 63 IDs; every documented dependency registered; no false Laravel mapping; workflow obligations captured | Target mapping complete; actual route mapping deferred to integration |
| D1a | First foundation delivery | 3 independent builds; strict TS/lint; identity fixtures; scoped shells; logout/cache isolation; controlled 401/403/409/422/429/503; browser journeys; no production mock artifacts | Implemented; see verification.md for actual evidence |
| D1b | Identity and shared workflow hardening | Session expiry warning/extension, MFA/step-up target contracts, authorization-revocation UI test, reusable cursor/filter/export patterns, recovery behavior | Frontend complete against mocks; see D1b verification. Real MFA and backend integration pending |
| D2 | O01–O10, O17–O22 read capabilities | Aggregate/list parity, authorized details, timestamps/stale states, safe exports; no per-row fetches | Read slices complete against mocks; remaining governed dependencies explicitly assigned to D5 |
| D3 | C01–C06, C12–C16 | Contact/verification/opening workflows, ownership, quarantine, statements, profile/security/support flows | D3a workflow slice implemented against mocks; remaining D3b/D3c dependencies open |
| D4 | C07–C11 | Exact replay, immutable payload, gate denial, UNKNOWN holds, duplicate submits and provider scenarios | Pending |
| D5 | O11–O16 mutations and governed staff grants | Distinct maker/checker, expected_version race, tamper/expiry, BLOCKED retry and case/journal traceability | Pending |
| D6 | P01–P05, P09–P10 | KYB remediation, isolated entitlement, public generated docs and executable quickstarts | Pending |
| D7 | P06–P08, P11–P15, P19, P23 | Credential once/rotation/revoke, webhooks/replay, environment/tenant/role restrictions, sanitized logs and quotas | Pending |
| D8 | P16–P18, P20–P22 | Delegated R1 commands, scoped reports, commercial evidence and controlled production activation | Pending |
| D9 | C17–C18 | Business grants/last owner, frozen proposal and distinct customer approver | Pending |
| D10 | Integration, staging and handover | Actual endpoint/auth mapping, provider/security/accounting/accessibility/load/restore evidence; signed release scope | Pending |

Dependencies: D1a → D1b → first feature slices D2/D3/D6; D3 → D4; Operations case contracts → D5; D6 → D7 → D8; customer and case foundations → D9; all feature and integration slices → D10. D2/D3/D6 do not depend on each other's UI delivery. Work proceeds in bounded sequential related batches in this workspace.

Frontend-complete against mocks, real-backend-integrated and staging-verified are separate fields. Initial status for every primary page is pending, with no CI/staging feature evidence. First-batch tests establish foundation behavior only. No production activation is implied.


## D2 bounded slices

| Slice | Scope and exit | Status |
|---|---|---|
| D2a | O04/O05 scoped lists, URL filters, cursors, detail balances/timelines, UNKNOWN hold explanation, independently authorized links, loading/empty/error/denial, browser scope isolation | Read slice implemented against mocks; full pages partial |
| D2b | O08/O09 hold lifecycle and immutable balanced journal details; link transactions to actual evidence | Read slice complete against mocks; full pages partial |
| D2c | O06/O07 collection receipt and payout attempt/inquiry evidence; matching and uncertainty | Read slice complete against mocks; full pages partial |
| D2d | O02/O03 customer/KYC read views with quarantine and masked identity; extend governed dependencies register | Read slice complete against mocks; primary pages partial |
| D2e | O10/O17 reconciliation, reproducible report exports and explicit daily-close blockers | Frontend slice complete against mocks; O10 ingestion/exception actions remain D5 |
| D2f | O18–O22 audit, staff matrix, integration certification, alert delivery and governance; authorized preferences/acknowledgement and audit verification/export workflows | Frontend slice complete against mocks; governed O19/O20/O21 dependencies remain D5 |
| D2g | O01 aggregates derived from completed domain datasets; source queue parity, freshness and independently authorized links | Frontend read slice complete against mocks; incident case detail remains D5 |

D2 read slices are complete against mocks. D2a does not complete O04/O05 governed actions; their remaining workflows are recorded in inventory. No incomplete page is reported fully complete. Later slices use these typed account/transaction foundations; the 63-page objective remains unchanged.

D2b exit evidence: 63 API/component tests and 23 browser journeys; three production builds and mock-exclusion. Journal export remains D2e; exceptional hold actions and full PT-15 case workflow remain D5.


D2c exit: 76 API/component tests, 28 browser journeys, scoped PDF receipt download and one-effect replay assertions. Collection matching/investigation mutations remain D5. Next bounded slice: D2d customer and KYC read views. The complete 63-page objective is unchanged.


D2d exit verified: masked customer and application reads, clean evidence access and direct quarantined-evidence denial; full regression suite and three builds. Remaining privileged forms/actions are assigned to D5. Next slice D2e: reconciliation/reports and ledger exports. All63 pages remain the objective.

D2d regression evidence:85 API/component tests,32 browser journeys, typecheck/lint/contracts, three builds and production mock-exclusion passed locally. Windows checks pending.


D2e exit includes report/ledger CSV workflows and read-only close assessment, reconciliation read evidence and prior run preservation. Remaining ingestion/exception commands require D5 authority; no silent financial correction or daily-close transition. Next D2f: audit/staff/integrations/alerts/governance read surfaces and authorized safe acknowledgement/preferences workflows. The complete63-page objective remains unchanged.


D2f exit: scoped lists/details, immutable audit evidence and pinned verification/export, staff matrix, explicit fake/uncertified adapters, stateful alert acknowledgement and versioned personal preferences. All implemented actions have typed contracts and mock server guards; no direct role grant, key rotation, delivery retry or money gate override. Next bounded slice D2g: O01 source-derived Operations overview, freshness and queue parity. All63 primary pages and their documented workflows remain the objective.


D2g closes the source-derived overview and read-only outbox evidence slice. Account balances and active holds are point-in-time by currency; creation-date/provider filters affect operations/outbox and statement filters affect reconciliation. Aggregates derive the same datasets as source queues; every source is separately redacted without its grant. No new primary page is invented: outbox list/detail are O01 diagnostic views. O01 remains partial until incident detail is implemented in D5. Next bounded batch D3a: Account Holder registration/contact verification, identity evidence and account-opening eligibility/request workflows (C01–C06 foundation), with explicit ownership and review states. Remaining D3 slices cover statements/profile/security/support. All 63 pages remain the objective.

D2g actual exit:84 operations/77 paths/151 dependencies; strict TS/lint/contracts;130 API/component tests and48 browser journeys;3 production builds/mock-exclusion. Desktop and720px visuals inspected. Real integration/staging/Windows current-delivery verification pending. Incident detail remains a D5 acceptance dependency, so full O01 completion is not claimed.


## D3 bounded slices

| Slice | Scope and measurable exit | Status |
|---|---|---|
| D3a | C01 registration/contact continuation; C03 policy draft, actual multipart evidence, signature/quarantine scan states, frozen submission, review/remediation; C04 policy eligibility/consent, immutable opening and zero balance with committed-response-loss retry; C05/C06 owned reads to inspect result; mobile390px and cross-context denial | Implemented against mocks; see verification.md |
| D3b1 | C02 approved recovery/session revocation, C05 profile projection and C06 account-bound step-up closure; ownership/error/lost-response/mobile regressions | Implemented against mocks; final checks below |
| D3b2 | C12 statements/documents and C07 receipt dependencies with scoped exports/checksums, exact posted balances and date validation | Next |
| D3c | C13–C16 profile/notification/security/support workflows; remaining C05 overview actions and deep links | Pending |

D3a does not claim full C02/C05/C06 completion. Existing C02 sign-in remains the foundation; verified recovery is D3b. C05 recent activity and C06 account-filtered activity depend on D4. C03 fixture policy is Kenya-only and accepts individual/business documents with an18-year adult threshold; none of these synthetic policies, terms, fees or review decisions are regulatory or product approval. Every documented page and workflow remains the objective. Next D3b: account-holder recovery, statements/receipts and policy-controlled closure requests.

D3a actual exit:98 operations/89 paths/156 dependencies; strict TS/lint/contracts;148 API/component tests and55 full-regression browser journeys;three production builds and mock-exclusion. C01/C03/C04 complete against mocks; C05/C06 partial. Next D3b remains recovery, statements/receipts and policy-controlled closure. Real backend/staging/Windows current-delivery evidence pending.

D3b is delivered in bounded dependent slices D3b1 then D3b2. C13 is Profile and Consents, as specified, not receipts; its write workflows remain D3c. No D3b statement or receipt completion is claimed in D3b1. Cards are an explicit user extension nested under C05/C06, with issuer policy/ownership/stateful workflows and responsive personal/business designs delivered in a D4 card slice. C05 recent-transaction summary uses the same owned source as C07 in D4, with separate currency amounts and truthful status. See cards-and-homepage.md.

D3b1 actual exit:109 operations/99 paths/171 dependencies; strict TS/lint/contracts;167 API/component tests and61 browser journeys;3 production builds/mock-exclusion. New approved recovery/session revocation, masked profile and governed closure are implemented against mocks; full C02/C05/C06/C13 remain partial as recorded. Next D3b2 statements/documents/scoped receipts, then D3c and D4 owned activity/payments/cards/home summaries. Backend/staging/Windows delivery evidence pending.
