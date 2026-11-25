# Observed verification — Batch D0/D1a

Date: 1 October 2026. Runtime: Node 24.19.0 / npm 11.9.0, Linux. Tests exercise frontend against deterministic MSW network mocks. Windows PowerShell commands are supplied in README; no Windows runtime execution is claimed.

| Check | Observed result |
|---|---|
| npm ci --offline | Passed; 345 packages installed in 7 seconds from exact lockfile |
| npm run contracts:generate | Passed; OpenAPI 3.1 types generated with openapi-typescript 7.13.0 |
| npm run contracts:check | Passed; 63 pages, 141 documented page/endpoint dependencies, 18 executable identity operations |
| npm run typecheck | Passed; strict TypeScript with noUncheckedIndexedAccess and exactOptionalPropertyTypes |
| npm run lint | Passed; ESLint |
| npm run test | Passed; 18 tests across 2 files |
| npm run test:e2e | Passed; 7 Chromium browser journeys, final run 12.1 seconds |
| npm run build | Passed; Operations, Customer and Partner each built independently |
| npm run build:check | Passed; all three outputs exclude mock worker, fixture identities/CSRF and mock setup |
| Visual inspection | Desktop Operations and 390px Customer screenshots inspected; Partner small-screen evidence saved |
| Remote CI | Not run; workflow committed for a future external repository |
| Actual Laravel integration | Not performed |
| Staging verification | Not performed |

Browser evidence: all surfaces reject wrong-domain fixture identifiers, accept their own synthetic identity, switch authorized context, deny production access and sign out. Customer mobile navigation and horizontally scrollable tables remain usable at 390px. Keyboard-only sign-in works. A revoked mock session is discovered on next protected read and clears the workspace. Browser DELETE without CSRF returns 403. Partner at 720px with 200% text size has no page-level horizontal overflow. These checks do not establish a full WCAG audit.

API/component evidence: owned scope/environment selection, domain interchange, missing CSRF, authorization loss, version/validation/rate/dependency errors and Retry-After, large integer-string money formatting, frozen retry utility, empty table and accessible validation. Startup dependency failure displays a retry state rather than pretending the user has no session. No localStorage credentials are written.

Failures encountered and resolved: MSW 3 renamed onUnhandledRequest to onUnhandledFrame; fixture challenge labels included error text in accessible names; a reserved error-code enum required an explicit fallback response type; Vite wildcard bind triggered a container network-enumeration error. All were corrected before the successful checks above.

Environment-only browser limitation: the standard Playwright Chromium CDN download returned an invalid archive. For this Linux run, Chromium 153.0.8010.0 was extracted from @sparticuz/chromium 153.0.0 via npm into /tmp and selected through PLAYWRIGHT_CHROMIUM_EXECUTABLE. It is not a project dependency or deliverable. Normal Windows setup uses npx playwright install chromium. The optional executable override remains available for controlled CI environments.

See evidence/operations-desktop.png, customer-mobile.png and partner-small-screen.png. All primary page workflows are still pending; D1a evidence is not substituted into feature page CI or staging fields.


# Observed verification — D1b

Date: 1 October 2026. Local Linux mock verification: contracts check passed (63 pages, 141 documented dependencies, 42 executable operations); strict typecheck and lint passed; Vitest passed 42 tests across four files (final run 2.65 seconds); Chromium Playwright passed 15 tests (20.0 seconds). All three production builds and mock-exclusion checks passed. Vite reports a 512 kB entry chunk warning; route splitting remains a performance follow-up before broad feature delivery. No dependency changes; root package version advances to 0.2.0.

