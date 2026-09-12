"use client";
import { useState } from "react";
import type { Distribution, EdaResult } from "./edaTypes";

const card: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "1rem 1.15rem",
};

/** Bars are drawn as SVG rather than divs so the whole chart scales with the
 *  container and prints correctly, and so the axis labels sit on a shared
 *  baseline instead of wherever line-height puts them. */
function Bars({ counts, labels }: { counts: number[]; labels: string[] }) {
  const max = Math.max(...counts, 1);
  const W = 320;
  const H = 96;
  const gap = 2;
  const bw = Math.max(1, (W - gap * (counts.length - 1)) / counts.length);

  return (
    <svg viewBox={`0 0 ${W} ${H + 16}`} role="img"
         aria-label={`Distribution across ${counts.length} groups, tallest ${max}`}
         style={{ width: "100%", height: "auto", display: "block" }}>
      {counts.map((c, i) => {
        const h = (c / max) * H;
        return (
          <rect key={i} x={i * (bw + gap)} y={H - h} width={bw} height={Math.max(h, 0.5)}
                rx={1} fill="currentColor" opacity={0.55}>
            <title>{`${labels[i] ?? i}: ${c}`}</title>
          </rect>
        );
      })}
      <line x1={0} y1={H} x2={W} y2={H} stroke="currentColor" strokeWidth={0.6} opacity={0.35} />
    </svg>
  );
}

function labelsFor(d: Distribution): string[] {
  return d.type === "bar" ? d.labels : d.bins.map((b) => b.toFixed(2));
}

function Heatmap({ labels, matrix }: { labels: string[]; matrix: (number | null)[][] }) {
  const cell = 30;
  const pad = 92;
  const size = labels.length * cell;

  return (
    <div style={{ overflowX: "auto" }}>
      <svg viewBox={`0 0 ${size + pad} ${size + pad}`} role="img"
           aria-label="Correlation matrix between numeric columns"
           style={{ minWidth: Math.min(size + pad, 520), display: "block" }}>
        {labels.map((row, i) =>
          labels.map((col, j) => {
            const v = matrix[i][j];
            // An uncomputable correlation is drawn hollow, not as zero. Zero
            // means "no linear relationship"; null means "cannot tell".
            const fill = v === null ? "none" : v >= 0 ? "#4ade80" : "#f87171";
            return (
              <rect key={`${i}-${j}`} x={pad + j * cell} y={i * cell}
                    width={cell - 1.5} height={cell - 1.5} rx={2}
                    fill={fill} fillOpacity={v === null ? 0 : Math.min(Math.abs(v), 1) * 0.85}
                    stroke="currentColor" strokeOpacity={v === null ? 0.3 : 0.12}
                    strokeDasharray={v === null ? "2 2" : undefined}>
                <title>{`${row} × ${col}: ${v === null ? "not computable" : v.toFixed(3)}`}</title>
              </rect>
            );
          })
        )}
        {labels.map((l, i) => (
          <text key={`r${i}`} x={pad - 8} y={i * cell + cell / 2 + 3} textAnchor="end"
                fontSize={10} fill="currentColor" opacity={0.75}>
            {l.length > 13 ? l.slice(0, 12) + "…" : l}
          </text>
        ))}
        {labels.map((l, j) => (
          <text key={`c${j}`} x={pad + j * cell + cell / 2} y={size + 14} textAnchor="end"
                fontSize={10} fill="currentColor" opacity={0.75}
                transform={`rotate(-45 ${pad + j * cell + cell / 2} ${size + 14})`}>
            {l.length > 13 ? l.slice(0, 12) + "…" : l}
          </text>
        ))}
      </svg>
    </div>
  );
}

export default function EdaCharts({ result }: { result: EdaResult }) {
  const entries = Object.entries(result.distributions);
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? entries : entries.slice(0, 6);

  return (
    <section data-wt="eda-charts" style={{ display: "grid", gap: "1.25rem" }}>
      <div style={card}>
        <h2 style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text3)", margin: "0 0 0.85rem" }}>
          Distributions
        </h2>
        {entries.length === 0 ? (
          <p style={{ fontSize: "0.85rem", color: "var(--text3)", margin: 0 }}>
            No column had enough values to chart.
          </p>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
              {visible.map(([name, d]) => (
                <div key={name} style={{ color: "var(--accent, #60a5fa)" }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
                    {name}{" "}
                    <span style={{ fontWeight: 400, color: "var(--text3)", marginLeft: 6 }}>
                      {d.type === "histogram" ? "histogram" : "top values"}
                    </span>
                  </div>
                  <Bars counts={d.counts} labels={labelsFor(d)} />
                </div>
              ))}
            </div>
            {entries.length > 6 && (
              <button
                onClick={() => setShowAll((v) => !v)}
                style={{
                  marginTop: "0.9rem", background: "none", border: "1px solid var(--border)",
                  borderRadius: 8, padding: "0.35rem 0.8rem", cursor: "pointer",
                  color: "var(--text2)", fontSize: "0.78rem",
                }}
              >
                {showAll ? "Show fewer" : `Show all ${entries.length}`}
              </button>
            )}
          </>
        )}
      </div>

      {result.correlations && result.correlations.labels.length >= 2 && (
        <div style={card}>
          <h2 style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text3)", margin: "0 0 0.3rem" }}>
            Correlations
          </h2>
          <p style={{ fontSize: "0.8rem", color: "var(--text3)", margin: "0 0 0.85rem" }}>
            Green is positive, red is negative, stronger is more opaque. A dashed
            outline means the pair could not be computed, which is not the same as zero.
          </p>
          <Heatmap labels={result.correlations.labels} matrix={result.correlations.matrix} />
        </div>
      )}
    </section>
  );
}
