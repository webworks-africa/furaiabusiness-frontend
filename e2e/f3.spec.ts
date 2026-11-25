import { test, expect, type Page } from "./fixtures";
async function control(page: Page, scenario: string, role = "admin") {
  const summary = page.getByText("Development tools · scenarios & reset");
  const details = page.locator("details.mock-controls");
  if ((await details.getAttribute("open")) === null) await summary.click();
  await page
    .getByRole("combobox", { name: "Scenario", exact: true })
    .selectOption(scenario);
  await page
    .getByRole("combobox", { name: "Mock identity", exact: true })
    .selectOption(role);
  await page.getByRole("button", { name: "Apply scenario" }).click();
}
async function upload(page: Page, kind: string) {
  const input = page.getByLabel(`Choose ${kind} document`, { exact: true });
  await input.setInputFiles({
    name: `${kind}.pdf`,
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\nMock test document\n%%EOF"),
  });
  const article = page.locator("article.document-item").filter({ has: input });
  await article
    .getByRole("button", { name: "Upload document", exact: true })
    .click();
  await expect(
    article.getByRole("button", { name: "Replace document", exact: true }),
  ).toBeVisible();
}
async function submitApplication(page: Page) {
  await page.goto("/onboarding?step=4");
  for (const kind of ["registration", "tax", "representative", "address"])
    await upload(page, kind);
  await page
    .getByRole("button", { name: "Step 6: Review & submit", exact: true })
    .click();
  await page.getByRole("checkbox", { name: /I am authorized/ }).check();
  await page
    .getByRole("button", { name: "Submit for review", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Application status & service eligibility",
    }),
  ).toBeVisible();
  await expect(page.getByText("In review", { exact: true })).toBeVisible();
}
test("onboarding uploads, submission, review and account provisioning stay separate", async ({
  page,
}) => {
  await submitApplication(page);
  await expect(
    page.getByRole("button", { name: "Request account", exact: true }),
  ).toHaveCount(0);
  await control(page, "onboarding-approved");
  await expect(
    page.getByText("Eligible to request", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Account name", { exact: true })
    .fill("Business collections");
  await page
    .getByRole("button", { name: "Request account", exact: true })
    .click();
  await expect(page.getByText("Pending review", { exact: true })).toBeVisible();
  await control(page, "account-provisioned");
  await page
    .getByRole("link", { name: "View opened account →", exact: true })
    .click();
  await expect(
    page.locator(".three-grid").getByText("KES 0.00", { exact: true }),
  ).toHaveCount(3);
  await expect(page.getByText("TXN-90234", { exact: true })).toHaveCount(0);
});
test("draft resumes; invalid document signature and review changes are actionable", async ({
  page,
}) => {
  await page.goto("/onboarding");
  await page
    .getByLabel("Registered legal business name", { exact: true })
    .fill("Saved Demo Limited");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(
    page.getByText(
      "Draft saved. No verification or account activation has occurred.",
    ),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Application status", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Continue application", exact: true })
    .click();
  await expect(
    page.getByLabel("Registered legal business name", { exact: true }),
  ).toHaveValue("Saved Demo Limited");
  await page
    .getByRole("button", { name: "Step 4: Documents", exact: true })
    .click();
  const input = page.getByLabel("Choose registration document", {
    exact: true,
  });
  await input.setInputFiles({
    name: "bad.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("<html>not a PDF</html>"),
  });
  await page
    .locator("article.document-item")
    .filter({ has: input })
    .getByRole("button", { name: "Upload document", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "could not be validated" }),
  ).toBeVisible();
  for (const kind of ["registration", "tax", "representative", "address"])
    await upload(page, kind);
  await page
    .getByRole("button", { name: "Step 6: Review & submit", exact: true })
    .click();
  await page.getByRole("checkbox", { name: /I am authorized/ }).check();
  await page
    .getByRole("button", { name: "Submit for review", exact: true })
    .click();
  await expect(page.getByText("In review", { exact: true })).toBeVisible();
  await control(page, "onboarding-changes");
  await page
    .getByRole("link", { name: "Update requested documents", exact: true })
    .click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Provide a current proof of operating address." })
      .getByText("Provide a current proof of operating address.", {
        exact: true,
      }),
  ).toBeVisible();
  await page
    .getByLabel("Choose address document", { exact: true })
    .setInputFiles({
      name: "updated-address.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\nUpdated mock address\n%%EOF"),
    });
  await page
    .locator("article.document-item")
    .filter({
      has: page.getByLabel("Choose address document", { exact: true }),
    })
    .getByRole("button", { name: "Replace document", exact: true })
    .click();
  await expect(page.locator("small.field-error")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Step 6: Review & submit", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Submit for review", exact: true })
    .click();
  await expect(page.getByText("In review", { exact: true })).toBeVisible();
});
test("business profile and mock session changes persist across views", async ({
  page,
}) => {
  await page.goto("/settings");
  await page
    .getByLabel("Business display name", { exact: true })
    .fill("Demo Business Updated");
  await page
    .getByRole("button", { name: "Save business profile", exact: true })
    .click();
  await expect(
    page
      .getByRole("banner")
      .getByText("Demo Business Updated", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Security & sessions", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Idle session timeout", exact: true })
    .selectOption("15");
  await page
    .getByRole("button", { name: "Save security policy", exact: true })
    .click();
  await expect(
    page.getByText("Mock sign-in policy saved; enforcement is not connected."),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Revoke session", exact: true })
    .click();
  await expect(page.getByText("Revoked", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Revoke session", exact: true }),
  ).toBeDisabled();
});
test("invitations and explicit developer entitlement affect permissions", async ({
  page,
}) => {
  await page.goto("/team-and-approvals");
  const member = page.getByRole("article", {
    name: "Member Amina S.",
    exact: true,
  });
  await member
    .getByRole("checkbox", {
      name: "Developer sandbox entitlement",
      exact: true,
    })
    .check();
  await member
    .getByRole("button", { name: "Save access", exact: true })
    .click();
  await expect(member.getByText("Member access saved.")).toBeVisible();
  await page.getByLabel("Invitee name", { exact: true }).fill("Test Colleague");
  await page
    .getByLabel("Invitee email", { exact: true })
    .fill("colleague@example.test");
  await page
    .getByRole("button", { name: "Create invitation", exact: true })
    .click();
  await expect(
    page.getByText("colleague@example.test · viewer · Attempt 1"),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Revoke invitation", exact: true })
    .click();
  await expect(page.getByText("Revoked", { exact: true })).toBeVisible();
  await control(page, "normal", "developer");
  await expect(
    page.getByRole("link", { name: "Developers", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "Workspace", exact: true })
      .getByRole("link", { name: "Accounts", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Create invitation", exact: true }),
  ).toBeDisabled();
});
test("viewer sees read-only onboarding and settings on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/settings");
  await control(page, "normal", "viewer");
  await expect(
    page.getByRole("button", { name: "Save business profile", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Business onboarding", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Save & continue", exact: true }),
  ).toBeDisabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
