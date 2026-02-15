import { expect, type Page } from "@playwright/test";

/**
 * Log in as the seeded parent account → lands on /dashboard.
 */
export async function login(page: Page) {
  await page.goto("/auth/login");
  await page.fill('input[id="email"]', "parent@example.com");
  await page.fill('input[id="password"]', "password123");

  // Use Promise.all to avoid race between click and navigation
  await Promise.all([
    page.waitForURL("**/dashboard", { timeout: 20_000 }),
    page.click('button[type="submit"]'),
  ]);
  await expect(page.getByText("Welcome back")).toBeVisible({ timeout: 10_000 });
}

/**
 * Log in + click Maya's card → lands on student dashboard (/).
 */
export async function loginAndSelectMaya(page: Page) {
  await login(page);

  // Click Maya's card — sets activeChild in React context + localStorage
  const mayaCard = page.locator("div.cursor-pointer", { hasText: "Maya" }).first();
  await mayaCard.click();

  // Wait for student dashboard
  await page.waitForURL("/", { timeout: 10_000 });
  await page.waitForFunction(
    () => {
      const text = document.body.innerText;
      return (
        text.includes("Up Next") ||
        text.includes("Continue lesson") ||
        text.includes("This Week") ||
        text.includes("Lessons done")
      );
    },
    { timeout: 15_000 }
  );
}

/**
 * Navigate to a specific lesson via SPA link on the student dashboard.
 */
export async function navigateToLesson(page: Page, lessonId: string) {
  const lessonLink = page.locator(`a[href="/lesson/${lessonId}"]`);

  if (await lessonLink.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
    await lessonLink.first().click();
  } else {
    // Fall back to primary CTA
    const primaryCta = page.locator('a[href^="/lesson/"]').first();
    await primaryCta.click();
  }

  await page.waitForFunction(
    () => document.body.innerText.includes("of 5"),
    { timeout: 60_000 }
  );
}

/**
 * Navigate to the parent report page for a given child.
 */
export async function navigateToReport(page: Page, childId: string) {
  await page.goto(`/dashboard/children/${childId}/report`);
  await page.waitForFunction(
    () => document.body.innerText.includes("Progress Report"),
    { timeout: 15_000 }
  );
}

/**
 * Wait for the AI response — typing indicator appears then disappears.
 */
export async function waitForAIResponse(page: Page) {
  const typing = page.locator('[data-testid="typing-indicator"]');

  try {
    await expect(typing).toBeVisible({ timeout: 15_000 });
  } catch {
    // Typing indicator may have already disappeared
    await page.waitForTimeout(1000);
    return;
  }

  await expect(typing).not.toBeVisible({ timeout: 90_000 });
  await page.waitForTimeout(500);
}

/**
 * Interact with the current instruction step — answer a question or click Continue.
 */
export async function interactWithStep(page: Page) {
  await page.waitForTimeout(500);

  const quickAnswer = page.getByPlaceholder("Type your answer...");
  const continueBtn = page.getByRole("button", { name: "Continue" });

  if (await quickAnswer.isVisible().catch(() => false)) {
    const answers = [
      "I think hooks are sentences that grab your attention right away!",
      "A question like 'Have you ever wondered why the sky is blue?'",
      "The author used a surprising fact to make me curious!",
      "I would start with an exciting action scene!",
      "The question hook because it makes you think about the answer!",
    ];
    const randomAnswer = answers[Math.floor(Math.random() * answers.length)];
    await quickAnswer.fill(randomAnswer);

    const doneBtn = page.getByRole("button", { name: /done/i });
    if (await doneBtn.isVisible().catch(() => false)) {
      await doneBtn.click();
    }
  } else if (await continueBtn.isVisible().catch(() => false)) {
    await continueBtn.click();
  } else {
    await page.waitForTimeout(2000);
    const cb = page.getByRole("button", { name: "Continue" });
    if (await cb.isVisible().catch(() => false)) {
      await cb.click();
    }
  }
}

/**
 * Parse the current step number from the progress bar text.
 */
export async function getCurrentStep(page: Page): Promise<number> {
  for (let step = 5; step >= 1; step--) {
    const stepText = page.getByText(`Step ${step} of 5`);
    if (await stepText.isVisible().catch(() => false)) {
      return step;
    }
  }
  return 1;
}
