import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { TransactionBrowser } from "../components/TransactionBrowser";
export function Transactions() {
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Transactions</h1>
          <p>
            Ledger activity across accounts · all dates in EAT. Pending outcomes
            remain unconfirmed.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/statements">Statement exports</Link>
        </Button>
      </div>
      <TransactionBrowser />
    </>
  );
}
