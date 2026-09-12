import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

/**
 * Phase 2 of the testing plan: one smoke test per tool page.
 *
 * The list is read from the filesystem rather than hand-maintained, so a tool
 * added next month is covered the day its route exists and nobody has to
 * remember this file. Reading src/data/capabilities.ts would be the other
 * obvious source, but that module imports React icon components, and a test
 * list should not depend on a UI library resolving in Node.
 *
 * What each test asserts is deliberately modest — the page answers, renders a
 * heading, and its own scripts did not throw. That is enough to catch the
 * failure this project keeps hitting: a page that is broken for every visitor
 * and looks fine until somebody reads a response body. It is NOT enough to
 * prove a tool works, and does not try to be; that is what the guided
 * walkthroughs and the backend suites are for.
 *
 * Nothing here asserts on a backend response. These pages call two Hugging
 * Face Spaces that cold-start and rate-limit, and a suite that goes red for
 * that reason is a suite people stop reading.
 */

// Resolved from the project root, which is where Playwright runs. Not from
// import.meta: these specs are transpiled as CommonJS, where it does not exist.
const TOOLS_DIR = path.join(process.cwd(), "src", "app", "tools");

/** Every directory under app/tools that is a real page.
 *  Skips `[domain]` and friends — a dynamic segment is not a route on its own,
 *  and requesting it literally would 404 for reasons that mean nothing. */
function toolRoutes(): string[] {
  return fs
    .readdirSync(TOOLS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("[") && !e.name.startsWith("_"))
    .filter((e) => fs.existsSync(path.join(TOOLS_DIR, e.name, "page.tsx")))
    .map((e) => e.name)
    .sort();
}

const routes = toolRoutes();

/**
 * Pages with NO heading element anywhere — not an h1, not any level.
 *
 * This is an accessibility gap in the app, not a test to relax: a screen
 * reader gets no document outline for these six, and they are the ML pipeline
 * tools that open straight into a modal wizard with no page-level title.
 * Every other tool page has a heading.
 *
 * Listed explicitly so it is visible and countable rather than hidden behind
 * a weakened assertion. The list should only ever shrink — the test below
 * fails if it grows, and an entry that starts passing must be deleted.
 */
const NO_HEADING_YET = new Set([
  "automl",
  "ensemble",
  "feature-engineering",
  "feature-selection",
  "optuna",
  "shap",
]);

test.describe("tool pages", () => {
  // A list built from the filesystem could silently become empty — a moved
  // directory, a changed path — and an empty list means zero tests, which
  // reads as a green run. Assert the list itself before trusting it.
  test("the route list is not empty", () => {
    expect(routes.length).toBeGreaterThan(40);
  });

  // An exception list nobody checks becomes permanent. This fails if a route
  // is added to it, and if a listed route no longer exists.
  test("the no-heading exception list has not grown", () => {
    expect(NO_HEADING_YET.size).toBeLessThanOrEqual(6);
    for (const route of NO_HEADING_YET) {
      expect(routes, `${route} is on the exception list but has no page`).toContain(route);
    }
  });

  for (const route of routes) {
    test(`/tools/${route} renders`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (err) => errors.push(err.message));

      const res = await page.goto(`/tools/${route}`);
      expect(res?.status(), `HTTP status for /tools/${route}`).toBe(200);

      // Any level. Most pages put an h1 in page.tsx, but several render their
      // heading from a client component, and the test should not care which.
      if (!NO_HEADING_YET.has(route)) {
        await expect(
          page.getByRole("heading").first(),
          `no heading rendered on /tools/${route}`
        ).toBeVisible();
      }

      expect(
        errors,
        `uncaught page errors on /tools/${route}: ${errors.join(" | ")}`
      ).toEqual([]);
    });
  }
});
