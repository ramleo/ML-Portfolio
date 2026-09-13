/** One layout base for every chart on the page, in both themes.
 *
 *  Plotly does not read CSS custom properties, so the card's colours have to
 *  be restated here as literals. They are kept deliberately few — a text
 *  colour, a grid colour, and transparent paper so the card behind shows
 *  through — rather than a full duplicate of the site palette that would
 *  drift from it silently.
 */
export type Theme = { text: string; grid: string; zero: string; light: boolean };

export function theme(light: boolean): Theme {
  return light
    ? { text: "#334155", grid: "rgba(15,23,42,0.10)", zero: "rgba(15,23,42,0.18)", light }
    : { text: "#cbd5e1", grid: "rgba(255,255,255,0.08)", zero: "rgba(255,255,255,0.14)", light };
}

/** Series colours. Numeric distributions, categorical distributions and
 *  scatter marks each get their own so a glance at a chart says which kind it
 *  is without reading the title. */
export const SERIES = {
  numeric: "#34d399",
  category: "#a78bfa",
  scatter: "#38bdf8",
};

export function baseLayout(t: Theme, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    font: { color: t.text, size: 10 },
    showlegend: false,
    margin: { l: 46, r: 14, t: 12, b: 46 },
    bargap: 0.04,
    xaxis: { gridcolor: t.grid, zerolinecolor: t.zero, tickfont: { size: 9 } },
    yaxis: { gridcolor: t.grid, zerolinecolor: t.zero, tickfont: { size: 9 } },
    hoverlabel: { font: { size: 11 } },
    ...extra,
  };
}

/** No mode bar clutter, no Plotly logo, and responsive so a chart reflows
 *  with its card instead of keeping the width it was born at. */
export const CONFIG = {
  responsive: true,
  displaylogo: false,
  modeBarButtonsToRemove: ["lasso2d", "select2d", "sendDataToCloud"],
};

/** Plotly renders a null heatmap cell at the middle of the colour scale,
 *  which for a correlation matrix reads as "no relationship" when the truth
 *  is "could not be computed". Painting those cells with an explicit
 *  annotation is how the distinction survives into the Plotly version — the
 *  hand-drawn heatmap it replaces used a dashed hollow square for the same
 *  reason. */
export function nullCells(labels: string[], matrix: (number | null)[][], t: Theme) {
  const marks: Record<string, unknown>[] = [];
  matrix.forEach((row, i) =>
    row.forEach((v, j) => {
      if (v === null) {
        marks.push({
          x: labels[j], y: labels[i], text: "n/a", showarrow: false,
          font: { size: 8, color: t.text }, opacity: 0.75,
        });
      }
    }));
  return marks;
}
