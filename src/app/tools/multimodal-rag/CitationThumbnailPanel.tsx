"use client";

import { useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";
import type { Bbox } from "./_types";

const ACCENT = "#a78bfa";

type SimilarResult = { source: string; page: number; similarity: number };

type Props = {
  pageImages: string[];
  page: number | null | undefined;
  chunkType: string | null | undefined;
  /** Page-relative [x,y,w,h] (MMRAG-07) — draws a highlighted rectangle over
   * the exact region a table/figure citation came from. Absent for text
   * citations (the whole page is already the relevant context there). */
  bbox?: Bbox | null;
  source: string;
  /** Whether "find visually similar figures" was enabled at upload time —
   * hides the button entirely instead of showing one that always says
   * "not available" for the common (unchecked) default. */
  canFindSimilar: boolean;
};

const TYPE_LABEL: Record<string, string> = { table: "Table", figure: "Figure", text: "Text", image: "Image", video: "Video Frame" };

export default function CitationThumbnailPanel({ pageImages, page, chunkType, bbox, source, canFindSimilar }: Props) {
  const [similar, setSimilar] = useState<SimilarResult[] | null>(null);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [similarNote, setSimilarNote] = useState<string | null>(null);

  if (!page || page < 1 || page > pageImages.length) return null;
  const img = pageImages[page - 1];

  const findSimilar = async () => {
    setLoadingSimilar(true);
    setSimilar(null);
    setSimilarNote(null);
    try {
      const url = `${ML_UNIFIED_API}/rag/mm-similar-figures?source=${encodeURIComponent(source)}&page=${page}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!data.available) {
        setSimilarNote("Not available — 'find visually similar figures' wasn't enabled for this upload.");
      } else if (!data.results?.length) {
        setSimilarNote("No similar figures found in this document.");
      } else {
        setSimilar(data.results);
      }
    } catch {
      setSimilarNote("Could not check for similar figures right now.");
    } finally {
      setLoadingSimilar(false);
    }
  };

  return (
    <div className="rounded-xl overflow-hidden border" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
      <div className="flex items-center justify-between px-3 py-1.5"
        style={{ background: "rgba(255,255,255,0.03)" }}>
        <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.4)" }}>
          Page {page}{chunkType && chunkType in TYPE_LABEL ? ` · ${TYPE_LABEL[chunkType]}` : ""}
        </span>
        {canFindSimilar && (chunkType === "figure" || chunkType === "image") && (
          <button onClick={findSimilar} disabled={loadingSimilar}
            className="text-[9px] px-2 py-0.5 rounded border transition-colors hover:bg-white/5"
            style={{ borderColor: `${ACCENT}40`, color: ACCENT, opacity: loadingSimilar ? 0.5 : 1 }}>
            {loadingSimilar ? "Checking…" : "Find similar figures"}
          </button>
        )}
      </div>
      {/* No objectFit/maxHeight on the <img> itself — a capped, shrunk image
          can letterbox (blank bars) inside its box, which would throw off a
          percentage-positioned bbox overlay. Full width + auto height keeps
          the rendered image always at its true aspect ratio; a scrollable
          OUTER wrapper caps how much vertical space a tall page takes.
          position:relative lives on the INNER wrapper (sized exactly to the
          image, no overflow/max-height on it) — not the scrolling outer div.
          A relative ancestor with overflow:auto + max-height (but no
          explicit height) resolves an absolutely-positioned child's
          percentage top/height against the CLIPPED viewport, not the full
          scrollable content height — verified live: with position:relative
          on the outer div, a bbox at top:50.5% rendered at 50.5% of the
          320px clip (161px) instead of 50.5% of the image's true 787px
          height, visibly misaligned once scrolled. */}
      <div className="w-full overflow-y-auto" style={{ maxHeight: 320, background: "#0a0f1a" }}>
        <div className="relative w-full">
          <img src={`data:image/png;base64,${img}`} alt={`Page ${page}`} className="w-full block" />
          {bbox && (
            <div className="absolute pointer-events-none" style={{
              left: `${bbox[0] * 100}%`, top: `${bbox[1] * 100}%`,
              width: `${bbox[2] * 100}%`, height: `${bbox[3] * 100}%`,
              border: `2px solid ${ACCENT}`, borderRadius: 3,
              background: `${ACCENT}18`, boxShadow: `0 0 0 2px rgba(0,0,0,0.4)`,
            }} />
          )}
        </div>
      </div>
      {similarNote && (
        <p className="text-[9px] px-3 py-2" style={{ color: "rgba(255,255,255,0.35)" }}>{similarNote}</p>
      )}
      {similar && (
        <div className="px-3 py-2 flex flex-col gap-1">
          {similar.map((s, i) => (
            <div key={i} className="text-[9px]" style={{ color: "rgba(255,255,255,0.5)" }}>
              Page {s.page} — {Math.round(s.similarity * 100)}% similar
            </div>
          ))}
        </div>
      )}
    </div>
  );
}