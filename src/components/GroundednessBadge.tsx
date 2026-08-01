"use client";

export type Groundedness = { score: number; level: "high" | "medium" | "low"; ungrounded_sentences: string[] };

const GROUNDEDNESS_COLORS: Record<string, string> = {
  high: "#34d399", medium: "#f59e0b", low: "#f87171",
};

/** Single source of truth for rendering a groundedness score (MMRAG-04) —
 * used by both the shared ChatMessageList and Multimodal RAG's bespoke
 * MmRagRunner chat panel, so the two surfaces can't drift out of sync. */
export default function GroundednessBadge({ groundedness, selfCorrected }: { groundedness: Groundedness | null | undefined; selfCorrected?: boolean }) {
  if (!groundedness) return null;
  const color = GROUNDEDNESS_COLORS[groundedness.level];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
        <span title="How well the answer's sentences match the retrieved sources — a heuristic, not a certainty."
          style={{
            display: "inline-flex", alignItems: "center", gap: "0.4rem",
            fontSize: "0.72rem", fontWeight: 500, color, background: `${color}18`,
            border: `1px solid ${color}40`, borderRadius: 9999, padding: "0.22rem 0.65rem 0.22rem 0.55rem",
          }}>
          <span style={{ width: 6, height: 6, borderRadius: 9999, background: color, flexShrink: 0 }} />
          Grounded · {Math.round(groundedness.score * 100)}%
        </span>
        {selfCorrected && (
          <span title="The first answer looked weakly grounded, so it was automatically regenerated once with broader retrieval — this is the corrected result."
            style={{
              display: "inline-flex", alignItems: "center", gap: "0.35rem",
              fontSize: "0.68rem", color: "var(--text3)", background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.12)", borderRadius: 9999, padding: "0.22rem 0.6rem",
            }}>
            <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 1 3 6.7" /><path d="M3 16v-4h4" />
            </svg>
            Self-corrected once
          </span>
        )}
      </div>
      {groundedness.ungrounded_sentences.length > 0 && (
        <div style={{ fontSize: "0.6rem", color: "var(--text3)", lineHeight: 1.5 }}>
          Possibly unsupported by the retrieved sources:
          {groundedness.ungrounded_sentences.map((s, i) => (
            <div key={i} style={{ marginTop: "0.2rem", padding: "0.2rem 0.5rem", background: "rgba(255,255,255,0.04)", borderRadius: 5, borderLeft: "2px solid #f8717155", color: "var(--text2)" }}>
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}