import { test, expect } from "@playwright/test";
import { login } from "./helpers";

/**
 * E2E: Authentication flows.
 *
 * Requires: dev server running, database seeded with e2e data.
 * No AI calls — these tests are fast.
 */

test.describe("Authentication", () => {
  test("login with valid credentials → redirects to /dashboard", async ({ page }) => {
    await page.goto("/auth/login");
    await page.fill('input[id="email"]', "parent@example.com");
    await page.fill('input[id="password"]', "password123");
    await page.click('button[type="submit"]');

    await page.waitForURL("**/dashboard", { timeout: 15_000 });
    await expect(page.getByText("Welcome back")).toBeVisible({ timeout: 10_000 });
  });

  test("login with wrong password → shows error", async ({ page }) => {
    await page.goto("/auth/login");
    await page.fill('input[id="email"]', "parent@example.com");
    await page.fill('input[id="password"]', "wrongpassword");
    await page.click('button[type="submit"]');

    // Should show an error message and stay on login page
    await expect(page.getByText(/invalid|wrong|failed/i)).toBeVisible({ timeout: 10_000 });
    expect(page.url()).toContain("/auth/login");
  });

  test("logout → redirects to /auth/login", async ({ page }) => {
    // Login first
    await login(page);

    // Click Log Out
    await page.getByRole("button", { name: /log out/i }).click();

    // Should redirect to login
    await page.waitForURL("**/auth/login", { timeout: 15_000 });
    await expect(page.getByRole("button", { name: "Log In" })).toBeVisible();
  });

  test("unauthenticated visit to / → redirect to /auth/login", async ({ page }) => {
    // goto() follows the redirect, so by the time it resolves we're already at /auth/login
    await page.goto("/");

    // Verify we ended up on the login page (middleware redirect)
    await expect(page.getByRole("button", { name: "Log In" })).toBeVisible({ timeout: 15_000 });
    expect(page.url()).toContain("/auth/login");
  });
});
