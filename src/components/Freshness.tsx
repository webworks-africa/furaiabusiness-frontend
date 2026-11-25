import { Button } from "./ui/button";
export function Freshness({
  asOf,
  stale,
  refresh,
}: {
  asOf: string;
  stale: boolean;
  refresh: () => void;
}) {
  return stale ? (
    <div className="notice warning" role="status">
      <span>
        Stale data · last confirmed{" "}
        {new Date(asOf).toLocaleString("en-GB", { timeZone: "Africa/Nairobi" })}{" "}
        EAT. Refresh before making decisions.
      </span>
      <Button variant="outline" onClick={refresh}>
        Refresh
      </Button>
    </div>
  ) : (
    <p className="footnote">
      As of{" "}
      {new Date(asOf).toLocaleString("en-GB", { timeZone: "Africa/Nairobi" })}{" "}
      EAT
    </p>
  );
}
export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`badge ${["Completed", "Ready", "Active"].includes(status) ? "success" : ["Failed", "Expired", "Restricted"].includes(status) ? "danger" : "warning"}`}
    >
      {status}
    </span>
  );
}
