# Integrated Business verification — 24 October 2026

Version 0.8.0. This package is mock-complete within the documented boundaries. No feature is API-integrated or staging-verified.

| Check actually executed | Result |
|---|---|
| Strict TypeScript checking | Pass |
| ESLint | Pass |
| Uploaded identity contract/generated snapshot check | Pass |
| Full Vitest suite | 128 tests across 17 files pass, 113.76 seconds |
| Full Playwright suite | All 48 journeys pass, 4.0 minutes |
| Real-mode production build + check:release | Pass; no mock worker or handlers |
| Production mock-mode guard | Build rejected with the expected development-only error |
| Prior source integrity | 156 retained source files match SHA-256 manifest |
| Internal visual review | Login at 360/768/1440px, desktop Business overview; existing card/report/developer responsive journeys pass |

New API tests cover anonymous read/write denial, uploaded partner identity shape, invalid/wrong-boundary credentials, logout, server expiry, suspended members, service outage, role permissions, required verification, active business scope and safe return targets. The signed-in maker/checker test verifies holds without ledger debit, self-approval denial, Viewer denial, separate Finance approval/execution, original UNKNOWN inquiry and one confirmed debit. Money tests use integer minor strings beyond Number.MAX_SAFE_INTEGER.

Six new browser journeys start anonymously and exercise sign-in validation, original-route continuation, logout/protected re-entry, two-member payment approval and execution, expiry/reauthentication, Viewer restrictions, anonymous public documents, external redirect rejection and responsive directional colours. Existing authenticated suites explicitly seed a development mock role; they do not claim real authentication.

One first full browser run had a stale test expectation: the development reset panel is remounted closed after an identity service outage. The test now opens the visible disclosure before reset. The final full run passed all 48. All later source changes were included in the final full unit/browser runs and build; subsequent edits are documentation only.

Linux, Node 24.22.1/npm 11.9.0, isolated Chromium 153. Standard Playwright CDN browser installation returned a truncated archive; the installed npm-distributed Chromium was used outside project dependencies. Managed preview was also inspected at the configured terminal.local host. Internal screenshots/traces are excluded from the package. Windows/PowerShell was not available for execution; exact commands and guarded scripts are supplied.

No real IdP/MFA/cookie/BFF, backend authorization, banking provider, receiver webhook, issuer credentials or staging was exercised. Prior Customer/Operations source is preserved without dependency installation or current verification; its historical reports are not current test evidence. Full F8 accessibility/performance and staging preparation remain open.

Build advisories: shared entry 588.69 kB minified /179.63 kB gzip; existing entry-size advisory remains, with lazy Business routes. Vite strips two upstream Zod annotation comments. Host npm emits an http-proxy environment warning. The generated identity file is type-only and is not a runtime dependency. Previous evidence is preserved in F7_VERIFICATION.md, F6_VERIFICATION.md and F5_VERIFICATION.md.
