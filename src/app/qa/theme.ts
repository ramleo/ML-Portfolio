/** Testwright world — shared signature colors and the four-stage definition.
 *  One source of truth for the in-world nav, the landing and the stage pages. */

export const QA_ACCENT = "#14b8a6";   // teal — solid accent, reads on both themes
export const QA_ACCENT2 = "#22d3ee";  // cyan — gradient partner

export type StageStatus = "live" | "next" | "planned";

export type Stage = {
  key: string;
  label: string;
  href: string;
  status: StageStatus;
  statusLabel: string;
  blurb: string;
  analog: string;
};

export const STAGES: Stage[] = [
  {
    key: "author",
    label: "Author",
    href: "/qa/author",
    status: "live",
    statusLabel: "Live",
    blurb: "Plain English, a recorded click-through, or an imported case → a Playwright TS test with resilient locators and real assertions.",
    analog: "≈ testRigor plain-English · Katalon Studio",
  },
  {
    key: "run",
    label: "Run",
    href: "/qa/run",
    status: "next",
    statusLabel: "Phase 2",
    blurb: "Execute against our own site in a bounded, sandboxed runner. Pass/fail, screenshots, video and a trace for every run.",
    analog: "≈ Katalon TestCloud / TestOps",
  },
  {
    key: "discover",
    label: "Discover",
    href: "/qa/discover",
    status: "planned",
    statusLabel: "Phase 3",
    blurb: "Give an own-site URL → a bounded crawl proposes candidate test cases → you confirm the list → it generates and runs them.",
    analog: "≈ testRigor auto-discovery",
  },
  {
    key: "heal",
    label: "Heal",
    href: "/qa/heal",
    status: "planned",
    statusLabel: "Phase 5",
    blurb: "When many tests fail on one broken thing, group them by root cause — \"1 issue, 12 tests\" — and fix all in one click, or one by one.",
    analog: "≈ testRigor grouping · self-healing",
  },
];

export const STATUS_COLOR: Record<StageStatus, string> = {
  live: "#34d399",
  next: "#f59e0b",
  planned: "#94a3b8",
};
