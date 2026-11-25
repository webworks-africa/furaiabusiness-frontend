import { test, expect } from "./fixtures";
test("filter state survives navigation and uncertain transaction remains unposted", async ({
  page,
}) => {
  await page.goto("/transactions?status=Pending%20confirmation&currency=KES");
  await expect(page.getByText("1 transactions · page 1 of 1")).toBeVisible();
  await page.getByRole("link", { name: "Kenya Power", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Transaction TXN-90234" }),
  ).toBeVisible();
  await expect(page.getByText(/Do not re-initiate or duplicate/)).toBeVisible();
  await expect(page.getByText("KES 0.00", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Refresh status", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Payment outcome unresolved" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Back to transactions" }).click();
  await expect(page).toHaveURL(/status=Pending/);
  await expect(
    page.getByRole("combobox", { name: "Status", exact: true }),
  ).toHaveValue("Pending confirmation");
});
test("generate and download a statement snapshot", async ({ page }) => {
  await page.goto("/accounts/acc_kes");
  await page
    .getByRole("button", { name: "Generate statement", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Generate statement", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your statement is ready" }),
  ).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download CSV" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("STMT-0001.csv");
  await page
    .getByRole("link", { name: "Statement exports", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "STMT-0001 · KES statement" }),
  ).toBeVisible();
});
test("failed export retries the original reference", async ({ page }) => {
  await page.goto("/accounts");
  await page.getByText("Development tools · scenarios & reset").click();
  await page
    .getByRole("combobox", { name: "Scenario", exact: true })
    .selectOption("export-failure");
  await page.getByRole("button", { name: "Apply scenario" }).click();
  await page
    .getByRole("button", { name: "Generate statement", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Generate statement", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Statement generation failed" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Retry generation" }).click();
  await expect(
    page.getByRole("heading", { name: "Your statement is ready" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Statement STMT-0001", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("2", { exact: true })).toBeVisible();
});
test("viewer cannot export; invalid filters and missing records are visible", async ({
  page,
}) => {
  await page.goto("/accounts");
  await page.getByText("Development tools · scenarios & reset").click();
  await page
    .getByRole("combobox", { name: "Mock identity", exact: true })
    .selectOption("viewer");
  await page.getByRole("button", { name: "Apply scenario" }).click();
  await expect(
    page.getByRole("button", { name: "Generate statement", exact: true }),
  ).toBeDisabled();
  await page.goto("/transactions?from=2026-11-01&to=2026-10-01");
  await expect(
    page.getByText(
      "The URL contains invalid filters. Reset filters to continue.",
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reset filters" }).click();
  await expect(page.getByText("24 transactions · page 1 of 4")).toBeVisible();
  await page.goto("/transactions/not-found");
  await expect(
    page.getByRole("heading", { name: "Record not found" }),
  ).toBeVisible();
});
test("USD summary stays separate and mobile statement dialog supports Escape", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/accounts/acc_usd");
  await expect(page.getByText("USD 25,000.00", { exact: true })).toBeVisible();
  await expect(
    page.getByText("KES 14,842,950.00", { exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Generate statement", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("statement date validation and expiry prevent an invalid download", async ({
  page,
}) => {
  await page.goto("/accounts");
  await page
    .getByRole("button", { name: "Generate statement", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("From date", { exact: true }).fill("2026-10-10");
  await dialog.getByLabel("To date", { exact: true }).fill("2026-10-01");
  await dialog
    .getByRole("button", { name: "Generate statement", exact: true })
    .click();
  await expect(
    dialog.getByText("From date must be on or before To date"),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByText("Development tools · scenarios & reset").click();
  await page
    .getByRole("combobox", { name: "Scenario", exact: true })
    .selectOption("export-expired");
  await page.getByRole("button", { name: "Apply scenario" }).click();
  await page
    .getByRole("button", { name: "Generate statement", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Generate statement", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Statement download expired" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Download CSV" })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Generate new statement" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
});
