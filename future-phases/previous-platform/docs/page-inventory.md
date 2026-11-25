# Complete page and workflow inventory

Source: attached specification v1.0, 1 October 2026. All 63 primary pages retained. Feature workflows pending; D1 shells do not satisfy page acceptance.



## O01 — Overview

Route: `/ops` · Batch: D2

Live operational position by legal entity and currency.



**Content:** Outstanding operations by state, UNKNOWN count, hold exposure, latest reconciliation run, break count, gate state, outbox lag, alert delivery state

**Filters:** Legal entity; date; provider; currency

**Actions:** Open filtered queues and incident detail; acknowledge an alert only when granted

**API dependency:** GET /ops/v1/overview

**Acceptance:** Aggregates reconcile to their source lists; freshness is visible; incompatible currencies are not summed.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



## O02 — Customers

Route: `/ops/customers` · Batch: D2

Search and review customers within granted scopes.



**Content:** Customer ID, masked name/contact, tenant, state, risk tier, account count, last activity; detail includes KYC history, consents and linked records

**Filters:** ID; masked contact search; state; tier; tenant

**Actions:** Open detail, request authorized PII reveal, propose suspension or KYC review; never directly mark VERIFIED

**API dependency:** GET /ops/v1/customers; GET /ops/v1/customers/{id}

**Acceptance:** A cross-tenant search returns no restricted rows; reveals are audited; linked account access is independently authorized.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



## O03 — Onboarding reviews

Route: `/ops/onboarding` · Batch: D2

Review submitted customer or business evidence.



**Content:** Application, applicant type, submitted evidence, scan status, outstanding requirements, reviewer history, policy version

**Filters:** State; age; assigned reviewer; applicant type

**Actions:** Assign review, request evidence, propose verification or rejection via registered workflow

**API dependency:** GET /ops/v1/onboarding; POST /ops/v1/onboarding/{id}/review-requests

**Acceptance:** Quarantined evidence cannot be opened; review history persists; reviewer cannot bypass final decision authority.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



D2a status: read slice implemented and tested against mocks; full primary page partial. See traceability.md for remaining workflows.

## O04 — Accounts

Route: `/ops/accounts` · Batch: D2

Inspect account lifecycle and ownership.



**Content:** Account ID, owner, product, currency, legal entity, state, posted/held/available balance, policy version

**Filters:** Owner; product; state; currency; entity

**Actions:** Open detail; propose suspension, closure or limit change where policy permits

**API dependency:** GET /ops/v1/accounts; GET /ops/v1/accounts/{id}

**Acceptance:** Balance labels match backend semantics; account closure with funds or active obligations is refused by server.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



D2a status: read slice implemented and tested against mocks; full primary page partial. See traceability.md for remaining workflows.

## O05 — Transactions

Route: `/ops/operations` · Batch: D2

Investigate transfer, collection and payout outcomes.



**Content:** Operation ID, kind, amount, fee, currency, status, business reference, provider reference, timestamps, request/correlation IDs

**Filters:** Kind; state; time; account; provider reference

**Actions:** Open timeline, related journals, holds, callbacks and evidence; authorized inquiry request

**API dependency:** GET /ops/v1/operations; GET /ops/v1/operations/{id}

**Acceptance:** UNKNOWN remains distinct from failure; provider evidence never authorizes a duplicate submission from the UI.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



## O06 — Collections

Route: `/ops/collections` · Batch: D2

Monitor incoming collection instructions and receipts.



**Content:** Instruction, payer reference masked, expected/received amount, fee, receipt evidence, state and linked journal

**Filters:** Provider; state; date; unmatched receipt

**Actions:** View receipt and inbound evidence; open associated reconciliation exception

**API dependency:** GET /ops/v1/collections; GET /ops/v1/collections/{id}

**Acceptance:** Duplicate receipt shows one financial effect; unmatched receipts link to the exception workflow.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



## O07 — Payouts

Route: `/ops/payouts` · Batch: D2

Monitor outgoing instructions and settlement.



**Content:** Destination masked, held amount, provider state, instruction ID, attempts, inquiry evidence and settlement due date

**Filters:** Provider; state; ageing; date

**Actions:** View instruction and inquiry timeline; open investigation; no blind resend

**API dependency:** GET /ops/v1/payouts; GET /ops/v1/payouts/{id}

**Acceptance:** Accepted timeout displays UNKNOWN and preserves hold; confirmed failure evidence is required for release.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



D2b status: read slice implemented and tested against mocks; full primary page partial. See traceability.md for remaining workflows.

## O08 — Holds

Route: `/ops/holds` · Batch: D2

Inspect reserved funds and lifecycle.



**Content:** Hold ID, account, operation, amount, creation/expiry times, lifecycle state, uncertainty reason, capture/release journal

**Filters:** State; expiry; account; operation

**Actions:** View evidence and lifecycle; propose any permitted exceptional action

