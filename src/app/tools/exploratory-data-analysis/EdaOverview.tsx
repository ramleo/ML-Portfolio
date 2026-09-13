"use client";
import EdaSection, { cardStyle } from "./EdaSection";
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

/** A number the model could not compute renders as "—", never as 0.
 *  Zero standard deviation and undefined standard deviation are different
 *  facts about a column, and showing one as the other is a wrong answer. */
function num(value: number | null, digits = 2): string {
  return value === null || value === undefined ? "—" : value.toFixed(digits);
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div style={cardStyle}>
      <div style={{ fontSize: "0.62rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text3)" }}>
        {label}
      </div>
      <div style={{ fontSize: "1.6rem", fontWeight: 700, marginTop: 4, color: tone ?? "var(--text)", fontVariantNumeric: "tabular-nums" }}>
        {value}
      </div>
    </div>
  );
}

/** The quality score as an arc.
 *
 *  Width and height are pinned to the viewBox rather than left to the
 *  container. An SVG with a viewBox and no width fills whatever box it is in
 *  and scales its text with it — that is how this page once rendered 10px
 *  labels at roughly 60px.
 */
function Gauge({ score }: { score: number }) {
  const tone = score >= 80 ? "#4ade80" : score >= 60 ? "#fbbf24" : "#f87171";
  const r = 46;
  const circumference = Math.PI * r;      // a half turn, not a full one
  const filled = (score / 100) * circumference;
  const arc = `M 8 58 A ${r} ${r} 0 0 1 108 58`;

  return (
    <svg width={116} height={72} viewBox="0 0 116 72" role="img"
         aria-label={`Data quality ${score} out of 100`}
         style={{ maxWidth: "100%", display: "block" }}>
      <path d={arc} fill="none" stroke="currentColor" strokeOpacity={0.16} strokeWidth={9} strokeLinecap="round" />
      <path d={arc} fill="none" stroke={tone} strokeWidth={9} strokeLinecap="round"
            strokeDasharray={`${filled} ${circumference}`} />
      <text x={58} y={54} textAnchor="middle" fontSize={20} fontWeight={700} fill="currentColor">
        {score}
      </text>
      <text x={58} y={68} textAnchor="middle" fontSize={8} fill="currentColor" opacity={0.6}>
        out of 100
      </text>
    </svg>
  );
}

export default function EdaOverview({ result }: { result: EdaResult }) {
  const { overview, quality_score, narrative, insights, readiness, low_variance_cols } = result;
  const scoreTone = quality_score >= 80 ? "#4ade80" : quality_score >= 60 ? "#fbbf24" : "#f87171";
  const failing = readiness.filter((r) => r.verdict === "fail");
  const warning = readiness.filter((r) => r.verdict === "warn");

  return (
    <>
      <section id="overview" data-wt="eda-overview" style={{ display: "grid", gap: "1.25rem", scrollMarginTop: 132 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem" }}>
          <Stat label="Rows" value={overview.rows.toLocaleString()} />
          <Stat label="Columns" value={String(overview.cols)} />
          <Stat label="Duplicates" value={overview.duplicates.toLocaleString()} tone={overview.duplicates > 0 ? "#fbbf24" : undefined} />
          <Stat label="Missing" value={`${num(overview.missing_pct, 1)}%`} tone={overview.missing_pct > 5 ? "#fbbf24" : undefined} />
          <div style={{ ...cardStyle, display: "flex", alignItems: "center", gap: "0.7rem", color: "var(--text)" }}>
            <Gauge score={quality_score} />
            <div>
              <div style={{ fontSize: "0.62rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text3)" }}>
                Quality
              </div>
              <div style={{ fontSize: "0.78rem", color: scoreTone, fontWeight: 600, marginTop: 2 }}>
                {quality_score >= 80 ? "excellent" : quality_score >= 60 ? "fair" : "poor"}
              </div>
            </div>
          </div>
        </div>

        {narrative && (
          <div style={{ ...cardStyle, lineHeight: 1.65, fontSize: "0.92rem", color: "var(--text2)" }}>
            {narrative}
          </div>
        )}
      </section>

      {insights.length > 0 && (
        <EdaSection id="insights" title="What stands out" icon="insight" testId="eda-insights">
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
        </EdaSection>
      )}

      <EdaSection
        id="readiness"
        testId="eda-readiness"
        title="Modelling readiness"
        icon="readiness"
        note={<>
          {failing.length} column{failing.length === 1 ? "" : "s"} would hurt a model as-is
          {warning.length > 0 && `, ${warning.length} need${warning.length === 1 ? "s" : ""} a look`}.
          Hover any chip for the reason.
          {low_variance_cols.length > 0 &&
            ` Barely varying: ${low_variance_cols.join(", ")}.`}
        </>}
      >
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
      </EdaSection>
    </>
  );
}
