import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { z } from "zod";
import { request } from "../api/http";
import { config } from "../api/config";
import {
  financialDocumentSchema,
  workspaceSchema,
  supplierWorkspaceSchema,
  publicSupplierSchema,
  type FinancialDocument,
} from "../api/documentContracts";
export function useDocumentModel(kind: FinancialDocument["kind"], id: string) {
  return useQuery({
    queryKey: ["financial-document", kind, id],
    queryFn: () =>
      request(
        `/documents/${kind}/${encodeURIComponent(id)}`,
        financialDocumentSchema,
      ),
  });
}
export function useDocumentWorkspace() {
  return useQuery({
    queryKey: ["document-workspace"],
    queryFn: () => request("/documents/workspace", workspaceSchema),
    refetchInterval: (q) =>
      q.state.data?.deliveries.some((m) => m.status === "Queued") ? 600 : false,
  });
}
export function useSupplierDocuments() {
  return useQuery({
    queryKey: ["supplier-documents"],
    queryFn: () => request("/supplier-documents", supplierWorkspaceSchema),
    refetchInterval: 3000,
  });
}
export function usePublicSupplier(token: string) {
  return useQuery({
    queryKey: ["public-supplier", token],
    queryFn: () =>
      request(
        `/public/supplier-submissions/${encodeURIComponent(token)}`,
        publicSupplierSchema,
      ),
  });
}
export function useDocumentCommand() {
  const cache = useQueryClient(),
    keys = useRef(new Map<string, string>()),
    [pending, setPending] = useState(false),
    [error, setError] = useState<Error | null>(null);
  async function run<T>(
    path: string,
    schema: z.ZodType<T>,
    body: unknown = {},
  ): Promise<T | null> {
    setError(null);
    setPending(true);
    const fingerprint =
      path + (body instanceof FormData ? "upload" : JSON.stringify(body));
    let key = keys.current.get(fingerprint);
    if (!key) {
      key = crypto.randomUUID();
      keys.current.set(fingerprint, key);
    }
    try {
      if (
        !config.mock &&
        path.startsWith("/tax/") &&
        (path.includes("demo-") || path.endsWith("/submit-demo"))
      )
        throw Error(
          "Tax simulation is unavailable in real API mode. A confirmed eTIMS backend contract is required.",
        );
      const result = await request(path, schema, {
        method: "POST",
        headers: { "Idempotency-Key": key },
        body: body instanceof FormData ? body : JSON.stringify(body),
      });
      await cache.invalidateQueries();
      return result;
    } catch (e) {
      setError(
        e instanceof Error ? e : new Error("Document service unavailable"),
      );
      return null;
    } finally {
      setPending(false);
    }
  }
  return { run, pending, error };
}
