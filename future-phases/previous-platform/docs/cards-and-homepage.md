# Cards and customer homepage — user extension accepted 2 October 2026

The user requested modern, well-designed debit cards for different accounts, a homepage card summary and a transaction summary. These are delivery requirements. They extend C05/C06 with nested card views; the63 original primary pages are retained. Do not count placeholders or design previews as issued cards or completed workflows.

## Visual direction

Build card faces as accessible React/CSS components, using the existing temporary Furaia text wordmark and palette until approved assets are supplied. Personal accounts use charcoal with a restrained mint accent; business accounts use deep teal with warm light typography. Product-specific variants follow actual server product identifiers rather than invented Gold/Platinum tiers. Use crisp typography, deliberate spacing, subtle geometric linework and a conventional debit-card proportion. No decorative imagery, heavy gradients, glass, emojis or unapproved network/issuer logos. A static chip/contactless motif may appear only where the issuer capability supports it. Designs must remain legible on390px screens and with enlarged text; account balances sit beside the card, rather than suggesting a separate invented card balance.

Card faces show approved product/name, masked last four digits, cardholder display name, debit label and truthful status/environment. No fabricated full card number, CVC, PIN or network membership. Design previews must say “Design preview — not issued” and cannot masquerade as live cards. Actual card faces require an account-owned server card record. Sandbox is clearly marked. The empty state explains that no card has been issued; card request is available only when server eligibility permits it.

## Required workflows and states

Scope card reads to the active principal/business context, owned account, tenant and environment. Model NOT_ISSUED, REQUESTED, PENDING_ACTIVATION, ACTIVE, FROZEN, BLOCKED, EXPIRED and REPLACED as server-authoritative states, with issuer-approved transitions. Request/activation/freeze/unfreeze/replacement actions must have explicit contracts, permission checks, fresh step-up where policy requires, current version and immutable idempotency. UI buttons must execute stateful mocks and show real outcomes. Changes must propagate to the account detail and homepage summary. Merchant controls and limits are included only if supported by target issuer policy. Do not store PAN, CVC, PIN, tokens or card secrets in browser storage/telemetry; any future sensitive reveal needs an issuer-approved isolated delivery mechanism.

Target draft paths are recorded in the contract register: account card collection, card detail and card request. Additional lifecycle action contracts are finalized before that implementation batch. The issuer/network, physical versus virtual products and legal terms remain backend/product integration decisions; the frontend can proceed against explicit sandbox contracts without implying an approved issuer.

## Homepage summaries

C05 shows owned account balances per currency, verification/required actions, card summary and recent transactions. Card summary uses the same card collection as account detail, shows status and masked digits and opens its permitted card controls. On mobile show one readable card at a time with labeled navigation; on desktop group by account. Do not compress cards or financial columns into unreadable thumbnails. Absent/restricted/unavailable card data is distinct from zero issued cards.

Recent transactions use the exact C07 owned operation source: account, kind, amount/fee/currency, direction, masked counterparty, reference, timestamp and server status. Accepted/pending is not completed; UNKNOWN retains its hold/inquiry guidance. Show a bounded recent list, clear empty/loading/error/restricted states, and a View all activity link preserving account context. Amounts remain integer minor-unit strings and never combine currencies. Aggregate summaries come from authoritative operation snapshots; no invented analytics or fixture amounts in components.

## Exit criteria

Personal/business card designs visually inspected at desktop and390px; accessible statuses and controls; account/context switching removes prior card data; issued and empty/restricted/error states are truthful; permitted card workflows change server mock records and both summaries; exact idempotent retries do not issue duplicate cards; customer cannot activate production or grant scope; recent-transaction rows/counts match C07 source and retain UNKNOWN semantics. API, component and browser tests plus all three builds/mock-exclusion are required. Backend issuer authorization, PCI controls and staging verification remain separately recorded.