**API dependency:** GET /ops/v1/holds; GET /ops/v1/holds/{id}

**Acceptance:** UNKNOWN-aware expiry is explained; terminal transitions cannot be forced in the browser.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



D2b status: read slice implemented and tested against mocks; full primary page partial. See traceability.md for remaining workflows.

## O09 — Ledger and journals

Route: `/ops/ledger` · Batch: D2

Read immutable accounting evidence.



**Content:** Journal ID, posting time, template, reference kind/ID, legal entity, currency and balanced debit/credit lines

**Filters:** Journal; account; reference; template; period

**Actions:** View linked operation/case; authorized filtered export

**API dependency:** GET /ops/v1/journals; GET /ops/v1/journals/{id}

**Acceptance:** PT-15 journals link to the maker-checker case; no edit or delete affordance exists; line totals balance.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



## O10 — Reconciliation runs

Route: `/ops/reconciliation` · Batch: D2

Inspect ingestion and matching results.



**Content:** Provider, entity, currency, statement date/digest, run state, counts, equation components, alert threshold decision

**Filters:** Date; provider; state; entity

**Actions:** View observations/matches; open exceptions and amendment history; authorized ingestion request

**API dependency:** GET /ops/v1/reconciliation/runs; GET /ops/v1/reconciliation/runs/{id}

**Acceptance:** Re-ingestion identity and amended-file exceptions are visible; prior completed runs are not overwritten.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



## O11 — Reconciliation exceptions

Route: `/ops/reconciliation/exceptions` · Batch: D5

Investigate financial breaks with evidence.



**Content:** Exception ID, type, expected/observed amount, difference, references, age, severity, owner and resolution case

**Filters:** Type; severity; state; age; assignee

**Actions:** Assign investigation, attach evidence, propose resolution; financial correction requires a separate adjustment case

**API dependency:** GET /ops/v1/reconciliation/exceptions; POST /ops/v1/cases

**Acceptance:** Resolution does not silently post money; approved closure records evidence and the linked journal if a separate adjustment occurred.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



## O12 — Approvals

Route: `/ops/approvals` · Batch: D5

Decide governed privileged changes.



**Content:** Case kind, maker, payload digest, evidence, scope, financial impact, expiry, version, decision and execution state

**Filters:** Kind; state; scope; maker; execution state

**Actions:** Approve, reject, request evidence, cancel where permitted; execution follows registered kind

**API dependency:** GET /ops/v1/cases; POST /ops/v1/cases/{id}/decisions

**Acceptance:** Own-case approval is denied server-side; concurrent decisions have one winner; BLOCKED is shown as retryable separately from approval.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



## O13 — Manual adjustments

Route: `/ops/adjustments` · Batch: D5

Propose approved PT-15 corrections.



**Content:** Approved template, permitted source/destination, currency, amount, reason code, narrative, evidence and preview lines

**Filters:** Template; case state; reason; entity

**Actions:** Preview and propose; distinct approver decides; executor posts through ledger gateway

**API dependency:** GET /ops/v1/adjustment-templates; POST /ops/v1/adjustments/preview; POST /ops/v1/cases

**Acceptance:** Cannot choose arbitrary accounts outside template policy; furaia_app execution posts balanced journal with reference to case; gate denial creates no journal.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



## O14 — Disputes

Route: `/ops/disputes` · Batch: D5

Track customer-reported transaction problems.



**Content:** Dispute ID, operation, complainant, category, evidence, assignee, response due date, case history

**Filters:** State; category; overdue; owner

**Actions:** Assign, request evidence, record outcome; propose correction separately

**API dependency:** GET /ops/v1/disputes; POST /ops/v1/disputes/{id}/responses

**Acceptance:** Dispute closure does not mutate a posted journal; customer sees only customer-visible notes.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



## O15 — Partners

Route: `/ops/partners` · Batch: D5

Review partner organizations and production access.



**Content:** Organization, application state, verified business evidence, requested scopes, readiness checks, active apps and environment

**Filters:** State; organization; requested product; review age

**Actions:** Request evidence, approve/reject scoped access through governance, suspend credentials under controlled policy

**API dependency:** GET /ops/v1/partners; GET /ops/v1/partners/{id}; POST /ops/v1/cases

**Acceptance:** Applicant cannot activate own production; approval is bound to environment, app and reviewed scope set.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



## O16 — Products and limits

Route: `/ops/products` · Batch: D5

Inspect and propose versioned account policy.



**Content:** Product code/version, entity, eligibility, currency, fees, tier limits, effective dates, active accounts

**Filters:** Entity; product; effective state

**Actions:** View policy differences and impact; propose version change through maker-checker

**API dependency:** GET /ops/v1/products; GET /ops/v1/policies; POST /ops/v1/cases

**Acceptance:** Existing accounts retain their effective policy until a controlled migration; previewed changes show affected scope.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



