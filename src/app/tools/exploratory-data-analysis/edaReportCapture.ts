import { SERIES } from "./plotlyTheme";
import { palette, type ReportTheme } from "./reportTheme";
import type { EdaResult } from "./edaTypes";

/**
 * Rasterising every chart for the downloadable report.
 *
 * Each chart is drawn fresh into a hidden, fixed-size element rather than
 * photographed off the page. Charts on the page are responsive and sized by
 * their card, so their pixel dimensions depend on the reader's window — a
 * report captured from them would be a different document on a laptop than on
 * a monitor. A fixed offscreen render makes the output reproducible, and it
 * captures charts the reader never scrolled to.
 *
 * The palette comes from the theme the reader picked at download, not from
 * the site's current theme, and it is the same palette the surrounding page
 * uses — see reportTheme.ts.
 */
function paperLayout(theme: ReportTheme) {
  const c = palette(theme);
  return {
    paper_bgcolor: c.panel,
    plot_bgcolor: c.panel,
    font: { color: c.ink, size: 10 },
    showlegend: false,
    margin: { l: 46, r: 14, t: 12, b: 48 },
    bargap: 0.04,
    xaxis: { gridcolor: c.grid, zerolinecolor: c.grid, tickfont: { size: 9 } },
    yaxis: { gridcolor: c.grid, zerolinecolor: c.grid, tickfont: { size: 9 } },
  };
}

export type Captured = {
  distributions: { name: string; png: string }[];
  box: string | null;
  correlations: string | null;
  mi: string | null;
  splom: string | null;
  pca: string | null;
};

async function shot(traces: unknown[], layout: Record<string, unknown>, w: number, h: number): Promise<string | null> {
  const plotly = window.Plotly;
  if (!plotly) return null;
  const el = document.createElement("div");
  el.style.cssText = `position:fixed;left:-9999px;top:0;width:${w}px;height:${h}px;visibility:hidden;`;
  document.body.appendChild(el);
  try {
    await plotly.newPlot(el, traces, { ...layout, width: w, height: h },
                         { staticPlot: true, responsive: false });
    return await plotly.toImage(el, { format: "png", scale: 2, width: w, height: h });
  } catch {
    // One chart that will not rasterise must not cost the reader the report.
    return null;
  } finally {
    try { plotly.purge(el); } catch { /* already gone */ }
    el.remove();
  }
}

function heat(z: unknown[][], labels: string[], scale: string, diverging: boolean) {
  return [{
    type: "heatmap", z, x: labels, y: labels, colorscale: scale,
    ...(diverging ? { zmid: 0, zmin: -1, zmax: 1 } : { zmin: 0, zmax: 1 }),
    showscale: true, colorbar: { thickness: 10, len: 0.7, tickfont: { size: 9 } },
    text: z.map((r) => r.map((v) => (v === null ? "" : Number(v).toFixed(2)))),
    texttemplate: "%{text}", textfont: { size: 8 },
  }];
}

function heatLayout(theme: ReportTheme) {
  return {
    ...paperLayout(theme),
    margin: { l: 100, r: 60, t: 18, b: 118 },
    xaxis: { tickangle: -45, tickfont: { size: 9 }, gridcolor: "transparent" },
    yaxis: { tickfont: { size: 9 }, gridcolor: "transparent", autorange: "reversed" },
  };
}

/** `onStep` drives the progress readout. Fourteen charts at two-times scale
 *  is several seconds of work, and a button that just sits there for that
 *  long reads as broken. */
export async function captureAll(
  result: EdaResult,
  theme: ReportTheme,
  onStep: (done: number, total: number) => void,
): Promise<Captured> {
  const c = palette(theme);
  const PAPER = paperLayout(theme);
  const HEAT_LAYOUT = heatLayout(theme);
  const distEntries = Object.entries(result.distributions);
  const boxCols = Object.keys(result.stats).filter((c) => result.stats[c].raw_vals?.length);
  const total = distEntries.length + 4 + (result.pca ? 1 : 0);
  let done = 0;
  const step = <T,>(v: T): T => { onStep(++done, total); return v; };

  const distributions: { name: string; png: string }[] = [];
  for (const [name, dist] of distEntries) {
    const raw = result.stats[name]?.raw_vals;
    const traces = dist.type === "histogram" && raw?.length
      ? [{ type: "histogram", x: raw, autobinx: true, marker: { color: SERIES.numeric, opacity: 0.85 } }]
      : [{ type: "bar",
           x: dist.type === "bar" ? dist.labels : dist.bins,
           y: dist.counts,
           marker: { color: dist.type === "bar" ? SERIES.category : SERIES.numeric, opacity: 0.85 } }];
    const png = step(await shot(traces, PAPER, 700, 280));
    if (png) distributions.push({ name, png });
  }

  const box = step(boxCols.length
    ? await shot(
        boxCols.map((col) => ({
          type: "box", name: col, y: result.stats[col].raw_vals, boxpoints: "outliers",
          marker: { color: SERIES.numeric, size: 3, opacity: 0.7 },
          line: { color: SERIES.numeric, width: 1.4 },
          fillcolor: "rgba(52,211,153,0.14)",
        })),
        { ...PAPER, margin: { l: 54, r: 20, t: 12, b: 92 },
          xaxis: { tickangle: -35, tickfont: { size: 9 }, gridcolor: c.grid } },
        900, 400)
    : null);

  const correlations = step(result.correlations
    ? await shot(heat(result.correlations.matrix, result.correlations.labels, "RdBu", true),
                 HEAT_LAYOUT, 800, 750)
    : null);

  const mi = step(result.mi
    ? await shot(heat(result.mi.matrix, result.mi.labels, "Viridis", false), HEAT_LAYOUT, 800, 750)
    : null);

  const splom = step(result.splom
    ? await shot(
        [{ type: "splom",
           dimensions: result.splom.cols.map((c) => ({ label: c, values: result.splom!.data[c] })),
           showupperhalf: false, diagonal: { visible: false },
           marker: { size: 3, color: SERIES.scatter, opacity: 0.6, line: { width: 0 } } }],
        { ...PAPER, margin: { l: 60, r: 20, t: 12, b: 60 } }, 900, 900)
    : null);

  // A still of a rotatable chart is a fixed viewpoint, so the report says so
  // in its caption rather than implying the reader saw all of it.
  const pca = result.pca
    ? step(await shot(
        [{ type: "scatter3d", mode: "markers",
           x: result.pca.coords.map((c) => c[0]),
           y: result.pca.coords.map((c) => c[1]),
           z: result.pca.coords.map((c) => c[2]),
           marker: { size: 3, opacity: 0.8, color: SERIES.scatter } }],
        { ...PAPER, margin: { l: 0, r: 0, t: 0, b: 0 },
          scene: { xaxis: { title: { text: "PC1" }, gridcolor: c.grid },
                   yaxis: { title: { text: "PC2" }, gridcolor: c.grid },
                   zaxis: { title: { text: "PC3" }, gridcolor: c.grid },
                   bgcolor: c.panel } },
        760, 620))
    : null;

  return { distributions, box, correlations, mi, splom, pca };
}
