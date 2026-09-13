"use client";
import { useMemo, useState } from "react";
import PlotlyFigure from "./PlotlyFigure";
import EdaSection from "./EdaSection";
import { useIsLight } from "./usePlotly";
import { baseLayout, SERIES, theme } from "./plotlyTheme";
import type { ColumnStats, Distribution, EdaResult } from "./edaTypes";

/** One distribution.
 *
 *  A numeric column is drawn from its sampled raw values when they exist, so
 *  the bin edges are Plotly's own and the hover shows real ranges. The
 *  server's pre-binned counts are the fallback for a column whose sample did
 *  not come back — never a reason to draw nothing.
 */
function traceFor(dist: Distribution, stats: ColumnStats | undefined) {
  if (dist.type === "bar") {
    return [{
      type: "bar", x: dist.labels, y: dist.counts,
      marker: { color: SERIES.category, opacity: 0.82 },
      hovertemplate: "%{x}: %{y}<extra></extra>",
    }];
  }
  if (stats?.raw_vals?.length) {
    return [{
      type: "histogram", x: stats.raw_vals, autobinx: true,
      marker: { color: SERIES.numeric, opacity: 0.82, line: { color: "rgba(52,211,153,0.35)", width: 0.5 } },
      hovertemplate: "%{x}: %{y}<extra></extra>",
    }];
  }
  return [{
    type: "bar", x: dist.bins, y: dist.counts,
    marker: { color: SERIES.numeric, opacity: 0.82 },
    hovertemplate: "%{x}: %{y}<extra></extra>",
  }];
}

export default function EdaDistributions({ result }: { result: EdaResult }) {
  const light = useIsLight();
  const t = useMemo(() => theme(light), [light]);
  const layout = useMemo(() => baseLayout(t, { margin: { l: 42, r: 12, t: 8, b: 40 } }), [t]);

  const entries = Object.entries(result.distributions);
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? entries : entries.slice(0, 6);

  return (
    <EdaSection
      id="distributions"
      testId="eda-distributions"
      title="Distributions"
      icon="chart"
      note="Numeric columns are histograms over the sampled values; text columns show their ten most common values. Hover for exact counts."
      empty={entries.length === 0
        ? "No column had enough values to chart. A distribution needs at least a handful of non-empty rows."
        : undefined}
      right={entries.length > 6 ? (
        <button
          onClick={() => setShowAll((v) => !v)}
          style={{
            background: "none", border: "1px solid var(--border)", borderRadius: 8,
            padding: "0.3rem 0.7rem", cursor: "pointer", color: "var(--text2)", fontSize: "0.75rem",
          }}
        >
          {showAll ? "Show fewer" : `Show all ${entries.length}`}
        </button>
      ) : undefined}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
        {visible.map(([name, dist]) => (
          <div key={name} style={{ minWidth: 0 }}>
            <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>
              {name}
              <span style={{ fontWeight: 400, color: "var(--text3)", marginLeft: 6 }}>
                {dist.type === "histogram" ? "histogram" : "top values"}
              </span>
            </div>
            <PlotlyFigure
              traces={traceFor(dist, result.stats[name])}
              layout={layout}
              height={220}
              label={`Distribution of ${name}`}
            />
          </div>
        ))}
      </div>
    </EdaSection>
  );
}
