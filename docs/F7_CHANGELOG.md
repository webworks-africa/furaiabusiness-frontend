# F7 — reports and gated developer sandbox

Complete source release 0.7.0; no dependencies added or upgraded. Existing banking, billing, payment options, card disclosure and approved black credit preview are retained. No feature is API-integrated or staging-verified.

## Delivered

- Reports home with actual currency-specific summaries, confirmed cash movements, receivables aging and invoice collection cohorts. URL filters, TanStack tables, scoped totals, pagination and linked details.
- Immutable CSV export jobs: queued, generating, ready, selected failure/retry, expiry and authorized download. Search does not redefine full-scope summary totals. Bank statements retain their own route.
- Sandbox applications: create, edit, version checks, scoped read permissions and suspension.
- Credential creation reveals a clearly synthetic secret once. Close, timeout, navigation, blur and hidden-page cleanup remove local disclosure. Replay returns metadata only. Rotation revokes the old credential; revocation persists.
- Webhook endpoints: validated example-only HTTPS URLs, subscriptions, pause/resume, explicit simulated success/failure/timeout, delivery detail and up to three attempts on the same event. No outbound HTTP or payment execution occurs.
- Redacted request-log filters and proposed developer documentation. Administrator production-review submission has prerequisites and stays Pending review; productionEnabled always remains false.
- Loading, empty, stale, unavailable, expired-session, validation and denied states; permission-filtered routes/navigation.

## Assumptions and limits

F7 extends the approved forest/mint shell and table/form hierarchy conservatively. Missing export detail and validation screens reuse existing patterns. Aging is a current snapshot at the frozen fixture clock, not a historical aging engine. Collection follows invoice issue dates and current allocations/credits, with refunds separate; it is not recognized revenue. Cash opening is reconstructed from fixture ledger/history. CSV uses integer minor units and formula-safe cells. No PDF/XLSX, certified tax report or scheduling is fabricated.

Sandbox API scopes are read-only. Real pagination/cursor contracts, authentication, audit retention, secret storage, receiver signatures/HMAC, signing-secret rotation, automated retry/backoff, live dispatch, operational API calls and production approval remain backend dependencies. Small developer fixture inventories are client-paginated; report rows are server-paginated. Secret values are random per first creation, while IDs and fixture outcomes reset deterministically. A lost disclosure response must be resolved through metadata and rotation.

See VERIFICATION.md for checks actually executed and README for Windows commands. F8 is next.
