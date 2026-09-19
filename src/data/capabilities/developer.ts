/** Developer Tools cards.
 *
 *  A new domain, added for the QA Test Author (the AI test-automation tool).
 *  This is dev/QA tooling, deliberately kept out of the Security & Trust suite —
 *  see docs/QA_AUTOMATION_AND_LOGGING_PLAN.md. Order within the domain is the
 *  render order on the domain page.
 */
import { FlaskConical } from "lucide-react";

import { GITHUB, type Capability } from "./_types";

const developerTools: Capability[] = [
  {
    id: "qa-test-author",
    domain: "Developer Tools",
    title: "QA Test Author",
    subtitle: "Plain English to Playwright",
    description:
      "Describe a browser test in plain English and get a complete, runnable Playwright test in TypeScript. A free LLM turns your steps into a test that uses resilient locators — accessible role and name, label, visible text — instead of brittle CSS or positional selectors, with a short comment on each choice and real assertions at the end. This phase generates the test only; it does not run anything, so there is nothing to execute against your site yet. Copy the code straight into a Playwright project.",
    accent: "#c47d1a",
    icon: FlaskConical,
    stat: "TS",
    statLabel: "Playwright",
    model: "Cohere / Mistral (free) · Playwright",
    input: "Plain-English test steps",
    tags: ["QA", "Playwright", "TypeScript", "Test Generation", "Free LLM"],
    link: "/tools/qa-test-author",
    github: GITHUB,
    internalLink: "/tools/qa-test-author",
  },
];

export default developerTools;
