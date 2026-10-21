/** Shared formatting + the eval-section design tokens. One place so every panel
 * reads the same. Content-free throughout — these only shape numbers already in
 * the payloads. */

export const n = (x: number) => x.toLocaleString();
export const usd = (x: number) => (x === 0 ? "$0" : x < 0.01 ? `$${x.toFixed(4)}` : `$${x.toFixed(2)}`);
export const ms = (x: number | null) => (x == null ? "—" : x >= 1000 ? `${(x / 1000).toFixed(1)}s` : `${Math.round(x)}ms`);
export const pct = (x: number | null) => (x == null ? "—" : `${(x * 100).toFixed(1)}%`);
export const pct0 = (x: number | null) => (x == null ? "—" : `${Math.round(x * 100)}%`);
/** "2026-10-21T17:25…" → "2026-10-21 17:25" */
export const when = (ts: string | null) => (ts ? ts.slice(0, 16).replace("T", " ") : "—");
/** "2026-10-21" → "10-21" */
export const mmdd = (d: string | undefined) => (d ? d.slice(5) : "");

/** Data-mark colors — eval-scoped CSS vars (see EVAL_TOKENS_CSS), independent of
 * the user-selectable brand accent so charts stay consistent and validated. */
export const C = {
  s1: "var(--ev-1)", s2: "var(--ev-2)", s3: "var(--ev-3)", s4: "var(--ev-4)", s5: "var(--ev-5)",
  err: "var(--ev-err)", warn: "var(--ev-warn)", good: "var(--ev-good)",
  grid: "var(--ev-grid)", axis: "var(--ev-axis)", track: "var(--ev-track)",
  text: "var(--text)", text2: "var(--text2)", text3: "var(--text3)",
} as const;

/** Primary magnitude hue for single-series charts (ok calls, cost, cache, …). */
export const PRIMARY = C.s1;
export const SERIES = [C.s1, C.s2, C.s3, C.s4, C.s5];

/** Stable color per entity (model/provider) — index into a sorted name list so a
 * given name keeps its hue regardless of how many series are shown. */
export function seriesColor(name: string, allSorted: string[]) {
  const i = allSorted.indexOf(name);
  return SERIES[(i < 0 ? 0 : i) % SERIES.length];
}

/** Round a max up to a clean tick value so the y-axis reads well. */
export function niceMax(v: number): number {
  if (v <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const r = v / mag;
  const step = r <= 1 ? 1 : r <= 2 ? 2 : r <= 5 ? 5 : 10;
  return step * mag;
}

/** The eval-section data palette — validated (dataviz skill) against both the dark
 * (#0a0f1e, the site default) and light (#f0f4f8, html.light) surfaces, with its own
 * dark steps (not a flipped light set). Keyed off the site's own theme mechanism
 * (default dark; `html.light` for light), NOT prefers-color-scheme. Injected once at
 * the dashboard root. */
export const EVAL_TOKENS_CSS = `
.eval-root{
  --ev-1:#3987e5;--ev-2:#d95926;--ev-3:#199e70;--ev-4:#c98500;--ev-5:#d55181;
  --ev-err:#e66767;--ev-warn:#e0a400;--ev-good:#3bbf63;
  --ev-grid:var(--border);--ev-axis:var(--border2);--ev-track:var(--bg);
}
html.light .eval-root{
  --ev-1:#2a78d6;--ev-2:#eb6834;--ev-3:#1baf7a;--ev-4:#eda100;--ev-5:#e87ba4;
  --ev-err:#d64545;--ev-warn:#c77d00;--ev-good:#1a8f3c;
}
@media (prefers-reduced-motion:no-preference){
  .eval-root .ev-grow{transform-origin:left center;animation:evGrow .5s cubic-bezier(.22,1,.36,1) both}
  .eval-root .ev-rise{animation:evRise .5s cubic-bezier(.22,1,.36,1) both}
  .eval-root .ev-draw{animation:evDraw .7s ease both}
}
@keyframes evGrow{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes evRise{from{transform:scaleY(0)}to{transform:scaleY(1)}}
@keyframes evDraw{from{stroke-dashoffset:var(--len,1000)}to{stroke-dashoffset:0}}
`;
