"use client";

type RetrievalTrace = { dense?: { score: number; rank: number }; bm25?: { score: number; rank: number }; vision?: { score: number; rank: number }; graph?: { score: number; rank: number } } | null | undefined;
type Signal = { label: string; rank: number; color: string; desc: string };

const CHUNK_TYPE_LABEL: Record<string, string> = { table: "Table", figure: "Figure", image: "Image", video: "Video Frame" };

type Props = {
  accent: string;
  chunkType?: string | null;
  retrievalSignals: Signal[];
  retrievalTrace: RetrievalTrace;
  hybridScore?: number | null;
  rerankValue: number;
  typeBoost?: number | null;
  usedInAnswer?: boolean | null;
  traceOpen: boolean;
  setTraceOpen: (fn: (o: boolean) => boolean) => void;
};

/** The "Why was this cited?" expandable retrieval-signal breakdown (MMRAG-08)
 * under an expanded citation card — split out of RagSourceCard.tsx purely to
 * keep that file under the project's 400-line cap; no behavior changed. */
export default function RagRetrievalTrace({ accent, chunkType, retrievalSignals, retrievalTrace, hybridScore, rerankValue, typeBoost, usedInAnswer, traceOpen, setTraceOpen }: Props) {
  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem", marginBottom: "0.4rem" }}>
        {(retrievalSignals.length > 0 || hybridScore != null) && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
            <span>Retrieval</span>
            {retrievalSignals.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                {retrievalSignals.map(sig => (
                  <span key={sig.label} title={`${sig.desc} — ranked #${sig.rank} among the candidates this signal alone found`} style={{
                    fontSize: "0.72rem", fontWeight: 700, color: sig.color,
                    background: `${sig.color}1a`, borderRadius: 9999, padding: "1px 7px",
                    fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                  }}>
                    {sig.label} · #{sig.rank}
                  </span>
                ))}
              </div>
            ) : (
              <span style={{ color: "var(--text2)", fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace" }}>fused retrieval</span>
            )}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>Rerank score</span>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <div style={{ width: 48, height: 4, borderRadius: 3, background: "var(--border)", overflow: "hidden" }}>
              <div style={{ width: `${Math.round(rerankValue * 100)}%`, height: "100%", background: accent }} />
            </div>
            <span style={{ color: "var(--text2)", fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace" }}>{rerankValue.toFixed(2)}</span>
          </div>
        </div>
        {usedInAnswer != null && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>Used in answer</span>
            <span style={{ color: usedInAnswer ? "#34d399" : "var(--text3)", fontWeight: 600 }}>{usedInAnswer ? "yes" : "no"}</span>
          </div>
        )}
      </div>
      {(retrievalTrace?.dense || retrievalTrace?.bm25 || retrievalTrace?.vision || retrievalTrace?.graph || (typeBoost && typeBoost !== 1) || hybridScore != null) && (
        <div style={{ marginTop: "0.1rem" }}>
          <button onClick={(e) => { e.stopPropagation(); setTraceOpen(o => !o); }}
            style={{ fontSize: "0.76rem", color: accent, background: "none", border: "none", padding: 0, cursor: "pointer", textDecoration: "underline" }}>
            {traceOpen ? "Hide detail" : "Why was this cited?"}
          </button>
          {traceOpen && (
            <div style={{ marginTop: "0.3rem", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
              {retrievalTrace?.dense && (
                <div>Semantic (meaning) match: <strong style={{ color: "var(--text2)" }}>{retrievalTrace.dense.score.toFixed(3)}</strong> similarity, ranked #{retrievalTrace.dense.rank} of the candidates this signal alone found.</div>
              )}
              {retrievalTrace?.bm25 && (
                <div>Keyword (BM25) match: <strong style={{ color: "var(--text2)" }}>{retrievalTrace.bm25.score.toFixed(2)}</strong> score, ranked #{retrievalTrace.bm25.rank} of the candidates this signal alone found.</div>
              )}
              {retrievalTrace?.vision && (
                <div>Visual (image) match: <strong style={{ color: "var(--text2)" }}>{retrievalTrace.vision.score.toFixed(3)}</strong> similarity, ranked #{retrievalTrace.vision.rank} of the candidates this signal alone found.</div>
              )}
              {retrievalTrace?.graph && (
                <div>Shared value match: this chunk states the same value or name as your question (an amount, date, percentage, person, organization, or location) — found across your uploaded documents (confidence <strong style={{ color: "var(--text2)" }}>{retrievalTrace.graph.score.toFixed(2)}</strong>, not a similarity score).</div>
              )}
              {typeBoost && typeBoost !== 1 && (
                <div>Your question&apos;s wording ({chunkType ? CHUNK_TYPE_LABEL[chunkType] ?? chunkType : "this type"}-related) gave this chunk type a <strong style={{ color: "var(--text2)" }}>{typeBoost}×</strong> boost.</div>
              )}
              {hybridScore != null && (
                <div>Combined retrieval score (semantic + keyword, fused): <strong style={{ color: "var(--text2)" }}>{hybridScore.toFixed(4)}</strong>.</div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
