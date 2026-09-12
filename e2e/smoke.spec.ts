import { expect, test } from "@playwright/test";

/**
 * Phase 1 of the testing plan: prove the harness runs against a real build,
 * with assertions that can actually fail.
 *
 * Deliberately narrow. These assert on things the page owns — its own markup
 * and whether its own scripts threw — and never on a backend response. A
 * suite that goes red because a free-tier provider is rate limiting is a
 * suite people learn to ignore. Backend-dependent checks belong in phase 2,
 * where the mocking strategy is decided.
 */

/** Uncaught exceptions, not console noise.
 *
 *  `pageerror` fires only when the page's own JavaScript throws — a real
 *  defect every time. `console` would also catch failed network requests to a
 *  Space that happens to be cold, which is not this suite's business. */
function collectPageErrors(page: import("@playwright/test").Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

test.describe("site smoke", () => {
  test("home page renders its own content", async ({ page }) => {
    const errors = collectPageErrors(page);

    await page.goto("/");
    await expect(page).toHaveTitle(/.+/);
    // The nav is on every page and is not fed by any backend, so it renders
    // whether or not a Space is awake.
    await expect(page.locator("nav").first()).toBeVisible();

    expect(errors, `uncaught page errors: ${errors.join(" | ")}`).toEqual([]);
  });

  test("a tool page renders and its demo anchors are present", async ({ page }) => {
    const errors = collectPageErrors(page);

    // Text-to-SQL is the check with the most reach: the page is server
    // rendered, and its anchors are the ones the guided walkthrough drives,
    // so if these are missing the demo is broken too.
    await page.goto("/tools/text-to-sql");

    await expect(page.getByRole("heading", { name: /text.to.sql/i }).first()).toBeVisible();
    await expect(page.locator('[data-wt="question"]')).toBeVisible();
    await expect(page.locator('[data-wt="ask"]')).toBeVisible();

    expect(errors, `uncaught page errors: ${errors.join(" | ")}`).toEqual([]);
  });

  test("an unknown route returns the not-found page, not a crash", async ({ page }) => {
    const errors = collectPageErrors(page);

    const res = await page.goto("/tools/this-tool-does-not-exist");
    expect(res?.status()).toBe(404);

    expect(errors, `uncaught page errors: ${errors.join(" | ")}`).toEqual([]);
  });
});
