# Business expansion verification — 24 October 2026

Version 0.9.0. All delivered workflows remain simulated/mock-complete within BUSINESS_EXPANSION.md. None is API-integrated or staging-verified.

| Check actually executed | Result |
|---|---|
| Strict TypeScript checking | Pass |
| ESLint | Pass |
| Supplied identity contract/generated snapshot check | Pass |
| Full Vitest suite | 147 tests across 19 files pass, 147.87 seconds |
| Full Playwright suite | All 59 journeys pass, 5.0 minutes |
| Real-mode production build + check:release | Pass; no mock worker/handlers |
| Production mock-mode guard | Rejected with expected development-only error |
| New OTP/payment handler and identity markers | Absent from release JavaScript |
| New module visual/runtime checks | Seven page types at 360/768/1440px, loaded controls visible, no page overflow or JavaScript errors |

New API/domain tests cover single/two/three-authorizer rules, member/version-bound OTP, expiry/attempts/consumption, idempotent confirmation, holds/ledger/available propagation, UNKNOWN and failure/cancel/reject, insufficient funds/duplicate references, Finance/Developer/Viewer boundaries, immutable invoice branding, running customer balances and confirmed partial allocation/opening balance, supplier/LPO snapshot/cash isolation, atomic payroll net reserves, POS confirmed-only postings, exact loan monthly dates/rounding/principal/interest, OTP disbursement, partial/full repayments/duplicate reference/overpayment, optional FX gating and clean unfunded signup/reset. Invalid money returns validation rather than conversion exceptions.

Browser tests exercise separate signed-in members approving the same order, automatic final dispatch and animation, deductions and transaction/account links, hidden/denied Finance Team access, Developer navigation, supplier→LPO issue/receive/print, payroll net payment→OTP, pending POS→confirmation, loan draft→issue→OTP→partial repayment, logo/default/per-invoice template changes, customer statement currency/CSV, signup→onboarding and public searchable docs. The M-Pesa journey verifies the explicit waiting text/phone animation before confirmation. Original banking/billing/public collection/card/permission/export journeys remain in the final full run. Earlier manual-payout API regressions remain historical compatibility tests; new UI sends use /payment-orders.

The final full run used frozen source. Initial browser-discovered payroll schema/blank decimal validation issues were corrected, payee preselection waits for options, and selectors were updated for new headings. One earlier regression run overlapped a development module edit and lost a payroll fixture; the final unchanged-source full run passed all 59. No browser evidence is packaged or saved as a deliverable.

Environment: Linux, Node 24.22.1/npm 11.9.0, isolated Chromium 153 from an npm distribution installed outside project dependencies. Managed public documentation preview was also inspected. Windows/PowerShell was unavailable for execution; guarded startup/verification scripts and exact commands are included. No dependency was added/upgraded in the project.

Build advisories: shared entry 594.14 kB minified /181.09 kB gzip; new BusinessTools and DeveloperDocumentation are lazy chunks. The existing >500 kB entry advisory remains; performance budgeting is still F8. Vite strips two upstream Zod annotation comments; host npm emits an http-proxy environment warning. These are not passing evidence for production performance or readiness.

No real SMS/OTP/contact verification, secure IdP/BFF session, backend authorization, M-Pesa/other rail, physical POS/acquirer, lending entitlement/underwriting/legal contract or staging was verified. Payroll statutory deductions/filings, certified PDFs, historical lending operations and operational SDK/signatures remain backend/product dependencies. Real-mode simulations are blocked and payment-order bodies omit fixture outcomes. Previous delivery evidence is preserved in INTEGRATED_BUSINESS_VERIFICATION.md, F7_VERIFICATION.md and earlier verification files. Customer and Super Admin are deferred.
