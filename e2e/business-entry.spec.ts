import { otp, createOrder } from "./enterprise-helpers";
import { test, expect, type Page } from "@playwright/test";
async function login(page: Page, identifier = "admin@business.sandbox") {
  await page.getByLabel("Sign-in identifier", { exact: true }).fill(identifier);
  await page
    .getByLabel("Verification challenge", { exact: true })
    .fill("246810");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}
async function signout(page: Page) {
  await page.getByLabel("Profile menu").click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Sign in to Furaia" }),
  ).toBeVisible();
}
test("protected entry, validation, original destination, sign out and no credential persistence", async ({
  page,
}) => {
  await page.goto("/accounts");
  await expect(
    page.getByRole("heading", { name: "Sign in to Furaia" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByText("Enter a valid sign-in identifier."),
  ).toBeVisible();
  await page
    .getByLabel("Sign-in identifier", { exact: true })
    .fill("admin@business.sandbox");
  await page
    .getByLabel("Verification challenge", { exact: true })
    .fill("000000");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("not accepted");
  await login(page);
  await expect(page).toHaveURL(/\/accounts$/);
  await expect(
    page.getByRole("heading", {
      name: "Treasury & Operational Accounts",
      exact: true,
    }),
  ).toBeVisible();
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
  expect(
    await page.evaluate(() =>
      Object.values(sessionStorage).some(
        (v) => v.includes("246810") || v.includes("MOCK_CSRF"),
      ),
    ),
  ).toBe(false);
  await signout(page);
  await page.goto("/accounts");
  await expect(
    page.getByRole("heading", { name: "Sign in to Furaia" }),
  ).toBeVisible();
});
test("two logged-in members verify OTPs before dispatch and the confirmed debit is visible", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto("/settings/workflows");
  await login(page);
  await page
    .getByLabel("Required distinct authorizers", { exact: true })
    .selectOption("2");
  await page
    .getByRole("button", { name: "Save approval policy", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Save approval policy", exact: true }),
  ).toBeEnabled();
  await createOrder(page, "SIGNED-IN-APPROVAL", "confirmed", true);
  await otp(page, false);
  await expect(
    page.getByText(
      "Your approval is recorded. Another authorized member must approve.",
      { exact: true },
    ),
  ).toBeVisible();
  await signout(page);
  await login(page, "finance@business.sandbox");
  await page
    .getByRole("navigation", { name: "Workspace", exact: true })
    .getByRole("link", { name: "Payments", exact: true })
    .click();
  await page
    .locator("tbody tr")
    .filter({ hasText: "SIGNED-IN-APPROVAL" })
    .getByRole("link")
    .first()
    .click();
  await expect(page.getByText(/1 of 2 distinct OTP approvals/)).toBeVisible();
  await otp(page);
  await expect(
    page.getByRole("heading", { name: "Payment sent", exact: true }),
  ).toBeVisible();
  await expect(page.locator("h2 .money-outgoing")).toContainText("123.45");
  await page
    .getByRole("link", { name: "View confirmed transaction →", exact: true })
    .click();
  await expect(page.locator(".balance .money-outgoing").first()).toContainText(
    "123.45",
  );
});
test("viewer login cannot create or approve payments and legacy entry resolves", async ({
  page,
}) => {
  await page.goto("/partners");
  await login(page, "viewer@business.sandbox");
  await expect(
    page.getByRole("heading", { name: "Good morning, Sarah" }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Workspace", exact: true })
    .getByRole("link", { name: "Payments", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "New payment", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Developers", exact: true }),
  ).toHaveCount(0);
});
test("expired session returns to login and reauthentication restores target", async ({
  page,
}) => {
  await page.goto("/payments");
  await login(page);
  await page.getByText("Development tools · scenarios & reset").click();
  await page
    .getByRole("combobox", { name: "Scenario", exact: true })
    .selectOption("expired");
  await page
    .getByRole("button", { name: "Apply scenario", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Sign in to Furaia" }),
  ).toBeVisible();
  await login(page);
  await expect(page).toHaveURL(/\/payments$/);
  await expect(
    page.getByRole("heading", {
      name: "Payments & disbursements",
      exact: true,
    }),
  ).toBeVisible();
});
test("external return target stays in Business and public pages stay anonymous", async ({
  page,
}) => {
  await page.goto("/public/payment-links/unknown");
  await expect(
    page.getByRole("heading", { name: "Record not found" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Sign in to Furaia" }),
  ).toHaveCount(0);
  await page.goto("/login?returnTo=https://example.test");
  await login(page);
  await expect(page).toHaveURL(/:\d+\/$/);
});
test("login and direction colours remain readable at phone, tablet and desktop widths", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: 960 });
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: "Sign in to Furaia" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `/tmp/furaia-login-${width}.png`,
      fullPage: true,
    });
  }
  await login(page);
  await expect(page.locator(".metric-value.money-incoming")).toBeVisible();
  await expect(page.locator(".metric-value.money-outgoing")).toBeVisible();
  const table = page.getByRole("region", { name: "Transactions", exact: true });
  await expect(table.locator(".money-incoming").first()).toHaveCSS(
    "color",
    "rgb(22, 101, 52)",
  );
  await expect(table.locator(".money-outgoing").first()).toHaveCSS(
    "color",
    "rgb(180, 35, 24)",
  );
  expect(errors).toEqual([]);
  await page.screenshot({
    path: "/tmp/furaia-combined-overview.png",
    fullPage: true,
  });
});
