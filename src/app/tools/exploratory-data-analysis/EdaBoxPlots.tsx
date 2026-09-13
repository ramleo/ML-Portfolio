"use client";
import { useMemo, useState } from "react";
import PlotlyFigure from "./PlotlyFigure";
import EdaSection from "./EdaSection";
import { useIsLight } from "./usePlotly";
import { baseLayout, SERIES, theme } from "./plotlyTheme";
import type { EdaResult } from "./edaTypes";

/**
 * Box plots over the sampled values of every numeric column.
 *
 * One box per panel, each with its own axis, rather than every column on a
 * shared scale. On a real dataset the shared version is close to useless: a
 * revenue column in the thousands sets the axis and every other box collapses
 * to a line on the floor. The legacy Explorer draws it that way and this is
 * the one chart where its picture is actively misleading.
 *
 * The columns table already reports an outlier count. A count says how many;
 * the box says how far out they sit and which side they fall on, which is the
 * difference between a few typos and a genuinely long tail.
 */
export default function EdaBoxPlots({ result }: { result: EdaResult }) {
  const light = useIsLight();
  const t = useMemo(() => theme(light), [light]);
  const [showAll, setShowAll] = useState(false);

  const cols = useMemo(
    () => Object.keys(result.stats).filter((c) => result.stats[c].raw_vals?.length),
    [result.stats],
  );

  const layout = useMemo(() => baseLayout(t, {
    margin: { l: 52, r: 12, t: 8, b: 24 },
    xaxis: { showticklabels: false, gridcolor: "transparent", zerolinecolor: "transparent" },
    yaxis: { gridcolor: t.grid, zerolinecolor: t.zero, tickfont: { size: 9 } },
  }), [t]);

  const visible = showAll ? cols : cols.slice(0, 6);

  return (
    <EdaSection
      id="box-plots"
      testId="eda-box"
      title="Spread and outliers"
      icon="box"
      note="Each box covers the middle half of the values, the whiskers reach 1.5× the interquartile range, and every dot beyond them is an outlier. Each column has its own axis — a shared one would flatten every small-magnitude column against the largest. Drawn from the server's sample, at most 300 values per column."
      empty={cols.length === 0
        ? "No numeric column came back with sampled values, so there is nothing to box. Text columns have no spread to draw."
        : undefined}
      right={cols.length > 6 ? (
        <button
          onClick={() => setShowAll((v) => !v)}
          style={{
            background: "none", border: "1px solid var(--border)", borderRadius: 8,
            padding: "0.3rem 0.7rem", cursor: "pointer", color: "var(--text2)", fontSize: "0.75rem",
          }}
        >
          {showAll ? "Show fewer" : `Show all ${cols.length}`}
        </button>
      ) : undefined}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
        {visible.map((col) => {
          const s = result.stats[col];
          return (
            <div key={col} style={{ minWidth: 0 }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>
                {col}
                <span style={{ fontWeight: 400, color: "var(--text3)", marginLeft: 6 }}>
                  {s.outliers} outlier{s.outliers === 1 ? "" : "s"}
                </span>
              </div>
              <PlotlyFigure
                traces={[{
                  type: "box", name: col, y: s.raw_vals, boxpoints: "outliers",
                  marker: { color: SERIES.numeric, size: 3, opacity: 0.7 },
                  line: { color: SERIES.numeric, width: 1.4 },
                  fillcolor: "rgba(52,211,153,0.12)",
                  hovertemplate: "%{y}<extra></extra>",
                }]}
                layout={layout}
                height={260}
                label={`Spread of ${col}`}
              />
            </div>
          );
        })}
      </div>
    </EdaSection>
  );
}
