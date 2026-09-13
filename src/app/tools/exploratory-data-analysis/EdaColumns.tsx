"use client";
import EdaSection from "./EdaSection";
import type { ColumnProfile, EdaResult } from "./edaTypes";

/**
 * Every column as a labelled bar of its missing percentage.
 *
 * This replaced a thirteen-column table, which was the wrong shape for the
 * question the panel answers. "Which columns have holes in them" is a
 * comparison across rows, and a table makes the reader do that comparison by
 * scanning numbers; a bar puts the answer in the shape. The numeric detail
 * that table carried now lives in the statistics panel, where it is sorted by
 * something meaningful.
 *
 * Each row is two lines: name, bar and percentage on the first, then dtype,
 * missing count and cardinality underneath in the same three columns, so the
 * secondary facts line up with what they describe.
 */
function barColor(pct: number): string {
  if (pct > 20) return "#f87171";
  if (pct > 5) return "#fbbf24";
  if (pct > 0) return "#38bdf8";
  return "#4ade80";
}

const GRID: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 180px) 1fr 52px",
  gap: "0.75rem",
  alignItems: "center",
};

function Row({ col }: { col: ColumnProfile }) {
  const pct = col.missing_pct;
  const color = barColor(pct);
  const typeColor = col.is_numeric ? "#818cf8" : "#34d399";

  return (
    <div>
      <div style={GRID}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", justifyContent: "flex-end", minWidth: 0 }}>
          <span style={{
            fontSize: "0.58rem", padding: "0.1rem 0.35rem", borderRadius: 10,
            background: `${typeColor}22`, color: typeColor, fontWeight: 700, flexShrink: 0,
          }}>
            {col.is_numeric ? "num" : "cat"}
          </span>
          <span title={col.name} style={{
            fontSize: "0.75rem", fontWeight: 600, color: "var(--text)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {col.name}
          </span>
        </div>

        <div
          role="img"
          aria-label={`${col.name}: ${pct}% missing`}
          style={{ height: 8, borderRadius: 4, background: "var(--border)", overflow: "hidden", minWidth: 0 }}
        >
          <div style={{ height: "100%", width: `${Math.min(100, pct)}%`, background: color, borderRadius: 4 }} />
        </div>

        <span style={{
          fontSize: "0.72rem", fontWeight: 700, textAlign: "right",
          color: pct > 0 ? color : "var(--text3)", fontVariantNumeric: "tabular-nums",
        }}>
          {pct}%
        </span>
      </div>

      <div style={{ ...GRID, marginTop: 1 }}>
        <span style={{ fontSize: "0.6rem", color: "var(--text3)", textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {col.dtype}
        </span>
        <span style={{ fontSize: "0.6rem", color: "var(--text3)" }}>
          {col.missing === 0 ? "complete" : `${col.missing.toLocaleString()} missing`}
        </span>
        <span style={{ fontSize: "0.6rem", color: "var(--text3)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
          {col.nunique.toLocaleString()}u
        </span>
      </div>
    </div>
  );
}

export default function EdaColumns({ result }: { result: EdaResult }) {
  const withHoles = result.columns.filter((c) => c.missing_pct > 0).length;

  return (
    <EdaSection
      id="columns"
      testId="eda-columns"
      title="Columns"
      icon="table"
      meta={`${result.columns.length} total · missing %`}
      note={withHoles === 0
        ? "Every column is complete — no missing values anywhere. The bars below are all empty for that reason, not because nothing was measured."
        : `${withHoles} of ${result.columns.length} columns have missing values. Longer and redder is worse; the number under each bar is how many rows, and the count on the right is distinct values.`}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", minWidth: 0 }}>
        {result.columns.map((col) => <Row key={col.name} col={col} />)}
      </div>
    </EdaSection>
  );
}
