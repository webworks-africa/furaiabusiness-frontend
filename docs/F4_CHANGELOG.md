# F4 — contacts, quotations and immutable invoice issue

Version 0.4.0 extends F1–F3 without dependency changes. All delivered workflows are mock-complete, not API-integrated/staging-verified.

- Commercial contacts: search, archive filter, pagination, create/edit/version checks, duplicate email protection, separate KES/USD receivables and linked-document filters.
- Shared exact decimal editor: customer/currency/dates/scope, dynamic lines, discount/tax, terms/notes, local preview and API-authoritative saved totals.
- Quotations: draft/share snapshot, recipient capability view with explicit consent, accept/decline, expired/invalid link handling, revision/history and old-link revocation.
- Accepted quotation → exactly one linked draft invoice; issue remains a separate confirmed action.
- Immutable issued invoice snapshots and outstanding amounts; connected customer/invoice/overview receivables; no bank balance changes or invented payment success.
- Billing read/write scopes, public/authenticated shell separation, loading/error/empty/stale/read-only states and responsive tables/forms.

No real email, verified signature, tax certification, PDF/export, collection, receipt, credit note or refund is implemented. Tokens are test-only and full reload resets them. Proposed route/rounding/tax assumptions are in INTEGRATION_REGISTER.md; F5 payment/allocations/receipts is next. See VERIFICATION.md for actual checks and README for exact Windows commands.
