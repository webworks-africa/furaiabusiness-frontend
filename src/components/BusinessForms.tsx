import { useSession } from "../application/queries";
import { cloneElement, isValidElement, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useActivity } from "../application/business";
import { Button } from "./ui/button";
import { StatePanel, Empty } from "./StatePanel";
export function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      {error &&
      isValidElement<{ "aria-describedby"?: string; "aria-invalid"?: boolean }>(
        children,
      )
        ? cloneElement(children, {
            "aria-invalid": true,
            "aria-describedby": [
              children.props["aria-describedby"],
              `${id}-error`,
            ]
              .filter(Boolean)
              .join(" "),
          })
        : children}
      {error && (
        <p className="field-error" id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
export function MutationMessage({
  error,
  success,
}: {
  error?: Error | null;
  success?: string;
}) {
  return (
    <>
      {error && (
        <p role="alert" className="field-error">
          {error.message}
        </p>
      )}
      {success && !error && (
        <p role="status" className="saved-message">
          {success}
        </p>
      )}
    </>
  );
}
export function VersionNotice({
  local,
  server,
  reload,
}: {
  local: number;
  server: number;
  reload: () => void;
}) {
  return local !== server ? (
    <div className="notice warning" role="status">
      <span>
        Your edits use version {local}; saved data is now version {server}.
        Reload saved values before retrying.
      </span>
      <Button variant="outline" type="button" onClick={reload}>
        Reload saved values
      </Button>
    </div>
  ) : null;
}
export function SettingsNav() {
  const session = useSession();
  return (
    <nav className="page-tabs" aria-label="Settings sections">
      <Link to="/settings">Business profile</Link>
      <Link to="/settings/security">Security & sessions</Link>
      {session.data?.role === "admin" && (
        <>
          <Link to="/settings/workflows">Approvals & invoice templates</Link>
          <Link to="/settings/tax">Tax integration</Link>
        </>
      )}
      <Link to="/onboarding/status">Application status</Link>
    </nav>
  );
}
export function ActivityLog() {
  const q = useActivity();
  return (
    <section className="panel">
      <h2>Business activity</h2>
      <p>Mock activity history; no external notifications are sent.</p>
      {q.isPending ? (
        <StatePanel />
      ) : q.error ? (
        <StatePanel error={q.error} retry={() => void q.refetch()} />
      ) : !q.data.items.length ? (
        <Empty
          title="No recorded changes"
          detail="Saved business actions will appear here."
        />
      ) : (
        <ol className="activity-list">
          {q.data.items.slice(0, 20).map((item) => (
            <li key={item.id}>
              <strong>{item.event}</strong>
              <small>
                {item.actor} ·{" "}
                {new Date(item.at).toLocaleString("en-GB", {
                  timeZone: "Africa/Nairobi",
                })}{" "}
                EAT
              </small>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
