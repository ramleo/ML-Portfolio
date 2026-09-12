"use client";

import { useRagChat } from "@/components/useRagChat";
import RagSourceCard from "@/components/RagSourceCard";
import Skeleton from "./Skeleton";
import type { Bbox, DetectedObject, Entity } from "./_types";

type Props = {
  chat: ReturnType<typeof useRagChat>;
  accent: string;
  cardStyle: React.CSSProperties;
  jumpToCitation: (source: string, chunkType: string | null | undefined,
                   page: number | null | undefined, text: string, bbox?: Bbox | null,
                   objects?: DetectedObject[] | null, timestampS?: number | null,
                   entities?: Entity[] | null, piiTypes?: string | null,
                   signatures?: DetectedObject[] | null, tampering?: DetectedObject[] | null,
                   personCount?: number | null) => void;
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
  // Which card the guided demo clicks. NOT position zero: that is whatever
  // the reranker happened to put first, and the reranker's order moves per
  // run. Two takes were lost to it — the top card was prose, so the clip
  // narrated "clicking it opens that page at the region the passage was read
  // from" over a jump that opened no region at all.
  //
  // Only a citation carrying a bbox HAS a region to open (jumpToCitation
  // feeds it to the cropped-page panel); a text chunk has none and can only
  // highlight an entry in the extracted-text list. So the anchor asks for the
  // property the narration depends on rather than trusting a rank: prefer a
  // bboxed citation the answer actually used, then any bboxed one, then any
  // used one, and fall back to the first card so the anchor always exists.
  const hasBbox = (i: number) => !!(chat.sources[i] as { bbox?: Bbox | null })?.bbox;
  const usedIdx = used?.length ? used : [];
  const firstBboxed = chat.sources.findIndex((_, i) => hasBbox(i));
  const anchorIdx =
    usedIdx.find(hasBbox)
    ?? (firstBboxed !== -1 ? firstBboxed : undefined)
    ?? usedIdx[0]
    ?? 0;
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
      signatures?: DetectedObject[] | null;
      tampering?: DetectedObject[] | null;
      person_count?: number | null;
      retrieval_trace?: { dense?: { score: number; rank: number }; bm25?: { score: number; rank: number }; vision?: { score: number; rank: number }; graph?: { score: number; rank: number } } | null;
      hybrid_score?: number | null; rerank_score?: number | null; type_boost?: number | null;
    };
    // One card carries an anchor so the guided demo has a citation to click
    // (see anchorIdx). Wrapped rather than given a prop:
    // RagSourceCard is shared with the other RAG tools and sits close to the
    // file-length limit, and this is a fact about this page's demo, not about
    // what a citation card is.
    const card = (
      <RagSourceCard index={i + 1} source={s.source} text={s.text}
        score={s.display_score ?? s.score} rawScore={s.score} accent={ACCENT}
        // An EMPTY list means the overlap detector found nothing, which is
        // "could not tell", not "not used" — it compares 4-grams of the
        // answer against each chunk, so a short one-sentence answer that
        // paraphrases rather than quotes matches nothing at all. Reporting
        // that as a confident "no" put "Used in answer — no" under every
        // citation of a demonstrably correct answer. Only claim either way
        // when the detector actually found something.
        usedInAnswer={usedIdx.length > 0 ? usedIdx.includes(i) : null}
        chunkType={withMeta.chunk_type} page={withMeta.page} numberMismatch={!!withMeta.number_mismatch}
        piiTypes={withMeta.pii_types} blurry={!!withMeta.blurry} entities={withMeta.entities}
        retrievalTrace={withMeta.retrieval_trace} hybridScore={withMeta.hybrid_score}
        rerankScore={withMeta.rerank_score} typeBoost={withMeta.type_boost}
        onSelect={() => jumpToCitation(s.source, withMeta.chunk_type, withMeta.page, s.text, withMeta.bbox, withMeta.objects, withMeta.timestamp_s, withMeta.entities, withMeta.pii_types, withMeta.signatures, withMeta.tampering, withMeta.person_count)}
      />
    );
    // A plain div, not display:contents — the recorder measures this element
    // to place its spotlight, and a box-less element measures as zero.
    return i === anchorIdx
      ? <div key={i} data-wt="mmrag-cite">{card}</div>
      : <div key={i}>{card}</div>;
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
        borderColor: `${ACCENT}30`, background: "var(--bg-card)",
        boxShadow: "0 6px 12px -6px rgba(0,0,0,0.5)",
      }}>
        <span className="text-[17px]" style={{ color: ACCENT, fontFamily: "ui-serif, 'Iowan Old Style', 'Palatino Linotype', 'Source Serif Pro', Georgia, serif" }}>
          Evidence
        </span>
        {chat.sources.length > 0 && (
          <span className="text-[11px]" style={{ color: "var(--text3)", fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace" }}>
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
        {!hasContent && chat.loading && (
          <div className="flex flex-col gap-1.5">
            {[0, 1, 2].map(i => (
              <div key={i} className="rounded-lg p-2.5 flex flex-col gap-1.5" style={cardStyle}>
                <Skeleton className="h-2.5 w-1/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            ))}
          </div>
        )}
        {!hasContent && !chat.loading && (
          <p className="text-[13px] text-center py-8 px-2" style={{ color: "var(--text3)" }}>
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
                <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--text3)" }}
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