import { config } from "../api/config";
import { beneficiaryListSchema } from "../api/paymentContracts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { z } from "zod";
import { request } from "../api/http";
import {
  toolsSchema,
  brandingSchema,
  customerStatementSchema,
} from "../api/enterpriseContracts";
export const toolsKey = ["business-tools"];
export function useTools() {
  return useQuery({
    queryKey: toolsKey,
    queryFn: () => request("/business-tools", toolsSchema),
  });
}
export function useBranding() {
  return useQuery({
    queryKey: ["branding"],
    queryFn: () => request("/business/branding", brandingSchema),
  });
}
export function useCustomerStatement(id: string, params: URLSearchParams) {
  return useQuery({
    queryKey: ["customer-statement", id, params.toString()],
    queryFn: () =>
      request(
        `/customers/${encodeURIComponent(id)}/statement?${params}`,
        customerStatementSchema,
      ),
  });
}
// OTP input is transient service input, never retained in the mutation cache or logs.
export function useToolsAction() {
  const cache = useQueryClient();
  const [pending, setPending] = useState(false),
    [error, setError] = useState<Error | null>(null);
  const keys = useRef(new Map<string, string>());
  async function run(path: string, body: unknown) {
    setError(null);
    if (
      !config.mock &&
      (/^\/(pos|loans)(\/|$)/.test(path) || path.endsWith("/outcome"))
    ) {
      setError(
        new Error(
          "This simulation is unavailable in real API mode; a confirmed backend capability is required.",
        ),
      );
      return false;
    }
    const payload =
      !config.mock &&
      path === "/payment-orders" &&
      body &&
      typeof body === "object"
        ? Object.fromEntries(
            Object.entries(body).filter(([key]) => key !== "outcome"),
          )
        : body;
    setPending(true);
    const fingerprint =
      path +
      JSON.stringify(payload, (key, value) =>
        key === "code" ? "REDACTED" : value,
      );
    let key = keys.current.get(fingerprint);
    if (!key) {
      key = crypto.randomUUID();
      keys.current.set(fingerprint, key);
    }
    try {
      const result = await request(path, toolsSchema, {
        method: "POST",
        headers: { "Idempotency-Key": key },
        body: JSON.stringify(payload),
      });
      cache.setQueryData(toolsKey, result);
      await cache.invalidateQueries();
      return true;
    } catch (e) {
      setError(
        e instanceof Error
          ? e
          : new Error(
              "Service unavailable. Refresh the original record before retrying.",
            ),
      );
      return false;
    } finally {
      setPending(false);
    }
  }
  return { run, pending, error };
}
export function useRegistration() {
  const [pending, setPending] = useState(false),
    [error, setError] = useState<Error | null>(null);
  async function register(body: unknown) {
    setPending(true);
    setError(null);
    try {
      await request("/business-registration", z.object({ ok: z.boolean() }), {
        method: "POST",
        body: JSON.stringify(body),
      });
      return true;
    } catch (e) {
      setError(e instanceof Error ? e : new Error("Registration unavailable"));
      return false;
    } finally {
      setPending(false);
    }
  }
  return { register, pending, error };
}

export function usePayeeOptions() {
  return useQuery({
    queryKey: ["payee-options"],
    queryFn: () => request("/beneficiaries/options", beneficiaryListSchema),
  });
}
export function useBusinessPreferences() {
  return useQuery({
    queryKey: ["business-preferences"],
    queryFn: () =>
      request(
        "/business/preferences",
        z.object({
          foreignAccounts: z.boolean(),
          requiredApprovals: z.number().int(),
        }),
      ),
  });
}

export function useCardholders() {
  return useQuery({
    queryKey: ["cardholders"],
    queryFn: () =>
      request(
        "/cards/holders",
        z.object({
          asOf: z.string(),
          stale: z.boolean(),
          members: z.array(
            z.object({
              id: z.string(),
              name: z.string(),
              status: z.literal("Active"),
              role: z.enum(["admin", "finance", "developer", "viewer"]),
            }),
          ),
        }),
      ),
  });
}
