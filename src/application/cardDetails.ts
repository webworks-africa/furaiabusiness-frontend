import { request } from "../api/http";
import { config } from "../api/config";
import { mockCardDetailsSchema } from "../api/paymentContracts";
// Deliberately outside Query: revealed values must not enter shared query/mutation caches.
export function revealMockCardDetails(id: string, signal: AbortSignal) {
  if (!import.meta.env.DEV || !config.mock)
    throw new Error("Secure issuer reveal is not connected.");
  return request(
    `/__mock/cards/${encodeURIComponent(id)}/details`,
    mockCardDetailsSchema,
    { method: "POST", body: "{}", signal, cache: "no-store" },
  );
}
