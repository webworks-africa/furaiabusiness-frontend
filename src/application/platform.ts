import { useQuery } from "@tanstack/react-query";
import { request, download } from "../api/http";
import {
  reportSchema,
  exportsSchema,
  exportSchema,
  developerSchema,
  credentialCreated,
  type ReportFilters,
} from "../api/platformContracts";
export { usePaymentWrite as usePlatformWrite } from "./payments";
export function useReport(filters: ReportFilters) {
  return useQuery({
    queryKey: ["report", filters],
    queryFn: () =>
      request(
        "/reports/data?" +
          new URLSearchParams(
            Object.fromEntries(
              Object.entries(filters).map(([k, v]) => [k, String(v)]),
            ),
          ),
        reportSchema,
      ),
  });
}
export function useReportExports() {
  return useQuery({
    queryKey: ["report-exports"],
    queryFn: () => request("/report-exports", exportsSchema),
  });
}
export function useReportExport(id: string) {
  return useQuery({
    queryKey: ["report-export", id],
    queryFn: () =>
      request(`/report-exports/${encodeURIComponent(id)}`, exportSchema),
    enabled: !!id,
    refetchInterval: (q) =>
      ["Queued", "Generating"].includes(q.state.data?.status ?? "") &&
      !q.state.error
        ? 500
        : false,
  });
}
export function downloadReport(id: string) {
  return download(
    `/report-exports/${encodeURIComponent(id)}/download`,
    `${id}.csv`,
  );
}
export function useDeveloper() {
  return useQuery({
    queryKey: ["developer-workspace"],
    queryFn: () => request("/developers/workspace", developerSchema),
  });
}
// Once-only responses intentionally bypass Query/mutation caches.
export function credentialAction(
  path: string,
  body: unknown,
  key: string,
  signal: AbortSignal,
) {
  return request(path, credentialCreated, {
    method: "POST",
    headers: { "Idempotency-Key": key },
    body: JSON.stringify(body),
    signal,
    cache: "no-store",
  });
}
