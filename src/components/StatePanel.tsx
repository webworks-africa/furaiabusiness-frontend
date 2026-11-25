import { ApiError } from "../api/http";
import { Button } from "./ui/button";
export function StatePanel({
  error,
  retry,
}: {
  error?: Error | null;
  retry?: () => void;
}) {
  const title = !error
    ? "Loading your workspace…"
    : error instanceof ApiError && error.status === 401
      ? "Session expired"
      : error instanceof ApiError && error.status === 404
        ? "Record not found"
        : error instanceof ApiError && error.status === 403
          ? "Permission denied"
          : "Service unavailable";
  return (
    <section className="panel state" role={error ? "alert" : "status"}>
      <h2>{title}</h2>
      <p>{error?.message ?? "Retrieving the latest workspace information."}</p>
      {error && retry && (
        <Button variant="outline" onClick={retry}>
          Try again
        </Button>
      )}
    </section>
  );
}
export function Empty({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="state">
      <h2>{title}</h2>
      <p>{detail}</p>
    </div>
  );
}
