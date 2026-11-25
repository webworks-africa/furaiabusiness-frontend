import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { request, download } from "../api/http";
import {
  accountListSchema,
  accountDetailSchema,
  overviewSchema,
  transactionPageSchema,
  transactionDetailSchema,
  statementListSchema,
  statementJobSchema,
  type StatementRequest,
} from "../api/contracts";
import { filterParams, type TransactionFilters } from "../domain/filters";
import { authAdapter } from "../auth/adapter";
export const keys = {
  session: ["session"],
  overview: ["overview"],
  accounts: ["accounts"],
  statements: ["statements"],
} as const;
export function useSession() {
  return useQuery({
    queryKey: keys.session,
    queryFn: authAdapter.session,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}
export function useOverview() {
  return useQuery({
    queryKey: keys.overview,
    queryFn: () => request("/business/overview", overviewSchema),
  });
}
export function useAccounts() {
  return useQuery({
    queryKey: keys.accounts,
    queryFn: () => request("/accounts", accountListSchema),
  });
}
export function useAccount(id: string) {
  return useQuery({
    queryKey: ["account", id],
    queryFn: () =>
      request(`/accounts/${encodeURIComponent(id)}`, accountDetailSchema),
    enabled: !!id,
  });
}
export function useTransactions(filters: TransactionFilters, enabled = true) {
  return useQuery({
    queryKey: ["transactions", filters],
    queryFn: ({ signal }) =>
      request(`/transactions?${filterParams(filters)}`, transactionPageSchema, {
        signal,
      }),
    enabled,
  });
}
export function useTransaction(id: string) {
  return useQuery({
    queryKey: ["transaction", id],
    queryFn: () =>
      request(
        `/transactions/${encodeURIComponent(id)}`,
        transactionDetailSchema,
      ),
    enabled: !!id,
  });
}
export function useStatements() {
  return useQuery({
    queryKey: keys.statements,
    queryFn: () => request("/statements", statementListSchema),
  });
}
export function useStatement(id: string) {
  const client = useQueryClient();
  return useQuery({
    queryKey: ["statement", id],
    queryFn: async () => {
      const data = await request(
        `/statements/${encodeURIComponent(id)}`,
        statementJobSchema,
      );
      if (["Ready", "Failed", "Expired"].includes(data.status))
        void client.invalidateQueries({ queryKey: keys.statements });
      return data;
    },
    enabled: !!id,
    refetchInterval: (query) =>
      ["Queued", "Generating"].includes(query.state.data?.status ?? "") &&
      !query.state.error
        ? 500
        : false,
  });
}
export function useCreateStatement() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ values, key }: { values: StatementRequest; key: string }) =>
      request("/statements", statementJobSchema, {
        method: "POST",
        headers: { "Idempotency-Key": key },
        body: JSON.stringify(values),
      }),
    onSuccess: (data) => {
      client.setQueryData(["statement", data.id], data);
      void client.invalidateQueries({ queryKey: keys.statements });
    },
  });
}
export function useRetryStatement(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () =>
      request(
        `/statements/${encodeURIComponent(id)}/retry`,
        statementJobSchema,
        { method: "POST" },
      ),
    onSuccess: (data) => {
      client.setQueryData(["statement", id], data);
      void client.invalidateQueries({ queryKey: keys.statements });
    },
  });
}
export function useDownloadStatement(id: string) {
  return useMutation({
    mutationFn: () =>
      download(`/statements/${encodeURIComponent(id)}/download`, `${id}.csv`),
  });
}