## O17 — Reports and daily close

Route: `/ops/reports` · Batch: D2

Produce scoped operational and accounting reports.



**Content:** Close date/state, totals per currency, unresolved breaks, outstanding holds, UNKNOWN ageing, report version and data watermark

**Filters:** Report type; date; entity; currency

**Actions:** Generate/download authorized reports; request daily-close assessment

**API dependency:** GET /ops/v1/reports; POST /ops/v1/exports; GET /ops/v1/daily-close

**Acceptance:** Close blockers are explicit; report is reproducible from its snapshot; no UI click labels an unresolved day reconciled.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



## O18 — Audit trail

Route: `/ops/audit` · Batch: D2

Explore immutable events and integrity evidence.



**Content:** Timestamp, actor, action, resource, outcome, request/correlation IDs, event digest and verification result

**Filters:** Actor; action; resource; outcome; time

**Actions:** View sanitized metadata; authorized export; request integrity verification

**API dependency:** GET /ops/v1/audit-events; GET /ops/v1/audit-verifications

**Acceptance:** Integrity status distinguishes verified, failed and not checked; absence of an audit row for a rolled-back transaction is not fabricated.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



## O19 — Staff and access

Route: `/ops/staff` · Batch: D2

Inspect staff membership and governed grants.



**Content:** Staff principal, active identity binding, roles, tenant/entity grants, MFA state, access expiry and history

**Filters:** Role; state; scope; expiry

**Actions:** Propose provisioning, grants, revocation; show access preview and separation duties

**API dependency:** GET /ops/v1/staff; GET /ops/v1/role-matrix; POST /ops/v1/cases

**Acceptance:** No self-elevation; disabled staff cannot reuse sessions; external SSO groups alone do not authorize money.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



## O20 — Integrations

Route: `/ops/integrations` · Batch: D2

Inspect rail and KYC adapter readiness.



**Content:** Provider, capability manifest version, credential reference, certification state, callbacks health, statement lag

**Filters:** Provider; environment; health

**Actions:** View certification evidence; propose configuration or key rotation; no secret display

**API dependency:** GET /ops/v1/integrations; GET /ops/v1/integrations/{id}

**Acceptance:** Fake and certified adapters are unmistakable; secrets are represented by references only.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



## O21 — Alerts and delivery

Route: `/ops/alerts` · Batch: D2

Investigate governance and platform alarms.



**Content:** Alert type, scope, threshold/window, first/last occurrence, delivery attempts, SNS message reference and recovery

**Filters:** State; severity; type; environment

**Actions:** View evidence, acknowledge if granted, open incident; delivery retry only if authorized

**API dependency:** GET /ops/v1/alerts; POST /ops/v1/alerts/{id}/acknowledgements

**Acceptance:** Delivery acceptance is not labeled email receipt; repeated alarms deduplicate and recovery history remains.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



## O22 — Settings and governance

Route: `/ops/settings` · Batch: D2

Inspect environment and controlled runtime policy.



**Content:** Environment, deployed version, gate state/age, last validation, feature policy version, currency registry and notification preferences

**Filters:** Environment; policy kind

**Actions:** Edit personal notification preferences; link to controlled flag deployment and key rotation procedures

**API dependency:** GET /ops/v1/governance; GET /ops/v1/settings; PATCH /ops/v1/me/preferences

**Acceptance:** Production-impacting changes do not bypass external two-person deployment approval; stale true is never shown as permission to write.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



## C01 — Registration

Route: `/app/register` · Batch: D3

Create a customer identity and accept applicable terms.



**Content:** Email or phone, verification channel, country, applicant type, terms/privacy versions and consent timestamps

**Filters:** Not applicable

**Actions:** Register, verify contact, resume verification; do not open a financial account automatically

**API dependency:** POST /v1/registrations; POST /v1/registrations/{id}/verify

**Acceptance:** Contact challenge is rate-limited; duplicate registration does not enumerate other users.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



## C02 — Sign in and recovery

Route: `/app/login` · Batch: D3

Authenticate account holder and recover access.



**Content:** Identifier, authentication challenge, MFA when required, recovery case reference

**Filters:** Not applicable

**Actions:** Sign in, recover access, revoke lost-device sessions after verified recovery

**API dependency:** POST /v1/sessions; POST /v1/recovery-requests

**Acceptance:** Recovery cannot bypass identity proof or reveal account existence; sessions are invalidated according to policy.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



## C03 — Identity verification

Route: `/app/verification` · Batch: D3

Submit and track personal or business verification.



**Content:** Legal name, birth date for individuals, residency, document type/number masked, address, evidence and outstanding checks

**Filters:** Applicant type; application state

**Actions:** Save draft, upload evidence, submit, respond to review request

**API dependency:** GET /v1/me/verification; POST /v1/me/verification/submissions

