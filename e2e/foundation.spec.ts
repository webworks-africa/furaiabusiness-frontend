import { test, expect } from "./fixtures";
test("overview, account detail and paginated uncertain transaction", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Good morning, David" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Account details" }).click();
  await expect(
    page.getByRole("heading", { name: "Account details", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Workspace", exact: true })
    .getByRole("link", { name: "Transactions" })
    .click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(
    page
      .getByRole("region", { name: "Transactions", exact: true })
      .getByText("Pending confirmation", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Bank transfer · TXN-90234")).toBeVisible();
});
test("developer access changes with mock role, failures reset", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByText("Development tools · scenarios & reset").click();
  await page.getByLabel("Mock identity").selectOption("viewer");
  await page.getByRole("button", { name: "Apply scenario" }).click();
  await expect(
    page.getByRole("link", { name: "Developers", exact: true }),
  ).toHaveCount(0);
  await page.evaluate(() => {
    window.history.pushState({}, "", "/developers");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await expect(
    page.getByRole("heading", { name: "Permission denied" }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Scenario", exact: true })
    .selectOption("unavailable");
  await page.getByRole("button", { name: "Apply scenario" }).click();
  await page.getByRole("link", { name: "Overview", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Service unavailable" }),
  ).toBeVisible();
  const controls = page.locator("details.mock-controls");
  if ((await controls.getAttribute("open")) === null)
    await controls.locator("summary").click();
  await page.getByRole("button", { name: "Reset mock data" }).click();
  await expect(
    page.getByRole("heading", { name: "Good morning, David" }),
  ).toBeVisible();
});
test("mobile navigation is keyboard accessible and has no page overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Good morning, David" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open navigation" }).focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Close navigation", exact: true }).first(),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Open navigation" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await page
    .getByRole("navigation", { name: "Workspace", exact: true })
    .getByRole("link", { name: "Accounts", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Treasury & Operational Accounts" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
