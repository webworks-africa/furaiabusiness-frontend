import { z } from "zod";
export const dateInput = z
  .string()
  .refine(
    (v) =>
      v === "" ||
      (/^\d{4}-\d{2}-\d{2}$/.test(v) &&
        !Number.isNaN(Date.parse(v)) &&
        new Date(v).toISOString().slice(0, 10) === v),
    "Enter a valid date",
  );
export const transactionFiltersSchema = z
  .object({
    search: z.string().max(120),
    account: z.string(),
    currency: z.enum(["", "KES", "USD"]),
    status: z.enum(["", "Completed", "Pending confirmation", "Failed"]),
    rail: z.enum([
      "",
      "Collection",
      "Bank transfer",
      "PesaLink",
      "M-Pesa B2C",
      "RTGS",
    ]),
    from: dateInput,
    to: dateInput,
    sort: z.enum(["newest", "oldest"]),
    page: z.coerce.number().int().min(1).max(10000),
  })
  .refine((v) => !v.from || !v.to || v.from <= v.to, {
    message: "From date must be on or before To date",
    path: ["to"],
  });
export type TransactionFilters = z.output<typeof transactionFiltersSchema>;
export const defaultFilters: TransactionFilters = {
  search: "",
  account: "",
  currency: "",
  status: "",
  rail: "",
  from: "",
  to: "",
  sort: "newest",
  page: 1,
};
export function filterParams(filters: TransactionFilters) {
  const p = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== "" && v !== undefined) p.set(k, String(v));
  });
  return p;
}
export function dayInNairobi(iso: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Africa/Nairobi",
  }).formatToParts(new Date(iso));
  return ["year", "month", "day"]
    .map((type) => parts.find((p) => p.type === type)?.value)
    .join("-");
}
