"use client";
import EdaSection, { Scroller } from "./EdaSection";
import type { EdaResult, Verdict } from "./edaTypes";

const VERDICT_COLOR: Record<Verdict, string> = {
  pass: "#4ade80",
  warn: "#fbbf24",
  fail: "#f87171",
};

/** "—", not "0", and never the literal word "null" — which is what the
 *  legacy table printed for an undefined kurtosis. A statistic that does not
 *  exist for this column and a statistic that happens to be zero are
 *  different facts. */
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

/** A percentage and a bar of the same width. The number is exact and the bar
 *  is scannable — reading twelve rows of "3.4%" to find the one that says
 *  "41.2%" is work the eye should not have to do. */
function MissingBar({ pct }: { pct: number }) {
  const tone = pct > 20 ? "#f87171" : pct > 5 ? "#fbbf24" : "#4ade80";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
      <span style={{ minWidth: 44, display: "inline-block", color: pct > 20 ? "#f87171" : "var(--text2)" }}>
        {num(pct, 1)}%
      </span>
      <span aria-hidden style={{ width: 52, height: 5, borderRadius: 9999, background: "var(--border)", overflow: "hidden" }}>
        <span style={{ display: "block", width: `${Math.min(pct, 100)}%`, height: "100%", background: tone }} />
      </span>
    </span>
  );
}

export default function EdaColumns({ result }: { result: EdaResult }) {
  const verdictOf = new Map(result.readiness.map((r) => [r.name, r]));

  return (
    <EdaSection
      id="columns"
      testId="eda-columns"
      title="Columns"
      icon="table"
      note="Hover a verdict dot for the reason. A dash means the statistic is not defined for this column, usually because it has too few values — kurtosis needs four, skew three, standard deviation two."
    >
      <Scroller min={860}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
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
              <th style={th}>Kurtosis</th>
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
                  <td style={td}><MissingBar pct={col.missing_pct} /></td>
                  <td style={td}>{col.nunique.toLocaleString()}</td>
                  <td style={td}>{num(s?.mean)}</td>
                  <td style={td}>{num(s?.median)}</td>
                  <td style={td}>{num(s?.std)}</td>
                  <td style={td}>{num(s?.min)}</td>
                  <td style={td}>{num(s?.max)}</td>
                  <td style={td}>{s ? s.outliers : "—"}</td>
                  <td style={td}>{num(s?.skew)}</td>
                  <td style={td}>{num(s?.kurtosis)}</td>
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
      </Scroller>
    </EdaSection>
  );
}
