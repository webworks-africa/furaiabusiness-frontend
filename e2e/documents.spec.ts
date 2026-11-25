import { test, expect, type Page } from "./fixtures";
import { readFile } from "node:fs/promises";
import { otp } from "./enterprise-helpers";
async function api(page: Page, path: string, body?: unknown) {
  return page.evaluate(
    async ({ path, body }) => {
      const r = await fetch("/api" + path, {
        method: body ? "POST" : "GET",
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
test("invoice PDF layout, email attachment, profile settings and responsive paper", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/invoices/INV-MOCK-101");
  await expect(page.locator(".financial-paper")).toBeVisible();
  expect(
    (await page.locator(".financial-paper").boundingBox())!.width,
  ).toBeGreaterThan(650);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF", exact: true }).click();
  const pdf = await download;
  expect((await readFile((await pdf.path())!)).subarray(0, 5).toString()).toBe(
    "%PDF-",
  );
  await page
    .getByRole("button", { name: "Send by email", exact: true })
    .click();
  await page
    .getByLabel("Recipient email", { exact: true })
    .fill("accounts@example.test");
  await page
    .getByRole("button", { name: "Send simulated email", exact: true })
    .click();
  await expect(
    page.getByText("Delivered (simulated) · Attempt 1"),
  ).toBeVisible();
  if (process.env.FURAIA_BROWSER_QA_DIR)
    await page.screenshot({
      path: process.env.FURAIA_BROWSER_QA_DIR + "/invoice-desktop.png",
      fullPage: true,
    });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  if (process.env.FURAIA_BROWSER_QA_DIR)
    await page.screenshot({
      path: process.env.FURAIA_BROWSER_QA_DIR + "/invoice-mobile.png",
      fullPage: true,
    });
  await page.getByLabel("Profile menu").click();
  await page
    .getByRole("navigation", { name: "Profile actions" })
    .getByRole("link", { name: "Settings", exact: true })
    .click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(
    page.getByRole("link", {
      name: "Approvals & invoice templates",
      exact: true,
    }),
  ).toBeVisible();
});
test("external CSV intake, mandatory review, net-30 payable, OTP settlement and revocation", async ({
  page,
  context,
}) => {
  await page.goto("/accounts");
  await expect(
    page.getByRole("heading", { name: "Treasury & Operational Accounts" }),
  ).toBeVisible();
  expect(
    (
      await api(page, "/suppliers", {
        name: "Acacia Supplies",
        email: "supplier@example.test",
        phone: "+254700000000",
        address: "Nairobi",
        beneficiaryId: "BEN-MOCK-001",
      })
    ).status,
  ).toBe(200);
  await go(page, "/procurement/invoices");
  await page
    .getByLabel("Supplier", { exact: true })
    .selectOption({ label: "Acacia Supplies" });
  await page
    .getByRole("button", { name: "Create upload link", exact: true })
    .click();
  const href = await page
      .getByRole("link", { name: "Open supplier upload" })
      .getAttribute("href"),
    external = await context.newPage();
  await external.goto(href!);
  await external
    .getByLabel("Invoice file")
    .setInputFiles({
      name: "supplier.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(
        "Invoice No: SUP-101\nInvoice Date: 2026-10-01\nGrand Total: KES 123.45\nPayment Terms: 30 days",
      ),
    });
  await external
    .getByRole("button", { name: "Upload invoice", exact: true })
    .click();
  await expect(
    external.getByRole("heading", { name: "Submitted for business review" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Acacia Supplies · supplier.csv" }),
  ).toBeVisible({ timeout: 10000 });
  await page
    .getByRole("button", { name: "Acacia Supplies · supplier.csv" })
    .click();
  await expect(
    page.getByLabel("Supplier invoice number", { exact: true }),
  ).toHaveValue("SUP-101");
  await expect(page.getByLabel("Invoice total", { exact: true })).toHaveValue(
    "123.45",
  );
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Approve invoice payable", exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: "Upcoming · Net 30", exact: false }),
  ).toBeVisible();
  await page
    .getByLabel("Payment account", { exact: true })
    .selectOption("acc_kes");
  await page
    .getByRole("button", { name: "Prepare payment", exact: true })
    .click();
  await otp(page);
  await expect(
    page.getByRole("heading", { name: "Payment sent", exact: true }),
  ).toBeVisible();
  await go(page, "/procurement/invoices");
  await expect(
    page.getByRole("cell", { name: "Paid", exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Revoke link", exact: true }).click();
  await external.reload();
  await expect(
    external.getByRole("heading", {
      name: "Upload link expired or revoked",
      exact: true,
    }),
  ).toBeVisible();
});
test("eTIMS connection and tax QR remain explicitly simulated", async ({
  page,
}) => {
  await page.goto("/settings/tax");
  await page
    .getByRole("button", { name: "Enable development simulation" })
    .click();
  await page.getByLabel("Issued invoice reference").fill("INV-MOCK-101");
  await page.getByRole("button", { name: "Simulate eTIMS submission" }).click();
  await expect(page.getByText(/INV-MOCK-101: Demo accepted/)).toBeVisible();
  await go(page, "/invoices/INV-MOCK-101");
  await expect(
    page.getByRole("img", { name: "Demo eTIMS document reference" }),
  ).toBeVisible();
  await expect(page.getByText("DEMO — NOT A KRA TAX INVOICE")).toBeVisible();
});
test("supplier PDF extraction reads actual selectable totals", async ({
  page,
  context,
}) => {
  await page.goto("/accounts");
  await expect(
    page.getByRole("heading", { name: "Treasury & Operational Accounts" }),
  ).toBeVisible();
  const s = await api(page, "/suppliers", {
      name: "PDF Supplier",
      email: "pdf@example.test",
      phone: "+254700000000",
      address: "Nairobi",
      beneficiaryId: "BEN-MOCK-001",
    }),
    l = await api(
      page,
      `/suppliers/${s.data.suppliers[0].id}/upload-links`,
      {},
    ),
    external = await context.newPage();
  await external.goto(l.data.path);
  await external
    .getByLabel("Invoice file")
    .setInputFiles("examples/documents/INV-2026-0142.pdf");
  await external
    .getByRole("button", { name: "Upload invoice", exact: true })
    .click();
  await expect(
    external.getByRole("heading", { name: "Submitted for business review" }),
  ).toBeVisible({ timeout: 15000 });
  await expect(external.getByText(/KES\s+203,000\.00/)).toBeVisible();
});
