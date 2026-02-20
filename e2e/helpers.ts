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
    page.waitForURL("**/dashboard", { timeout: 30_000 }),
    page.click('button[type="submit"]'),
  ]);
  await expect(page.getByText("Welcome back")).toBeVisible({ timeout: 15_000 });
}

/**
 * Log in + click Maya's card → lands on student dashboard (/).
 */
export async function loginAndSelectMaya(page: Page) {
  await login(page);

  // Wait for children data to fully load (async streak/badge fetches cause card instability)
  await page.waitForTimeout(1000);

  // Click Maya's card — sets activeChild in React context + localStorage
  const mayaCard = page.locator("div.cursor-pointer", { hasText: "Maya" }).first();
  await mayaCard.click({ force: true });

  // Wait for student dashboard (child view lives at /home; first load may need compilation)
  await page.waitForURL("**/home", { timeout: 30_000 });
  await page.waitForFunction(
    () => {
      const text = document.body.innerText;
      return (
        text.includes("Up Next") ||
        text.includes("Continue lesson") ||
        text.includes("This Week") ||
        text.includes("Lessons done") ||
        text.includes("My Writing")
      );
    },
    { timeout: 20_000 }
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

  // Wait for lesson page URL first, then lesson-specific content
  await page.waitForURL("**/lesson/**", { timeout: 30_000 });
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
 * Handles: AnswerCard choice/poll buttons, text input, "Type my own answer", Continue button.
 */
export async function interactWithStep(page: Page) {
  await page.waitForTimeout(500);

  const quickAnswer = page.getByPlaceholder("Type your answer...");
  const continueBtn = page.getByRole("button", { name: "Continue" });

  if (await quickAnswer.isVisible().catch(() => false)) {
    // Text input is visible — type an answer and submit
    const answers = [
      "First, the cat climbed the tall tree. Next, it saw a beautiful bird!",
      "I think the answer is the first one because it makes the most sense.",
      "The character felt happy because they solved the problem by being brave.",
      "First, I would introduce the character. Then, I would describe the setting.",
      "I think it helps the reader understand what is happening in the story.",
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
    // Try clicking an AnswerCard option button (choice, poll, etc.)
    // Exclude known utility buttons and find answer-like buttons in the main area
    const skipNames = /^(Type my own|Ask|Cancel|Send|Go back|Open Next|Log Out|Edit|View Report|\+ Add|Show Ollie|Submit)/i;
    const allBtns = page.locator("main button:not([disabled])");
    const count = await allBtns.count().catch(() => 0);

    for (let i = 0; i < count; i++) {
      const btn = allBtns.nth(i);
      const name = await btn.innerText().catch(() => "");
      if (name && !skipNames.test(name.trim()) && name.trim().length > 3) {
        await btn.click();
        return;
      }
    }

    // Fallback: try "Type my own answer" button to open text input
    const typeOwnBtn = page.getByRole("button", { name: "Type my own answer" });
    if (await typeOwnBtn.isVisible().catch(() => false)) {
      await typeOwnBtn.click();
      await page.waitForTimeout(300);
      const input = page.getByPlaceholder("Type your answer...");
      if (await input.isVisible().catch(() => false)) {
        await input.fill("I think the answer is about making the story interesting!");
        const sendBtn = page.getByRole("button", { name: "Send" });
        if (await sendBtn.isVisible().catch(() => false)) {
          await sendBtn.click();
        }
      }
      return;
    }

    // Last resort: wait and try Continue again
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
  for (let step = 3; step >= 1; step--) {
    const stepText = page.getByText(`Step ${step} of 3`);
    if (await stepText.isVisible().catch(() => false)) {
      return step;
    }
  }
  return 1;
}
