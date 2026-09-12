import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests for the site.
 *
 * Port 3300, not 3000: ml-api's security/origin_policy.py hard-rejects any
 * browser Origin that is not on its allowlist, and 3300 is the only
 * allowlisted local port besides 3000. The demo recorder already runs there
 * for the same reason — see scripts/record-demo.mjs.
 *
 * Tests select on the `data-wt` anchors the tool pages already carry for the
 * guided walkthroughs. Those are stable and maintained, because a broken one
 * fails a demo recording. A second, parallel set of test-only ids would be one
 * more thing to keep in sync and nothing else would notice when it rotted.
 */
export default defineConfig({
  testDir: "./e2e",
  // A tool page that talks to a Hugging Face Space can sit through a cold
  // start, so the default 30s is too tight; individual waits stay short.
  timeout: 60_000,
  expect: { timeout: 10_000 },

  // A test that only passes on the second run is a broken test, not a slow
  // one. Retries exist so CI reports the flake instead of the failure, and
  // locally there are none so flakiness is visible while it is being written.
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,

  // Fails the build if a test is left focused with .only.
  forbidOnly: !!process.env.CI,

  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"]],

  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3300",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],

  /**
   * Build and serve the real production output, not the dev server: dev-only
   * warnings and the absence of the production build's route handling would
   * make these tests describe an app nobody visits.
   *
   * Reuses an already-running server locally so a test run does not cost a
   * two-minute rebuild each time; never in CI, where a stale server would mean
   * testing the previous commit.
   */
  webServer: {
    command: "npx next start -p 3300",
    url: "http://localhost:3300",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
