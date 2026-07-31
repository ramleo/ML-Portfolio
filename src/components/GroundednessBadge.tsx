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
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.57rem", color: "var(--text3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Groundedness</span>
        <span title="How well the answer's sentences match the retrieved sources — a heuristic, not a certainty."
          style={{ fontSize: "0.6rem", color: GROUNDEDNESS_COLORS[groundedness.level], background: `${GROUNDEDNESS_COLORS[groundedness.level]}18`, borderRadius: 4, padding: "1px 5px", fontWeight: 600, textTransform: "capitalize" }}>
          {groundedness.level} ({Math.round(groundedness.score * 100)}%)
        </span>
        {selfCorrected && (
          <span title="The first answer looked weakly grounded, so it was automatically regenerated once with broader retrieval — this is the corrected result."
            style={{ fontSize: "0.6rem", color: "#60a5fa", background: "#60a5fa18", borderRadius: 4, padding: "1px 5px", fontWeight: 600 }}>
            Auto-corrected
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