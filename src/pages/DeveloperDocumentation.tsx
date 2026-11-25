import { Button } from "../components/ui/button";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
const chapters = [
  {
    id: "overview",
    group: "Getting started",
    title: "Overview",
    method: "GET",
    path: "/api/session",
    body: "Build business experiences against explicit Furaia target contracts. The portal routes every request through a typed HTTP boundary. Development MSW simulates that boundary; no live financial API is asserted here.",
    request: "GET /api/session\nAccept: application/json",
    response:
      '{ "memberId": "member_admin", "business": "Example Ltd", "permissions": ["banking:read"] }',
  },
  {
    id: "authentication",
    group: "Getting started",
    title: "Authentication & access",
    method: "POST",
    path: "/api/partner/v1/sessions",
    body: "Browser sessions use the uploaded partner identity contract: identifier plus verification challenge, followed by an authorized Business projection. Real integrations require a secure HttpOnly cookie/BFF, CSRF policy and server-side tenancy checks. API-client authentication is separate; never embed private keys or secrets in frontend code.",
    request:
      'POST /api/partner/v1/sessions\nContent-Type: application/json\n\n{ "identifier": "<business identifier>", "challenge": "<verification challenge>" }',
    response:
      '{ "surface": "partner", "active_scope_id": "<business UUID>", "mfa": "verified", "capabilities": ["<authorized capability>"] }',
  },
  {
    id: "accounts",
    group: "Banking services",
    title: "Accounts & balances",
    method: "GET",
    path: "/api/accounts",
    body: "Keep ledger, held and available balances distinct. New foreign-currency accounts are optional and reviewed separately; never combine currencies or invent FX conversions. A business signup does not itself create a funded account.",
    request: "GET /api/accounts\nCookie: <secure server session>",
    response:
      '{ "items": [{ "id": "acc_kes", "currency": "KES", "ledgerMinor": "100000", "heldMinor": "25000", "availableMinor": "75000" }] }',
  },
  {
    id: "payments",
    group: "Banking services",
    title: "Payments & OTP approvals",
    method: "POST",
    path: "/api/payment-orders",
    body: "Create one payment order to a saved person or business payee. Submission reserves available cash. OTP authorizations bind member, order version, expiry and attempts. The final required distinct authorization dispatches the original payment. Only confirmed settlement debits ledger. Never create a replacement attempt while the result is UNKNOWN.",
    request:
      'POST /api/payment-orders\nIdempotency-Key: <one intent key>\n\n{ "accountId": "acc_kes", "beneficiaryId": "<payee id>", "amountMinor": "12345", "reference": "SUPPLIER-001", "outcome": "confirmed" }\n\n# outcome is development simulation only\nPOST /api/payment-orders/:id/challenge\nPOST /api/payment-orders/:id/approve',
    response:
      '{ "orders": [{ "id": "PAY-ORDER-1", "required": 2, "approvals": [], "payout": { "status": "Awaiting approval", "holdMinor": "12345" } }] }',
  },
  {
    id: "collections",
    group: "Banking services",
    title: "Collections & M-Pesa STK",
    method: "POST",
    path: "/api/public/checkouts/:token/attempts",
    body: "A public payment capability is distinct from a Business session. STK requests show an explicit waiting state; no real handset is contacted in development. A browser redirect, PIN prompt, timeout or pending provider status never proves successful payment. Confirm through the original reference before allocating funds.",
    request:
      'POST /api/public/checkouts/:token/attempts\nIdempotency-Key: <original intent key>\n\n{ "method": "mpesa", "phone": "<test Kenyan phone>", "amountMinor": "12345" }\n\n# Confirm the exact checkout endpoint against the integration register.',
    response:
      '{ "status": "Pending confirmation", "providerReference": "<original reference>", "receipt": null }',
  },
  {
    id: "statements",
    group: "Business tools",
    title: "Statements & reports",
    method: "GET",
    path: "/api/customers/:id/statement",
    body: "Customer statements are running receivable ledgers: issued invoices debit, confirmed allocations and credit notes credit, and confirmed refunds debit customer credit. Date-filtered opening and closing balances use the selected currency. Bank statements and certified reporting are separate contracts.",
    request:
      "GET /api/customers/contact_1/statement?currency=KES&from=2026-10-01&to=2026-10-21",
    response:
      '{ "currency": "KES", "openingMinor": "0", "closingMinor": "3480000", "rows": [{ "kind": "Invoice", "debitMinor": "3480000", "creditMinor": "0", "balanceMinor": "3480000" }] }',
  },
  {
    id: "business-tools",
    group: "Business tools",
    title: "Procurement, payroll, POS & loans",
    method: "GET",
    path: "/api/business-tools",
    body: "LPO issue is a document event and does not move funds. Payroll creates individual reserved payment orders with the same mandate. POS and loan repayments post money only on explicit simulated confirmation. Lending remains a preview with a flat monthly rate, exact installments and backend-dependent underwriting/issuance authority.",
    request:
      "GET /api/business-tools\n\nPOST /api/lpos\nPOST /api/payroll\nPOST /api/pos/sales\nPOST /api/loans",
    response:
      '{ "mandate": { "approvals": 2 }, "payroll": [], "lpos": [], "terminals": [], "loans": [] }',
  },
  {
    id: "idempotency",
    group: "Integration guides",
    title: "Idempotency & money",
    method: "POST",
    path: "/api/payment-orders/:id/inquiry",
    body: "Reuse one idempotency key for the same intent and payload; changed input with that key conflicts. Keep integer minor-unit strings across API boundaries and exact decimal quantity/rate arithmetic. Totals, permissions, eligibility and settlement remain authoritative backend decisions.",
    request:
      'POST /api/payment-orders/PAY-ORDER-1/inquiry\nIdempotency-Key: <inquiry key>\n\n{ "version": 4 }',
    response:
      '{ "status": "Pending confirmation", "reference": "SUPPLIER-001" }\n\n# Pending confirmation is never Paid.',
  },
  {
    id: "webhooks",
    group: "Integration guides",
    title: "Webhook events & retries",
    method: "POST",
    path: "/api/developers/webhooks",
    body: "The dispatcher records development attempts without outbound HTTP. Receivers must durably deduplicate event IDs and verify the agreed signature/replay window on the server. Signature format, key rotation, retries/backoff and operational dispatch await backend confirmation. Sandbox and production access are separate grants.",
    request:
      'POST /api/developers/webhooks\n\n{ "appId": "<app id>", "name": "Receipts", "url": "https://receiver.example.test/events", "events": ["payment.confirmed"] }',
    response:
      '{ "event": "payment.confirmed", "reference": "REDACTED-TEST-REFERENCE", "simulated": true }',
  },
  {
    id: "errors",
    group: "Integration guides",
    title: "Errors & troubleshooting",
    method: "GET",
    path: "/api/transactions/:id",
    body: "401 requires reauthentication, 403 requires permission, 409 means version/state/idempotency conflict, 422 means validation and 503 means unavailable service. Preserve the original reference on uncertainty. Redact secrets, OTPs, cookies, PAN/CVV and personal payloads from telemetry.",
    request:
      "GET /api/transactions/<original transaction id>\nX-Request-Id: <correlation id>",
    response:
      '{ "error": { "code": "STATE_CONFLICT", "message": "Refresh the original record." } }',
  },
];
export function DeveloperDocumentation() {
  const [p, set] = useSearchParams(),
    [search, setSearch] = useState(""),
    [copied, setCopied] = useState(false);
  const current =
    chapters.find((c) => c.id === (p.get("topic") ?? "overview")) ??
    chapters[0];
  const filtered = chapters.filter((c) =>
    `${c.title} ${c.group} ${c.path}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Furaia developer hub</span>
          <h1>API documentation</h1>
          <p>Banking services, business tools and integration guides</p>
        </div>
        <Link to="/api-banking">Explore API banking →</Link>
      </div>
      <div className="notice">
        Proposed target contracts and development simulations. Confirm
        request/response schemas against the supplied identity contract and
        Business integration register before real API use. Examples are
        intentionally abbreviated.
      </div>
      <div className="api-doc-layout">
        <aside className="panel api-doc-sidebar">
          <label htmlFor="docs-search">Search documentation</label>
          <input
            id="docs-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Accounts, payments, webhooks…"
          />
          <nav aria-label="Documentation topics">
            {[
              "Getting started",
              "Banking services",
              "Business tools",
              "Integration guides",
            ].map((g) => (
              <details key={g} open>
                <summary>{g}</summary>
                {filtered
                  .filter((c) => c.group === g)
                  .map((c) => (
                    <button
                      key={c.id}
                      className={current.id === c.id ? "active" : ""}
                      aria-current={current.id === c.id ? "page" : undefined}
                      onClick={() => {
                        set((p) => {
                          p.set("topic", c.id);
                          return p;
                        });
                        setCopied(false);
                      }}
                    >
                      {c.title}
                    </button>
                  ))}
              </details>
            ))}
            {!filtered.length && <p>No matching documentation.</p>}
          </nav>
        </aside>
        <article className="panel api-doc-article">
          <p className="eyebrow">{current.group}</p>
          <h2 id="overview">{current.title}</h2>
          <p className="docs-prose">{current.body}</p>
          <div className="endpoint">
            <strong>{current.method}</strong>
            <code>{current.path}</code>
            <span>Proposed</span>
          </div>
          <h3 id="request">Request example</h3>
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(current.request);
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
          >
            {copied ? "Copied request" : "Copy request"}
          </Button>
          <pre className="code-sample">{current.request}</pre>
          <h3 id="response">Response example</h3>
          <pre className="code-sample">{current.response}</pre>
          <h3 id="integration-notes">Integration notes</h3>
          <ul>
            <li>
              Use server-side authentication and authorization. API secrets
              never belong in browser code.
            </li>
            <li>
              Keep money exact, currencies separate, and payment references
              stable.
            </li>
            <li>
              Production enablement needs an independently approved backend
              capability.
            </li>
          </ul>
          <p>
            No regulatory status, banking partnership, SLA or operational SDK is
            implied.
          </p>
        </article>
        <nav className="api-doc-toc" aria-label="On this page">
          <strong>On this page</strong>
          <a href="#overview">Overview</a>
          <a href="#request">Request</a>
          <a href="#response">Response</a>
          <a href="#integration-notes">Integration notes</a>
          <Link to="/login">Business sign in →</Link>
        </nav>
      </div>
    </>
  );
}
export function ApiBankingPage() {
  return (
    <div className="api-banking">
      <span className="eyebrow">Furaia API banking</span>
      <h1>
        Financial workflows,
        <br />
        built into your business.
      </h1>
      <p>
        Explore the proposed accounts, payments, collections and business-tool
        contracts. Start with clear documentation and an explicitly simulated
        sandbox.
      </p>
      <div className="action-row">
        <Link className="button button-primary" to="/docs">
          Read the documentation
        </Link>
        <Link className="button button-outline" to="/login">
          Business sign in
        </Link>
      </div>
      <div className="api-capabilities">
        {[
          [
            "Accounts & statements",
            "Currency-scoped balances, holds and running statements.",
          ],
          [
            "Payments & approvals",
            "Saved recipients, OTP mandates and original-reference inquiry.",
          ],
          [
            "Collections",
            "M-Pesa STK simulation, invoices, links and confirmed allocations.",
          ],
          [
            "Business operations",
            "Procurement, payroll, POS and a clearly labelled lending preview.",
          ],
        ].map(([t, b]) => (
          <section className="panel" key={t}>
            <h2>{t}</h2>
            <p>{b}</p>
          </section>
        ))}
      </div>
      <section className="panel">
        <h2>From sandbox to integration</h2>
        <ol>
          <li>Create and verify a business profile.</li>
          <li>Request and receive separate developer sandbox permission.</li>
          <li>
            Create a scoped app, test contracts and inspect delivery evidence.
          </li>
          <li>
            Confirm backend security and payment contracts, then request
            production review.
          </li>
        </ol>
        <p>Sandbox keys are synthetic. Production access is never automatic.</p>
      </section>
    </div>
  );
}
