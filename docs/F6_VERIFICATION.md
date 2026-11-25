# Card refinement verification — 23 October 2026

Version 0.6.1 retains F6 and adds scoped Show/Hide plus the approved black credit treatment. All workflows remain simulated; real issuer reveal is unavailable.

| Check executed for this refinement | Result |
|---|---|
| Type checking and lint | Pass |
| Full unit/API/domain/component suite | 104 tests across 14 files pass |
| Playwright card-details + F6 subset | All nine journeys pass, 53 seconds |
| Real-mode production build and check:release | Pass; development disclosure endpoint excluded |
| Visual review | Black credit face and masked portfolio inspected on mobile/desktop |
| Viewport/runtime | Five F6 page types at 360/768/1440px, no page overflow or page JavaScript errors |

New browser tests verify hidden-by-default number, explicit Show/Hide, revealed expiry/CVV, automatic 60-second remasking, navigation masking, credit styling and unavailable repayments. API tests verify scoped no-store display responses, no fixture/cash mutation, denied Viewer/stale/unissued requests and no credit activation. Window blur/visibility cleanup and in-flight aborts are implemented; those two native lifecycle events were not separately exercised by the automated browser journeys.

No dependency changes. Tests use isolated Chromium 153; Windows, real APIs/providers/issuer credentials and staging were not available. Build retains the existing entry-size and upstream annotation advisories. Internal screenshots/traces are excluded from the download. Exact PowerShell commands are in README. The full 33-journey F6 baseline below was executed in the prior batch; it was not rerun in full for this refinement.

---

## Retained F6 baseline — 23 October 2026

Version 0.6.0. Existing React/Vite project retained; dependency versions unchanged. Linux, Node 24.19.0/npm 11.9.0, isolated Chromium 153. Windows was unavailable; exact PowerShell commands are in README. Fixture clock remains 21 October 2026, 11:00 EAT. Every implemented financial/issuer workflow remains mock-complete only; none is API-integrated or staging-verified.

| Check executed | Result |
|---|---|
| npm run typecheck | Pass |
| npm run lint | Pass |
| npm test -- --maxWorkers=1 --no-file-parallelism | 102 tests across 14 files pass |
| Full Playwright suite | 33 journeys pass in 2.8 minutes; no retries |
| Final payout/filter API/domain check | 19 tests pass after adding new payout rail options to transaction filters |
| Final banking browser subset | All six journeys pass after the filter extension |
| Real-mode production build | Pass; entry approximately 578.24 kB minified / 176.51 kB gzip |
| npm run check:release | Pass; no mock worker/handlers or provider/payout/issuer simulators in release |
| Mock-mode production build | Expected rejection with the release-block message |
| git diff --check | Pass |
| Viewport/runtime checks | Payments, beneficiaries, card portfolio/detail/request at 360, 768, 1440px: no page overflow or page JavaScript errors |
| Visual comparison | Approved payments/beneficiary/card sources reviewed; implemented desktop/mobile portfolio, debit detail and beneficiary layout inspected |

## Meaningful coverage

The 19 new tests cover exact decimal/minor-unit conversion and invalid precision; beneficiary masking/pagination/selection/archival; no funds moving on draft/edit/approval; creator-owned versioned editing and post-submit lock; separate maker/checker/executor; held/available/ledger invariants; UNKNOWN retention; idempotent dispatch/inquiry and exactly-once posting; definitive failure/rejection/cancellation; source/account/permission/approver rechecks; scoped read-only roles; stale/expired/unavailable/empty responses; versioned card freeze/controls; limit hierarchy and spent floor; separate request/approval/issuer stages; replacement linkage; preview-only credit; reset consistency; malformed integer inputs returning validation errors instead of conversion exceptions; and filtering the confirmed payout transaction by its new rail.

Seven new browser journeys cover payment draft/edit/review/reservation → different-member approval → execution → UNKNOWN → original-reference confirmation and linked transaction; beneficiary creation/payment selection/rejection; mobile debit controls and credit preview; card request/approval/issuer activation; viewer restrictions; draft editing; and five page types at three viewport widths. Existing banking, statements, onboarding, team/settings, billing, public checkout, partial payments, credit/refund and all five provider journeys passed in the same full regression run.

During development, checks found an implicit selector-label association, a browser test using a full reload that intentionally restored Admin identity, and tablet portfolio overflow at 768px. The label was made explicit, the permission journey now uses in-app navigation, and the portfolio stacks at narrow desktop/tablet widths. Invalid integer conversion checks were hardened and source account selection is explicit. Final successful runs use the normal timeouts: longer F6 multi-step/viewport journeys are configured for 60 seconds; no retries conceal failures. The later small transaction-rail extension was checked with the payout API/domain tests and banking browser subset. The full regression runs preceded that filter-only extension; all affected API/domain tests and six banking browser journeys were rerun successfully afterward.

## Environment and limits

The normal Playwright Chromium download returned truncated archives in this environment. An isolated Chromium 153 executable from the established npm registry was used through the repository’s existing PLAYWRIGHT_CHROMIUM_EXECUTABLE configuration; no browser package/dependency was added to the project or archive. Windows normally uses npx playwright install chromium. Test traces/screenshots are internal and excluded from the download.

Vite still warns about the entry chunk exceeding 500 kB. Two upstream Zod annotation comments are stripped by Rollup; npm reports a host http-proxy configuration advisory. No warning threshold/dependency changes hide these advisories. Route/performance budgets, full cross-browser/screen-reader/WCAG review and real staging tests remain F8.

Payouts are simulated KES-only PesaLink/M-Pesa B2C/RTGS with explicit zero fees and an all-amount different-member mandate. Actual fees, rail eligibility, account limits/cut-offs, internal/FX/bulk transfers, signed outcomes/reconciliation and backend authorization remain dependencies. Card activities are illustrative; issuer controls, physical delivery, sensitive reveal/PIN, global/MCC policy, certified statements/export and credit operations are unavailable. Credit amounts do not represent an approved facility. Refund approval/execution remains separate. No real STK, bank transfer, card charge/order or PayPal capture occurred.

Full reload/new tab resets the in-memory mock store and identity; persistence assertions use in-app links. Real mode has no mock fallback and requires the confirmed secure session/backend/BFF contracts. No AWS, Windows, real provider credentials/funds or deployment was tested. A passing build is not a production-readiness claim. Earlier F5 verification is retained in F5_VERIFICATION.md.