**Acceptance:** Required fields follow server jurisdiction/product policy; user cannot submit VERIFIED as a state.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



## C04 — Account opening

Route: `/app/accounts/open` · Batch: D3

Open an eligible account using product policy.



**Content:** Eligible products, entity disclosure, KES currency, terms, eligibility, fee/limit summary and policy version

**Filters:** Applicant type; eligible product

**Actions:** Select product, accept terms, submit idempotent account-opening request

**API dependency:** GET /v1/products/eligible; POST /v1/accounts

**Acceptance:** Unverified or suspended customers are rejected; duplicate opening request returns the same account; opening balance is zero.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



## C05 — Overview

Route: `/app` · Batch: D3

Show own accounts and recent activity.



**Content:** Available/held/posted totals per currency, account tiles, pending verification, recent operations, required actions

**Filters:** Active customer/business context

**Actions:** Open account, transfer, statement, verification or support

**API dependency:** GET /v1/me; GET /v1/me/overview

**Acceptance:** Only owned or granted accounts are included; multi-currency amounts are never blended.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



## C06 — Accounts and balances

Route: `/app/accounts` · Batch: D3

Inspect own account details and product terms.



**Content:** Account identifier, product, currency, status, available/held/posted amounts, limits and as-of timestamp

**Filters:** State; product

**Actions:** Open account detail and account-filtered activity; request closure through policy workflow

**API dependency:** GET /v1/accounts; GET /v1/accounts/{id}; POST /v1/accounts/{id}/closure-requests

**Acceptance:** Manipulated account ID cannot expose another principal; closure eligibility is enforced on server.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



## C07 — Activity and transaction detail

Route: `/app/activity` · Batch: D4

Track operation outcomes and receipts.



**Content:** Kind, amount, fee, status, source/destination masked, references, timeline and provider evidence summary

**Filters:** Account; date; kind; status

**Actions:** View receipt, copy safe reference, open dispute and download permitted receipt

**API dependency:** GET /v1/operations; GET /v1/operations/{id}

**Acceptance:** Accepted is not labeled completed; exact replay restores the original operation; internal audit and staff notes are absent.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



## C08 — Internal transfer

Route: `/app/payments/transfer` · Batch: D4

Move funds between authorized accounts.



**Content:** Source, recipient identifier/name confirmation, amount, fee, reference, available funds, limit check and preview expiry

**Filters:** Source account; saved recipient

**Actions:** Preview, confirm, submit with idempotency key, view resulting operation

**API dependency:** POST /v1/transfers/internal/preview; POST /v1/transfers/internal

**Acceptance:** Server validates ownership and recipient policy; insufficient funds, changed-body conflict and gate-disabled cases preserve safe retry.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



## C09 — Beneficiaries

Route: `/app/beneficiaries` · Batch: D4

Manage permitted payment destinations.



**Content:** Display name, destination kind, masked details, validation state, created/updated times

**Filters:** Kind; name; active state

**Actions:** Add, verify, edit non-financial label, archive; sensitive destination changes require revalidation

**API dependency:** GET /v1/beneficiaries; POST /v1/beneficiaries; PATCH /v1/beneficiaries/{id}

**Acceptance:** No beneficiary ownership leakage; destination validation results expire under policy; archived records remain in historical receipts.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



## C10 — Add money and collections

Route: `/app/payments/collect` · Batch: D4

Create supported collection instruction.



**Content:** Target account, amount, permitted rail, payer details masked, expiry, reference and charges

**Filters:** Target account; permitted rail

**Actions:** Preview/create collection, show provider instructions, track pending receipt

**API dependency:** POST /v1/collections/preview; POST /v1/collections

**Acceptance:** Do not mark account credited before confirmed receipt and posting; instruction is labeled sandbox where fake rail is active.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



## C11 — Payouts

Route: `/app/payments/payout` · Batch: D4

Send funds through an approved outbound rail.



**Content:** Source, validated beneficiary, amount, fees, total reservation, estimated timing, limit check and provider

**Filters:** Source; beneficiary; rail

**Actions:** Preview, confirm, submit, track status and held funds

**API dependency:** POST /v1/payouts/preview; POST /v1/payouts

**Acceptance:** UNKNOWN locks retry guidance to status inquiry; no release or resend button; state changes follow provider evidence.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



## C12 — Statements and documents

Route: `/app/statements` · Batch: D3

Obtain account history and product documents.



**Content:** Account, inclusive date range, opening/closing posted balance, fees, entries, export state and document version

**Filters:** Account; date; format PDF or CSV

**Actions:** Generate statement, download scoped export, read account terms

**API dependency:** GET /v1/accounts/{id}/statements; POST /v1/exports

**Acceptance:** Statement balance is posted balance and holds are separately explained; export download authorization is checked.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



## C13 — Profile and consents

Route: `/app/profile` · Batch: D3

Maintain contact information and consent records.



