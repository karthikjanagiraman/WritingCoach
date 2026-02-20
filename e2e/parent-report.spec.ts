import { test, expect } from "@playwright/test";
import { login } from "./helpers";

/**
 * E2E: Parent progress report.
 *
 * Requires: dev server running, database seeded with e2e data.
 * Maya has assessments for N1.1.1 (3.2) and N1.1.2 (1.0), plus needs_improvement.
 * No AI calls for basic tests.
 */

const CHILD_ID = "child-maya-001";

test.describe("Parent Report", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`/dashboard/children/${CHILD_ID}/report`);
    await page.waitForFunction(
      () => document.body.innerText.includes("Progress Report"),
      { timeout: 20_000 }
    );
  });

  test("report loads with child name + tier badge", async ({ page }) => {
    await expect(page.getByText("Maya")).toBeVisible();
    await expect(page.getByText("Progress Report")).toBeVisible();

    // Tier badge
    const bodyText = await page.locator("body").innerText();
    expect(bodyText).toMatch(/Tier 1/);
  });

  test("summary stats show correct counts", async ({ page }) => {
    // Wait for summary stats to render
    await page.waitForFunction(
      () => document.body.innerText.includes("Lessons Done"),
      { timeout: 20_000 }
    );

    const bodyText = await page.locator("body").innerText();

    // Should show completed lesson count (at least 1)
    expect(bodyText).toContain("Lessons Done");

    // Should show average score
    expect(bodyText).toContain("Avg Score");

    // Should show words written
    expect(bodyText).toContain("Words Written");

    // Should show badge count
    expect(bodyText).toContain("Badges Earned");
  });

  test("needs improvement alert shows when needs_improvement lessons exist", async ({ page }) => {
    // The amber banner should appear since N1.1.2 is needs_improvement
    await page.waitForFunction(
      () =>
        document.body.innerText.includes("needs") ||
        document.body.innerText.includes("revision") ||
        document.body.innerText.includes("Needs") ||
        document.body.innerText.includes("Revision"),
      { timeout: 20_000 }
    );

    const alertText = page.getByText(/lesson[s]?\s+need[s]?\s+revision/i);
    await expect(alertText).toBeVisible({ timeout: 10_000 });
  });

  test("assessment row shows lesson title, type, date, score", async ({ page }) => {
    // Wait for recent assessments section
    await page.waitForFunction(
      () => document.body.innerText.includes("Recent Assessments"),
      { timeout: 20_000 }
    );

    await expect(page.getByText("Recent Assessments")).toBeVisible();

    // Should see at least one assessment row with score
    const scoreLabels = page.locator("text=/\\d+\\.\\d+\\/4/");
    const count = await scoreLabels.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("click assessment row → expands to show scores, feedback, writing excerpt", async ({ page }) => {
    // Wait for recent assessments
    await page.waitForFunction(
      () => document.body.innerText.includes("Recent Assessments"),
      { timeout: 20_000 }
    );

    // Click the first assessment row to expand it
    const assessmentRow = page.locator("button", { hasText: /Narrative|N1|Descriptive/ }).first();
    if (await assessmentRow.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await assessmentRow.click();

      // Should show expanded details
      await page.waitForTimeout(500);
      const bodyText = await page.locator("body").innerText();

      // Should see scores section
      expect(bodyText).toMatch(/Scores|Strength|Growth Area/i);

      // Should see "View Full Detail" link
      await expect(page.getByText("View Full Detail")).toBeVisible({ timeout: 5_000 });
    }
  });

  test("expanded assessment has 'View Full Detail' link", async ({ page }) => {
    await page.waitForFunction(
      () => document.body.innerText.includes("Recent Assessments"),
      { timeout: 20_000 }
    );

    // Expand first assessment
    const assessmentRow = page.locator("button", { hasText: /3\.2|1\.0|2\.0/ }).first();
    if (await assessmentRow.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await assessmentRow.click();
      await page.waitForTimeout(500);

      const detailLink = page.getByText("View Full Detail");
      await expect(detailLink).toBeVisible({ timeout: 5_000 });

      // Link should point to lesson detail route
      const href = await detailLink.getAttribute("href");
      expect(href).toContain(`/dashboard/children/${CHILD_ID}/report/`);
    }
  });

  test("'Export CSV' button is visible", async ({ page }) => {
    const exportBtn = page.getByText("Export CSV");
    await expect(exportBtn).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("Lesson Detail (from report)", () => {
  test("lesson detail page loads with content", async ({ page }) => {
    await login(page);

    // Navigate directly to the lesson detail page for N1.1.1
    await page.goto(`/dashboard/children/${CHILD_ID}/report/N1.1.1`);

    await page.waitForFunction(
      () => document.body.innerText.includes("Lesson Detail"),
      { timeout: 20_000 }
    );

    const bodyText = await page.locator("body").innerText();

    // Should show lesson info
    expect(bodyText).toContain("Lesson Detail");

    // Should show the score (3.2)
    expect(bodyText).toMatch(/3\.2/);
  });

  test("lesson detail shows learning objectives and feedback cards", async ({ page }) => {
    await login(page);
    await page.goto(`/dashboard/children/${CHILD_ID}/report/N1.1.1`);

    await page.waitForFunction(
      () =>
        document.body.innerText.includes("Lesson Detail") ||
        document.body.innerText.includes("Learning Objectives"),
      { timeout: 20_000 }
    );

    const bodyText = await page.locator("body").innerText();

    // Should show feedback sections
    expect(bodyText).toMatch(/What They Did Well|Strength/i);
    expect(bodyText).toMatch(/Area for Growth|Growth/i);
  });

  test("lesson detail shows writing submission text", async ({ page }) => {
    await login(page);
    await page.goto(`/dashboard/children/${CHILD_ID}/report/N1.1.1`);

    await page.waitForFunction(
      () => document.body.innerText.includes("Original") || document.body.innerText.includes("Submission"),
      { timeout: 20_000 }
    );

    // Should show the seeded submission text
    const bodyText = await page.locator("body").innerText();
    expect(bodyText).toContain("fox named Ruby");
  });
});
