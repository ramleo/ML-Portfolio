import type { Captured } from "./edaReportCapture";
import type { EdaResult, Sample } from "./edaTypes";

/**
 * The report as one self-contained HTML document.
 *
 * Charts are embedded as data URIs rather than linked, so the file works from
 * a Downloads folder with no network and no companion assets — that is the
 * whole point of a report you can email. It is also the source the PDF is
 * typeset from, so the two formats can never disagree about the numbers.
 */
const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

/** "—", never "null" and never "0". A statistic that does not exist and a
 *  statistic that is zero are different facts, and the legacy report printed
 *  the literal word "null" for the first. */
const num = (v: number | null | undefined, d = 2) =>
  v === null || v === undefined ? "—" : Number(v).toFixed(d);

function table(head: string[], rows: string[][]): string {
  return `<div class="scroll"><table><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>`
    + `<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

function sampleTable(s: Sample): string {
  return table(s.columns, s.rows.map((r) =>
    r.map((v) => (v === null || v === "" ? '<span class="dash">—</span>' : esc(v)))));
}

function figure(png: string | null, caption: string): string {
  if (!png) return "";
  return `<figure><img src="${png}" alt="${esc(caption)}"><figcaption>${esc(caption)}</figcaption></figure>`;
}

export const REPORT_CSS = `
:root { color-scheme: light; }
* { box-sizing: border-box; }
body { margin: 0; background: #f8fafc; color: #1e293b;
  font: 14px/1.6 ui-sans-serif, -apple-system, "Segoe UI", Roboto, sans-serif; }
.page { max-width: 900px; margin: 0 auto; padding: 2.5rem 1.5rem 4rem; }
h1 { font-size: 1.6rem; margin: 0 0 0.3rem; }
h2 { font-size: 0.72rem; letter-spacing: 0.08em; text-transform: uppercase;
  color: #64748b; margin: 2.2rem 0 0.6rem; border-top: 1px solid #e2e8f0; padding-top: 1.1rem; }
.meta { color: #64748b; font-size: 0.82rem; margin: 0 0 1.6rem; }
.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 0.6rem; }
.card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 0.7rem 0.85rem; min-width: 0; }
.card .k { font-size: 0.6rem; letter-spacing: 0.08em; text-transform: uppercase; color: #64748b; }
.card .v { font-size: 1.35rem; font-weight: 700; font-variant-numeric: tabular-nums; }
p.narrative { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 0.9rem 1rem; }
ul { margin: 0; padding-left: 1.1rem; }
li { margin: 0.2rem 0; }
li.danger::marker { color: #dc2626; } li.warning::marker { color: #d97706; } li.info::marker { color: #2563eb; }
.scroll { overflow-x: auto; }
table { border-collapse: collapse; width: 100%; font-size: 0.78rem; background: #fff; }
th, td { border: 1px solid #e2e8f0; padding: 0.35rem 0.55rem; text-align: left; white-space: nowrap;
  font-variant-numeric: tabular-nums; }
th { background: #f1f5f9; font-size: 0.62rem; letter-spacing: 0.06em; text-transform: uppercase; color: #475569; }
.dash { color: #94a3b8; font-style: italic; }
.pass { color: #16a34a; } .warn { color: #d97706; } .fail { color: #dc2626; }
figure { margin: 1rem 0; page-break-inside: avoid; break-inside: avoid; }
img { max-width: 100%; height: auto; display: block; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; }
figcaption { font-size: 0.72rem; color: #64748b; margin-top: 0.35rem; }
.grid2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1rem; }
@media print { body { background: #fff; } .page { padding: 0; max-width: none; } h2 { break-after: avoid; } }
`;

export function buildReportHtml(result: EdaResult, filename: string, shots: Captured): string {
  const o = result.overview;
  const dup = result.duplicate_rows;

  const cards = [
    ["Rows", o.rows.toLocaleString()], ["Columns", String(o.cols)],
    ["Duplicates", o.duplicates.toLocaleString()], ["Missing", `${num(o.missing_pct, 1)}%`],
    ["Quality", `${result.quality_score}/100`],
  ].map(([k, v]) => `<div class="card"><div class="k">${k}</div><div class="v">${v}</div></div>`).join("");

  const columnRows = result.columns.map((c) => {
    const s = result.stats[c.name];
    const r = result.readiness.find((x) => x.name === c.name);
    return [
      esc(c.name), c.is_numeric ? "numeric" : esc(c.dtype),
      `${c.missing} (${num(c.missing_pct, 1)}%)`, c.nunique.toLocaleString(),
      num(s?.mean), num(s?.median), num(s?.std), num(s?.min), num(s?.max),
      s ? String(s.outliers) : "—", num(s?.skew), num(s?.kurtosis),
      r ? `<span class="${r.verdict}">${r.verdict}</span>` : "—",
    ];
  });

  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(filename)} — EDA report</title><style>${REPORT_CSS}</style></head><body><div class="page">
<h1>Exploratory data analysis</h1>
<p class="meta">${esc(filename)} · generated ${new Date().toLocaleString()} · analysed in memory, never stored</p>
<div class="cards">${cards}</div>

<h2>Analyst summary</h2><p class="narrative">${esc(result.narrative)}</p>

${result.insights.length ? `<h2>What stands out</h2><ul>${result.insights
  .map((i) => `<li class="${i.type}">${esc(i.text)}</li>`).join("")}</ul>` : ""}

<h2>Modelling readiness</h2>
${table(["Column", "Verdict", "Reason"], result.readiness.map((r) =>
  [esc(r.name), `<span class="${r.verdict}">${r.verdict}</span>`, esc(r.reason)]))}

<h2>First rows</h2>${sampleTable(result.sample)}
${dup && dup.rows.length
  ? `<h2>Duplicate rows</h2><p class="meta">${o.duplicates.toLocaleString()} exact repeats found.</p>${sampleTable(dup)}`
  : ""}

<h2>Columns</h2>
${table(["Column", "Type", "Missing", "Unique", "Mean", "Median", "Std", "Min", "Max", "Outliers", "Skew", "Kurtosis", "Ready"], columnRows)}

${shots.distributions.length ? `<h2>Distributions</h2><div class="grid2">${shots.distributions
  .map((d) => figure(d.png, d.name)).join("")}</div>` : ""}

${shots.box ? `<h2>Spread and outliers</h2>${figure(shots.box, "Box plots — middle half, 1.5× IQR whiskers, outliers as dots")}` : ""}
${shots.mi ? `<h2>Mutual information</h2>${figure(shots.mi, "Normalised mutual information, 0 to 1")}` : ""}
${shots.splom ? `<h2>Scatter matrix</h2>${figure(shots.splom, `Numeric pairs over ${result.splom?.n ?? 0} sampled rows`)}` : ""}
${shots.pca ? `<h2>3D projection</h2>${figure(shots.pca, `Principal components, one fixed viewpoint of a rotatable chart — ${Math.round((result.pca?.explained_variance ?? []).reduce((a, b) => a + b, 0))}% of the variation`)}` : ""}
${shots.correlations ? `<h2>Correlations</h2>${figure(shots.correlations, "Pearson correlation; blank cells could not be computed, which is not zero")}` : ""}
</div></body></html>`;
}
