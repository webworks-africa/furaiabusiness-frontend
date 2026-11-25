# View Furaia in your browser

Open PowerShell in C:\Users\user\furaia_frontend. Start each surface in a separate terminal and keep it running.

| Command | Browser URL | Mock identifier |
|---|---|---|
| npm run dev:ops | http://localhost:5173/ops | operator@staff.sandbox |
| npm run dev:customer | http://localhost:5174/app | customer@customer.sandbox |
| npm run dev:partner | http://localhost:5175/partners | developer@partner.sandbox |

Mock sign-in challenge and step-up code: 246810. These are synthetic identities. Page reload resets the in-memory simulator session. Stop a server with Ctrl+C. If another server is using a port, stop its earlier terminal before starting again; use the exact URL Vite prints if you intentionally change ports.

Operations navigation now includes working account/transaction/hold/journal read screens and Session and access. Overview is still the foundation workspace; its operational aggregates are D2g. Other primary pages show explicit scheduled-work states until their batches are delivered. Customer/partner foundation contexts are available; their domain workflows remain scheduled. All3 development surfaces explicitly use MSW; production builds use the real API and contain no mocks. npm run build creates deployable files and does not start the development dashboard.


D2c v0.5.0 adds Collections and Payouts under Operations. A matched collection can download a sandbox PDF; unmatched receipts link to suspense evidence. UNKNOWN payouts show the original submission and inquiry with no resend. Stop the dev server with Ctrl+C before applying updates or npm ci, then restart npm run dev:ops.


D2d v0.6.0 adds Customers and Onboarding reviews. Customer detail links to accounts and application history. CLEAN scanned evidence opens sanitized synthetic text with separate permission; other scan states remain blocked. Use the existing mock Operations sign-in. Stop Vite before update/installation; run npm ci --include=dev and stop immediately on failure.


D2e v0.7.0 adds Reconciliation runs and Reports and daily close. Inspect prior immutable run and unmatched/UNKNOWN links. Close assessment remains BLOCKED while obligations remain. Choose an export report/currency or filter Ledger and journals, Generate CSV, give a reason and step-up246810; READY offers a checksum-verified CSV. Import money columns as text. Stop all Vite servers with Ctrl+C before applying updates/npm ci.


## D2f Operations controls

On v0.8.0 review Audit trail, Staff and access, Integrations, Alerts and delivery, and Settings and governance. Audit range8–32 verifies;1–32 intentionally fails at7. Generate CSV verifies code246810 and exports every filtered event. An open alert acknowledgement needs a note and updates version/ownership while preserving delivery history. A preference save creates version2 and an audit event; mandatory security notices and stale gate denial remain. Policy kind filters documented deployment/rotation procedures. These are synthetic workflows, not proof of backend authorization or external certification. Stop Vite with Ctrl+C before any subsequent installer/npm ci.
