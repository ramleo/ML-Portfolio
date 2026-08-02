"use client";

import { useRagChat } from "@/components/useRagChat";
import RagSourceCard from "@/components/RagSourceCard";
import type { Bbox, DetectedObject } from "./_types";

type Props = {
  chat: ReturnType<typeof useRagChat>;
  accent: string;
  cardStyle: React.CSSProperties;
  jumpToCitation: (source: string, chunkType: string | null | undefined,
                   page: number | null | undefined, text: string, bbox?: Bbox | null,
                   objects?: DetectedObject[] | null, timestampS?: number | null) => void;
};

/** The ranked citation list + groundedness readout for the latest answer —
 * split out of ChatPanel.tsx so it can render as its own column (the
 * "evidence" side of the layout) instead of scrolling inline with the
 * messages. Split out of MmRagRunner.tsx to stay under the project's
 * file-length limit. */
export default function EvidencePanel({ chat, accent: ACCENT, cardStyle, jumpToCitation }: Props) {
  const used = chat.likelyUsedSources;
  // Only split into two groups when the signal is meaningful — some sources
  // flagged used AND some not. An all-or-nothing result (e.g. heavy
  // paraphrasing with low literal overlap) falls back to one flat list
  // rather than mislabeling everything.
  const canSplit = !!used && used.length > 0 && used.length < chat.sources.length;
  // Rank number is the card's position in the always-fixed chat.sources
  // order, not the position within whichever of the two (cited / additional
  // context) groups it lands in — keeps a given source's number stable
  // across both groups instead of restarting the count at 1 for "additional
  // context".
  const renderCard = (s: typeof chat.sources[number], i: number) => {
    const withMeta = s as typeof s & {
      chunk_type?: string | null; page?: number | null; timestamp_s?: number | null; bbox?: Bbox | null; objects?: DetectedObject[] | null;
      number_mismatch?: boolean | null; pii_types?: string | null; blurry?: boolean | null;
      entities?: { type: string; value: string }[] | null;
      retrieval_trace?: { dense?: { score: number; rank: number }; bm25?: { score: number; rank: number }; vision?: { score: number; rank: number }; graph?: { score: number; rank: number } } | null;
      hybrid_score?: number | null; rerank_score?: number | null; type_boost?: number | null;
    };
    return (
      <RagSourceCard key={i} index={i + 1} source={s.source} text={s.text}
        score={s.display_score ?? s.score} rawScore={s.score} accent={ACCENT}
        usedInAnswer={used ? used.includes(i) : null}
        chunkType={withMeta.chunk_type} page={withMeta.page} numberMismatch={!!withMeta.number_mismatch}
        piiTypes={withMeta.pii_types} blurry={!!withMeta.blurry} entities={withMeta.entities}
        retrievalTrace={withMeta.retrieval_trace} hybridScore={withMeta.hybrid_score}
        rerankScore={withMeta.rerank_score} typeBoost={withMeta.type_boost}
        onSelect={() => jumpToCitation(s.source, withMeta.chunk_type, withMeta.page, s.text, withMeta.bbox, withMeta.objects, withMeta.timestamp_s)}
      />
    );
  };

  // Groundedness now renders inline under the answer in ChatPanel, right next
  // to the feedback thumbs — this panel's "has anything to show" check no
  // longer needs to factor it in.
  const hasContent = chat.sources.length > 0;

  return (
    <div style={cardStyle} className="flex flex-col min-h-0 h-full">
      {/* Solid-ish background + shadow, not just the card's translucent
       * background/faint border — otherwise this reads as blending into
       * the scrolled list beneath it instead of sitting above it. */}
      <div className="px-4 py-2.5 border-b shrink-0 flex items-center justify-between relative z-10" style={{
        borderColor: `${ACCENT}30`, background: "rgba(10,8,18,0.92)",
        boxShadow: "0 6px 12px -6px rgba(0,0,0,0.5)",
      }}>
        <span className="text-[17px]" style={{ color: ACCENT, fontFamily: "ui-serif, 'Iowan Old Style', 'Palatino Linotype', 'Source Serif Pro', Georgia, serif" }}>
          Evidence
        </span>
        {chat.sources.length > 0 && (
          <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)", fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace" }}>
            {chat.sources.length} cited
          </span>
        )}
      </div>
      {/* mask-image fade at the top — the shadow above only makes the
       * header itself look solid; it does nothing about scrolled content,
       * since this div's own top padding scrolls away with everything
       * else, leaving text flush against the visible edge right under the
       * header. A persistent fade means content never appears to touch
       * that edge, regardless of scroll position. */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-3" style={{
        maskImage: "linear-gradient(to bottom, transparent 0, black 32px)",
        WebkitMaskImage: "linear-gradient(to bottom, transparent 0, black 32px)",
      }}>
        {!hasContent && (
          <p className="text-[13px] text-center py-8 px-2" style={{ color: "rgba(255,255,255,0.3)" }}>
            Ask a question — the sources it draws from will rank here.
          </p>
        )}
        {chat.sources.length > 0 && (
          canSplit ? (
            <div className="flex flex-col gap-2.5">
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: `${ACCENT}99` }}>
                  Directly cited · {used!.length}
                </span>
                {chat.sources.map((s, i) => (used!.includes(i) ? renderCard(s, i) : null))}
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.3)" }}
                  title="Sent to the AI as context, but the answer doesn't appear to draw from this">
                  Additional context (not used in this answer)
                </span>
                {chat.sources.map((s, i) => (used!.includes(i) ? null : renderCard(s, i)))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">{chat.sources.map(renderCard)}</div>
          )
        )}
      </div>
    </div>
  );
}