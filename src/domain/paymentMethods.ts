export const paymentMethods = [
  {
    id: "mpesa",
    label: "M-Pesa",
    description: "STK push to your phone",
    kesOnly: true,
  },
  {
    id: "pesalink",
    label: "PesaLink",
    description: "Bank transfer reference",
    kesOnly: true,
  },
  {
    id: "visa",
    label: "Visa",
    description: "Hosted card checkout",
    kesOnly: false,
  },
  {
    id: "mastercard",
    label: "Mastercard",
    description: "Hosted card checkout",
    kesOnly: false,
  },
  {
    id: "paypal",
    label: "PayPal",
    description: "PayPal approval",
    kesOnly: false,
  },
] as const;
export function normalizeKenyanMobile(value: string): string | null {
  let v = value.trim().replace(/[\s()-]/g, "");
  if (v.startsWith("+")) v = v.slice(1);
  if (/^0[17]\d{8}$/.test(v)) v = "254" + v.slice(1);
  return /^254[17]\d{8}$/.test(v) ? v : null;
}
export function maskMobile(phone: string) {
  return phone.slice(0, 4) + "•••••" + phone.slice(-3);
}
export function methodName(method: string) {
  return (
    paymentMethods.find((m) => m.id === method)?.label ?? "Simulated payment"
  );
}
