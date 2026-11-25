import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Eye, EyeOff, Radio } from "lucide-react";
import type { BusinessCard, MockCardDetails } from "../api/paymentContracts";
import { useSession } from "../application/queries";
import { revealMockCardDetails } from "../application/cardDetails";
import { can } from "../auth/adapter";
import { config } from "../api/config";
import { Button } from "./ui/button";
export function CardVisual({
  card,
  details,
}: {
  card: BusinessCard;
  details?: MockCardDetails;
}) {
  const credit = card.kind === "Credit";
  return (
    <div
      className={`payment-card business-card ${credit ? "credit-preview" : ""}`}
      aria-label={`${card.kind} card ${card.last4 ? `ending ${card.last4}` : "design preview"}`}
    >
      <div className="card-top">
        <strong>FURAIA</strong>
        <small>{credit ? "BUSINESS CREDIT" : card.form.toUpperCase()}</small>
      </div>
      {credit && (
        <div className="credit-subtitle">
          REVOLVING CREDIT LINE · DESIGN PREVIEW
        </div>
      )}
      <div className="card-hardware">
        <div className="chip" aria-hidden="true">
          <span />
        </div>
        <Radio size={18} aria-hidden="true" />
        {credit && <small>FURAIA BUSINESS</small>}
      </div>
      <div className="card-kind">
        {credit
          ? "PREVIEW · NO CREDIT ISSUED"
          : `BUSINESS DEBIT · ${card.last4 ? "MOCK" : "NOT ISSUED"}`}
      </div>
      <div className="card-number">
        {details ? (
          details.number
        ) : (
          <>•••• · •••• · •••• · {card.last4 ?? "••••"}</>
        )}
      </div>
      <div className="card-bottom">
        <div>
          <small>CARDHOLDER / BUSINESS</small>
          <strong>{card.holderName}</strong>
          <small>{card.businessName}</small>
        </div>
        <div className="card-security-values">
          <small>VALID THRU · CVV</small>
          <strong>
            {details ? `${details.expiry} · ${details.cvv}` : "••/•• · •••"}
          </strong>
        </div>
      </div>
    </div>
  );
}
export function RevealableCard({ card }: { card: BusinessCard }) {
  const session = useSession();
  const location = useLocation();
  const allowed =
    can(session.data?.permissions ?? [], "cards:reveal") && !card.stale;
  // A new security context always mounts masked, even for a cached card route.
  return (
    <CardDisclosure
      key={`${card.id}:${card.version}:${session.data?.memberId}:${allowed}:${location.pathname}`}
      card={card}
      allowed={allowed}
    />
  );
}
function CardDisclosure({
  card,
  allowed,
}: {
  card: BusinessCard;
  allowed: boolean;
}) {
  const [details, setDetails] = useState<MockCardDetails>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const active = useRef<AbortController | undefined>(undefined);
  const supported = ["Active", "Frozen", "Preview"].includes(card.status);
  const enabled = import.meta.env.DEV && config.mock && allowed && supported;
  function hide() {
    active.current?.abort();
    active.current = undefined;
    setDetails(undefined);
    setLoading(false);
    setError("");
  }
  useEffect(() => {
    const obscure = () => {
      active.current?.abort();
      active.current = undefined;
      setDetails(undefined);
      setLoading(false);
    };
    const visibility = () => {
      if (document.hidden) obscure();
    };
    window.addEventListener("blur", obscure);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      active.current?.abort();
      window.removeEventListener("blur", obscure);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  useEffect(() => {
    if (!details) return;
    const timer = setTimeout(() => setDetails(undefined), 60000);
    return () => clearTimeout(timer);
  }, [details]);
  async function reveal() {
    if (!enabled) return;
    const controller = new AbortController();
    active.current = controller;
    setLoading(true);
    setError("");
    try {
      const value = await revealMockCardDetails(card.id, controller.signal);
      if (!controller.signal.aborted && active.current === controller) {
        setDetails(value);
        setLoading(false);
      }
    } catch (e) {
      if (!controller.signal.aborted && active.current === controller) {
        setLoading(false);
        setError(
          e instanceof Error ? e.message : "Could not reveal test details.",
        );
      }
    }
  }
  return (
    <section className="card-disclosure" aria-label={`${card.name} details`}>
      <CardVisual card={card} details={details} />
      <div className="card-reveal-controls">
        <Button
          type="button"
          variant="outline"
          disabled={!enabled || loading}
          aria-expanded={!!details}
          onClick={() => (details ? hide() : void reveal())}
        >
          {details ? <EyeOff size={16} /> : <Eye size={16} />}{" "}
          {loading
            ? "Loading details…"
            : details
              ? "Hide card details"
              : "Show card details"}
        </Button>
        <small>
          {supported
            ? enabled
              ? "Simulated · hides after 60 seconds"
              : "Secure reveal unavailable"
            : "Details available after issuance"}
        </small>
      </div>
      {details && (
        <p className="card-test-notice" role="status">
          Test details only — not valid for payments. Hides when you leave this
          page or switch windows.
        </p>
      )}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
