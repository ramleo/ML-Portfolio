export const QA_GUIDE = `
# QA Test Author — User Guide

## What this tool does
You describe a browser test in **plain English** and it writes a complete,
runnable **Playwright** test in **TypeScript**. A free LLM turns your steps into
a test file you can drop straight into a Playwright project.

This is **Phase 1: generation only.** The tool writes the test — it does **not
run** anything. There is no execution against your site here, so there is no
risk of it touching a real page. Running generated tests (against this project's
own site, bounded and sandboxed) is a later phase.

## How to use it
1. Optionally set the **Base URL** of the site the test targets (defaults to a
   \`localhost\` placeholder you can change in the code).
2. Optionally give the test a **name** (used for the \`describe\` block).
3. Type what to test in plain English, e.g.
   *"Open the pricing page, click Sign up, check the email field is required."*
4. Press **Generate test** and copy the resulting TypeScript.

## What makes the output good
- **Resilient locators.** It prefers \`getByRole\`, \`getByLabel\`,
  \`getByText\` and \`getByPlaceholder\` — locators tied to what a user sees
  (accessible role, name, label) rather than brittle CSS paths or positional
  \`.nth()\` indices that break on the smallest layout change.
- **Real assertions.** Every scenario ends in at least one \`expect(...)\` — a
  test with no assertion passes even when the page is broken.
- **Comments that explain the choice.** Each locator carries a short note on
  why it is stable. That is the honest version of "self-healing": the selectors
  are chosen to survive change, and you can see the reasoning.

## Honest limits
- The generated test is a **draft to review**, not a guaranteed-passing test.
  Selectors depend on your actual markup — check the names match your page.
- It uses **free LLM providers** (Cohere / Mistral). On a bad response the tool
  says so rather than showing broken code; just try again.
- **Nothing is executed.** Copy the code into your own Playwright setup
  (\`npm init playwright@latest\`) to run it.

## Why it matters
Writing good end-to-end tests is slow, and most hand-written selectors are
brittle. Turning a plain-English description into a Playwright test with stable
locators removes the tedious first draft and nudges toward tests that do not
shatter on the next redesign.
`;

export const QA_SUGGESTIONS = [
  "What makes a Playwright locator resilient?",
  "Why should every test end in an assertion?",
  "How do I run the generated test locally?",
  "What is the difference between getByRole and a CSS selector?",
];