The expanded tests cover challenge binding/expiry/single-use/lockout, version conflicts, authorization revalidation, current and other session revocation, snapshot pagination/filter isolation, asynchronous CSV and idempotent concurrent creation, expiry/restriction failures, dialog cancellation, cache clearance and UNKNOWN recovery helper behavior. Browser journeys download and inspect actual CSV files on all three surfaces. Clock-controlled expiry/extension and mobile controls were verified. Desktop and mobile screenshots inspected and saved in docs/evidence/*-d1b-*.png. Full financial recovery UI remains pending.

A browser test found a late-401 race that erased the sign-out expiry message; the authenticated-session guard now preserves the notice after local termination. Another mobile test needed to open the navigation drawer before following the access link. These issues were corrected before the 15-test passing run. Browser binary override is the same controlled Linux setup documented above.

User-supplied Windows output establishes D1a checks passed with Node 24.21.0/npm 11.19.0: npm ci (zero vulnerabilities), generated contracts, contract check, typecheck, lint, 18 tests, seven Playwright journeys, three production builds and mock-exclusion. D1b Windows checks have not yet been run. Remote CI, actual backend integration and staging remain unverified. Browser mock authorization cannot establish backend enforcement.


# D1b Windows verification received

The user supplied actual Windows v0.2.0 output on 1 October 2026: generated contracts, contract check (42 operations), typecheck, lint, 42 tests, 15 browser journeys, all three builds and mock-exclusion passed. The 512 kB bundle warning was nonfatal. This establishes frontend behavior against mocks on Windows, not real integration or staging.


# Observed D2a verification — 1 October 2026

Linux Node 24.19.0/npm 11.9.0: npm ci succeeded with the unchanged pinned dependency versions. Initial offline install lacked cache entries; regular installation succeeded. contracts:generate and contracts:check passed (63 pages, 141 documented dependencies, 46 executable operations/40 paths). Strict typecheck and lint passed. Vitest passed 52 tests across six files (6.61 seconds final run). Chromium Playwright passed all 19 journeys (34.8 seconds final run). All three real-mode builds and build:check passed; initial entry chunks 440.74 kB, largest separately loaded shared-table chunk 54.54 kB, with no 500 kB warning. No performance/Lighthouse or remote CI claim is made.

New tests cover stable cursors and filter/authorization/context binding, exact large-integer balances, masked owned-scope rows, independently authorized detail links, UNKNOWN hold evidence, validation/rate/dependency failures, loading then genuine empty lists, retry behavior and Retry-After controls. Browser evidence includes account-to-transaction links, UNKNOWN without resend, invalid-cursor recovery, capability loss and scope switch hiding previous detail at 720px. Saved desktop UNKNOWN and small-screen Accounts screenshots were visually inspected. Full accessibility audit is not claimed.

Browser testing initially found filter accessible names incorporating option labels; explicit aria-labels fixed the control names. The old foundation test still expected Transactions to be pending; it now checks the still-pending Customers route. Rerun passed before delivery. The standard Chromium CDN download again yielded an invalid archive; test-only Chromium 153 from @sparticuz/chromium was extracted outside the repository and selected with the existing executable override. It is not a project dependency or required on Windows.

D2a Windows execution remains pending. User Windows D1b results above establish the starting baseline. O04/O05 are partial primary pages; read slice only is frontend-complete against mocks. Actual Laravel mappings, staging and live-money verification remain absent.


# D2a Windows verification received

User output on 1 October 2026 confirms v0.3.0 Vitest 52 tests, Playwright 19 journeys, three builds and production mock-exclusion passed on Windows. Initial bundles 440.74 kB with no 500 kB warning. This received output did not include contract/typecheck/lint commands; no new Windows pass for those commands is inferred.

# Observed D2b verification — 1 October 2026

Linux Node24.19.0/npm11.9.0: generated OpenAPI0.4.0 types and contract check passed (63 inventory pages,141 dependencies,50 executable operations/44 paths); strict typecheck and lint passed. Vitest passed63 tests across8 files in3.37 seconds. Playwright Chromium passed23 browser journeys in28.5 seconds. All3 production builds and mock-exclusion passed; initial chunks441.81–441.82 kB, no bundle warning. No dependency versions changed. Browser used the existing test-only Chromium153 outside the repository; Windows uses its installed standard Playwright browser.

New checks: overdue UNKNOWN holds remain active/no journal; captured hold links match transaction/currency; confirmed failure releases without fabricated settlement; stable journal pagination and context-bound cursor; PT-15 case metadata and distinct actors; tampered/unbalanced/malformed/huge line amounts; capability and entity denial; loading/empty resource, integrity alert and cooldown UI. Browser journeys verify transaction→hold, captured hold→journal→transaction, PT-15 filtered details, no edit/delete/release/resend controls, date validation and small-screen entity-change denial. Screenshot evidence in hold-unknown.png, journal-pt15.png and ledger-small.png. PT-15 desktop and small-screen ledger screenshots inspected. Journal integrity checks verify frontend consistency only, not cryptographic provenance, backend authorization or accounting certification.

D2b Windows verification pending; real Laravel integration, staging and external CI not performed. O08/O09 remain partial primary pages until the recorded export/exception/case dependencies are delivered.


## Observed D2c verification — 1 October 2026

Linux Node 24.19.0/npm 11.9.0: strict typecheck and lint passed; Vitest 76 tests across 10 files passed (6.56 seconds); Chromium Playwright 28 journeys passed (31.2 seconds). Browser uses the existing external test-only Chromium 153 override. No dependency changes. Contract generation/check and final builds are recorded below after execution.

Initial browser runs found a filter navigation race: resetting URL filters asynchronously erased a newly typed date. Operations, ledger and rail forms now mark their own URL transitions synchronously and only reset on external filter changes. Full browser rerun passed. Tests download an actual PDF, inspect its content, compare replay journal identities, follow unmatched receipts into suspense journals, retain UNKNOWN holds and verify scope denial/smaller-screen table containment. Desktop unmatched/UNKNOWN and 720px screenshots were visually inspected; tables scroll inside their regions. Receipt PDF rendered with Poppler: one A4 PDF 1.4 page, no JavaScript/forms, legible sandbox disclaimer, IDs and exact amount/fee/net values without clipping. This is a deterministic mock receipt, not an approved production document.

User Windows npm ci succeeded after stopping the process locking LightningCSS. Fresh v0.4.0 Windows workflow/build output has not been supplied; build:check before a successful new build could have inspected older outputs. D2c Windows checks remain pending. No real Laravel integration, staging, remote CI, live-money or backend authorization certification.

Final v0.5.0 contracts:generate/check passed (63 pages,141 dependencies,56 operations/50 paths). All three production builds passed; entry chunks443.28 kB, lazy rails14.93 kB; no size warning. build:check passed and excludes MSW/fixtures/mock setup.


## D2c Windows verification received

User output on 1 October 2026 establishes v0.5.0 contracts generation/check (56 operations, 63 pages, 141 dependencies), typecheck/lint, 76 tests, 28 Playwright journeys, all three builds and mock-exclusion passed. npm ci --include=dev installed 341 packages/audited 350 with zero vulnerabilities; Vite 8.3.1 available on Node 24.21.0. Operations dev server started on 127.0.0.1:5173. These establish frontend behavior against mocks only.

## D2d verification

Final local execution output is recorded below. Initial85-test run had one test selector mismatch (Retry versus existing Try again); corrected. Initial browser run had incorrect Next page selector and a full-page navigation reset the in-memory mock session; corrected to Next and SPA route navigation. Neither was counted as passing. Existing foundation pending-route test now uses still-pending Reconciliation runs rather than delivered Customers. No real backend, staging or external CI claim. Windows D2d execution pending.

Final v0.6.0 local checks passed: contracts generation/check (61 operations,55 paths,63 pages,141 documented dependencies), strict typecheck, lint,85 tests across12 files (4.09seconds), all32 browser journeys, three production builds and mock-exclusion. Initial bundles444.72–444.73kB; lazy customer chunk11.95kB; no500kB warning. Final customer/application KYC histories share the same evidence and are asserted equal. Browser desktop customer and quarantine screenshots and720px customer list were visually inspected; content legible, table scroll region contains width. Evidence copied to docs/evidence. No dependencies changed; Windows execution of D2d remains pending.


## D2e verification

Final local outputs are recorded below. New tests exercise immutable reconciliation versions and observation parity, exact per-currency close totals, UNKNOWN/suspense/hold blockers, async filtered CSV/checksum/repeated download, concurrent exact replay/one-grant exclusivity, changed-payload409, CSRF/context/type-specific permission denial, download revocation/owner isolation, expiry410, cursor binding and unsupported dates. UI tests cover loading/empty/503 retry, FAILED/EXPIRED without download,503 immutable key/payload retry and tampered checksum denial. Browser journeys inspect actual close and filtered-ledger CSV bytes, linked unmatched receipt evidence, prior run, blocked reassessment, no results/date validation and smaller-screen scope denial. No actual backend/staging/remote CI or Windows D2e pass is inferred. Windows D2d output has not yet been supplied.

Final v0.7.0 local checks passed: generated contracts and contract check (65 operations,59 paths,63 pages,141 dependencies), strict typecheck, lint and102 tests across15 files. Full36-journey Chromium regression passed; after localized export authorization/metadata and close-layout changes, all4 affected reporting browser journeys were rerun and passed. Final three production builds and mock-exclusion passed; entry chunks446.32–446.33kB, with no500kB warning. Reconciliation detail, corrected vertical close blockers and720px reconciliation screenshots were visually inspected. Tables remain contained in scroll regions. No dependencies changed. D2d/D2e Windows execution, real Laravel integration and staging remain pending.


## D2e Windows verification received

User attachment Pasted text(20261001-165329).txt confirms v0.7.0:102 tests across15 files,36 browser journeys,all3 builds and production mock-exclusion passed on Windows. The attachment starts at test output; contract generation/check,typecheck and lint Windows passes are not inferred. No real backend/staging evidence.

## D2f verification in progress

New API/component coverage:12 controls contract tests and4 UI workflows. Initial typecheck caught unsupported React Testing Library exact options and a narrowed null error check; corrected. An empty-audit UI test initially ended before its secondary verification history query settled, causing a test teardown network failure; it now waits for that secondary empty state. Initial browser selectors clicked before filtered staff data settled and matched two Reset filters buttons; tests now await the target filtered row and select the form reset. Targeted16 tests and6 browser journeys subsequently passed before full regression.

On2 October the temporary test browser had been removed between sessions. Browser runs failed before page creation and are not passes. Standard Playwright CDN again returned a truncated/non-ZIP archive. Test-only Chromium153 was restored from @sparticuz/chromium outside the frontend repository; it is not a dependency change and Windows reuses its installed Playwright Chromium. Final execution results follow after completion. No real integration/staging/remote CI or Windows D2f pass is inferred.


Final v0.8.0 local checks on2 October2026 passed: contract generation/check (81 operations,74 paths,63 pages,149 dependencies), strict typecheck, lint,118 tests across17 files (4.85seconds), all42 Chromium browser journeys (33.8seconds), three production builds and production mock-exclusion. Entry chunks448.33–448.34kB; lazy controls22.13kB; no500kB warning. No project dependency versions changed. Final browser visual evidence for audit verification, acknowledged alert, governance/preferences and720px audit was inspected; tables scroll within their regions and forms remain readable. Synthetic chain mismatch at7 is intentional test data, not a failed application test. Windows D2f execution, real Laravel integration, staging and external CI remain pending.

## D2g final local verification — 2 October 2026

OpenAPI0.9.0 generation/check passed:84 executable operations,77 paths,63 primary pages,151 page/endpoint dependencies. Strict TypeScript and ESLint passed on final source. Vitest passed130 tests across19 files (5.48seconds final source run); the12 new API/component checks cover exact account/hold parity, filtered operation counts, latest reconciliation version, scoped cursor/detail isolation, server capability redaction, stateful acknowledgement, source freshness, genuine empty queues, unavailable sources,503 retry and429 cooldown. Existing118 tests remain passing.

Final Playwright Chromium run passed all48 journeys in49.5seconds, including6 new overview/outbox journeys. Earlier failing runs are not counted as passes: accessible filter names were corrected; SPA test navigation replaced full page reloads that reset in-memory MSW identity; path-keyed route loading removed inappropriate previous-page display; overview entry and refresh revalidate the session even if overview capability is absent; governance now has a single initial loading state; the KYC test waits for the named onboarding source table rather than potentially selecting an overview table during navigation. Existing authorization, quarantine, report/export, UNKNOWN holds, scope/session revocation and responsive journeys pass in the final complete run.

All3 real-mode production builds and build:check passed after final functional changes. Initial bundles449.34kB; lazy overview14.03kB; controls22.17kB; no500kB warning. Production output excludes MSW worker, fixtures and mock setup. Project dependency versions unchanged; lockfile root version is0.9.0. Existing installed dependencies were used; no new npm ci execution is claimed for this batch. Test-only Chromium153 remains outside the project and is not a frontend dependency.

Desktop1440px and smaller720px screenshots were visually inspected and retained as docs/evidence/D2g-overview-desktop.png and D2g-overview-small.png. Exact financial columns preserve spacing and scroll within the table region; smaller screens stack sections and have no document overflow. Source timestamps, source age at retrieval, historical/stale labels, sandbox/entity context and separate currencies are visible. Financial aggregates are calculated from shared server-side mock datasets, not component fixtures or invented analytics. Alerts use the same stateful D2f store; acknowledgement does not erase transport failures. Outbox data is synthetic delivery evidence, not external settlement proof.

Guarded Windows patch and full-source ZIP integrity/hash checks are recorded when packaged. Windows D2g installer/check execution is pending user output. Actual Laravel mapping, real backend integration, staging and remote CI remain unverified. Browser mock guards do not prove real backend authorization. D2 read slices are complete against mocks; O01 incident case detail and other governed dependencies remain D5, and the complete63-page objective remains open.


## D3a final local verification — 2 October 2026

OpenAPI0.10.0 generation/check passed:98 executable operations,89 paths,63 primary pages and156 page/endpoint dependencies. Strict TypeScript and ESLint passed. Final Vitest run passed148 tests across21 files in6.53seconds, including18 new registration/verification/opening API and component tests. The existing network mock harness retains the installed MSW version's typed onUnhandledFrame error policy. An attempted harness option rename was rejected by strict types and reverted to the installed-version API before the final passing checks. A retained sessionStorage intent caused one intermediate test failure; each account-holder UI test now starts with isolated storage. No failed run is counted as a pass.

Full final Chromium regression passed all55 journeys in56.7seconds, including7 new account-holder journeys: real registration/contact continuation, individual evidence scan and address remediation through server-only VERIFIED, zero-balance opening and owned detail/overview; distinct business policy; committed-response-loss retry with unchanged intent and one account; quarantine/signature denial; capability/scope/session isolation and metadata clearing; consent/contact errors and anonymous continuation;390px forms/product eligibility. Browser screenshot capture was then adjusted to scroll to the top, avoiding off-viewport fixed controls appearing in full-page captures; the7 account-holder journeys were rerun separately and passed in41.4seconds.

All three production builds and production mock-exclusion passed on final application source. Entry chunks452.57–452.58kB, lazy account-holder24.66kB; no500kB warning. Dependency versions are unchanged, and the committed lockfile root version is0.10.0. Existing installed dependencies were used; no new npm ci execution is claimed. Test-only Chromium153 runs outside the frontend repository; Windows reuses installed Playwright Chromium.

API tests use native Node File/FormData for actual multipart bytes; browser journeys upload actual multipart payloads. The initial jsdom multipart environment mismatch was corrected by selecting the native Node environment for that domain API test file, without bypassing HTTP or replacing the upload with metadata. Mock signature and EICAR checks are synthetic, not malware or identity certification. Unknown identity approval fields, foreign scopes/IDs, missing CSRF/grants, stale versions/terms, unverified/suspended/expired identities and conflicting idempotency payloads are rejected by network mocks. UI tests additionally cover429 cooldown, editable draft preservation and an explicit pre-creation policy rejection requiring intentional eligibility review. Ambiguous opening outcomes retain the original request.

Desktop opened-account/verification and390px verification/eligibility evidence is retained under docs/evidence/D3a-*.png. Account money remains exact minor-unit strings and zero until subsequent authorized money workflows. C01/C03/C04 are complete against mocks; C05/C06 reads are partial with remaining dependencies recorded. Full63-page delivery, real Laravel mapping/integration, staging, external CI and Windows execution of this update remain pending. Mock authorization tests prove frontend behavior only.

Visual review found an unlayered anchor color rule overriding white text on shared button links. The shared stylesheet now preserves white text for these links, with an explicit computed-color browser assertion. The complete55-journey regression and three builds were rerun after this correction; final timings are recorded below.

Final post-contrast run: strict TS/lint passed, all55 browser journeys passed in55.8seconds, all3 builds and mock-exclusion passed. The white-text button-link assertion passed. Retained screenshots were refreshed from that run and inspected. Guarded patch/source ZIP hashes and integrity are validated by packaging; actual Windows installer execution remains pending.


## D3b1 final local verification — 2 October 2026

OpenAPI0.11.0 generation/check passed:109 executable operations,99 paths,63 primary pages and171 page/endpoint dependencies. The register includes15 new dependencies (public recovery continuation, closure read/step-up dependencies and explicitly draft cards/recent-activity extensions). Real Laravel mappings remain null. Error codes now include emitted validation/state/continuation/recovery/closure codes in generated types. Strict TypeScript and ESLint passed on final source. Dependencies unchanged; lockfile root version0.11.0. Existing installed dependencies were used; no new npm ci execution is claimed.

Final Vitest run passed167 tests across23 files in6.58seconds, including19 new API/component tests for non-enumerating contact recovery, proof/expiry/rate gates, identity-review approval/refusal, immutable response-loss retry/one session, previous session revocation, replay refusal after logout, fresh identity evidence and current permissions, masked profile access, account ownership/CSRF/account-bound step-up, exact funds/hold/obligation refusal, closure one-effect replay, server-only approval/BLOCKED review and fresh eligibility after definitive rejection. Prior148 tests remain passing. Shared hardening test now requires new proof after switching away/back, reflecting strengthened mock invalidation rather than permitting grant resurrection.

Final full Chromium regression passed all61 journeys (Playwright reported1.1minutes), including6 new lifecycle journeys. Owned closure transitions through action-bound verification and server review to CLOSED/zero unchanged amounts; lost response repeats one request; new obligations keep account ACTIVE/BLOCKED; recovery requires independent server review and revokes prior sessions before masked profile access; unverified recovery remains REVIEW_REQUIRED; stale eligibility permits intentional fresh review with no request;390px screens retain readable controls and contained tables. Existing registration/evidence/remediation, UNKNOWN holds, reporting/exports, scope/auth/session revocation and Operations/Partner layout journeys remain passing. Browser mock authorization does not prove real backend controls.

Intermediate failures were fixed before final checks: JSX fragment/brace and generated error-code typing; a UI retry selector expected Retry instead of the actual Try again; a prior security test expected a grant to survive a scope round-trip, now rejected with fresh verification required. Browser tests initially injected obligations before the closure POST committed, correctly receiving a stale-version rejection; that scenario now waits for PENDING_REVIEW before introducing new obligations and separately tests the pre-creation rejection. Recovery navigation test now waits for its own heading before filling, avoiding input on the preceding login page. Browser initialization originally omitted the contact seed used by Node tests, causing default customer recovery/profile mismatch; explicit development-only worker initialization now resets the same deterministic baseline. No failed run is reported as passing.

All3 final real-mode production builds and build:check passed. Initial chunks454.58–454.59kB; lazy customer-lifecycle14.31kB and account-holder23.50kB. No500kB warning. Production builds exclude MSW worker, fixtures and mock setup. Test-only Chromium153 is outside the frontend repository and not a dependency. Windows should reuse installed Playwright Chromium.

Desktop closure approval/profile notices and390px closure/recovery screenshots were visually inspected and retained under docs/evidence/D3b1-*.png. Financial tables retain scroll regions; long account IDs/disclosures wrap within detail panels. Fixed mobile navigation stays at the viewport bottom in full-page screenshots; controls remain reachable by scrolling and document width does not exceed390px. Recovery input is obscured and contact is masked; no tokens/PAN/CVC/secrets are persisted.

C02 is partial for assisted-recovery integration; C05 partial for recent activity/cards/remaining actions; C06 partial for account activity/cards; C13 is a read slice with consent/contact/identity-change writes remaining D3c. Statements/documents and scoped receipt downloads are next D3b2. Cards and homepage transaction summaries are accepted user extensions with explicit draft contracts/visual/workflow exits in cards-and-homepage.md, not claimed issued/implemented. The complete63-page objective remains open. Actual Windows installer/checks, real Laravel integration, staging, issuer/legal approval and external CI remain pending. Packaging validates baseline/target hashes and ZIP integrity before delivery.
