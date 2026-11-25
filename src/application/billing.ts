import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { request, ApiError } from "../api/http";
import {
  billingDocumentSchema,
  billingListSchema,
  contactSchema,
  contactListSchema,
  publicQuoteSchema,
  type ContactFields,
  type DocumentFields,
} from "../api/billingContracts";
export type Kind = "quotations" | "invoices";
export function useContacts(
  search = "",
  page = 1,
  status = "All",
  options = false,
) {
  return useQuery({
    queryKey: ["contacts", search, page, status, options],
    queryFn: () =>
      request(
        options
          ? "/contacts/options"
          : `/contacts?${new URLSearchParams({ search, page: String(page), status })}`,
        contactListSchema,
      ),
  });
}
export function useContact(id: string) {
  return useQuery({
    queryKey: ["contact", id],
    queryFn: () =>
      request(`/contacts/${encodeURIComponent(id)}`, contactSchema),
    enabled: !!id,
  });
}
function useWrite<I, O>(fn: (input: I) => Promise<O>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => client.invalidateQueries(),
    onError: (error) =>
      error instanceof ApiError && error.status === 409
        ? client.invalidateQueries()
        : undefined,
  });
}
export function useSaveContact() {
  return useWrite(
    ({
      id,
      version,
      ...values
    }: ContactFields & { id?: string; version?: number }) =>
      request(
        id ? `/contacts/${encodeURIComponent(id)}` : "/contacts",
        contactSchema,
        {
          method: id ? "PATCH" : "POST",
          body: JSON.stringify(id ? { ...values, version } : values),
        },
      ),
  );
}
export function useBillingList(
  kind: Kind,
  search: string,
  page: number,
  currency: string,
  status: string,
  contactId = "",
) {
  return useQuery({
    queryKey: ["billing-list", kind, search, page, currency, status, contactId],
    queryFn: () =>
      request(
        `/billing/${kind}?${new URLSearchParams({ search, page: String(page), currency, status, contactId })}`,
        billingListSchema,
      ),
  });
}
export function useBillingDocument(kind: Kind, id: string) {
  return useQuery({
    queryKey: ["billing-document", kind, id],
    queryFn: () =>
      request(
        `/billing/${kind}/${encodeURIComponent(id)}`,
        billingDocumentSchema,
      ),
    enabled: !!id,
  });
}
export function useSaveDocument(kind: Kind) {
  return useWrite(
    ({
      id,
      version,
      values,
      key,
    }: {
      id?: string;
      version?: number;
      values: DocumentFields;
      key: string;
    }) =>
      request(
        id ? `/billing/${kind}/${encodeURIComponent(id)}` : `/billing/${kind}`,
        billingDocumentSchema,
        {
          method: id ? "PATCH" : "POST",
          headers: { "Idempotency-Key": key },
          body: JSON.stringify(id ? { version, values } : values),
        },
      ),
  );
}
export function useDocumentAction(kind: Kind, id: string) {
  return useWrite(({ action, version }: { action: string; version: number }) =>
    request(
      `/billing/${kind}/${encodeURIComponent(id)}/${action}`,
      billingDocumentSchema,
      { method: "POST", body: JSON.stringify({ version }) },
    ),
  );
}
export function usePublicQuote(token: string) {
  return useQuery({
    queryKey: ["public-quote", token],
    queryFn: () =>
      request(
        `/public/quotations/${encodeURIComponent(token)}`,
        publicQuoteSchema,
      ),
    retry: false,
  });
}
export function useQuoteResponse(token: string) {
  return useWrite(
    (values: {
      version: number;
      name: string;
      consent: boolean;
      decision: "accept" | "decline";
    }) =>
      request(
        `/public/quotations/${encodeURIComponent(token)}/respond`,
        publicQuoteSchema,
        { method: "POST", body: JSON.stringify(values) },
      ),
  );
}

export function useDocumentAppearance(kind:Kind,id:string){return useWrite(({template,version}:{template:"classic"|"modern"|"minimal";version:number})=>request(`/billing/${kind}/${encodeURIComponent(id)}/appearance`,billingDocumentSchema,{method:"POST",body:JSON.stringify({version,template})}));}
