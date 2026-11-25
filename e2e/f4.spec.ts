import { test, expect, type Page } from "./fixtures";
async function create(page: Page, kind = "quotations") {
  await page.goto(`/${kind}/new`);
  await expect(
    page.getByRole("heading", {
      name: kind === "quotations" ? "New quotation" : "New invoice",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByLabel("Customer", { exact: true }).selectOption("contact_1");
  await page.getByLabel("Project / scope").fill("F4 browser project");
  await page
    .getByLabel("Description", { exact: true })
    .fill("Implementation services");
  await page.getByLabel("Quantity", { exact: true }).fill("1.25");
  await page.getByLabel("Unit price", { exact: true }).fill("1000.00");
  await page.getByLabel("Tax %", { exact: true }).fill("16");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    kind === "quotations" ? "Quotation Q-MOCK" : "Invoice INV-MOCK",
  );
}
test("contact creation updates selectors and linked customer filtering", async ({
  page,
}) => {
  await page.goto("/customers/new");
  await page.getByLabel("Company / customer name").fill("Browser Customer");
  await page.getByLabel("Primary contact name").fill("Browser Contact");
  await page.getByLabel("Billing email").fill("browser@example.test");
  await page.getByLabel("Billing address").fill("Nairobi test address");
  await page
    .getByRole("button", { name: "Save customer", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Browser Customer", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Customer quotations", exact: true })
    .click();
  await expect(
    page.getByText("Filtered to one customer.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("link", { name: "New quotation", exact: true }).click();
  await expect(
    page
      .getByLabel("Customer", { exact: true })
      .getByRole("option", { name: "Browser Customer", exact: true }),
  ).toHaveCount(1);
});
test("recipient acceptance converts once and invoice issue creates fixed receivable", async ({
  page,
}) => {
  await create(page);
  const quoteUrl = page.url();
  await page
    .getByRole("button", { name: "Create recipient link", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Open recipient quotation →", exact: true })
    .click();
  await expect(page.getByRole("navigation", { name: "Workspace" })).toHaveCount(
    0,
  );
  await page.getByLabel("Your full name").fill("Test Recipient");
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Accept quotation", exact: true })
    .click();
  await expect(page.getByText("Accepted", { exact: true })).toBeVisible();
  await page.goBack();
  await expect(
    page.getByRole("button", { name: "Convert to invoice", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Convert to invoice", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Invoice INV-MOCK",
  );
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Issue invoice", exact: true })
    .click();
  await expect(page.getByText("Outstanding", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Edit draft", exact: true }),
  ).toHaveCount(0);
  await expect(
    page
      .locator(".billing-document-layout")
      .getByText("KES\u00a01,450.00", { exact: true }),
  ).toHaveCount(3);
  await page
    .getByRole("link", { name: "Linked quotation →", exact: true })
    .click();
  await expect(page).toHaveURL(quoteUrl);
  await expect(page.getByText("Converted", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Convert to invoice", exact: true }),
  ).toHaveCount(0);
});
test("quotation revision invalidates recipient link and preserves history", async ({
  page,
}) => {
  await create(page);
  await page
    .getByRole("button", { name: "Create recipient link", exact: true })
    .click();
  const oldToken = await page
    .getByRole("link", { name: "Open recipient quotation →" })
    .getAttribute("href");
  await page
    .getByRole("button", { name: "Create revision", exact: true })
    .click();
  await page.getByRole("link", { name: "Edit draft", exact: true }).click();
  await expect(page.getByLabel("Customer", { exact: true })).toHaveValue(
    "contact_1",
  );
  await page.getByLabel("Project / scope").fill("Revised scope");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await page
    .getByRole("button", { name: "Create recipient link", exact: true })
    .click();
  await expect(
    page.getByText("Revision 2 · KES\u00a01,450.00", { exact: true }),
  ).toBeVisible();
  await page.evaluate(
    (path) => window.history.pushState({}, "", path),
    oldToken!,
  );
  await page.evaluate(() =>
    window.dispatchEvent(new PopStateEvent("popstate")),
  );
  await expect(
    page.getByRole("heading", { name: "Record not found", exact: true }),
  ).toBeVisible();
});
test("mobile validation, empty search and viewer write gates", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/invoices/new");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(
    page.getByText("Check the labelled fields and line items before saving.", {
      exact: true,
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto("/customers");
  await page.getByLabel("Search customers").fill("missing-company");
  await expect(
    page.getByRole("heading", { name: "No customers found" }),
  ).toBeVisible();
  await page.getByText("Development tools · scenarios & reset").click();
  await page
    .getByRole("combobox", { name: "Mock identity", exact: true })
    .selectOption("viewer");
  await page
    .getByRole("button", { name: "Apply scenario", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "New customer", exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Search customers").fill("");
  await page
    .getByRole("link", { name: "Twiga Foods Supply Chain Ltd", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Save customer", exact: true }),
  ).toBeDisabled();
});
