> Current 0.10.1 additions and verification: [Restoration register](RESTORATION_REGISTER.md). Historical batch details below remain for context.

# Environment configuration

| Setting | Default | Rules |
|---|---|---|
| VITE_API_MODE | real | mock only for Vite development/tests; production build rejects mock |
| VITE_API_BASE_URL | /api | Central HTTP(S) base; no credentials/query/fragment; mock mode requires an /api suffix |

.env.example is an opt-in development template. .env.production sets real and /api. .env.local is ignored by git and takes precedence; remove it or explicitly set VITE_API_MODE=real before a release build. An environment variable set by PowerShell overrides the files. Values prefixed VITE_ are public bundle configuration, never secrets.

Production host must serve index.html for browser routes and route /api to the confirmed backend/BFF. Cookie credentials, CORS and CSRF policy must be agreed before real writes. With no backend configured, real mode shows the service error or expired-session state; it never activates fixtures.

Release build strips development controls/handlers and removes mockServiceWorker.js from dist. check:release inspects the output. Negative validation: VITE_API_MODE=mock npm run build must fail. Do not deploy npm run dev or its public directory. Use only dist. Lockfile is included; npm ci is the reproducible install path. Node 22.12+ is recommended; verified here on Node 24.19.0.


F3 introduces no environment settings or dependencies. Multipart uploads use the centralized API base URL and cookie credentials, as do profile, team and security mutations. Real mode requires confirmed routes, CSRF handling and a secure document service; no AWS deployment is needed for development. Do not configure secrets with VITE_ variables. Identity fixtures, mock policy and review/provisioning controls exist only in development mode.


F4 adds no environment variables. Recipient URLs are development test capabilities, created through the same API boundary; real sharing requires the confirmed public backend routes and secure capability/session design. No mail credentials, tax integrations or payment keys are requested. Public responses never prove payment. Generated mock links require same-tab navigation because full reload resets the in-memory simulation.


F5 adds no configuration or dependencies. Simulator controls exist only in DEV+mock. Real mode requires confirmed link/capability, collection inquiry/callback, receipt, credit and refund APIs, with backend authorization/CSRF and approved provider integration. No provider keys or card/phone secrets belong in VITE_ variables. Mock clock remains frozen and full reload resets public links.


Version 0.5.1 adds no variables or dependencies. There are no M-Pesa, card or PayPal keys to configure for simulations. Provider approval controls require DEV+mock and are checked for exclusion in the release scan. Real integration needs backend-held credentials and provider-approved hosted flows.

F6 (0.6.0) adds no dependencies, provider credentials or environment variables. New payment and card routes use the same cookie-bearing /api client. Payout outcome and issuer activation controls require DEV+mock and are release-scanned. Real-mode requires the proposed payment/beneficiary/card contracts, maker/checker authorization and secure issuer/provider event integration. A full reload resets all mocks and the selected mock identity; use in-app navigation during review.

0.6.1 adds no configuration. Card detail reveal works only in DEV+mock and is deliberately unavailable in real mode. No issuer/PAN/CVV/PIN/OTP secrets are requested. Backend/issuer step-up and secure reveal remain dependencies.

## F7

No additional environment variables or frontend API keys. Keep the centralized API base and deliberate mock/real switch. Never place credentials in VITE_ variables, localStorage or logs. Real mode has no fallback to mock data. Backend/BFF secure-cookie sessions, CSRF and authorization remain required. A production build with VITE_API_MODE=mock is blocked.

## Integrated Business release

No new environment keys. Copy .env.example to .env.local to deliberately enable development MSW. /login is now the default protected entry. Real mode expects uploaded /partner/v1/sessions plus the proposed /session Business projection at the centralized API base. Configure secure same-site HttpOnly cookies, CSRF, server authorization and strict CORS in the backend/BFF. There is no real password/OAuth/MFA implementation or credential fallback.

## Expansion environment boundaries

No new environment variables. Explicit mock mode enables synthetic approval/signup code 246810 and fixture outcome controls. Real payment-order bodies omit outcome; explicit outcome, POS/lending and signup simulations do not operate against real mode. Confirm API/BFF, OTP delivery and capabilities before enabling live workflows. Never put SMS credentials, private keys or loan/rail overrides in VITE_ variables. All new state resets with the existing development reset; page reload remains non-durable.
