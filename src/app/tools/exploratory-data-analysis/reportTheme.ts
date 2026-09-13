/** The downloadable report's palette, in both themes.
 *
 * One source for three consumers that must agree: the standalone HTML's
 * stylesheet, the Plotly charts rasterised into it, and the Paged.js pass that
 * typesets the PDF. When those drifted, a chart's own background did not match
 * the page it was pasted onto and the seam showed.
 *
 * Light is the default and stays the default. It is the one that prints:
 * browsers drop background colours from a print job unless the reader ticks
 * "Background graphics", so a dark report reaches paper as pale text on white.
 * Dark exists because the reader asked for a report matching the site they
 * were looking at, which is reasonable for a file that is read on screen and
 * shared, and never printed.
 */
export type ReportTheme = "light" | "dark";

export type ReportPalette = {
  /** The page behind everything. */
  paper: string;
  /** Cards, tables and the chart plotting area, which sit above the page. */
  panel: string;
  ink: string;
  muted: string;
  border: string;
  /** Table header fill and its text. */
  head: string;
  headInk: string;
  /** An absent value, rendered as an em dash rather than a zero. */
  dash: string;
  /** Chart gridlines. */
  grid: string;
  pass: string;
  warn: string;
  fail: string;
  info: string;
};

const LIGHT: ReportPalette = {
  paper: "#f8fafc", panel: "#ffffff", ink: "#1e293b", muted: "#64748b",
  border: "#e2e8f0", head: "#f1f5f9", headInk: "#475569", dash: "#94a3b8",
  grid: "rgba(15,23,42,0.10)",
  pass: "#16a34a", warn: "#d97706", fail: "#dc2626", info: "#2563eb",
};

// Not an inversion of the light values: the greens and reds are lifted so they
// stay legible on a dark ground, where #16a34a reads as almost black.
const DARK: ReportPalette = {
  paper: "#0b1220", panel: "#131c2e", ink: "#e2e8f0", muted: "#94a3b8",
  border: "#24314a", head: "#1a2537", headInk: "#cbd5e1", dash: "#64748b",
  grid: "rgba(255,255,255,0.10)",
  pass: "#4ade80", warn: "#fbbf24", fail: "#f87171", info: "#60a5fa",
};

export function palette(theme: ReportTheme): ReportPalette {
  return theme === "dark" ? DARK : LIGHT;
}
