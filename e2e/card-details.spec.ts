import { test, expect } from "./fixtures";
test("show/hide, expiry, automatic masking and navigation keep test details scoped", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/cards/CARD-MOCK-001");
  const card = page.getByRole("region", {
    name: "Primary Treasury Debit details",
    exact: true,
  });
  await expect(
    page.getByText("0000 0000 0000 4821", { exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Show card details", exact: true })
    .click();
  await expect(
    page.getByText("0000 0000 0000 4821", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("12/30 · 000", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Hide card details", exact: true })
    .click();
  await expect(
    page.getByText("0000 0000 0000 4821", { exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Show card details", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Hide card details", exact: true }),
  ).toBeVisible();
  await page.clock.fastForward(60001);
  await expect(
    page.getByRole("button", { name: "Show card details", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Show card details", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Hide card details", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "All cards →", exact: true }).click();
  await expect(
    page.getByText("0000 0000 0000 4821", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Show card details", exact: true }),
  ).toHaveCount(3);
  await expect(card).toHaveCount(1);
});
test("black credit preview retains reveal simulation, mobile proportions and unavailable repayment", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/cards/CARD-PREVIEW");
  await page
    .getByRole("button", { name: "Show card details", exact: true })
    .click();
  await expect(
    page.getByText("0000 0000 0000 0000", { exact: true }),
  ).toBeVisible();
  const visual = page.locator(".credit-preview");
  await expect(visual).toHaveCSS("background-color", "rgb(21, 23, 25)");
  await expect(
    page.getByRole("button", {
      name: "Make repayment — unavailable",
      exact: true,
    }),
  ).toBeDisabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  await page.screenshot({
    path: "/tmp/furaia-black-credit-mobile.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Hide card details", exact: true })
    .click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("link", { name: "All cards →", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Corporate cards", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "/tmp/furaia-black-credit-portfolio.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
