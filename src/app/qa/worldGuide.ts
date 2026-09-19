export const QA_WORLD_GUIDE = `
# Testwright — User Guide

## What Testwright is
Testwright is the QA-automation platform inside AIRaML. It turns a plain-English
description of a browser test into a real, runnable **Playwright** test in
**TypeScript**, using resilient locators and real assertions. It is a full
workspace organised as four stages — **Author**, **Run**, **Discover**, **Heal** —
that hand off to each other. All four are live today.

Everything is **free** to run (free LLM providers + open-source Playwright) and
aimed first at this site itself.

## The four stages
- **Author** *(live)* — describe a test in plain English (or paste a written
  test case) and get a runnable Playwright TypeScript test back.
- **Run** *(live)* — execute a Playwright test against a live site on an isolated,
  ephemeral CI runner (GitHub Actions), and get pass/fail, a summary, and a failure
  screenshot back — with video and a full trace on the linked run. When a locator
  fails, **Heal & re-run** re-resolves it from the page snapshot and runs the fix.
- **Discover** *(live)* — give a URL; it renders the page on the runner,
  reads the accessibility snapshot, and proposes candidate test cases. Pick the
  ones you want and it drafts each as a Playwright test to send to Run.
- **Heal** *(live)* — run your saved tests as a suite, group the failures by root
  cause ("1 issue · N tests"), and self-heal each group in one click.

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
5. Click **Generate test** (or **Use a sample** to load an example first). A free
   LLM (Cohere → Mistral, budget-capped) returns one complete test file.
6. Read the result, then either **Send to Run** to execute it here, click **Copy**
   to paste it into your own project, or both.

## Using the Run stage (step by step)
1. Open **Run** — via **Send to Run** on an Author result (it carries the test and
   name over), the Run tab in the sub-nav, or paste a \`@playwright/test\` file in
   directly. **Use a sample** loads a known-good test.
2. **Base URL** *(optional)* — the target site. Any public URL works; private or
   internal addresses (localhost, LAN IPs) are rejected. **Test name** *(optional)*
   is a label.
3. Click **Run test**. The test is dispatched to an **isolated, ephemeral GitHub
   Actions runner** — nothing runs in your browser or on the app server — and the
   page shows a **Queued → Running → Results** stepper while it executes.
4. On completion you get a **Passed/Failed** banner, a **summary** (passed /
   failed / flaky / skipped), a **step timeline**, and, on failure, the
   **screenshot** and **video** inline plus a **trace** download. The **Full run**
   link opens the CI run on GitHub.
5. **Self-healing** — if a test failed on a locator, click **Heal & re-run**. A
   free LLM reads the accessibility snapshot of the page at failure, rewrites the
   broken locator to one that matches, shows the change (old → new), and re-runs
   the corrected test. It repairs *locators* — a genuine bug (a correctly-failing
   assertion) will still fail on the re-run, which is the honest result.

## Using the Discover stage (step by step)
1. Open **Discover** and enter a **URL** (it defaults to this portfolio).
2. Click **Discover test cases** — it renders the page on the isolated runner and
   captures its accessibility snapshot (about a minute, same infra as Run).
3. You get up to **6 proposed test cases** (title + plain-English steps), based only
   on what's actually on the page. Tick the ones worth writing.
4. Click **Generate selected** — each proposal is drafted into a full Playwright
   test (the Author stage under the hood).
5. **Send to Run** on any draft to execute it, then save or heal it like any other
   run. Discover reads only the URL you give (one page for now).

## Using the Heal stage (step by step)
1. Save the tests you care about from **Run** (they live in this browser).
2. Open **Heal** and click **Run suite** — each saved test runs on the CI runner,
   one at a time.
3. Failures are **grouped by root cause** — tests that broke on the same locator
   show as one issue ("1 issue · N tests").
4. Click **Heal all** on a group — every test in it is re-resolved from its page
   snapshot and re-run. Green means healed; "still failing" means it's a real bug,
   not a locator.

## Reading and running the output
- The output is a complete \`*.spec.ts\` file: \`import { test, expect } from
  '@playwright/test'\`, a \`test.describe(...)\` block, and one or more \`test(...)\`
  cases.
- Run it **here** with **Send to Run** / the Run stage, or locally: \`npm init
  playwright@latest\` in a project, drop the file in \`tests/\`, then
  \`npx playwright test\`.
- The provider that generated the test is shown as a chip (e.g. \`cohere\`).

## What makes the generated tests good
- **Resilient locators.** It prefers \`getByRole\`, \`getByLabel\`, \`getByText\`,
  \`getByPlaceholder\` and \`getByTestId\` — locators tied to what a user sees
  (accessible role, name, label) rather than brittle CSS paths or positional
  \`.nth()\` indices that break on the smallest layout change. A short comment on
  each locator says why it is stable.
- **Real assertions.** Every scenario ends in at least one \`expect(...)\`
  (\`toBeVisible\`, \`toHaveURL\`, \`toHaveText\`, \`toHaveCount\`, …). A test with no
  assertion passes even when the page is broken, so Testwright never emits one.
- **One runnable file.** No pseudo-code, no fragments — a file you can run as-is.

## Honest limits
- The generated test is a **draft to review**, not a guaranteed-passing test. The
  selectors depend on your actual markup — check that the role/name/label it
  guessed match your page, and adjust if not.
- It uses **free LLM providers**; on a bad response the tool says so plainly
  rather than showing broken code — just generate again.
- **Execution runs on isolated CI**, single-worker with a hard timeout. It is not
  instant — a run queues, spins up a runner and executes, so expect roughly a
  minute end to end.
- It runs real browsers on public web pages: no native mobile/desktop/mainframe
  apps, no email/SMS flows, and no massive parallel device matrices (one free
  runner at a time).

## FAQ
- **Do I need to know Playwright?** No — you describe the test in English, and the
  Run stage executes it for you here. Reading the generated code helps but isn't
  required.
- **Where does the test actually run?** On an isolated, ephemeral GitHub Actions
  runner — never in your browser or on the app server — so a misbehaving test
  can't affect the live site.
- **What is self-healing?** When a locator breaks (an element moved or was
  renamed), **Heal & re-run** asks a free LLM to re-resolve it from the page's
  accessibility snapshot and re-runs the fixed test — so a UI change that renamed or
  moved an element doesn't break the test. It fixes locators, not real bugs.
- **Can it test any website?** Yes — give any public URL. Private or internal
  addresses (localhost, LAN IPs) are blocked, and runs are behind a daily budget
  cap.
- **Is it really free?** Yes — free LLM tiers and open-source Playwright, behind a
  daily budget cap.
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
  "How does Discover propose test cases?",
  "What can Testwright do today versus on the roadmap?",
];
