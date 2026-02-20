import { test, expect } from "@playwright/test";
import { loginAndSelectMaya } from "./helpers";

/**
 * E2E: Student dashboard (child view at /home).
 *
 * Requires: dev server running, database seeded with e2e data.
 * Maya has: N1.1.1 completed (3.2), N1.1.2 needs_improvement (1.0), N1.1.3 in_progress.
 * Streak: weeklyCompleted=2, weeklyGoal=3.
 * No AI calls — these tests are fast.
 */

test.describe("Student Dashboard", () => {
  test("dashboard renders greeting + tier badge", async ({ page }) => {
    await loginAndSelectMaya(page);

    // Greeting should include Maya's name
    const bodyText = await page.locator("body").innerText();
    expect(bodyText).toContain("Maya");

    // Tier badge — Maya is Tier 1
    expect(bodyText).toMatch(/Tier 1/);
  });

  test("completed lesson with high score shows green check", async ({ page }) => {
    await loginAndSelectMaya(page);

    // Wait for the weekly lessons to load
    await page.waitForFunction(
      () => document.body.innerText.includes("Done!") || document.body.innerText.includes("Completed"),
      { timeout: 20_000 }
    );

    // N1.1.1 (high score) should show "Done!" badge in the weekly view
    const bodyText = await page.locator("body").innerText();
    expect(bodyText).toContain("Done!");
  });

  test("needs_improvement lesson shows amber 'Needs Revision' badge", async ({ page }) => {
    await loginAndSelectMaya(page);

    // Wait for weekly lesson cards to render — look for any lesson status badge
    await page.waitForFunction(
      () =>
        document.body.innerText.includes("Needs Revision") ||
        document.body.innerText.includes("Done!") ||
        document.body.innerText.includes("Up Next"),
      { timeout: 20_000 }
    );

    // The needs_improvement lesson should show "Needs Revision" badge
    const needsRevision = page.getByText("Needs Revision").first();
    await expect(needsRevision).toBeVisible({ timeout: 5_000 });
  });

  test("primary CTA card shows correct lesson", async ({ page }) => {
    await loginAndSelectMaya(page);

    // There's an in-progress lesson (N1.1.3), so CTA should say "Continue lesson" / "Up Next"
    // Note: CSS text-transform:uppercase renders "Continue lesson" as "CONTINUE LESSON"
    const ctaText = await page.locator("body").innerText();
    expect(ctaText).toMatch(/continue lesson|up next/i);
  });

  test("weekly progress shows completed count", async ({ page }) => {
    await loginAndSelectMaya(page);

    // Streak data: weeklyCompleted=2, weeklyGoal=3 (seeded)
    await page.waitForFunction(
      () => document.body.innerText.includes("This week") || document.body.innerText.includes("of 3"),
      { timeout: 20_000 }
    );

    const bodyText = await page.locator("body").innerText();
    // Should show "N of 3" where N is weeklyCompleted (seeded as 2)
    expect(bodyText).toMatch(/\d\s*of\s*3/);
  });
});
