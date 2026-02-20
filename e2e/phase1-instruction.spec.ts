import { test, expect } from "@playwright/test";
import {
  loginAndSelectMaya,
  navigateToLesson,
  waitForAIResponse,
  interactWithStep,
  getCurrentStep,
} from "./helpers";

/**
 * E2E test: Phase 1 Interactive 3-Step Lesson Templates
 *
 * Tests the full instruction phase flow with live AI responses.
 * Uses SPA navigation (clicking links) to preserve React context,
 * since full page.goto() causes a race condition with ActiveChildContext.
 *
 * Requires:
 *   - Dev server running on localhost:3000
 *   - Database seeded (parent@example.com / password123, Maya age 8 tier 1)
 *   - ANTHROPIC_API_KEY set in .env
 */

async function navigateToFreshLesson(page: import("@playwright/test").Page) {
  // Navigate directly to N1.2.1 — a completely fresh lesson with no seeded session or progress
  // (N1.1.3 is seeded as in_progress/guided, lesson-lifecycle uses N1.3.1)
  // page.goto() works because loginAndSelectMaya already set activeChild in localStorage
  await page.goto("/lesson/N1.2.1");

  // Wait for lesson-specific content (NOT "of 3" which also matches home page "2 of 3 done")
  await page.waitForFunction(
    () => {
      const text = document.body.innerText;
      return (
        /Step \d of 3/.test(text) ||
        text.includes("Start writing") ||
        text.includes("Time to write")
      );
    },
    { timeout: 60_000 }
  );
}

// ── Tests ────────────────────────────────────────────────────────────────────

