import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { request, ApiError } from "../api/http";
import {
  beneficiaryListSchema,
  payoutListSchema,
  payoutSchema,
  cardListSchema,
  cardSchema,
  cardActivitySchema,
} from "../api/paymentContracts";
import type { z } from "zod";
export function useBeneficiaries(search = "", page = 1, status = "") {
  return useQuery({
    queryKey: ["beneficiaries", search, page, status],
    queryFn: () =>
      request(
        "/beneficiaries?" +
          new URLSearchParams({ search, page: String(page), status }),
        beneficiaryListSchema,
      ),
  });
}
export function usePayouts(search = "", page = 1, status = "") {
  return useQuery({
    queryKey: ["payments", search, page, status],
    queryFn: () =>
      request(
        "/payments?" +
          new URLSearchParams({ search, page: String(page), status }),
        payoutListSchema,
      ),
  });
}
export function usePayout(id: string) {
  return useQuery({
    queryKey: ["payment", id],
    queryFn: () => request(`/payments/${encodeURIComponent(id)}`, payoutSchema),
    enabled: !!id,
  });
}
export function useCards() {
  return useQuery({
    queryKey: ["cards"],
    queryFn: () => request("/cards", cardListSchema),
  });
}
export function useCard(id: string) {
  return useQuery({
    queryKey: ["card", id],
    queryFn: () => request(`/cards/${encodeURIComponent(id)}`, cardSchema),
    enabled: !!id,
  });
}
export function useCardActivity(id: string) {
  return useQuery({
    queryKey: ["card-activity", id],
    queryFn: () =>
      request(`/cards/${encodeURIComponent(id)}/activity`, cardActivitySchema),
    enabled: !!id,
  });
}
export function usePaymentWrite<T>(schema: z.ZodType<T>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      path,
      body,
      key,
    }: {
      path: string;
      body?: unknown;
      key: string;
    }) =>
      request(path, schema, {
        method: "POST",
        headers: { "Idempotency-Key": key },
        body: JSON.stringify(body ?? {}),
      }),
    onSuccess: () => client.invalidateQueries(),
    onError: (e) =>
      e instanceof ApiError && e.status === 409
        ? client.invalidateQueries()
        : undefined,
  });
}