**Content:** Masked identity, contact verification state, address-change request, communication preferences and consent history

**Filters:** Not applicable

**Actions:** Update contact through challenge, request material identity change, manage optional consent

**API dependency:** GET /v1/me; PATCH /v1/me/preferences; POST /v1/me/profile-change-requests

**Acceptance:** Mandatory processing notices are separate from optional marketing; identity changes do not silently erase KYC evidence.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



## C14 — Security and devices

Route: `/app/security` · Batch: D3

Manage own authentication and active sessions.



**Content:** MFA enrollment state, device/session list, sign-in history and recovery methods

**Filters:** Active sessions; date

**Actions:** Enroll/recover MFA, revoke session, change authentication secret with step-up

**API dependency:** GET /v1/me/sessions; DELETE /v1/me/sessions/{id}; POST /v1/me/mfa/enrollments

**Acceptance:** Current and other-session revocation are explicit; secrets and recovery codes display once and never enter telemetry.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



## C15 — Notifications

Route: `/app/notifications` · Batch: D3

Read customer-visible status updates.



**Content:** Category, operation/support reference, timestamp, read state and delivery preference

**Filters:** Unread; category; date

**Actions:** Mark read, open linked owned resource, change optional preferences

**API dependency:** GET /v1/me/notifications; PATCH /v1/me/notifications/{id}

**Acceptance:** A deep link repeats resource authorization; notifications never reveal complete beneficiary or identity data.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



## C16 — Support and disputes

Route: `/app/support` · Batch: D3

Raise questions and dispute a specific operation.



**Content:** Ticket category, operation reference, narrative, scanned evidence, state and customer-visible responses

**Filters:** State; category

**Actions:** Create ticket/dispute, reply, submit evidence, view progress

**API dependency:** GET /v1/me/support-tickets; POST /v1/disputes; POST /v1/me/support-tickets

**Acceptance:** Duplicate disputes are linked; staff-only notes remain hidden; submission never triggers an automatic reversal.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



## C17 — Business organization and team

Route: `/app/business/team` · Batch: D9

Manage scoped business membership.



**Content:** Business profile, verified status, members, invitations, roles, account grants and permission preview

**Filters:** Member state; role; account

**Actions:** Invite/revoke member and propose sensitive role changes under organization policy

**API dependency:** GET /v1/businesses/{id}/members; POST /v1/businesses/{id}/invitations

**Acceptance:** Only granted businesses appear; owner cannot remove the last authorized owner without a replacement procedure.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



## C18 — Business payment approvals

Route: `/app/business/approvals` · Batch: D9

Apply customer organization dual control to payments.



**Content:** Proposal, maker, amount/fee, beneficiary version, expiry, policy version, approver and execution outcome

**Filters:** State; amount; account; maker

**Actions:** Propose, approve/reject/cancel, request refreshed preview on expiry

**API dependency:** GET /v1/businesses/{id}/payment-cases; POST /v1/businesses/{id}/payment-cases

**Acceptance:** Maker cannot approve own payment; frozen amount and beneficiary cannot change after approval; funds and gate are checked at execution.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



## P01 — Partner registration

Route: `/partners/register` · Batch: D6

Start self-service partner onboarding.



**Content:** Business email, name, country, password or federated sign-in, terms/privacy acceptance

**Filters:** Not applicable

**Actions:** Register, verify contact and enter organization setup

**API dependency:** POST /partner/v1/registrations; POST /partner/v1/registrations/{id}/verify

**Acceptance:** No production credential is issued; automated abuse controls and duplicate-safe registration apply.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



## P02 — Partner login and recovery

Route: `/partners/login` · Batch: D6

Authenticate a human partner member.



**Content:** Login identifier, MFA, recovery status and organization memberships

**Filters:** Not applicable

**Actions:** Sign in, recover with evidence, select authorized organization

**API dependency:** POST /partner/v1/sessions; POST /partner/v1/recovery-requests

**Acceptance:** Human session is not usable as a machine API key; organization switching clears prior data.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



## P03 — Organization setup

Route: `/partners/onboarding/organization` · Batch: D6

Create an organization and describe intended integration.



**Content:** Legal/trading names, registration country/number, business type, website, address, contact, expected products/volumes

**Filters:** Not applicable

**Actions:** Save draft and submit business verification application

**API dependency:** POST /partner/v1/organizations; PATCH /partner/v1/organizations/{id}

**Acceptance:** Organization is unique under verified registration identity; owner membership is transactional with organization creation.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



## P04 — Business verification

Route: `/partners/onboarding/verification` · Batch: D6

Submit required KYB and authorized-person evidence.



**Content:** Registration documents, ownership/director evidence, authorized representative, business model, source/use of funds and review requests

**Filters:** Requirement state

**Actions:** Upload scanned evidence, save draft, submit and answer reviewer requests

