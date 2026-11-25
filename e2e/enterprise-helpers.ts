import { expect, type Page } from "@playwright/test";
export async function setPolicy(page: Page, count: number) {
  await page.goto("/settings/workflows");
  await page
    .getByLabel("Required distinct authorizers", { exact: true })
    .selectOption(String(count));
  const reply = page.waitForResponse(
    (r) =>
      r.url().endsWith("/business/mandate") && r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Save approval policy", exact: true })
    .click();
  expect((await reply).status()).toBe(200);
}
export async function createOrder(
  page: Page,
  reference = "E2E-ORDER-001",
  outcome = "confirmed",
  alreadyStarted = false,
) {
  if (alreadyStarted)
    await page
      .getByRole("navigation", { name: "Workspace", exact: true })
      .getByRole("link", { name: "Send money", exact: true })
      .click();
  else await page.goto("/send-money");
  await page
    .getByLabel("Source account", { exact: true })
    .selectOption("acc_kes");
  await page
    .getByLabel("Send to beneficiary", { exact: true })
    .selectOption("BEN-MOCK-001");
  await page.getByLabel("Amount (KES)", { exact: true }).fill("123.45");
  await page.getByLabel("Payment reference", { exact: true }).fill(reference);
  await page
    .getByLabel("Simulated settlement outcome", { exact: true })
    .selectOption(outcome);
  await page
    .getByRole("button", { name: "Review & reserve payment", exact: true })
    .click();
  await expect(page).toHaveURL(/\/send-money\/PAY-ORDER-/);
  return new URL(page.url()).pathname;
}
export async function otp(page: Page, final = true) {
  await page
    .getByRole("button", { name: "Request approval OTP", exact: true })
    .click();
  await page.getByLabel("Approval OTP", { exact: true }).fill("246810");
  await page
    .getByRole("button", {
      name: final ? "Authorize & send payment" : "Verify OTP & approve",
      exact: true,
    })
    .click();
}
export async function changeRole(page: Page, role: string) {
  const tools = page.locator("details.mock-controls");
  if ((await tools.getAttribute("open")) === null)
    await tools.locator("summary").click();
  await page
    .getByRole("combobox", { name: "Mock identity", exact: true })
    .selectOption(role);
  await page
    .getByRole("button", { name: "Apply scenario", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Apply scenario", exact: true }),
  ).toBeEnabled();
}
