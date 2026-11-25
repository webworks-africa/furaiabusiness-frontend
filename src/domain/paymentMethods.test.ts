import { it, expect } from "vitest";
import { normalizeKenyanMobile, maskMobile } from "./paymentMethods";
it("normalizes Kenya mobile formats and masks stored destinations", () => {
  for (const value of [
    "0712 345 678",
    "+254712345678",
    "254712345678",
    "(0712)-345-678",
  ])
    expect(normalizeKenyanMobile(value)).toBe("254712345678");
  expect(normalizeKenyanMobile("0112345678")).toBe("254112345678");
  expect(maskMobile("254712345678")).toBe("2547•••••678");
});
it("rejects invalid country, length, landline and alphabetic inputs", () => {
  for (const value of [
    "",
    "123",
    "+255712345678",
    "0201234567",
    "07123456789",
    "phone0712345678",
  ])
    expect(normalizeKenyanMobile(value)).toBeNull();
});
