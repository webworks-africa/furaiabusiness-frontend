# F5 — invoice checkout, allocations and credit/refund events

Version 0.5.0 extends F1–F4; no dependency changes. All workflows are mock-complete, not API-integrated or staging-verified.

Invoice-bound links support expiry/revoke/partial configuration, currency-matched settlement accounts and public checkout. Original payment references survive Processing/Pending confirmation; duplicate attempts are blocked. Only confirmed simulated inquiry allocates and posts cash, creates an immutable printable receipt and updates invoice/customer/overview/account/transaction views. Credit notes preserve issued snapshots and never move money. Refund requests reserve paid customer credit; separate development events confirm/fail refunds and post separate cash movements. Link revocation does not erase an existing uncertain payment.

Receipt/credit layouts extend the approved visual language; unsupported rail/regulatory/certification claims are absent. Real provider callbacks, legal receipts/PDF, delivery, refund approval/execution and secure capability/session integration await confirmed contracts. See VERIFICATION.md for actual checks, README for Windows commands and MOCKS.md for reset/scenarios. F6 payments/beneficiaries/approvals/cards is next.
