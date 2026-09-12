"use client";
import type { EdaResult, Verdict } from "./edaTypes";

const VERDICT_COLOR: Record<Verdict, string> = {
  pass: "#4ade80",
  warn: "#fbbf24",
  fail: "#f87171",
};

/** "—", not "0". A statistic that does not exist for this column and a
 *  statistic that happens to be zero are different facts. */
function num(value: number | null | undefined, digits = 2): string {
  return value === null || value === undefined ? "—" : Number(value).toFixed(digits);
}

const th: React.CSSProperties = {
  textAlign: "left", padding: "0.55rem 0.75rem", fontSize: "0.62rem",
  fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
  color: "var(--text3)", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap",
};
const td: React.CSSProperties = {
  padding: "0.5rem 0.75rem", fontSize: "0.82rem", color: "var(--text2)",
  borderBottom: "1px solid var(--border)", whiteSpace: "nowrap",
  fontVariantNumeric: "tabular-nums",
};

export default function EdaColumns({ result }: { result: EdaResult }) {
  const verdictOf = new Map(result.readiness.map((r) => [r.name, r]));

  return (
    <section data-wt="eda-columns" style={{
      background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12,
    }}>
      <div style={{ padding: "1rem 1.15rem 0.4rem" }}>
        <h2 style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text3)", margin: 0 }}>
          Columns
        </h2>
        <p style={{ fontSize: "0.8rem", color: "var(--text3)", margin: "0.3rem 0 0" }}>
          Hover a verdict for the reason. A dash means the statistic is not defined for
          this column, usually because it has too few values.
        </p>
      </div>

      {/* Wide table, its own scroller — the page body never scrolls sideways. */}
      <div style={{ overflowX: "auto", padding: "0 0.4rem 0.4rem" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
          <thead>
            <tr>
              <th style={th}>Column</th>
              <th style={th}>Type</th>
              <th style={th}>Missing</th>
              <th style={th}>Unique</th>
              <th style={th}>Mean</th>
              <th style={th}>Median</th>
              <th style={th}>Std</th>
              <th style={th}>Min</th>
              <th style={th}>Max</th>
              <th style={th}>Outliers</th>
              <th style={th}>Skew</th>
              <th style={th}>Ready</th>
            </tr>
          </thead>
          <tbody>
            {result.columns.map((col) => {
              const s = result.stats[col.name];
              const r = verdictOf.get(col.name);
              return (
                <tr key={col.name}>
                  <td style={{ ...td, color: "var(--text)", fontWeight: 600 }}>{col.name}</td>
                  <td style={td}>{col.is_numeric ? "numeric" : col.dtype}</td>
                  <td style={{ ...td, color: col.missing_pct > 20 ? "#f87171" : "var(--text2)" }}>
                    {col.missing} ({num(col.missing_pct, 1)}%)
                  </td>
                  <td style={td}>{col.nunique.toLocaleString()}</td>
                  <td style={td}>{num(s?.mean)}</td>
                  <td style={td}>{num(s?.median)}</td>
                  <td style={td}>{num(s?.std)}</td>
                  <td style={td}>{num(s?.min)}</td>
                  <td style={td}>{num(s?.max)}</td>
                  <td style={td}>{s ? s.outliers : "—"}</td>
                  <td style={td}>{num(s?.skew, 2)}</td>
                  <td style={td}>
                    {r ? (
                      <span title={r.reason} style={{
                        display: "inline-block", width: 8, height: 8, borderRadius: 9999,
                        background: VERDICT_COLOR[r.verdict],
                      }} />
                    ) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
