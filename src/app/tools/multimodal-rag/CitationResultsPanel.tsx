"use client";

import type { Bbox, DetectedObject, DuplicateMatch, Entity } from "./_types";
import { tamperingLevel } from "./tamperingLevel";
import { useNarration } from "./useNarration";

const TAMPERING_COLOR = "#f87171"; // same accent as the box overlay in CitationThumbnailPanel

type SimilarResult = { source: string; page: number; similarity: number };
type VisualAction = "" | "description" | "objects" | "faces" | "similar" | "entities" | "pii" | "signatures" | "tampering" | "duplicates";

type Props = {
  inpaintError: string | null;
  isImageOrVideoOnly: boolean;
  visualAction: VisualAction;
  captionText?: string | null;
  objects?: DetectedObject[] | null;
  entities?: Entity[] | null;
  piiTypes?: string | null;
  tampering?: DetectedObject[] | null;
  duplicates?: DuplicateMatch[] | null;
  /** Same coverage check CitationThumbnailPanel's box overlay uses — a text
   * row must disappear the same moment its box does, once a removal (Image
   * Inpainting & Object Remover) covers it. */
  isCovered: (bbox: Bbox) => boolean;
  similarNote: string | null;
  similar: SimilarResult[] | null;
};

/** The fixed-height result block below a citation's image (description,
 * object/entity/PII/tampering/duplicate lists, "find similar" results) —
 * split out of CitationThumbnailPanel.tsx purely to keep that file under
 * the project's 400-line cap; no behavior changed by the split. */
export default function CitationResultsPanel({ inpaintError, isImageOrVideoOnly, visualAction, captionText, objects, entities, piiTypes, tampering, duplicates, isCovered, similarNote, similar }: Props) {
  const { speaking, toggle: toggleNarration, supported: narrationSupported } = useNarration();
  return (
    // FIXED height, not max-height — see CitationThumbnailPanel.tsx's
    // caller for why (shares a fixed row budget with Evidence's flex-1).
    <div className="overflow-y-auto" style={{ height: 160 }}>
      {inpaintError && (
        <p className="text-[9px] px-3 py-2" style={{ color: TAMPERING_COLOR }}>{inpaintError}</p>
      )}
      {isImageOrVideoOnly && visualAction === "description" && captionText && (
        <div className="px-3 py-2 flex flex-col gap-1">
          {narrationSupported && (
            <button onClick={() => toggleNarration(captionText)}
              className="self-start text-[9px] px-2 py-0.5 rounded border transition-colors hover:bg-white/5"
              style={{ borderColor: "rgba(56,189,248,0.4)", color: "#38bdf8" }}>
              {speaking ? "Stop reading" : "Read aloud"}
            </button>
          )}
          <p className="text-[10px] whitespace-pre-wrap" style={{ color: "rgba(255,255,255,0.6)" }}>{captionText}</p>
        </div>
      )}
      {isImageOrVideoOnly && visualAction === "objects" && objects && objects.length > 0 && (
        <div className="px-3 py-2 flex flex-col gap-1">
          {objects.filter(o => !isCovered(o.bbox)).map((o, i) => (
            <div key={i} className="text-[9px]" style={{ color: "rgba(255,255,255,0.5)" }}>
              {o.label} — {Math.round(o.confidence * 100)}%
            </div>
          ))}
        </div>
      )}
      {isImageOrVideoOnly && visualAction === "entities" && entities && entities.length > 0 && (
        <div className="px-3 py-2 flex flex-col gap-1">
          {entities.map((e, i) => (
            <div key={i} className="text-[9px]" style={{ color: "rgba(255,255,255,0.5)" }}>
              <span style={{ color: "rgba(255,255,255,0.3)" }}>{e.type}:</span> {e.value}
            </div>
          ))}
        </div>
      )}
      {isImageOrVideoOnly && visualAction === "pii" && piiTypes && (
        <p className="text-[9px] px-3 py-2" style={{ color: "#fbbf24" }}>Contains: {piiTypes}</p>
      )}
      {isImageOrVideoOnly && visualAction === "tampering" && tampering && tampering.length > 0 && (
        <div className="px-3 py-2 flex flex-col gap-1">
          <p className="text-[9px]" style={{ color: TAMPERING_COLOR }}>
            Possible tampering — a statistical outlier, not a verdict. Reflective/metallic
            surfaces, spokes, and glossy stickers commonly trigger this too. Verify visually.
          </p>
          {tampering.filter(t => !isCovered(t.bbox)).map((t, i) => (
            <div key={i} className="text-[9px]" style={{ color: "rgba(255,255,255,0.5)" }}>
              Region {i + 1} — {tamperingLevel(t.confidence)} confidence ({Math.round(t.confidence * 100)}%)
            </div>
          ))}
        </div>
      )}
      {isImageOrVideoOnly && visualAction === "duplicates" && duplicates && duplicates.length > 0 && (
        <div className="px-3 py-2 flex flex-col gap-1">
          <p className="text-[9px]" style={{ color: "rgba(255,255,255,0.35)" }}>
            Closely matches other page(s) already uploaded this session:
          </p>
          {duplicates.map((d, i) => (
            <div key={i} className="text-[9px]" style={{ color: "rgba(255,255,255,0.5)" }}>
              {d.source} · Page {d.page} — {Math.round(d.similarity * 100)}% match
            </div>
          ))}
        </div>
      )}
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
