export function PaymentCardPreview() {
  return (
    <div
      className="payment-card"
      aria-label="Mock Furaia business debit card ending 4821"
    >
      <div className="card-top">
        <strong>
          FURAIA <span>◆</span>
        </strong>
        <small>BUSINESS</small>
      </div>
      <div className="chip" aria-hidden="true" />
      <div className="card-kind">KES DEBIT · PREVIEW</div>
      <div className="card-number">•••• · •••• · •••• · 4821</div>
      <div className="card-bottom">
        <div>
          <small>BUSINESS NAME</small>
          <strong>WEBWORKS AFRICA LTD</strong>
        </div>
        <span>MOCK</span>
      </div>
    </div>
  );
}