**API dependency:** GET /partner/v1/organizations/{id}/verification; POST /partner/v1/organizations/{id}/verification/submissions

**Acceptance:** Evidence checklist is server-policy-driven; personal owner data is restricted to designated roles.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



## P05 — Application status

Route: `/partners/onboarding/status` · Batch: D6

Explain onboarding decision and next steps.



**Content:** Submitted time, state, missing evidence, reviewer requests, sandbox entitlement and decision summary

**Filters:** Application version

**Actions:** Respond, withdraw before decision where allowed, request review under policy

**API dependency:** GET /partner/v1/organizations/{id}/onboarding

**Acceptance:** Status separates contact verified, KYB approved, sandbox active and production approved.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



## P06 — Partner overview

Route: `/partners` · Batch: D7

Show scoped integration and operational health.



**Content:** Environment, active apps, traffic/errors, quota usage, webhook failures, pending access request and permitted financial summaries

**Filters:** Environment; app; period

**Actions:** Open diagnostics, credentials, docs or production checklist

**API dependency:** GET /partner/v1/overview

**Acceptance:** Production metrics never appear in sandbox scope; financial totals require finance permission.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



## P07 — Applications

Route: `/partners/applications` · Batch: D7

Define each integration with independent permissions.



**Content:** Application name, purpose, callback origins, environment, requested/granted scopes, status and owner

**Filters:** Environment; state

**Actions:** Create/edit sandbox app, request production counterpart, archive after dependencies resolved

**API dependency:** GET /partner/v1/applications; POST /partner/v1/applications; PATCH /partner/v1/applications/{id}

**Acceptance:** Approved scope expansion requires review; archive does not delete transaction evidence.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



## P08 — API credentials

Route: `/partners/credentials` · Batch: D7

Issue and control machine credentials.



**Content:** Credential ID/prefix, app, environment, granted scopes, created/expiry times, last use and revocation state

**Filters:** Application; environment; state

**Actions:** Issue scoped key, show secret once, rotate with bounded overlap, revoke with step-up

**API dependency:** GET /partner/v1/credentials; POST /partner/v1/credentials; POST /partner/v1/credentials/{id}/rotations; DELETE /partner/v1/credentials/{id}

**Acceptance:** Secrets are stored as hashes where verification permits; private signing material is KMS-managed if asymmetric; revoked keys fail immediately under published propagation bound.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



## P09 — API documentation

Route: `/developers/api` · Batch: D6

Publish accurate versioned integration contracts.



**Content:** Environment base URLs, endpoint groups, auth/scopes, schemas, examples, errors, pagination, idempotency and lifecycle states

**Filters:** API version; product; search

**Actions:** Read, download OpenAPI, copy examples, follow migration guide

**API dependency:** GET /developers/openapi/{version}; GET /developers/changelog

**Acceptance:** Docs are generated from reviewed contract; unsupported operations are excluded or explicitly future; no real secret in examples.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



## P10 — Integration guides

Route: `/developers/guides` · Batch: D6

Explain complete partner implementation journeys.



**Content:** Quickstart, authentication, account ownership, money submission, callbacks, reconciliation, limits and recovery

**Filters:** Language; product; guide

**Actions:** Follow reproducible sandbox steps in PHP, JavaScript and curl examples

**API dependency:** Static versioned guides plus reviewed OpenAPI examples

**Acceptance:** Examples execute against simulator fixtures; guide explains ACCEPTED and UNKNOWN without unsafe retry advice.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



## P11 — Sandbox testing

Route: `/partners/sandbox` · Batch: D7

Exercise deterministic integration scenarios.



**Content:** App, synthetic identities/accounts, scenario catalog, test result, operation ID and readiness checklist

**Filters:** Scenario; app; run state

**Actions:** Seed isolated test resources, trigger permitted fake scenarios, reset own synthetic dataset

**API dependency:** POST /partner/v1/sandbox/runs; GET /partner/v1/sandbox/runs/{id}

**Acceptance:** Reset cannot reach production; scenario tests cover success, reject, timeout, duplicates and reordered callbacks.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



## P12 — Webhook endpoints

Route: `/partners/webhooks` · Batch: D7

Configure partner notification destinations.



**Content:** HTTPS URL, subscribed event types, environment, signing key version, endpoint state and last delivery

**Filters:** Environment; app; state

**Actions:** Create, challenge verify, edit subscriptions, rotate signing secret, disable

**API dependency:** GET /partner/v1/webhook-endpoints; POST /partner/v1/webhook-endpoints; PATCH /partner/v1/webhook-endpoints/{id}

**Acceptance:** Server rejects private/link-local/metadata targets and rechecks resolved destinations on send; signing secrets show once.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



## P13 — Webhook deliveries

Route: `/partners/webhooks/deliveries` · Batch: D7

Investigate delivery and controlled replay.



**Content:** Event ID, type/version, endpoint, attempts, response code, latency, next retry, terminal state and sanitized payload

