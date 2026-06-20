"use client";

import MouseTiltCard from "@/components/MouseTiltCard";
import { scoreColor } from "@/lib/preprocessingAlgorithms";

const ACCENT  = "#22d3ee";
const CARD_BG = "rgba(17,24,39,0.80)";

export function QualityScoreCard({ before, after }: { before: number; after: number }) {
  const diff = after - before;
  return (
    <MouseTiltCard style={{
      padding: "1.25rem 1.5rem", borderRadius: 14,
      background: CARD_BG, border: "1px solid var(--border)",
      marginBottom: "1.25rem",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1.5rem", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Data Quality Score
          </div>
          <div style={{ fontSize: "0.68rem", color: "var(--text3)", marginTop: "0.2rem", lineHeight: 1.5 }}>
            Based on: missing value rate (45 pts), column skewness (35 pts), coverage (20 pts)
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "0.6rem", color: "var(--text3)", marginBottom: "0.25rem" }}>Before</div>
            <div style={{ fontSize: "2.5rem", fontWeight: 800, color: scoreColor(before), lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{before}</div>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" style={{ opacity: 0.5, flexShrink: 0 }}>
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "0.6rem", color: "var(--text3)", marginBottom: "0.25rem" }}>After</div>
            <div style={{ fontSize: "2.5rem", fontWeight: 800, color: scoreColor(after), lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{after}</div>
          </div>
          {diff > 0 && (
            <div style={{
              padding: "0.3rem 0.8rem", borderRadius: 9999,
              background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.25)",
              color: "#4ade80", fontSize: "0.85rem", fontWeight: 700,
            }}>
              +{diff} pts
            </div>
          )}
        </div>
      </div>

      {/* Score bars */}
      <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.45rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "0.65rem", color: "var(--text3)", width: 44, flexShrink: 0 }}>Before</span>
          <div style={{ flex: 1, height: 8, borderRadius: 9999, background: "var(--border2)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${before}%`, background: scoreColor(before), borderRadius: 9999, transition: "width 0.6s ease" }} />
          </div>
          <span style={{ fontSize: "0.65rem", color: scoreColor(before), width: 28, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{before}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "0.65rem", color: "var(--text3)", width: 44, flexShrink: 0 }}>After</span>
          <div style={{ flex: 1, height: 8, borderRadius: 9999, background: "var(--border2)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${after}%`, background: scoreColor(after), borderRadius: 9999, transition: "width 0.6s ease" }} />
          </div>
          <span style={{ fontSize: "0.65rem", color: scoreColor(after), width: 28, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{after}</span>
        </div>
      </div>
    </MouseTiltCard>
  );
}
