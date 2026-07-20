"use client";

import { useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";

const ACCENT = "#a78bfa";

type SimilarResult = { source: string; page: number; similarity: number };

type Props = {
  pageImages: string[];
  page: number | null | undefined;
  chunkType: string | null | undefined;
  source: string;
};

const TYPE_LABEL: Record<string, string> = { table: "Table", figure: "Figure", text: "Text", image: "Image" };

export default function CitationThumbnailPanel({ pageImages, page, chunkType, source }: Props) {
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
        {(chunkType === "figure" || chunkType === "image") && (
          <button onClick={findSimilar} disabled={loadingSimilar}
            className="text-[9px] px-2 py-0.5 rounded border transition-colors hover:bg-white/5"
            style={{ borderColor: `${ACCENT}40`, color: ACCENT, opacity: loadingSimilar ? 0.5 : 1 }}>
            {loadingSimilar ? "Checking…" : "Find similar figures"}
          </button>
        )}
      </div>
      <img src={`data:image/png;base64,${img}`} alt={`Page ${page}`}
        className="w-full block" style={{ maxHeight: 320, objectFit: "contain", background: "#0a0f1a" }} />
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