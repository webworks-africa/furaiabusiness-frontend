import { test, expect, type Page } from "./fixtures";
async function control(page: Page, scenario: string, role = "admin") {
  const tools = page.locator("details.mock-controls");
  if ((await tools.getAttribute("open")) === null)
    await tools.locator("summary").click();
  await page
    .getByRole("combobox", { name: "Scenario", exact: true })
    .selectOption(scenario);
  await page
    .getByRole("combobox", { name: "Mock identity", exact: true })
    .selectOption(role);
  await page
    .getByRole("button", { name: "Apply scenario", exact: true })
    .click();
}
async function makeCredential(page: Page) {
  await page
    .getByLabel("Credential application", { exact: true })
    .selectOption("APP-SBX-001");
  await page
    .getByLabel("Credential name", { exact: true })
    .fill("E2E sandbox credential");
  await page
    .getByRole("group", { name: "Credential scopes", exact: true })
    .getByLabel("payments:read", { exact: true })
    .check();
  await page
    .getByRole("button", { name: "Create one-time credential", exact: true })
    .click();
  await expect(page.locator("code.secret-value")).toBeVisible();
}
test("reports keep currencies separate, export a queued CSV snapshot and deny viewer export", async ({
  page,
}) => {
  await page.goto("/reports/cash-movement");
  await page.getByLabel("Report currency", { exact: true }).selectOption("USD");
  await expect(
    page.getByRole("heading", { name: "USD\u00a025,400.00", exact: true }),
  ).toBeVisible();
  await expect(page.locator("tbody")).toContainText("TXN-USD");
  await page
    .getByRole("button", { name: "Generate CSV snapshot", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Download report CSV", exact: true }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download report CSV", exact: true })
    .click();
  expect((await download).suggestedFilename()).toMatch(/^REPORT-MOCK-.*\.csv$/);
  await page
    .getByRole("link", { name: "Cash movement & liquidity", exact: true })
    .click();
  await control(page, "normal", "viewer");
  await expect(
    page.getByRole("button", { name: "Generate CSV snapshot", exact: true }),
  ).toBeDisabled();
});
test("selected export failure retries the same snapshot/reference", async ({
  page,
}) => {
  await page.goto("/reports/invoice-collection");
  await control(page, "export-failure");
  await page
    .getByRole("button", { name: "Generate CSV snapshot", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Retry report generation", exact: true }),
  ).toBeVisible();
  const url = page.url();
  await page
    .getByRole("button", { name: "Retry report generation", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Download report CSV", exact: true }),
  ).toBeVisible();
  expect(page.url()).toBe(url);
  await expect(page.getByText(/Attempt 2/)).toBeVisible();
});
test("application scope edits persist across repeated saves and suspension", async ({
  page,
}) => {
  await page.goto("/developers/applications");
  await page
    .getByLabel("Application name", { exact: true })
    .fill("E2E reconciliation app");
  await page
    .getByLabel("Application purpose", { exact: true })
    .fill("Daily account and invoice reconciliation workflow.");
  await page
    .getByRole("group", { name: "Application scopes", exact: true })
    .getByLabel("accounts:read", { exact: true })
    .check();
  await page
    .getByRole("button", { name: "Create sandbox application", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "E2E reconciliation app", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Application purpose", { exact: true })
    .fill("Updated daily account reconciliation workflow.");
  await page
    .getByRole("button", { name: "Save application", exact: true })
    .click();
  await expect(
    page.getByText("Application saved.", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Application status", { exact: true })
    .selectOption("Suspended");
  await page
    .getByRole("button", { name: "Save application", exact: true })
    .click();
  await expect(
    page.getByLabel("Application status", { exact: true }),
  ).toHaveValue("Suspended");
  await expect(page.getByRole("alert")).toHaveCount(0);
});
test("credential secret closes permanently, rotates and revokes without a re-reveal control", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/developers/credentials");
  await makeCredential(page);
  const first = await page.locator("code.secret-value").innerText();
  expect(first).toMatch(/^FURAIA_MOCK_ONLY_/);
  await page
    .getByRole("button", { name: "Done & close secret", exact: true })
    .click();
  await expect(page.getByText(first, { exact: true })).toHaveCount(0);
  await page
    .getByRole("button", { name: "Rotate credential", exact: true })
    .click();
  await expect(page.locator("code.secret-value")).toBeVisible();
  expect(await page.locator("code.secret-value").innerText()).not.toBe(first);
  await page.clock.fastForward(60001);
  await expect(page.locator("code.secret-value")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Revoke credential", exact: true })
    .click();
  await expect(
    page.getByText("Credential revoked.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Rotate credential", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator("code.secret-value")).toHaveCount(0);
});
test("webhook failure/retry retains the event and production review never grants live access", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto("/developers/credentials");
  await makeCredential(page);
  await page
    .getByRole("button", { name: "Done & close secret", exact: true })
    .click();
  await page.getByRole("link", { name: "Webhooks", exact: true }).click();
  await page
    .getByLabel("Webhook application", { exact: true })
    .selectOption("APP-SBX-001");
  await page
    .getByLabel("Webhook name", { exact: true })
    .fill("E2E event receiver");
  await page
    .getByRole("group", { name: "Subscribed events", exact: true })
    .getByLabel("payment.confirmed", { exact: true })
    .check();
  await page
    .getByRole("button", { name: "Add simulated webhook", exact: true })
    .click();
  await expect(
    page.getByText("Webhook endpoint saved; no connection was made.", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Send simulated event", exact: true })
    .click();
  await expect(
    page.getByText("Attempt 1 · HTTP 500", { exact: true }),
  ).toBeVisible();
  const url = page.url();
  await page
    .getByRole("button", { name: "Retry original delivery", exact: true })
    .click();
  await expect(
    page.getByText("Attempt 2 · HTTP 200", { exact: true }),
  ).toBeVisible();
  expect(page.url()).toBe(url);
  await page
    .getByRole("link", { name: "Production access", exact: true })
    .click();
  await page
    .getByLabel("Production review application", { exact: true })
    .selectOption("APP-SBX-001");
  await page
    .getByLabel("Commercial use case", { exact: true })
    .fill("Automated supplier and invoice reconciliation for the business.");
  await page
    .getByLabel("Technical contact email", { exact: true })
    .fill("developer@example.test");
  await page
    .getByLabel("Security and integration plan", { exact: true })
    .fill(
      "Use secure server-held credentials, signed event verification and reconciliation.",
    );
  await page
    .getByRole("checkbox", {
      name: "I understand this request does not grant live access.",
      exact: true,
    })
    .check();
  await page
    .getByRole("button", {
      name: "Submit production review request",
      exact: true,
    })
    .click();
  await expect(
    page.getByText(
      "Request recorded as Pending review. Production remains unavailable.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByText("Pending review", { exact: true })).toBeVisible();
});
test("entitlement loss hides developer data and finance access does not include APIs", async ({
  page,
}) => {
  await page.goto("/developers");
  await expect(
    page.getByRole("heading", {
      name: "Developer platform & API overview",
      exact: true,
    }),
  ).toBeVisible();
  await control(page, "normal", "finance");
  await expect(
    page.getByRole("heading", { name: "Permission denied", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Developers", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Applications", exact: true }),
  ).toHaveCount(0);
});
test("report/developer pages fit mobile, tablet and desktop with no runtime errors", async ({
  page,
}) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const [route, title] of [
      ["/reports/receivables-aging", "Receivables aging"],
      ["/developers", "Developer platform & API overview"],
      ["/developers/applications", "Applications & sandbox clients"],
      ["/developers/credentials", "API credentials & secrets"],
      ["/developers/webhooks", "Webhook endpoints & subscriptions"],
      ["/developers/docs", "API documentation"],
    ]) {
      await page.goto(route);
      await expect(
        page.getByRole("heading", { name: title, exact: true }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        `${route} ${width}`,
      ).toBe(false);
      if (width === 360 || width === 1440)
        await page.screenshot({
          path: `/tmp/f7-${route.replaceAll("/", "-")}-${width}.png`,
          fullPage: true,
        });
    }
  }
  expect(errors).toEqual([]);
});
