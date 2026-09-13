"use client";
import EdaSection from "./EdaSection";
import type { EdaResult, Verdict } from "./edaTypes";

/**
 * Whether each column is fit to model on, and why.
 *
 * The rebuild first shipped this as a row of chips carrying only the column
 * name, with the reason hidden in a `title` tooltip. That threw away the
 * panel's entire value: a tooltip does not exist on a touch screen, does not
 * appear in a screenshot, and cannot be scanned across twelve columns even
 * with a mouse. "Age" tells a reader nothing; "19.9% missing — impute
 * recommended" is the finding.
 *
 * So the reason is body text, on the card, always visible.
 */
const VERDICT: Record<Verdict, { color: string; label: string }> = {
  pass: { color: "#4ade80", label: "Ready" },
  warn: { color: "#fbbf24", label: "Review" },
  fail: { color: "#f87171", label: "Fix" },
};

/** Inline SVG, not a glyph or an emoji: ✓ and ✗ render at wildly different
 *  weights across platforms and carry no accessible name. */
function VerdictIcon({ verdict }: { verdict: Verdict }) {
  const common = {
    width: 13, height: 13, viewBox: "0 0 24 24", fill: "none",
    stroke: "currentColor", strokeWidth: 2.4,
    strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
    "aria-hidden": true, focusable: "false" as const,
  };
  if (verdict === "pass") return <svg {...common}><path d="M20 6L9 17l-5-5" /></svg>;
  if (verdict === "warn") {
    return (
      <svg {...common}>
        <path d="M12 3l9.5 16.5H2.5L12 3z" />
        <path d="M12 10v4M12 17.5v.01" />
      </svg>
    );
  }
  return <svg {...common}><path d="M18 6L6 18M6 6l12 12" /></svg>;
}

export default function EdaReadiness({ result }: { result: EdaResult }) {
  const { readiness, low_variance_cols } = result;
  const failing = readiness.filter((r) => r.verdict === "fail").length;
  const warning = readiness.filter((r) => r.verdict === "warn").length;
  const ready = readiness.length - failing - warning;

  return (
    <EdaSection
      id="readiness"
      testId="eda-readiness"
      title="ML readiness"
      icon="readiness"
      meta={`${ready} ready · ${warning} to review · ${failing} to fix`}
      note={<>
        A verdict per column, with the reason it was given.
        {low_variance_cols.length > 0 &&
          ` Barely varying, whatever their verdict: ${low_variance_cols.join(", ")}.`}
      </>}
      empty={readiness.length === 0 ? "No columns were assessed." : undefined}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "0.6rem" }}>
        {readiness.map((r) => {
          const v = VERDICT[r.verdict];
          return (
            <div
              key={r.name}
              style={{
                display: "flex", alignItems: "flex-start", gap: "0.6rem",
                padding: "0.6rem 0.75rem", borderRadius: 10, minWidth: 0,
                background: `${v.color}14`, border: `1px solid ${v.color}33`,
              }}
            >
              <span style={{ color: v.color, flexShrink: 0, display: "flex", marginTop: 2 }}>
                <VerdictIcon verdict={r.verdict} />
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text)", marginBottom: 2, overflowWrap: "anywhere" }}>
                  {r.name}
                </div>
                <div style={{ fontSize: "0.7rem", color: "var(--text3)", lineHeight: 1.45, overflowWrap: "anywhere" }}>
                  {r.reason}
                </div>
              </div>
              <span style={{
                marginLeft: "auto", fontSize: "0.62rem", fontWeight: 700,
                color: v.color, flexShrink: 0, alignSelf: "center",
              }}>
                {v.label}
              </span>
            </div>
          );
        })}
      </div>
    </EdaSection>
  );
}
