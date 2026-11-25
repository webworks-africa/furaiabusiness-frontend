import { test, expect, type Page } from "./fixtures";
async function open(page: Page) {
  await page.goto("/payment-links/new");
  await page
    .getByLabel("Issued invoice", { exact: true })
    .selectOption("INV-MOCK-101");
  await page
    .getByLabel("Settlement account", { exact: true })
    .selectOption("acc_kes");
  await page
    .getByRole("button", { name: "Generate checkout link", exact: true })
    .click();
  await page.getByRole("link", { name: "Open checkout", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Pay invoice INV-MOCK-101" }),
  ).toBeVisible();
}
test("M-Pesa validates phone, sends a simulated STK push and confirms the original payment", async ({
  page,
}) => {
  await open(page);
  await page
    .getByRole("button", { name: "Send simulated STK push", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Enter a Kenyan mobile number" }),
  ).toBeVisible();
  await page
    .getByLabel("M-Pesa mobile number", { exact: true })
    .fill("0712 345 678");
  await page.getByLabel("Payment amount (KES)", { exact: true }).fill("100.00");
  await page
    .getByRole("button", { name: "Send simulated STK push", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Simulated M-Pesa phone prompt",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Waiting for M-Pesa confirmation", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".phone-pulse")).toBeVisible();
  await expect(
    page.getByText("STK push sent (simulated)", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Mobile number: 2547•••••678", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Approve simulated phone prompt",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("Authorized (simulated)", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Payment confirmed", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Check original payment", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Payment confirmed", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("KES\u00a034,700.00", { exact: true }),
  ).toBeVisible();
});
for (const [label, button] of [
  ["PesaLink", "Simulate bank transfer submitted"],
  ["Visa", "Authorize simulated card"],
  ["Mastercard", "Authorize simulated card"],
  ["PayPal", "Approve simulated PayPal"],
])
  test(`${label} has a simulated authorization journey`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page);
    await page.getByRole("radio", { name: new RegExp(label) }).check();
    await expect(
      page.getByLabel("M-Pesa mobile number", { exact: true }),
    ).toHaveCount(0);
    await page
      .getByRole("button", { name: "Start simulated payment", exact: true })
      .click();
    await page.getByRole("button", { name: button, exact: true }).click();
    await expect(
      page.getByText("Authorized (simulated)", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Check original payment", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Payment confirmed", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
