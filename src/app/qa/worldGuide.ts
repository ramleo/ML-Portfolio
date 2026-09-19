export const QA_WORLD_GUIDE = `
# Testwright — Platform Guide

## What Testwright is
Testwright is the **QA-automation platform** inside AIRaML — a full workspace for
building and running browser tests, not a single tool. It turns plain-English
descriptions into real **Playwright** tests, and (on the roadmap) runs and heals
them. Free, open-source engine, aimed first at this site itself.

## The four stages
One workspace, four stages that hand off to each other:
- **Author** *(live)* — describe a test in plain English (or paste a case) →
  a runnable Playwright TypeScript test with resilient role/text locators and
  real assertions.
- **Run** *(Phase 2)* — execute tests against our own site in a bounded runner,
  with pass/fail, screenshots, video and a trace.
- **Discover** *(Phase 3)* — give an own-site URL → a crawl proposes candidate
  test cases → you confirm → it generates and runs them.
- **Heal** *(Phase 5)* — when many tests fail on one broken thing, group them by
  root cause and fix all in one click, or one by one.

## How to use it now
Open **Author**, describe what to check, and copy the generated Playwright test
into your own project. Everything is generation-only today — nothing runs against
a live site until the Run stage lands.

## Honest scope
Testwright builds the core value **free, for our own site**: plain-English
authoring, resilient locators, bounded execution, visual + accessibility checks,
and root-cause grouping. It is **not** a paid device farm — no 3,000-browser
matrix, no native mobile/desktop/mainframe, no SMS/email flows.

## Why it exists
Writing good end-to-end tests is slow and most hand-written selectors are
brittle. Testwright removes the tedious first draft and pushes toward tests that
survive a redesign — the same idea tools like testRigor and Katalon are built on,
done honestly on a free stack.
`;

export const QA_WORLD_SUGGESTIONS = [
  "What can Testwright do today versus on the roadmap?",
  "What makes a Playwright locator resilient?",
  "How is Testwright different from testRigor or Katalon?",
  "Take me to the Author stage.",
];
