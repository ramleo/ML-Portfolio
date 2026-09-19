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
    analog: "Plain-English & recorded authoring",
  },
  {
    key: "run",
    label: "Run",
    href: "/qa/run",
    status: "live",
    statusLabel: "Live",
    blurb: "Execute against a live site on an isolated CI runner — pass/fail, a summary, video, trace and a step timeline. When a locator breaks, self-heal it from the page snapshot and re-run.",
    analog: "Cloud execution, artifacts & self-healing",
  },
  {
    key: "discover",
    label: "Discover",
    href: "/qa/discover",
    status: "live",
    statusLabel: "Live",
    blurb: "Give a URL → it renders the page, reads the accessibility snapshot, and proposes candidate test cases → pick some → it drafts each to send to Run.",
    analog: "Automated test discovery",
  },
  {
    key: "heal",
    label: "Heal",
    href: "/qa/heal",
    status: "live",
    statusLabel: "Live",
    blurb: "Run your saved tests as a suite, group the failures by root cause — \"1 issue · N tests\" — and self-heal each group in one click.",
    analog: "Root-cause failure grouping",
  },
];

export const STATUS_COLOR: Record<StageStatus, string> = {
  live: "#34d399",
  next: "#f59e0b",
  planned: "#94a3b8",
};
