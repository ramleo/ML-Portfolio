import capabilities from "./capabilities";

/**
 * The four groups the toolkit divides into, and the one place their order,
 * colour, URL slug and blurb are decided.
 *
 * Why this file exists rather than living in the component: the home page,
 * the four domain pages and the domain route's static-params generation all
 * need the same list, and capabilities.ts — the natural other home for it —
 * is a 943-line data file already pinned in the CI length baseline.
 *
 * A domain's `name` must match the `domain` string on the capabilities that
 * belong to it exactly. Nothing enforces that at build time, so `allDomains()`
 * exists as the safety net: a tool given a `domain` string that isn't listed
 * here still gets a section and a page rather than silently disappearing from
 * the site — the one failure mode that would be invisible in review.
 */
export type Domain = {
  slug: string;
  name: string;
  blurb: string;
  /** Edge and accent colour on the dark theme. */
  color: string;
  /**
   * The same hue darkened for the light theme. Two explicit values rather than
   * one colour mixed at render time: the four hues were chosen against a dark
   * ground and read at 1.7-4:1 on the light theme's near-white, under the 3:1
   * a UI component boundary needs. Deriving the darker one in CSS was tried
   * with color-mix() and abandoned — the build's CSS transform rewrote the
   * function and the computed colour matched neither the intended mix nor the
   * fallback, so the value that shipped could not be predicted from the source.
   * Both values here are measured: every one clears 3:1 on its own ground.
   */
  colorLight: string;
  /** Resting edge on the dark theme — the hue at half strength over the page. */
  colorDim: string;
  /** Resting edge on the light theme. */
  colorDimLight: string;
};

const domains: Domain[] = [
  {
    slug: "ml-pipeline",
    name: "ML Pipeline",
    blurb: "Everything between a raw CSV and a trained, explained model — cleaning, feature work, tuning, comparison and drift.",
    color: "#34d399",
    colorLight: "#047857",
    colorDim: "#1f715c",
    colorDimLight: "#6eb09f",
  },
  {
    slug: "language-documents",
    name: "Language & Documents",
    blurb: "Reading and reasoning over text: questions answered from your own files, plain English turned into SQL.",
    color: "#6366f1",
    colorLight: "#4338ca",
    colorDim: "#363a88",
    colorDimLight: "#918ddf",
  },
  {
    slug: "computer-vision",
    name: "Computer Vision",
    blurb: "Tools that look at an image or a video — detection, depth, pose, re-identification and generation.",
    color: "#38bdf8",
    colorLight: "#0369a1",
    colorDim: "#21668b",
    colorDimLight: "#6ea8c8",
  },
  {
    slug: "security-trust",
    name: "Security & Trust",
    blurb: "Checking whether something can be trusted: files, links, emails, packages, models and the people behind them.",
    color: "#f43f5e",
    colorLight: "#be123c",
    colorDim: "#7f273e",
    colorDimLight: "#d47891",
  },
  {
    slug: "developer-tools",
    name: "Developer Tools",
    blurb: "Tools for building and testing software itself — starting with plain-English test authoring for the browser.",
    // Amber, chosen apart from the four hues above. #b45309 (amber-700) clears
    // 3:1 on the light theme's near-white; #f59e0b reads on the dark ground.
    color: "#f59e0b",
    colorLight: "#b45309",
    colorDim: "#7a5a1e",
    colorDimLight: "#c9945a",
  },
];

const FALLBACK_COLOR = "#94a3b8";
const FALLBACK_COLOR_LIGHT = "#475569";

/**
 * The listed domains, plus a generated entry for any `domain` string found on
 * a capability that this file doesn't know about. Use this, not the default
 * export, anywhere that renders "all the groups" — the default export is the
 * curated order and copy, this is the guarantee that nothing is dropped.
 */
export function allDomains(): Domain[] {
  const known = new Set(domains.map((d) => d.name));
  const extras = [...new Set(capabilities.map((c) => c.domain))]
    .filter((name) => !known.has(name))
    .map<Domain>((name) => ({
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      name,
      blurb: "",
      color: FALLBACK_COLOR,
      colorLight: FALLBACK_COLOR_LIGHT,
      colorDim: FALLBACK_COLOR,
      colorDimLight: FALLBACK_COLOR_LIGHT,
    }));
  return [...domains, ...extras];
}

export function countFor(domain: Domain): number {
  return capabilities.filter((c) => c.domain === domain.name).length;
}

export function domainBySlug(slug: string): Domain | undefined {
  return allDomains().find((d) => d.slug === slug);
}

export default domains;
