import { setPolicy, createOrder, otp } from "./enterprise-helpers";
import { test, expect, type Page } from "./fixtures";
async function role(page: Page, role: string, scenario = "normal") {
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
test("different-member OTP mandate precedes automatic dispatch; UNKNOWN preserves the original inquiry", async ({
  page,
}) => {
  test.setTimeout(60000);
  await setPolicy(page, 2);
  const detail = await createOrder(page, "E2E-OTP-UNKNOWN", "pending", true);
  await otp(page, false);
  await expect(
    page.getByText(
      "Your approval is recorded. Another authorized member must approve.",
      { exact: true },
    ),
  ).toBeVisible();
  await role(page, "finance");
  await otp(page);
  await expect(
    page.getByText(/Pending confirmation. Preserve PAY-ORDER/),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Check original payment", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(detail + "$"));
  await page
    .getByRole("button", {
      name: "Simulate confirmed rail outcome",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Check original payment", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Payment sent", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: "View confirmed transaction →",
      exact: true,
    }),
  ).toBeVisible();
});
test("saved person/business beneficiary is selectable and rejection releases the payment reservation", async ({
  page,
}) => {
  await page.goto("/payments/beneficiaries");
  await page
    .getByLabel("Beneficiary name", { exact: true })
    .fill("E2E Test Supplier");
  await page
    .getByLabel("Institution / wallet", { exact: true })
    .fill("Demo bank");
  await page
    .getByLabel("Test account / mobile number", { exact: true })
    .fill("1000000099");
  await page
    .getByRole("button", { name: "Save beneficiary", exact: true })
    .click();
  await expect(
    page.getByText("Beneficiary saved and available for payments.", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .locator("tbody tr")
    .filter({ hasText: "E2E Test Supplier" })
    .getByRole("link", { name: "Pay", exact: true })
    .click();
  await expect(
    page.getByLabel("Send to beneficiary", { exact: true }),
  ).not.toHaveValue("");
  await page
    .getByLabel("Source account", { exact: true })
    .selectOption("acc_kes");
  await page.getByLabel("Amount (KES)", { exact: true }).fill("250.00");
  await page
    .getByLabel("Payment reference", { exact: true })
    .fill("E2E-REJECT");
  await page
    .getByRole("button", { name: "Review & reserve payment", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "E2E Test Supplier", exact: true }),
  ).toBeVisible();
  await role(page, "finance");
  await page
    .getByRole("button", { name: "Reject payment", exact: true })
    .click();
  await expect(page.getByText("Rejected", { exact: true })).toBeVisible();
  await expect(page.getByText(/reserved KES.*0.00/)).toBeVisible();
});
test("debit-card controls, freezing and credit preview work at mobile width", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/cards/CARD-MOCK-001");
  await page.getByRole("button", { name: "Freeze card", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Unfreeze card", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Reload saved values", exact: true })
    .click();
  await page.getByLabel("Online payments", { exact: true }).uncheck();
  await page
    .getByRole("button", { name: "Save card controls", exact: true })
    .click();
  await expect(
    page.getByText("Mock card controls saved.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Online payments", { exact: true }),
  ).not.toBeChecked();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  await page.goto("/cards/CARD-PREVIEW");
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
});
test("card request is approved separately and awaits explicit simulated issuer confirmation", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto("/cards/request");
  await page
    .getByLabel("Linked treasury account", { exact: true })
    .selectOption("acc_kes");
  await page
    .getByLabel("Authorized cardholder", { exact: true })
    .selectOption("member_admin");
  await page
    .getByLabel("Card nickname / purpose", { exact: true })
    .fill("E2E Software Card");
  await page
    .getByRole("button", { name: "Submit card request", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "E2E Software Card", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Approve card request", exact: true }),
  ).toHaveCount(0);
  await role(page, "finance");
  await page
    .getByRole("button", { name: "Approve card request", exact: true })
    .click();
  await expect(
    page.getByText("Request approved. No card has been issued yet.", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Simulate issuer confirmation", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Freeze card", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Simulated issuer confirmation; masked card activated", {
      exact: true,
    }),
  ).toBeVisible();
});
test("viewer cannot initiate payments or change card state", async ({
  page,
}) => {
  await page.goto("/payments");
  await role(page, "viewer");
  await expect(
    page.getByRole("link", { name: "Send money", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("link", { name: "Beneficiaries", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("button", { name: "Save beneficiary", exact: true }),
  ).toBeDisabled();
  await page.getByRole("link", { name: "Cards", exact: true }).click();
  await page
    .getByRole("link", { name: "Primary Treasury Debit", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Freeze card", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Save card controls", exact: true }),
  ).toBeDisabled();
});

test("amount validation precedes reservation and submitted payment terms stay locked", async ({
  page,
}) => {
  await page.goto("/payments/new");
  await page
    .getByLabel("Source account", { exact: true })
    .selectOption("acc_kes");
  await page
    .getByLabel("Send to beneficiary", { exact: true })
    .selectOption("BEN-MOCK-001");
  await page.getByLabel("Amount (KES)", { exact: true }).fill("0");
  await page
    .getByLabel("Payment reference", { exact: true })
    .fill("LOCKED-TERMS");
  await page
    .getByRole("button", { name: "Review & reserve payment", exact: true })
    .click();
  await expect(
    page.getByText("Enter an amount above zero", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Amount (KES)", { exact: true }).fill("250.25");
  await page
    .getByRole("button", { name: "Review & reserve payment", exact: true })
    .click();
  await expect(page.locator("h2 .money-outgoing")).toContainText("250.25");
  await expect(page.getByLabel("Amount (KES)", { exact: true })).toHaveCount(0);
});
test("approved payment and card layouts remain usable across viewport widths", async ({
  page,
}) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const [route, heading] of [
      ["/payments", "Payments & disbursements"],
      ["/payments/beneficiaries", "Beneficiaries"],
      ["/cards", "Corporate cards"],
      ["/cards/CARD-MOCK-001", "Primary Treasury Debit"],
      ["/cards/request", "Request a new card"],
    ]) {
      await page.goto(route);
      await expect(
        page.getByRole("heading", { name: heading, exact: true }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        `${route} at ${width}`,
      ).toBe(false);
      if (width === 360 || width === 1440)
        await page.screenshot({
          path: `/tmp/f6-${route.replaceAll("/", "-")}-${width}.png`,
          fullPage: true,
        });
    }
  }
  expect(errors).toEqual([]);
});
