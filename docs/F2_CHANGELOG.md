# F2 change notes

F2 extends F1 without replacing the project, pinned stack or shell.

- Overview: confirmed KES monthly totals, six-month cashflow with 3M/6M range and exact-data table; separate receivables and pending-approval summaries.
- Accounts: currency-scoped balances, searchable/sortable account table, masked details, holds, read-only limits/mandate, account-filtered activity and statement entry.
- Transactions: URL-backed counterparty/reference, account, currency, status, rail, EAT date and sort filters applied before pagination; linked details, preserved return filters, refresh and lifecycle states. Unknown/pending/failed never appear paid or posted.
- Statements: accessible CSV dialog, month presets, date/snapshot validation, role gates, idempotent create, queued/generating/ready/failed/expired screens, retry same snapshot/reference and authenticated downloads. Related job views share state.
- Reliability: strict response schemas, not-found states, exact money, snapshot arithmetic, formula-safe CSV, development failure/expiry scenarios and zero production mock handlers.

No live integration, no staging deployment and no money-moving workflow. PDF certification remains unavailable. Approval execution, contact/invoice workflows and card controls remain in later batches. See ROADMAP.md for F3 onward.
