# Payment options — 0.5.1

Adds M-Pesa STK simulation with Kenyan phone validation, one-time dispatch/idempotent replay, masked destination/provider reference and approve/cancel phone prompt. Adds PesaLink reference transfer, Visa and Mastercard hosted authorization simulators, and PayPal approval simulator. All use the original payment inquiry/allocation/receipt boundary. Approval alone changes no cash. Pending blocks cross-method duplicates. KES-only mobile/bank mocks and KES/USD card/PayPal flags await real eligibility confirmation.

No real phone push, rails, credentials, PAN/CVV/PIN fields, hosted provider redirect or merchant partnership is connected. Controls remain development-only; release scan rejects bundled simulator markers. See VERIFICATION.md for checks and README for setup. No dependency versions changed.
