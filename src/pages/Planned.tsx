import { Link, useLocation } from "react-router-dom";
import { navigation } from "../app/navigation";
import { useSession } from "../application/queries";
import { can } from "../auth/adapter";
import { ApiError } from "../api/http";
import { StatePanel } from "../components/StatePanel";
export function Planned() {
  const location = useLocation();
  const session = useSession();
  const item = navigation
    .flatMap((g) => g.items)
    .find((i) => i.path === location.pathname);
  if (
    location.pathname.startsWith("/developers") &&
    session.data &&
    !can(session.data.permissions, "developer:read")
  )
    return <StatePanel error={new ApiError(403, null)} />;
  return (
    <section className="panel state">
      <span className="badge">{item?.batch ?? "F5"} · Scheduled</span>
      <h1>{item?.label ?? "Public payment pages"}</h1>
      <p>This workflow is not implemented in the foundation batch.</p>
      <p>
        The approved screen and its dependencies are tracked in the page
        inventory. No financial action is available here yet.
      </p>
      <Link to="/">Return to overview</Link>
    </section>
  );
}
export function NotFound() {
  return (
    <section className="panel state">
      <h1>Page not found</h1>
      <p>Check the address or return to your workspace.</p>
      <Link to="/">Return to overview</Link>
    </section>
  );
}

export function PublicPlanned() {
  return (
    <section className="panel state">
      <span className="badge">F5 · Scheduled</span>
      <h1>Public payment pages</h1>
      <p>Checkout workflows are not implemented in this foundation batch.</p>
      <p>No payment can be initiated or confirmed here.</p>
    </section>
  );
}