**Filters:** Event; endpoint; state; period

**Actions:** View attempts and request replay of same event with audit

**API dependency:** GET /partner/v1/webhook-deliveries; POST /partner/v1/webhook-deliveries/{id}/replays

**Acceptance:** Replay retains event identity and cannot create a second financial effect; logs omit credentials and excessive response bodies.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



## P14 — API request logs

Route: `/partners/logs` · Batch: D7

Diagnose partner request failures.



**Content:** Timestamp, app/key prefix, method/path template, status, stable error code, request ID and latency

**Filters:** App; status; request ID; time

**Actions:** View sanitized detail and link owned operation; export if granted

**API dependency:** GET /partner/v1/request-logs; GET /partner/v1/request-logs/{id}

**Acceptance:** No request secret/raw KYC body is returned; cross-partner identifiers cannot resolve.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



## P15 — Usage and quotas

Route: `/partners/usage` · Batch: D7

Track enforced request and product limits.



**Content:** Requests, 429 count, quota limit/remaining/reset, transaction limits and scoped usage trends

**Filters:** Period; app; route group; environment

**Actions:** Inspect quota policy, request reviewed increase

**API dependency:** GET /partner/v1/usage; GET /partner/v1/quotas; POST /partner/v1/quota-change-requests

**Acceptance:** Charts reflect enforcement counters; UI does not interpret advisory headers as proof of real quotas.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



## P16 — Customers and accounts

Route: `/partners/customers` · Batch: D8

Inspect resources explicitly delegated to partner.



**Content:** Partner customer reference, consent/delegation state, masked customer, accounts, permitted balances and product

**Filters:** Reference; account; delegation state

**Actions:** Create onboarding request if product permits; inspect authorized resources

**API dependency:** GET /partner/v1/customers; GET /partner/v1/accounts; POST /partner/v1/customer-onboarding-requests

**Acceptance:** Partner cannot claim any Furaia customer by knowing an ID; creation does not bypass KYC/account eligibility.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



## P17 — Partner transactions

Route: `/partners/transactions` · Batch: D8

Track API-initiated financial operations.



**Content:** Operation, app, customer reference, kind, amount/fee, currency, state, idempotency reference and provider-safe timeline

**Filters:** State; app; customer; period

**Actions:** View permitted details, receipt and support case; no arbitrary ledger posting

**API dependency:** GET /partner/v1/operations; GET /partner/v1/operations/{id}

**Acceptance:** Partner operations use R1 command handlers with scoped delegation, not an independent ledger write path.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



## P18 — Reconciliation and settlement

Route: `/partners/reconciliation` · Batch: D8

Compare partner records with authorized Furaia reports.



**Content:** Report period, entity/currency, opening/closing exposure where contract applies, gross/fee/net totals, settlement status and exception reference

**Filters:** Period; currency; report type

**Actions:** Download permitted reports, submit discrepancy with evidence

**API dependency:** GET /partner/v1/reports; POST /partner/v1/discrepancies

**Acceptance:** Settlement account data is contract-scoped; raw safeguarding bank statements are never exposed by default.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



## P19 — Team and roles

Route: `/partners/team` · Batch: D7

Manage partner member access and invitations.



**Content:** Member, role, app/environment grants, MFA status, invite expiry and last activity

**Filters:** Role; state; app

**Actions:** Invite, grant permitted roles, revoke and view permission preview with step-up

**API dependency:** GET /partner/v1/members; POST /partner/v1/invitations; PATCH /partner/v1/members/{id}

**Acceptance:** No user grants a capability they cannot administer; last owner and self-elevation controls are enforced.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



## P20 — Billing and commercial terms

Route: `/partners/billing` · Batch: D8

Show contracted fees and invoice history.



**Content:** Commercial plan/version, usage units, fees/tax, invoice period/status and downloadable document

**Filters:** Period; invoice state

**Actions:** Read/download invoices, raise billing query; no card collection unless separately specified

**API dependency:** GET /partner/v1/commercial-terms; GET /partner/v1/invoices

**Acceptance:** Before a billing engine exists show approved commercial terms without invented invoice totals; billed usage is traceable and adjustments auditable.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



## P21 — Production access

Route: `/partners/production-access` · Batch: D8

Request reviewed production activation.



**Content:** Approved KYB, app/scopes, test results, webhook readiness, support contacts, security declaration and terms version

**Filters:** Application state

**Actions:** Submit, respond to evidence request, view approved scope and activation decision

**API dependency:** POST /partner/v1/production-access-requests; GET /partner/v1/production-access-requests/{id}

**Acceptance:** Sandbox keys never become production keys; activation requires staff approval and backend readiness gate.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



## P22 — Support and service status

Route: `/partners/support` · Batch: D8

Raise integration issues and inspect service communication.



