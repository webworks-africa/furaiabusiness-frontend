# F7 verification — 23 October 2026

Version 0.7.0. All delivered workflows remain mock-complete; none is API-integrated or staging-verified.

| Executed check | Result |
|---|---|
| Type checking and ESLint | Pass |
| Full Vitest suite | 120 tests across 15 files pass |
| Full Playwright suite | 42 journeys pass, 3.7 minutes |
| Real-mode production build | Pass |
| Production mock exclusion check | Pass: no worker or handlers |
| Production mock-mode build guard | Rejected as intended |
| Responsive browser review | Six F7 page types at 360/768/1440px, no page overflow or JavaScript errors |

New tests cover cash equations, currency isolation, aging boundaries, confirmed-only allocations, immutable CSV snapshots, failed/expired exports, viewer restrictions, business/member entitlements, app versions/scopes, once-only secret replay, rotation/revocation, URL restrictions, webhook retry event identity/attempt limits, pending production requests and redacted logs/reset. Browser journeys cover repeated app saves, secret closure/timeout/rotation, reports/downloads and failed delivery retry. Native blur/visibility cleanup is implemented but not separately browser-automated.

Linux, Node 24.19.0/npm 11.9.0, isolated Chromium 153. Windows was unavailable; exact PowerShell commands are in README. No backend/provider/receiver request, real issuer credential, login or staging integration was exercised. Internal screenshots are excluded from delivery.

Build advisories: existing shared entry is 579.93 kB minified /176.89 kB gzip; route chunks remain lazy. Vite removes two upstream Zod annotation comments. Host npm emits an http-proxy environment warning. These are not test failures; performance budgeting remains F8. Earlier verification is preserved in F6_VERIFICATION.md and F5_VERIFICATION.md.
