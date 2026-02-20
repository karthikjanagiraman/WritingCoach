import { test, expect } from "@playwright/test";
import { login } from "./helpers";

/**
 * E2E: Parent dashboard.
 *
 * Requires: dev server running, database seeded with e2e data.
 * No AI calls — these tests are fast.
 */

test.describe("Parent Dashboard", () => {
  test("dashboard shows both children (Maya, Ethan)", async ({ page }) => {
    await login(page);

    await expect(page.getByText("Maya")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Ethan")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Your Children")).toBeVisible();
  });

  test("click Maya's card → navigates to student dashboard", async ({ page }) => {
    await login(page);

    // Wait for async child data to load (streak/badges cause card re-renders)
    await page.waitForTimeout(1000);

    const mayaCard = page.locator("div.cursor-pointer", { hasText: "Maya" }).first();
    await mayaCard.click({ force: true });

    await page.waitForURL("**/home", { timeout: 30_000 });

    // Student dashboard should show greeting with Maya's name
    await page.waitForFunction(
      () => document.body.innerText.includes("Maya"),
      { timeout: 20_000 }
    );
  });

  test("child card shows streak and badge stats", async ({ page }) => {
    await login(page);

    // Wait for Maya's card to render with streak/badge data (fetched async)
    const mayaCard = page.locator("div.cursor-pointer", { hasText: "Maya" }).first();
    await expect(mayaCard).toBeVisible({ timeout: 10_000 });

    // Wait for async extra stats to load (streak + badges)
    await expect(mayaCard.getByText(/\d+\s*day/)).toBeVisible({ timeout: 15_000 });
  });

  test("'View Report' link navigates to report page", async ({ page }) => {
    await login(page);

    // Wait for children to load
    await expect(page.getByText("Maya")).toBeVisible({ timeout: 10_000 });

    // Click View Report for Maya
    const mayaCard = page.locator("div.cursor-pointer", { hasText: "Maya" }).first();
    const reportBtn = mayaCard.getByText("View Report");
    await reportBtn.click();

    // Should navigate to report page
    await page.waitForURL("**/dashboard/children/child-maya-001/report", { timeout: 15_000 });
    await expect(page.getByText("Progress Report")).toBeVisible({ timeout: 10_000 });
  });
});