**Content:** Ticket, request/operation ID, sanitized evidence, incident notices and response timeline

**Filters:** State; category; environment

**Actions:** Create/reply ticket, attach evidence, subscribe to notices

**API dependency:** GET /partner/v1/support-tickets; POST /partner/v1/support-tickets; GET /partner/v1/service-status

**Acceptance:** No promise of an SLA is fabricated; response target is read from signed commercial policy.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



## P23 — Organization security and audit

Route: `/partners/security` · Batch: D7

Inspect security settings and member action history.



**Content:** Sessions, MFA, approved origins/network policy where supported, credential events and organization audit

**Filters:** Actor; action; period

**Actions:** Revoke own sessions, configure permitted policies with step-up, export scoped audit

**API dependency:** GET /partner/v1/security; GET /partner/v1/audit-events; DELETE /partner/v1/sessions/{id}

**Acceptance:** Partner audit contains only own organization events; policy edits cannot lock out all recovery authority without verification.



Required UI states: loading, empty, no results, error, restricted access, detail, relevant forms/actions.



## D2c update

O06 Collections and O07 Payouts now have complete mock read slices, filter forms, detail evidence, loading/empty/error/restricted states. O06 matched receipt PDF and sanitized inbound evidence are executable. Unmatched receipts link to a suspense journal and the pending exception queue. O07 separates submission from inquiry, preserving UNKNOWN holds without resend. Both primary pages remain partial until governed exception/investigation workflows are delivered.


## D2d update

O02 Customers and O03 Onboarding reviews now have masked read lists/details, filters, cursors, history/consents, independent account/application links and restricted/loading/empty/error states. CLEAN evidence may open through a separately authorized endpoint. QUARANTINED/PENDING/REJECTED evidence cannot be opened even by direct endpoint request. Assignment, PII reveal, evidence requests and suspension/verification/rejection proposals remain D5; primary pages remain partial.


## D2e status

O10 reconciliation list/detail shows immutable revisions, ingestion identities, statement digest, counts/observations and ledger consistency totals. Ingestion/exception decisions remain D5; primary page partial. O17 scoped operational/accounting CSV catalog, asynchronous generate/status/download workflow and daily-close assessment are frontend complete against mocks. Inline export details include state, checksum, watermark and report version. Daily-close BLOCKED reasons, holds and UNKNOWN ageing remain per currency; no control marks a blocked day closed. O09 filtered ledger export delivered; governed case actions remain D5. Backend/staging verification remains absent.


## D2f status

O18 audit list/detail includes sanitized metadata, request/correlation IDs, immutable SHA-256 evidence, filtered CSV and request/status/history for pinned chain verification. NOT_CHECKED, VERIFIED and FAILED remain distinct. O19 staff list/detail and scoped role matrix are delivered; governed provisioning/grants/revocation remain D5. O20 adapter list/detail distinguishes FAKE/SIMULATED from EXTERNAL/NOT_CERTIFIED, with credential references only; configuration/rotation remain D5. O21 list/detail preserves deduplication counts, transport attempts and recovery history; authorized acknowledgement changes state/version and appends one audit event. Incident workflows and authorized delivery retry remain D5. O22 displays stale gate refusal, currency registry, filterable controlled procedures and own versioned notification preferences. Mandatory security notices cannot be disabled. All implemented slices include filters/forms as relevant and loading/empty/error/restricted handling. Real integration and staging remain unverified; all 63 pages remain the delivery objective.


## D2g status

O01 overview read slice and its outbox list/detail are implemented against mocks. Date/provider/currency queue navigation, per-source restrictions, historical freshness, exact separate-currency positions, latest reconciliation version and stateful alert counts are covered. Incident reference is visible in alert detail; incident case detail/retry remain D5. Thus O01 is partial, not full frontend completion. Customer/partner homepages remain their existing foundation. See JSON inventory and contract register for exact traceability.


## D3a status

C01, C03 and C04 workflows are frontend-complete against mocks for this slice: contact/consent continuation, policy draft and scanned evidence, server-controlled synthetic review/remediation, and idempotent zero-balance opening. C05/C06 now provide owned account reads needed to inspect results; they remain partial for profile/recent activity, account-filtered activity and closure. C02 recovery remains D3b. No real KYC approval, regulated account, backend enforcement or production entitlement is established. All63 pages remain in scope.

## D3b1 and user-requested cards extension

C02 approved recovery/contact continuation and session revocation are implemented against mocks; assisted-review integration remains D3c. C05 masked profile projection and C06 controlled closure requests are delivered; C13 is a read slice only, with edits/optional consents still D3c. C05/C06 now include account-specific debit-card views and a homepage card summary as an explicit user-requested extension. Recent transactions share C07 owned activity in D4. No cards are issued or fabricated in D3b1. See cards-and-homepage.md and the contract register for future acceptance. The original63 primary pages remain intact; extension views are nested under C05/C06.
