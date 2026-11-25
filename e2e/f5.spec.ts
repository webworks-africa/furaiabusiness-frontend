import { readFile } from "node:fs/promises";
import { test, expect, type Page } from "./fixtures";
async function checkout(page: Page) {
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
  await page.getByRole("radio", { name: /Visa Hosted card checkout/ }).check();
}
async function confirm(page: Page) {
  await page
    .getByRole("button", { name: "Authorize simulated card", exact: true })
    .click();
  await expect(
    page.getByText("Authorized (simulated)", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Check original payment", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Payment confirmed", exact: true }),
  ).toBeVisible();
}
test("pending partial payment keeps reference then confirms with receipt and correct invoice balance", async ({
  page,
}) => {
  await checkout(page);
  await page.getByLabel("Payment amount (KES)", { exact: true }).fill("100.00");
  await page
    .getByRole("button", { name: "Start simulated payment", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Payment processing", exact: true }),
  ).toBeVisible();
  const reference = await page
    .getByRole("heading", { name: /COL-MOCK/ })
    .innerText();
  await page
    .getByRole("button", { name: "Check original payment", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Pending confirmation", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: reference, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Start simulated payment", exact: true }),
  ).toHaveCount(0);
  await confirm(page);
  await expect(
    page.getByText("KES\u00a034,700.00", { exact: true }),
  ).toBeVisible();
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "KES\u00a034,700.00", exact: true }),
  ).toBeVisible();
  await page.goBack();
  await page.getByRole("link", { name: "View invoice", exact: true }).click();
  await expect(page.getByText("Partially paid", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: /View receipt RCT/ }).click();
  await expect(
    page.getByRole("button", { name: "Print receipt", exact: true }),
  ).toBeVisible();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF", exact: true }).click();
  const pdf = await pending;
  expect((await readFile((await pdf.path())!)).subarray(0, 5).toString()).toBe(
    "%PDF-",
  );
});
test("credit and refund records stay separate until external confirmation", async ({
  page,
}) => {
  await checkout(page);
  await page
    .getByRole("button", { name: "Start simulated payment", exact: true })
    .click();
  await confirm(page);
  await page.goBack();
  await page.goBack();
  await page.getByRole("link", { name: "View invoice", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Invoice INV-MOCK-101", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Credit amount", { exact: true }).fill("100.00");
  await page
    .getByLabel("Credit reason", { exact: true })
    .fill("Service cancellation credit");
  await page
    .getByRole("checkbox", {
      name: "I confirm this credit note is immutable and does not return cash.",
      exact: true,
    })
    .check();
  await page
    .getByRole("button", { name: "Issue credit note", exact: true })
    .click();
  await expect(
    page.getByText("Service cancellation credit", { exact: false }),
  ).toBeVisible();
  await page.getByLabel("Refund amount", { exact: true }).fill("100.00");
  await page
    .getByLabel("Refund reason", { exact: true })
    .fill("Return customer credit");
  await page
    .getByLabel("Original confirmed payment", { exact: true })
    .selectOption({ index: 1 });
  await page
    .getByRole("checkbox", {
      name: "I confirm this request does not prove money has been returned.",
      exact: true,
    })
    .check();
  await page
    .getByRole("button", { name: "Request refund", exact: true })
    .click();
  await expect(
    page.getByText("Pending confirmation · Return customer credit", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Simulate confirmed refund", exact: true })
    .click();
  await expect(
    page.getByText("Confirmed · Return customer credit", { exact: true }),
  ).toBeVisible();
});
test("revoked checkout is blocked and mobile link list remains readable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await checkout(page);
  await page.goBack();
  await page.getByRole("button", { name: "Revoke link", exact: true }).click();
  await expect(
    page.getByText("Revoked", { exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("link", { name: "Open checkout", exact: true }).click();
  await expect(
    page.getByText(
      "This link is revoked. Contact the business for a new link.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Start simulated payment", exact: true }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
