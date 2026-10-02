export const QA_WORLD_GUIDE = `
# Testwright — User Guide

## What Testwright is
Testwright is the QA-automation platform inside AIRaML. It turns a plain-English
description of a browser test into a real, runnable **Playwright** test in
**TypeScript**, using resilient locators and real assertions. It is a full
workspace organised as five stages — **Author**, **Run**, **Discover**, **Heal**,
**Visual** — that hand off to each other. All five are live today.

Everything is **free** to run (free LLM providers + open-source Playwright) and
executes on real browsers against any public site. The LLM work uses a free
provider cascade — **Cohere** (\`command-a-03-2025\`) first, **Mistral**
(\`mistral-small-latest\`) as the fallback. Each stage has its own daily budget
cap so one can't drain another.

## The five stages
- **Author** *(live)* — describe a test in plain English (or paste a written
  test case) and get a runnable Playwright TypeScript test back. It can also
  **suggest extra assertions** your draft is missing.
- **Run** *(live)* — execute a Playwright test against a live site on an isolated,
  ephemeral CI runner (GitHub Actions), and get pass/fail, a summary, timing, a
  step timeline, a failure screenshot, video and a full trace. You can **Stop** a
  run mid-flight, repeat it to **check flakiness**, and, when a locator fails,
  **Suggest a fix** (self-heal) then review the change before re-running.
- **Discover** *(live)* — give a URL; it renders the page on the runner, reads the
  accessibility snapshot, and proposes up to six candidate test cases. Pick the
  ones you want and it drafts each as a Playwright test to send to Run.
- **Heal** *(live)* — run your saved tests as a suite, group the failures by root
  cause ("1 issue · N tests"), and self-heal each group in one click.
- **Visual** *(live)* — screenshot a page on the runner, save it as a baseline in
  your browser, then re-shoot later and diff the two pixel-for-pixel. A red
  overlay and a % changed figure (against a tolerance you pick) catch unintended
  visual regressions. Best on static pages; animated/WebGL sections read as changed.

## Using the Author (step by step)
1. Open **Author** (the button on this page, or the Author tab in the sub-nav).
2. **Base URL** *(optional)* — the site the test targets. It defaults to this
   portfolio's URL; change it to point the generated test elsewhere. It becomes a
   \`BASE_URL\` constant at the top of the test.
3. **Test name** *(optional)* — used as the \`describe(...)\` block title. Leave it
   blank and a title is derived from your description.
4. **What should the test check?** — type the steps in plain English, the way
   you'd tell a teammate. Example: *"Open the pricing page, click Sign up, and
   check the email field is required."* Up to 4,000 characters.
5. Click **Generate test** (or **Use a sample** to load an example first). The
   provider cascade returns one complete test file; the one that answered is shown
   as a chip (e.g. \`cohere\`).
6. On the result you can **Send to Run** to execute it here, **Suggest assertions**
   to get up to six extra checks the test is missing (copy any into your test), or
   **Copy** the whole file into your own Playwright project. **Clear** starts over.

## Using the Run stage (step by step)
1. Open **Run** — via **Send to Run** on an Author/Discover result (it carries the
   test and name over), the Run tab in the sub-nav, or paste a \`@playwright/test\`
   file in directly. **Use a sample** loads a known-good test.
2. **Base URL** *(optional)* — the target site. **Test name** *(optional)* is a
   label; blank names are auto-derived from the test's \`describe\`/\`test\` title.
3. Testing a site that isn't this portfolio (a **third-party** site)? A checkbox
   appears — you must confirm you own it or are authorized to test it before the
   run button enables. The backend enforces the same gate.
4. Click **Run test**. The test is dispatched to an **isolated, ephemeral GitHub
   Actions runner** — nothing runs in your browser or on the app server — and the
   page shows a **Queued → Running → Results** stepper with a live elapsed timer.
   First-run setup on a fresh runner takes about 40–60s, so expect roughly a minute
   end to end. **Open on GitHub** lets you watch the raw CI run; **Stop** cancels
   the GitHub job (not just the local view) if you need to abort.
5. On completion you get a **Passed/Failed** banner, a **summary** (passed /
   failed / flaky / skipped), **timing** (\`test\` time vs \`total\` wall-clock), a
   **step timeline**, and, on failure, the **screenshot** and **video** inline plus
   a **trace** download. **Save test** keeps it in this browser.
6. **Check flakiness** — set **Runs** to 3× before running. The same
   test repeats that many times on one dispatch and you get a pass-rate and a
   stable / flaky / consistently-failing verdict — results that disagree across
   identical runs are flakiness, not a real pass or fail.
7. **Self-healing** — if a test failed on a **locator or a timing/wait** problem,
   click **Suggest a fix**. A free LLM reads the accessibility snapshot of the page
   at failure and rewrites the broken locator to one that matches, or adds a
   web-first wait (never a fixed sleep) for a timing failure. The fix is **staged
   into the editor and the change is shown (old → new)** — it does **not** run
   automatically. Review it, then **Re-run healed test** (a fresh ~40–60s CI run) or
   **Discard** to revert. It repairs *locators and timing only* — if the failure is
   an **assertion mismatch** (the page's real value differs from what the test
   expects), it **refuses and tells you**, because rewriting the assertion would hide
   a real bug. Fix those yourself from the "Why it failed" panel.
8. **Correct it yourself any time.** The Playwright code box is fully editable —
   hand-edit the staged fix (or any generated test) before running, then **Save
   test** to keep your version. A re-run of a *saved* test always uses your edits;
   regenerating from scratch starts fresh (it doesn't remember past edits).
9. **Recent runs** and **Saved tests** live at the bottom (in this browser).
   Recent runs shows each run's status, a running pass-rate, and a **Re-run**
   button; Saved tests lets you **Load** a test back into the editor, **Run** it
   again, or delete it.

## Using the Discover stage (step by step)
1. Open **Discover** and enter a **URL** (it defaults to this portfolio). A
   third-party URL shows the same ownership checkbox as Run.
2. Click **Discover test cases** — it renders the page on the isolated runner and
   captures its accessibility snapshot (about a minute, same infra as Run).
3. You get up to **6 proposed test cases** (title + plain-English steps), based only
   on what's actually on the page. Tick the ones worth writing.
4. Click **Generate selected (N)** — each proposal is drafted into a full Playwright
   test (the Author stage under the hood).
5. **Send to Run** on any draft to execute it, then save or heal it like any other
   run. Your proposals are **kept** — after Run, use the **← Back to Discover**
   button (or the Discover tab) to return and send more, without re-discovering.
   Discover reads only the URL you give (one page for now).

## Using the Heal stage (step by step)
1. Save the tests you care about from **Run** (they live in this browser).
2. Open **Heal** and click **Run suite (N)** — each saved test runs on the CI
   runner, one at a time, with a progress bar.
3. Failures are **grouped by root cause** — tests that broke on the same locator
   show as one issue ("1 issue · N tests"), with the shared cause listed.
4. Click **Heal all (N)** on a group — every test in it is re-resolved from its page
   snapshot and re-run. "healed · passed" means fixed; "still failing" means it's a
   real bug, not a locator. If every test passed, it says so and there's nothing to heal.

## Using the Visual stage (step by step)
1. Open **Visual** and enter a **page URL** (third-party URLs show the ownership
   checkbox). Pick a **Tolerance** — the % of pixels allowed to change and still
   "pass" (0.1% strict · 0.5% · 1% · 2% lenient).
2. Click **Capture baseline** — it screenshots the page on the isolated runner and
   saves the image **in your browser** as the reference ("● baseline saved").
3. Later, click **Compare to baseline** — it re-shoots the page and diffs it against
   the saved baseline pixel-for-pixel (the diff runs in your browser).
4. You get **No visual change** or **Visual change detected**, the exact **% of
   pixels changed vs the threshold**, and a side-by-side **Current** image and a
   **Diff** image with changes in red. A warning shows if the page size changed.
5. **Clear baseline** drops the saved reference so you can set a new one.

## Reading and running the output
- The output is a complete \`*.spec.ts\` file: \`import { test, expect } from
  '@playwright/test'\`, a \`test.describe(...)\` block, and one or more \`test(...)\`
  cases.
- Run it **here** with **Send to Run** / the Run stage, or locally: \`npm init
  playwright@latest\` in a project, drop the file in \`tests/\`, then
  \`npx playwright test\`.

## What makes the generated tests good
- **Resilient locators.** It prefers \`getByRole\`, \`getByLabel\`, \`getByText\`,
  \`getByPlaceholder\` and \`getByTestId\` — locators tied to what a user sees
  (accessible role, name, label) rather than brittle CSS paths or positional
  \`.nth()\` indices that break on the smallest layout change. A short comment on
  each locator says why it is stable.
- **Real assertions.** Every scenario ends in at least one \`expect(...)\`
  (\`toBeVisible\`, \`toHaveURL\`, \`toHaveText\`, \`toHaveCount\`, …). A test with no
  assertion passes even when the page is broken, so Testwright never emits one —
  and **Suggest assertions** points out any a draft is still missing.
- **One runnable file.** No pseudo-code, no fragments — a file you can run as-is.

## Safety, limits & cost
- The generated test is a **draft to review**, not a guaranteed-passing test. The
  selectors depend on your actual markup — check that the role/name/label it
  guessed match your page, and adjust if not.
- It uses **free LLM providers**; on a bad response the tool says so plainly
  rather than showing broken code — just generate again.
- **Execution runs on isolated CI**, single-worker with a hard timeout. It is not
  instant — a run queues, spins up a runner and executes, so expect roughly a
  minute end to end (the ~2GB runner image is pulled fresh each time).
- It runs real browsers on public web pages: no native mobile/desktop/mainframe
  apps, no email/SMS flows, and no massive parallel device matrices (one free
  runner at a time).
- **Public sites only** — private or internal addresses (localhost, LAN IPs) are
  blocked. Testing any site other than this portfolio requires confirming you're
  authorized, and every stage is behind its own **daily budget cap**.

## FAQ
- **Do I need to know Playwright?** No — you describe the test in English, and the
  Run stage executes it for you here. Reading the generated code helps but isn't
  required.
- **Where does the test actually run?** On an isolated, ephemeral GitHub Actions
  runner — never in your browser or on the app server — so a misbehaving test
  can't affect the live site.
- **What is self-healing?** When a locator breaks (an element moved or was renamed)
  or a step times out waiting for the page, **Suggest a fix** asks a free LLM to
  re-resolve the locator, or add a web-first wait, from the page's accessibility
  snapshot. It stages the change for you to review, then you choose to re-run or
  discard — it fixes locators and timing, and refuses to rewrite a failing assertion
  (that's a real bug for you to fix, not something to heal away).
- **Can I stop a run?** Yes — the **Stop** button cancels the GitHub job itself, not
  just the page's polling, so it frees the runner.
- **What's the flakiness check?** Running the same test 3× in one go; if
  identical runs disagree, the test is flaky (timing/animation-sensitive) rather
  than genuinely passing or failing.
- **Can it test any website?** Yes — give any public URL. Private or internal
  addresses are blocked, you must confirm authorization for sites you don't own,
  and runs are behind a daily budget cap.
- **Is it really free?** Yes — free LLM tiers and open-source Playwright, behind
  per-stage daily budget caps.
- **Why Playwright and not Selenium?** Playwright's role/text locators and
  built-in waiting make far more stable tests, and it is already the framework
  this site uses.

## Why it matters
Writing good end-to-end tests is slow, and most hand-written selectors are
brittle. Turning a plain-English description into a Playwright test with stable
locators removes the tedious first draft and pushes toward tests that survive the
next redesign — the same idea the commercial QA-automation tools are built on,
done here on a free, open stack.
`;

export const QA_WORLD_SUGGESTIONS = [
  "How do I run a test in the Run stage?",
  "How does self-healing fix a broken locator?",
  "How does the flakiness check work?",
  "How do I catch visual regressions with the Visual stage?",
];
