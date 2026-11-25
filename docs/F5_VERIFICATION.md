# F5 payment options verification — 23 October 2026

Version 0.5.1 extends the verified F5 baseline. Linux, Node 24.19.0/npm 11.9.0; Windows commands are in README but Windows itself was unavailable. No dependency versions changed. Fixture clock remains 21 October 2026, 11:00 EAT.

| Check executed | Result |
|---|---|
| npm run typecheck | Pass |
| npm run lint | Pass, no lint errors/warnings |
| npm test -- --maxWorkers=1 --no-file-parallelism | 83 tests across 12 files pass |
| Playwright full suite | 25 pass; one existing refund journey exceeded 30s after reaching confirmed state |
| Targeted refund rerun | Pass in 10.6s with the same timeout; all 26 journeys verified across runs |
| Real-mode production build | Pass, advisories below |
| npm run check:release | Pass; mock worker, handlers and provider/refund authorization controls excluded |
| Mock-mode production build | Expected release-block rejection |
| git diff --check | Pass |
| Visual/runtime review | Payment method tiles and M-Pesa prompt inspected at desktop/mobile; no JavaScript page errors or page overflow at 360/390/768px |

## Provider evidence

Two domain tests cover Kenyan 07/01/+254/254 normalization, spacing and invalid country/landline/length/alphabetic input. Six API tests cover one STK dispatch per idempotent normalized request; stable payment/provider reference; masked response/receipt and no full phone in idempotency records; changed phone/key conflict; approval without cash movement; cancellation/failure without allocation; and original-reference inquiry/once-only posting for M-Pesa, PesaLink, Visa, Mastercard and PayPal.

Five provider browser journeys cover mobile validation → simulated STK → masked destination → on-screen approval → original inquiry → confirmed partial allocation; plus the PesaLink, Visa, Mastercard and PayPal approval/inquiry journeys on mobile. Existing F5 journeys now select a card method and use its authorization simulator. Initial browser assertions expected status text twice; the current-status paragraph is the only exact match because history includes a timestamp. These selectors were corrected to assert the displayed state. One full-run refund journey reached its confirmed snapshot but exceeded the 30-second limit; its isolated rerun passed in 10.6 seconds with the same limit. No automatic retries or increased timeouts were used to conceal failures.

The prior 75 tests and 21 journeys continue to cover exact financial arithmetic, banking/holds/transactions/statements, onboarding/team/settings, contacts/quotations/issued invoices, pending duplicate prevention, partial payment balances, immutable receipts, credit-note/refund separation, idempotency, permissions, expired/revoked links and redirect queries never proving payment.

## Visual and browser scope

The provider controls extend the approved checkout's method tiles and M-Pesa phone/STK hierarchy. Lucide icons identify mobile/bank/card/wallet methods without invented partnership logos or certification claims. The method selector is a labelled radio group with focusable controls; mobile uses two columns. Phone destinations are masked, and the simulator requests no PIN/PAN/CVV/password. PesaLink/card/PayPal approval screens reuse the same public shell. Internal inspection screenshots are not deliverables. Full screen-reader/cross-browser/WCAG audit remains F8.

Browser verification uses isolated Chromium 153 through PLAYWRIGHT_CHROMIUM_EXECUTABLE, outside the project/archive. Windows should use npx playwright install chromium. No new runtime or testing dependency was committed. Unit tests run serially to avoid the resource contention observed in the earlier F5 batch.

## Build and integration limitations

Vite still warns about an entry chunk over 500 kB; further route splitting/performance budgets remain F8. Rollup strips two misplaced Zod pure-annotation comments. npm reports a host http-proxy configuration advisory. Warnings were not hidden by threshold/dependency changes.

All providers remain simulated; no real STK push reaches a handset, no bank transfer/card charge/PayPal capture occurs, and no live merchant relationship is asserted. Authorization alone never allocates money; original-reference inquiry confirms a simulated provider outcome through the existing once-only mock ledger path. The real backend/provider remains authoritative. Full reload/new tab resets mock capabilities. Actual enabled methods, merchant/currency/amount eligibility, STK callbacks/inquiry, PesaLink reconciliation, hosted card/3DS and PayPal integration, backend authorization, phone privacy/retention, refund approvals and real receipt certification remain unintegrated dependencies. M-Pesa/PesaLink KES-only and card/PayPal KES/USD flags are explicit mock assumptions, not provider promises. No staging, AWS, real funds, real credentials or Windows execution was tested. No feature is API-integrated or staging-verified.
