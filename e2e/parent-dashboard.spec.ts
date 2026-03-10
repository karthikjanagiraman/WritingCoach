import { test, expect } from "@playwright/test";
import { login } from "./helpers";

/**
 * E2E: Profile picker + parent dashboard.
 *
 * Requires: dev server running, database seeded with e2e data.
 * No AI calls — these tests are fast.
 */

test.describe("Profile Picker", () => {
  test("profile picker shows both children (Maya, Ethan)", async ({ page }) => {
    await login(page);

    await expect(page.getByText("Maya")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Ethan")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("writing today")).toBeVisible();
  });

  test("click Maya's card → navigates to student dashboard", async ({ page }) => {
    await login(page);

    // Wait for async child data to load (streak/badges cause card re-renders)
    await page.waitForTimeout(1000);

    const mayaCard = page.locator("button", { hasText: "Maya" }).first();
    await mayaCard.click({ force: true });

    await page.waitForURL("**/home", { timeout: 30_000 });

    // Student dashboard should show greeting with Maya's name
    await page.waitForFunction(
      () => document.body.innerText.includes("Maya"),
      { timeout: 20_000 }
    );
  });

  test("child card shows tier label", async ({ page }) => {
    await login(page);

    // Wait for Maya's card to render with tier info
    // Maya is age 8 = Tier 1 = "Explorer"
    await expect(page.getByText("Explorer")).toBeVisible({ timeout: 15_000 });
  });

  test("Parent Dashboard button is visible", async ({ page }) => {
    await login(page);

    // Wait for children to load
    await expect(page.getByText("Maya")).toBeVisible({ timeout: 10_000 });

    // The parent dashboard button should be visible
    await expect(page.getByText("Parent Dashboard")).toBeVisible({ timeout: 10_000 });
  });
});
