import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

/**
 * The exploratory data analysis page, from a stubbed response.
 *
 * The rest of this suite never asserts on a backend, for good reason: the two
 * Hugging Face Spaces cold-start and rate-limit, and a suite that goes red for
 * that is a suite people stop reading. This spec keeps that rule by fulfilling
 * POST /eda from a fixture, so what is under test is entirely the rendering —
 * fifteen sections, six Plotly charts, and the empty states.
 *
 * The fixture is a real captured response, and a deliberately awkward one:
 * five rows, a constant column, a duplicate row, and a pair whose correlation
 * cannot be computed. Those shapes are what broke this page twice — once as an
 * unhandled 500 from the analyser, once as a Plotly exception that replaced the
 * whole report with an error boundary. A fixture of comfortable data would have
 * caught neither.
 */
const FIXTURE = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "e2e", "fixtures", "eda-response.json"), "utf8"),
);

const ROUTE = "/tools/exploratory-data-analysis";

/** Sections every dataset produces, plus the two this fixture earns:
 *  duplicates, because it contains a repeated row, and the empty-state
 *  panels, which are sections too. */
const SECTIONS = [
  "overview", "summary", "insights", "readiness", "suggestions", "sample",
  "duplicates", "columns", "statistics", "distributions", "box-plots",
  "mutual-information", "splom", "pca", "correlations", "clean", "report",
];

async function analyseWithFixture(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await page.route("**/eda", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(FIXTURE) });
  });

  await page.goto(ROUTE);
  await page.locator('[data-wt="eda-sample"]').click();
  await expect(page.locator("#report")).toBeVisible();
  return errors;
}

test.describe("exploratory data analysis", () => {
  test("renders every section for an analysed file", async ({ page }) => {
    const errors = await analyseWithFixture(page);

    for (const id of SECTIONS) {
      await expect(page.locator(`#${id}`), `section #${id} is missing`).toBeAttached();
    }
    expect(errors, `the page's own scripts threw: ${errors.join("; ")}`).toEqual([]);
  });

  test("draws the interactive charts", async ({ page }) => {
    await analyseWithFixture(page);

    // Assert that a chart exists and has content, never on Plotly's internals.
    // Its SVG structure is the library's business and changes between minor
    // versions; that a container is non-empty is this page's business.
    for (const id of ["distributions", "box-plots", "mutual-information", "splom", "correlations"]) {
      const plots = page.locator(`#${id} .js-plotly-plot`);
      await expect(plots.first(), `no chart drawn in #${id}`).toBeVisible({ timeout: 20_000 });
    }
  });

  test("explains an empty panel instead of leaving it blank", async ({ page }) => {
    await analyseWithFixture(page);

    // Two numeric columns cannot make a three-axis projection. The panel must
    // say why: a blank card reads as a broken chart, and that is how the
    // analyser's 500 went unnoticed for months.
    await expect(page.locator("#pca")).toContainText(/at least three numeric columns/i);
  });

  test("marks an uncomputable correlation rather than drawing it as zero", async ({ page }) => {
    await analyseWithFixture(page);

    // A constant column has no correlation with anything — the value is null,
    // not zero, and Plotly would otherwise paint a null cell mid-scale, which
    // reads as "no relationship" instead of "cannot tell".
    const marks = page.locator("#correlations .annotation-text", { hasText: "n/a" });
    await expect(marks.first()).toBeVisible({ timeout: 20_000 });
  });

  test("keeps the page from scrolling sideways on a phone", async ({ page }) => {
    await page.setViewportSize({ width: 380, height: 780 });
    await analyseWithFixture(page);

    // Every grid item needs `min-width: 0` and every wide chart or table its
    // own scroller. Without both, one wide element drags the whole document
    // sideways and its own scroller never engages.
    const overflow = await page.evaluate(() => {
      const de = document.documentElement;
      return de.scrollWidth - de.clientWidth;
    });
    expect(overflow, "the page body scrolls sideways").toBeLessThanOrEqual(1);
  });

  test("every nav tab points at a section that exists", async ({ page }) => {
    await analyseWithFixture(page);

    // The nav is built from its own conditional list and the sections from
    // theirs. When those drift, a tab scrolls nowhere and nothing complains —
    // which is how the analyst summary ended up with no way to reach it.
    const targets = await page.locator('[data-wt="eda-nav"] a').evaluateAll(
      (links) => links.map((a) => (a.getAttribute("href") ?? "").slice(1)),
    );
    expect(targets.length).toBeGreaterThan(10);
    for (const id of targets) {
      await expect(page.locator(`#${id}`), `nav tab "${id}" has no section`).toBeAttached();
    }
  });

  test("shows why a column is not ready, as text", async ({ page }) => {
    await analyseWithFixture(page);

    // Not a tooltip. A `title` attribute does not exist on a touch screen and
    // cannot be scanned across a dozen columns, and shipping the verdict
    // without the reason made the panel useless. This asserts the reason is
    // rendered content.
    const panel = page.locator("#readiness");
    await expect(panel).toContainText(/likely an ID column|missing|skewed|unique categories|Ready to use/i);
  });

  test("ranks outliers and skew in the statistics panel", async ({ page }) => {
    await analyseWithFixture(page);

    const panel = page.locator("#statistics");
    await expect(panel).toContainText(/Outliers \(IQR\)/i);
    await expect(panel).toContainText(/Skewness/i);
    // The full-detail table carries kurtosis, which appears nowhere else.
    await expect(panel).toContainText(/Kurtosis/i);
  });

  test("names the file it analysed", async ({ page }) => {
    await analyseWithFixture(page);

    // Nothing on the page said which file this was, which matters the moment
    // somebody analyses two in a row.
    await expect(page.locator("#overview")).toContainText("sample-sales.csv");
  });
});
