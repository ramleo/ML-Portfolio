"use client";
import type { EdaResult, InsightLevel, Verdict } from "./edaTypes";

const VERDICT_COLOR: Record<Verdict, string> = {
  pass: "#4ade80",
  warn: "#fbbf24",
  fail: "#f87171",
};

// Same three colours as the readiness verdicts, on purpose: a danger insight
// and a failing column are usually the same problem said twice.
const INSIGHT_COLOR: Record<InsightLevel, string> = {
  danger: "#f87171",
  warning: "#fbbf24",
  info: "#60a5fa",
};

const card: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "1rem 1.15rem",
};

/** A number the model could not compute renders as "—", never as 0.
 *  Zero standard deviation and undefined standard deviation are different
 *  facts about a column, and showing one as the other is a wrong answer. */
function num(value: number | null, digits = 2): string {
  return value === null || value === undefined ? "—" : value.toFixed(digits);
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div style={card}>
      <div style={{ fontSize: "0.62rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text3)" }}>
        {label}
      </div>
      <div style={{ fontSize: "1.6rem", fontWeight: 700, marginTop: 4, color: tone ?? "var(--text)", fontVariantNumeric: "tabular-nums" }}>
        {value}
      </div>
    </div>
  );
}

export default function EdaOverview({ result }: { result: EdaResult }) {
  const { overview, quality_score, narrative, insights, readiness } = result;
  const scoreTone = quality_score >= 80 ? "#4ade80" : quality_score >= 60 ? "#fbbf24" : "#f87171";
  const failing = readiness.filter((r) => r.verdict === "fail");
  const warning = readiness.filter((r) => r.verdict === "warn");

  return (
    <section data-wt="eda-overview" style={{ display: "grid", gap: "1.25rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem" }}>
        <Stat label="Rows" value={overview.rows.toLocaleString()} />
        <Stat label="Columns" value={String(overview.cols)} />
        <Stat label="Duplicates" value={overview.duplicates.toLocaleString()} tone={overview.duplicates > 0 ? "#fbbf24" : undefined} />
        <Stat label="Missing" value={`${num(overview.missing_pct, 1)}%`} tone={overview.missing_pct > 5 ? "#fbbf24" : undefined} />
        <Stat label="Quality" value={`${quality_score}/100`} tone={scoreTone} />
      </div>

      {narrative && (
        <div style={{ ...card, lineHeight: 1.65, fontSize: "0.92rem", color: "var(--text2)" }}>
          {narrative}
        </div>
      )}

      {insights.length > 0 && (
        <div style={card}>
          <h2 style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text3)", margin: "0 0 0.6rem" }}>
            What stands out
          </h2>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: "0.45rem" }}>
            {insights.map((insight, i) => (
              <li key={i} style={{ display: "flex", gap: "0.55rem", alignItems: "start", fontSize: "0.88rem", color: "var(--text2)", lineHeight: 1.55 }}>
                <span aria-hidden style={{
                  width: 6, height: 6, borderRadius: 9999, marginTop: "0.45rem", flexShrink: 0,
                  background: INSIGHT_COLOR[insight.type] ?? INSIGHT_COLOR.info,
                }} />
                <span>{insight.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={card}>
        <h2 style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text3)", margin: "0 0 0.2rem" }}>
          Modelling readiness
        </h2>
        <p style={{ fontSize: "0.8rem", color: "var(--text3)", margin: "0 0 0.75rem" }}>
          {failing.length} column{failing.length === 1 ? "" : "s"} would hurt a model as-is
          {warning.length > 0 && `, ${warning.length} need${warning.length === 1 ? "s" : ""} a look`}.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
          {readiness.map((r) => (
            <span
              key={r.name}
              title={r.reason}
              style={{
                display: "inline-flex", alignItems: "center", gap: "0.35rem",
                fontSize: "0.75rem", padding: "3px 9px", borderRadius: 9999,
                background: `${VERDICT_COLOR[r.verdict]}14`,
                border: `1px solid ${VERDICT_COLOR[r.verdict]}38`,
                color: "var(--text2)",
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: 9999, background: VERDICT_COLOR[r.verdict] }} />
              {r.name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
