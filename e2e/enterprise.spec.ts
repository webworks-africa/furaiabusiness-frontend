import { test, expect, type Page } from "./fixtures";
import { test as anonymous } from "@playwright/test";
import { createOrder, otp, changeRole } from "./enterprise-helpers";
async function api(page: Page, path: string, body?: unknown) {
  return page.evaluate(
    async ({ path, body }) => {
      const r = await fetch("/api" + path, {
        method: body ? "POST" : "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      return { status: r.status, data: await r.json() };
    },
    { path, body },
  );
}
async function go(page: Page, path: string) {
  await page.evaluate((path) => {
    history.pushState({}, "", path);
    dispatchEvent(new PopStateEvent("popstate"));
  }, path);
}
test("single OTP sends immediately with animation and account balances update", async ({
  page,
}) => {
  await createOrder(page, "SINGLE-OTP");
  const before = (await api(page, "/accounts")).data.items[0];
  await otp(page);
  await expect(
    page.getByRole("heading", { name: "Payment sent", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".sent-check")).toBeVisible();
  const after = (await api(page, "/accounts")).data.items[0];
  expect(BigInt(after.ledgerMinor)).toBe(BigInt(before.ledgerMinor) - 12345n);
  expect(BigInt(after.availableMinor)).toBe(BigInt(before.availableMinor));
  await page
    .getByRole("link", { name: "View updated account →", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Account details", exact: true }),
  ).toBeVisible();
});
test("Finance cannot view Team and entitled Developer sees developer navigation", async ({
  page,
}) => {
  await page.goto("/");
  await changeRole(page, "finance");
  await expect(
    page.getByRole("link", { name: "Team & Approvals", exact: true }),
  ).toHaveCount(0);
  await go(page, "/team-and-approvals");
  await expect(
    page.getByRole("heading", { name: "Permission denied", exact: true }),
  ).toBeVisible();
  await changeRole(page, "developer");
  await expect(
    page.getByRole("link", { name: "Developers", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Developers", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Developer platform & API overview",
      exact: true,
    }),
  ).toBeVisible();
});
test("suppliers feed immutable purchase orders with issue and receipt states", async ({
  page,
}) => {
  await page.goto("/procurement");
  await page
    .getByLabel("Supplier name", { exact: true })
    .fill("Stationery Test Ltd");
  await page
    .getByLabel("Supplier email", { exact: true })
    .fill("stationery@example.test");
  await page.getByLabel("Supplier phone", { exact: true }).fill("254700000003");
  await page
    .getByLabel("Supplier address", { exact: true })
    .fill("Nairobi depot");
  await page
    .getByLabel("Payable beneficiary", { exact: true })
    .selectOption("BEN-MOCK-001");
  await page
    .getByRole("button", { name: "Save supplier", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Suppliers", exact: true }),
  ).toContainText("Stationery Test Ltd");
  const s = (await api(page, "/business-tools")).data.suppliers[0];
  await page.getByLabel("Supplier", { exact: true }).selectOption(s.id);
  await page.getByLabel("Description", { exact: true }).fill("Office paper");
  await page.getByLabel("Unit price (KES)", { exact: true }).fill("250");
  await page.getByRole("button", { name: "Add LPO line", exact: true }).click();
  await page
    .getByRole("button", { name: "Create LPO draft", exact: true })
    .click();
  await page.getByRole("button", { name: "Issue LPO", exact: true }).click();
  await page
    .getByRole("button", { name: "Record received", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Purchase orders", exact: true }),
  ).toContainText("Received");
  await page.getByRole("link", { name: "View LPO", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "LPO items", exact: true }),
  ).toContainText("Office paper");
  await expect(
    page.getByRole("button", { name: "Print LPO", exact: true }),
  ).toBeVisible();
});
test("payroll nets, reserves and authorizes employee payment through shared OTP flow", async ({
  page,
}) => {
  await page.goto("/payroll");
  await page
    .getByLabel("Employee name", { exact: true })
    .fill("Payroll Test Person");
  await page
    .getByLabel("Employee email", { exact: true })
    .fill("payroll@example.test");
  await page
    .getByLabel("Employee beneficiary", { exact: true })
    .selectOption("BEN-MOCK-002");
  await page.getByLabel("Gross salary (KES)", { exact: true }).fill("1000");
  await page.getByLabel("Deductions (KES)", { exact: true }).fill("100");
  await page.getByRole("button", { name: "Add employee", exact: true }).click();
  await page
    .getByRole("checkbox", { name: "Include Payroll Test Person", exact: true })
    .check();
  await page
    .getByLabel("Payroll account", { exact: true })
    .selectOption("acc_kes");
  await page
    .getByRole("button", {
      name: "Submit payroll for authorization",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("region", { name: "Payroll payments", exact: true }),
  ).toContainText("900.00");
  await page
    .getByRole("link", { name: "Review payment →", exact: true })
    .click();
  await otp(page);
  await expect(
    page.getByRole("heading", { name: "Payment sent", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Payroll", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Payroll payments", exact: true }),
  ).toContainText("Completed");
});
test("POS pending sale waits for confirmation before posting incoming cash", async ({
  page,
}) => {
  await page.goto("/pos");
  await page.getByLabel("Terminal name", { exact: true }).fill("Counter Test");
  await page.getByLabel("Terminal location", { exact: true }).fill("Nairobi");
  await page
    .getByLabel("Settlement account", { exact: true })
    .selectOption("acc_kes");
  await page
    .getByRole("button", { name: "Create simulated terminal", exact: true })
    .click();
  const terminal = (await api(page, "/business-tools")).data.terminals[0];
  await page.getByLabel("Terminal", { exact: true }).selectOption(terminal.id);
  await page.getByLabel("Sale amount (KES)", { exact: true }).fill("250");
  await page.getByLabel("Sale reference", { exact: true }).fill("POS-E2E-TEST");
  const cash = (await api(page, "/accounts")).data.items[0].ledgerMinor;
  await page
    .getByRole("button", { name: "Create pending POS sale", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "POS sales", exact: true }),
  ).toContainText("Pending confirmation");
  expect((await api(page, "/accounts")).data.items[0].ledgerMinor).toBe(cash);
  await page
    .getByRole("button", { name: "Confirm simulated sale", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "POS sales", exact: true }),
  ).toContainText("Confirmed");
  expect(BigInt((await api(page, "/accounts")).data.items[0].ledgerMinor)).toBe(
    BigInt(cash) + 25000n,
  );
});
test("loan preview issues principal via OTP and accepts partial confirmed repayments", async ({
  page,
}) => {
  await page.goto("/loans");
  await page
    .getByLabel("Borrower contact", { exact: true })
    .selectOption("contact_1");
  await page
    .getByLabel("Disbursement beneficiary", { exact: true })
    .selectOption("BEN-MOCK-001");
  await page
    .getByLabel("Lending account", { exact: true })
    .selectOption("acc_kes");
  await page.getByLabel("Principal (KES)", { exact: true }).fill("1000");
  await page
    .getByRole("button", { name: "Create loan & exact schedule", exact: true })
    .click();
  await expect(page.getByText(/Total payable KES.*1,045.00/)).toBeVisible();
  await page
    .getByRole("button", {
      name: "Issue preview loan for OTP disbursement",
      exact: true,
    })
    .click();
  await page
    .getByRole("link", { name: "View principal disbursement →", exact: true })
    .click();
  await otp(page);
  await expect(
    page.getByRole("heading", { name: "Payment sent", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Loans · Preview", exact: true })
    .click();
  await page
    .getByLabel("Confirmed simulated repayment (KES)", { exact: true })
    .fill("100");
  await page
    .getByLabel("Repayment reference", { exact: true })
    .fill("LOAN-E2E-REPAY");
  await page
    .getByRole("button", { name: "Confirm simulated repayment", exact: true })
    .click();
  await expect(page.getByText(/Remaining KES.*945.00/)).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Repayment schedule", exact: true }),
  ).toContainText("100.00");
});
test("logo defaults and per-invoice templates remain separate from issued versions", async ({
  page,
}) => {
  await page.goto("/settings/workflows");
  await page.getByRole("button", { name: "Modern", exact: true }).click();
  await page
    .getByLabel("Business logo · PNG/JPEG, up to 180 KB", { exact: true })
    .setInputFiles({
      name: "logo.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jX1kAAAAASUVORK5CYII=",
        "base64",
      ),
    });
  await page
    .getByLabel("Document footer", { exact: true })
    .fill("Business test invoice footer");
  await page
    .getByRole("button", { name: "Save invoice appearance", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Save invoice appearance", exact: true }),
  ).toBeEnabled();
  const quotation = (await api(page, "/billing/quotations/Q-MOCK-100")).data;
  const created = await api(page, "/billing/invoices", quotation.values);
  expect(created.status).toBe(200);
  await go(page, "/invoices/" + created.data.id);
  await expect(page.locator(".billing-paper.invoice-modern")).toBeVisible();
  await expect(page.locator(".invoice-logo")).toBeVisible();
  await page
    .getByLabel("Invoice / quotation template", { exact: true })
    .selectOption("minimal");
  await expect(page.locator(".billing-paper.invoice-minimal")).toBeVisible();
});
test("customer running statement filters currency and downloads exact CSV", async ({
  page,
}) => {
  await page.goto("/customers/contact_1/statement");
  await expect(
    page.getByRole("region", { name: "Customer statement", exact: true }),
  ).toContainText("INV-MOCK-101");
  await expect(
    page.getByRole("region", { name: "Customer statement", exact: true }),
  ).toContainText("34,800.00");
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download statement CSV", exact: true })
    .click();
  expect((await download).suggestedFilename()).toContain("KES-statement.csv");
  await page
    .getByRole("combobox", { name: "Statement currency", exact: true })
    .selectOption("USD");
  await expect(
    page.getByRole("heading", { name: "No customer statement", exact: true }),
  ).toBeVisible();
});
test("new business pages and documentation fit mobile/tablet/desktop without runtime errors", async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of [
      "/send-money",
      "/settings/workflows",
      "/procurement",
      "/payroll",
      "/pos",
      "/loans",
      "/docs",
    ]) {
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const ready: Record<string, string> = {
        "/send-money": "Source account",
        "/settings/workflows": "Required distinct authorizers",
        "/procurement": "Supplier name",
        "/payroll": "Employee name",
        "/pos": "Terminal name",
        "/loans": "Principal (KES)",
        "/docs": "Search documentation",
      };
      await expect(
        page.getByLabel(ready[route], { exact: true }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${route} at ${width}`,
      ).toBe(true);
      if (width === 360 || width === 1440)
        await page.screenshot({
          path: `/tmp/b2-${route.replaceAll("/", "-")}-${width}.png`,
          fullPage: true,
        });
    }
  }
  expect(errors).toEqual([]);
});
anonymous(
  "signup creates an unfunded business and enters onboarding without developer entitlement",
  async ({ page }) => {
    await page.goto("/register");
    await page
      .getByLabel("Registered business name", { exact: true })
      .fill("New Signup Test Ltd");
    await page
      .getByLabel("Your full name", { exact: true })
      .fill("Signup Test Owner");
    await page
      .getByLabel("Business email", { exact: true })
      .fill("signup-owner@example.test");
    await page
      .getByLabel("Kenyan mobile (2547… or 2541…)", { exact: true })
      .fill("254700000001");
    await page
      .getByLabel("Signup verification challenge", { exact: true })
      .fill("246810");
    await page
      .getByLabel("Development registration acknowledgement", { exact: true })
      .selectOption("yes");
    await page
      .getByRole("button", {
        name: "Verify & begin business onboarding",
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(/\/onboarding$/);
    await expect(
      page.getByLabel("Registered legal business name", { exact: true }),
    ).toHaveValue("New Signup Test Ltd");
    await expect(
      page.getByRole("link", { name: "Developers", exact: true }),
    ).toHaveCount(0);
  },
);
anonymous(
  "public documentation has searchable chapters and grouped reference navigation",
  async ({ page }) => {
    await page.goto("/docs");
    await page.getByLabel("Search documentation", { exact: true }).fill("OTP");
    await page
      .getByRole("button", { name: "Payments & OTP approvals", exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Payments & OTP approvals",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.locator(".endpoint")).toContainText(
      "/api/payment-orders",
    );
    await page
      .getByRole("link", { name: "Explore API banking →", exact: true })
      .click();
    await expect(
      page.getByRole("link", { name: "Read the documentation", exact: true }),
    ).toBeVisible();
  },
);