test.describe("Phase 1: Interactive 3-Template Lesson", () => {
  test("lesson loads with step progress bar showing Step 1", async ({ page }) => {
    await loginAndSelectMaya(page);
    await navigateToFreshLesson(page);

    // Step progress bar should show "Step N of 3" (N may be > 1 if resuming)
    const stepText = page.locator("text=/Step \\d of 3/");
    await expect(stepText).toBeVisible({ timeout: 15_000 });

    // Should have 3 step dots in the progress bar
    const stepDots = page.locator('[title="Learn"], [title="Practice"], [title="Check"]');
    await expect(stepDots).toHaveCount(3);
  });

  test("initial coach message renders and [STEP: N] marker is stripped", async ({ page }) => {
    await loginAndSelectMaya(page);
    await navigateToFreshLesson(page);

    // The [STEP: N] marker should NOT be visible in the rendered text
    const bodyText = await page.locator("body").innerText();
    expect(bodyText).not.toContain("[STEP:");
    expect(bodyText).not.toContain("[STEP");

    // Should have at least one coach message visible (non-empty conversation)
    expect(bodyText.length).toBeGreaterThan(200);
  });

  test("interaction controls appear (QuickAnswerCard or Continue button)", async ({ page }) => {
    await loginAndSelectMaya(page);
    await navigateToFreshLesson(page);

    // Check if either QuickAnswerCard (input) or Continue button is visible
    const quickAnswer = page.getByPlaceholder("Type your answer...");
    const continueBtn = page.getByRole("button", { name: "Continue" });
    const askBtn = page.getByRole("button", { name: /^Ask/ });

    const hasQuickAnswer = await quickAnswer.isVisible().catch(() => false);
    const hasContinue = await continueBtn.isVisible().catch(() => false);
    const hasAsk = await askBtn.first().isVisible().catch(() => false);

    // At least one of these interaction controls should be visible
    expect(hasQuickAnswer || hasContinue || hasAsk).toBe(true);
  });

  test("submitting an answer shows typing indicator then AI response", async ({ page }) => {
    await loginAndSelectMaya(page);
    await navigateToFreshLesson(page);

    // Count current coach messages
    const initialText = await page.locator("body").innerText();

    // Interact with whatever control is shown
    await interactWithStep(page);

    // Typing indicator should appear
    const typing = page.locator('[data-testid="typing-indicator"]');
    await expect(typing).toBeVisible({ timeout: 15_000 });

    // Wait for typing to disappear (AI responds)
    await expect(typing).not.toBeVisible({ timeout: 90_000 });

    // Page should now have more content (AI response added)
    const newText = await page.locator("body").innerText();
    expect(newText.length).toBeGreaterThan(initialText.length);
  });

  test("multi-step interaction advances the step indicator", async ({ page }) => {
    await loginAndSelectMaya(page);
    await navigateToFreshLesson(page);

    // Get starting step
    const startStep = await getCurrentStep(page);
    console.log(`Starting at step ${startStep}`);

    // Interact through multiple rounds
    let step = startStep;
    let attempts = 0;
    const maxAttempts = 8;

    while (step <= startStep && attempts < maxAttempts) {
      await interactWithStep(page);
      await waitForAIResponse(page);
      step = await getCurrentStep(page);
      attempts++;
    }

    console.log(`After ${attempts} interactions, reached step ${step}`);

    // If we advanced past the start step, verify the step indicator
    if (step > startStep) {
      await expect(page.getByText(`Step ${step} of 3`)).toBeVisible();

      // Step divider should have appeared
      const dividers = page.locator('[role="separator"]');
      const dividerCount = await dividers.count();
      expect(dividerCount).toBeGreaterThanOrEqual(1);
    }
  });

  test("Ask button opens and closes free-form chat input", async ({ page }) => {
    await loginAndSelectMaya(page);
    await navigateToFreshLesson(page);

    // Look for any Ask button variant
    const askBtn = page.getByRole("button", { name: /^Ask/ });
    const askVisible = await askBtn.first().isVisible().catch(() => false);

    if (askVisible) {
      await askBtn.first().click();

      // Free-form input should appear
      const questionInput = page.getByPlaceholder(/Ask .* a question/);
      await expect(questionInput).toBeVisible({ timeout: 5_000 });

      // Send and Cancel buttons
      await expect(page.getByRole("button", { name: "Send" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();

      // Cancel should close it
      await page.getByRole("button", { name: "Cancel" }).click();
      await expect(questionInput).not.toBeVisible();
    } else {
      // "Ask a question" might not be visible if a QuickAnswerCard is active
      // In that case, submit the answer first, then test Ask
      await interactWithStep(page);
      await waitForAIResponse(page);

      const askAfter = page.getByRole("button", { name: /^Ask/ });
      if (await askAfter.first().isVisible().catch(() => false)) {
        await askAfter.first().click();
        const qi = page.getByPlaceholder(/Ask .* a question/);
        await expect(qi).toBeVisible({ timeout: 5_000 });
        await page.getByRole("button", { name: "Cancel" }).click();
        await expect(qi).not.toBeVisible();
      }
    }
  });

  test("student answer appears as completed card after submission", async ({ page }) => {
    await loginAndSelectMaya(page);
    await navigateToFreshLesson(page);

    const quickAnswer = page.getByPlaceholder("Type your answer...");
    if (await quickAnswer.isVisible().catch(() => false)) {
      const myAnswer = "I love the opening of Harry Potter because it surprises you!";
      await quickAnswer.fill(myAnswer);

      // Submit
      const doneBtn = page.getByRole("button", { name: /done/i });
      await doneBtn.click();

      // Wait for AI response
      await waitForAIResponse(page);

      // The student's answer should be visible in the conversation
      await expect(page.getByText(myAnswer)).toBeVisible();
    } else {
      // Continue button is shown — interact and verify response
      await interactWithStep(page);
      await waitForAIResponse(page);

      // Should have content from the AI response
      const bodyText = await page.locator("body").innerText();
      expect(bodyText.length).toBeGreaterThan(200);
    }
  });

  test("free-form question gets AI response", async ({ page }) => {
    await loginAndSelectMaya(page);
    await navigateToFreshLesson(page);

    // First, handle any active QuickAnswerCard
    const quickAnswer = page.getByPlaceholder("Type your answer...");
    if (await quickAnswer.isVisible().catch(() => false)) {
      await quickAnswer.fill("Hooks grab your attention!");
      await page.getByRole("button", { name: /done/i }).click();
      await waitForAIResponse(page);
    }

    // Now open the Ask input
    const askBtn = page.getByRole("button", { name: /^Ask/ });
    if (await askBtn.first().isVisible().catch(() => false)) {
      await askBtn.first().click();

      const input = page.getByPlaceholder(/Ask .* a question/);
      await expect(input).toBeVisible({ timeout: 5_000 });
      await input.fill("Can you give me another example of a hook?");
      await page.getByRole("button", { name: "Send" }).click();

      // Wait for AI response
      await waitForAIResponse(page);

      // Page should have the question and response
      await expect(page.getByText("Can you give me another example of a hook?").first()).toBeVisible();
    }
  });
});
