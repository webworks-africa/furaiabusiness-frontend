import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { request, ApiError } from "../api/http";
import {
  linkSchema,
  linkListSchema,
  checkoutSchema,
  attemptSchema,
  settlementSchema,
  receiptSchema,
} from "../api/collectionContracts";
import type { z } from "zod";
export function useCollectionWrite<T>(schema: z.ZodType<T>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      path,
      body,
      key,
    }: {
      path: string;
      body?: unknown;
      key?: string;
    }) =>
      request(path, schema, {
        method: "POST",
        headers: key ? { "Idempotency-Key": key } : {},
        body: JSON.stringify(body ?? {}),
      }),
    onSuccess: () => client.invalidateQueries(),
    onError: (e) =>
      e instanceof ApiError && e.status === 409
        ? client.invalidateQueries()
        : undefined,
  });
}
export function usePaymentLinks(search: string, page: number, status: string) {
  return useQuery({
    queryKey: ["payment-links", search, page, status],
    queryFn: () =>
      request(
        "/payment-links?" +
          new URLSearchParams({ search, page: String(page), status }),
        linkListSchema,
      ),
  });
}
export function usePaymentLink(id: string) {
  return useQuery({
    queryKey: ["payment-link", id],
    queryFn: () =>
      request("/payment-links/" + encodeURIComponent(id), linkSchema),
    enabled: !!id,
  });
}
export function useSettlement(id: string) {
  return useQuery({
    queryKey: ["settlement", id],
    queryFn: () =>
      request(
        `/invoices/${encodeURIComponent(id)}/settlement`,
        settlementSchema,
      ),
  });
}
export function useCheckout(token: string) {
  return useQuery({
    queryKey: ["checkout", token],
    queryFn: () =>
      request("/public/checkouts/" + encodeURIComponent(token), checkoutSchema),
    staleTime: 0,
  });
}
export function useAttempt(token: string) {
  return useQuery({
    queryKey: ["collection-result", token],
    queryFn: () =>
      request(
        "/public/collection-results/" + encodeURIComponent(token),
        attemptSchema,
      ),
    staleTime: 0,
  });
}
export function useReceipt(id: string) {
  return useQuery({
    queryKey: ["receipt", id],
    queryFn: () =>
      request("/receipts/" + encodeURIComponent(id), receiptSchema),
  });
}
