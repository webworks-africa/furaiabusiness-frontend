# Business frontend 0.10.1 restoration and integration register

The recovered 0.9 source is preserved and extended. The original 0.10 archive could not be recovered; document/supplier additions were reconstructed. Earlier changelogs describe historical batches; this register describes the current delivery.

## Implementation status

| Area | Status |
|---|---|
| Existing business login/onboarding, accounts, statements, billing, checkout, payments, cards, reports, procurement, payroll, POS, lending and developer permissions | Preserved development workflows; network mocks |
| Invoice, quotation, LPO and confirmed receipt export | Rebuilt vector PDF, three templates, branding, print, revision snapshots |
| Email | Simulated queue, immutable attachment, selected failures and retry; no email sent |
| Profile/settings | Canonical settings route, profile sign out, settings approvals/templates and tax section |
| Tax references | Explicit demo connection and accepted/rejected outcomes, demo QR; not a KRA tax invoice |
| Supplier intake | External scoped upload link, PDF/DOCX/XLSX/CSV extraction, original download, mandatory review |
| Supplier payables | Terms/due dates, per-currency totals, existing KES payment order/OTP execution and balance update |
| Live M-Pesa/B2C Hakikisha, real email/KRA/provider integrations | Pending; never claimed integrated |
| Customer and internal operations applications | Future phase; previous source retained separately |

## Proposed endpoints awaiting backend confirmation

All are routed through the typed HTTP boundary and intercepted by MSW in explicit development mock mode.

| Endpoint family | Purpose |
|---|---|
| GET /documents/workspace | Export and delivery history |
| GET /documents/:kind/:id | Typed document projection |
| POST /documents/:kind/:id/exports; GET /document-exports/:id/pdf | Revision-checked immutable PDF asset and authorized download |
| Document email and delivery retry routes | Snapshot attachment, idempotent simulated queue and bounded retries |
| /tax/demo-connection and demo submission routes | Development-only tax simulation; blocked by client in real mode |
| Supplier workspace, links and intake routes | Hash-stored revocable upload capabilities, reviewed invoices and payables |
| Public supplier upload and public document routes | Capability-scoped access, expiry and revocation checks |
| Supplier payable payment route | Reuse original payment order and existing OTP execution |

Exact proposed paths and Zod schemas are in src/mocks/documentHandlers.ts and src/api/documentContracts.ts. Existing contracts and identity snapshot checks remain in place. These additions require backend confirmation; frontend checks never replace server authorization.

## Financial and security behavior

Invoice issuance and supplier review do not create cash. Money remains integer minor-unit strings, currencies have separate totals, approval and execution remain separate. A completed simulated payment alone settles a payable. Pending, unknown or lost original payment references stay pending and block duplicate attempts. Supplier payments currently execute KES only and do not support partial supplier settlement or FX conversion.

Issued documents capture appearance and issuer details. Export bytes, revision, checksum and email attachments remain immutable in the mock session. Receipts require a confirmed payment. Credit notes and refunds remain separate existing events. QR references clearly identify demo status and cannot prove KRA acceptance.

Public supplier links expire after seven days, can be revoked and are revealed when issued. Only token hashes persist. Uploads are synthetic development documents, not a production document intake service. No real credentials belong in VITE_* configuration or browser storage.

## Extraction and persistence limits

Maximum upload is 5 MB; PDF extraction is text-only up to 50 pages, without OCR. DOCX/XLSX extraction bounds archive entries (300), selected XML entry size (5 MB), total selected XML (20 MB), worksheets (10) and rows (10,000). Formulas are not executed. Macro-enabled and legacy binary Office files are unsupported. Ambiguous/missing dates and totals require review; extracted values are suggestions. Maximum local upload storage is 60 MB.

Supplier records and original bytes persist in local IndexedDB. Other financial state and document exports remain in memory. Use the shared development scenario reset to reset deterministic fixtures and clear supplier records. Reloading after a payout loses its in-memory order, so the persisted payable retains pending confirmation and disallows duplicate execution. Cross-tab financial execution is not transactionally coordinated by this mock.

## Backend dependencies

Provide tenant-scoped sessions/authorization, authoritative calculations and payment state, atomic idempotent payout coordination, secure storage/downloads, document scanning/retention, bounded extraction/OCR, rate limiting and audited capability expiry. Add email transport and delivery callbacks, KRA onboarding/server credentials, and live Safaricom credential storage/signing/callback verification on a server. Browser redirects do not confirm payments. No live credentials or provider secrets have been embedded.

## Verification actually executed

- TypeScript strict checking, ESLint and identity contract snapshot checks passed.
- Production dependency audit reported zero known vulnerabilities. Production mock-mode build rejection was checked.
- Vitest: 161 tests passed across 21 files, including document calculations, PDFs, extraction, permissions, immutable exports, retries, supplier review and payment state transitions.
- Real-mode production build and release mock-exclusion check passed. The build reports a main bundle size warning; further bundle optimization remains useful.
- Five synthetic invoice/quotation/LPO/receipt PDFs generated; visual render samples reviewed. Samples are included under examples/documents.
- Four new Playwright journeys cover documents, supplier review/payment, tax demo and PDF intake. They could not execute here because Chromium launch was rejected by environment socket restrictions. They are included for local execution. No full browser-pass or staging claim is made.
- The business login page was inspected in the available browser. Full responsive and accessibility browser review remains required.

## Windows PowerShell verification

Run in the extracted furaia-frontend directory:

```powershell
npm.cmd ci --include=dev
if (!(Test-Path .env.local)) { Copy-Item .env.example .env.local }
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run check:identity-contract
npx.cmd playwright install chromium
npm.cmd run test:e2e
$env:VITE_API_MODE = "real"
npm.cmd run build
npm.cmd run check:release
Remove-Item Env:VITE_API_MODE
npm.cmd run dev -- --port 5180
```

For CMD startup use Start-Furaia.cmd, or the CMD commands in README.md. Local test credentials and mock reset instructions are in README.md and docs/MOCKS.md.
