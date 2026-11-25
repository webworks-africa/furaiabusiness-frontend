import { test as base, expect } from "@playwright/test";
export { expect };
export type { Page } from "@playwright/test";
export const test = base.extend({
  page: async ({ page }, runFixture) => {
    await page.addInitScript(() => {
      sessionStorage.setItem("furaia.development.mock-member", "admin");
    });
    await runFixture(page);
  },
});
