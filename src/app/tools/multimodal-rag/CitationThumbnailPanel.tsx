"use client";

import { useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";
import type { Bbox, DetectedObject } from "./_types";

const ACCENT = "#a78bfa";
const OBJECT_COLOR = "#34d399"; // distinct from the static table/figure box — a specific answer to "where is the X"

type SimilarResult = { source: string; page: number; similarity: number };

type Props = {
  pageImages: string[];
  page: number | null | undefined;
  chunkType: string | null | undefined;
  /** Page-relative [x,y,w,h] (MMRAG-07) — draws a highlighted rectangle over
   * the exact region a table/figure citation came from. Absent for text
   * citations (the whole page is already the relevant context there). */
  bbox?: Bbox | null;
  /** Every precomputed detection matching the current question's wording
   * (MMRAG-07 follow-up, e.g. "where is the goldfish") — computed by the
   * caller since only it knows what was actually asked. Plural: an image
   * can have more than one detection sharing the matched label (two
   * separate goldfish), and all of them should be highlighted, not just
   * one. Takes priority over `bbox` when both are present (more specific). */
  matchedObjects?: DetectedObject[] | null;
  /** Every precomputed detection on this citation's image/frame (not just
   * the one matching the current question) — powers the "Detect faces"
   * toggle below, which highlights ALL faces found regardless of what was
   * asked. Same detections MMRAG-07's "where is the X" already uses; this
   * is a second, independent way to surface them, no extra vision call. */
  objects?: DetectedObject[] | null;
  source: string;
  /** Whether "find visually similar figures" was enabled at upload time —
   * hides the button entirely instead of showing one that always says
   * "not available" for the common (unchecked) default. */
  canFindSimilar: boolean;
  /** Already-computed AI caption + OCR text for this exact page/frame
   * (NotableChunk.text, from ingest) — no extra call, just surfaced. */
  captionText?: string | null;
  /** True only when the uploaded FILE ITSELF is a standalone image/video
   * (not a PDF's embedded photo/chart) — computed by the caller from the
   * document's chunk-type summary. Swaps the scattered per-action buttons
   * below for a single dropdown; a PDF/mixed-content citation keeps the
   * original buttons untouched. */
  isImageOrVideoOnly: boolean;
};

const TYPE_LABEL: Record<string, string> = { table: "Table", figure: "Figure", text: "Text", image: "Image", video: "Video Frame" };
const FACE_COLOR = "#fbbf24"; // distinct from both the question-match green and the static table/figure accent

type VisualAction = "" | "description" | "objects" | "faces" | "similar";

export default function CitationThumbnailPanel({ pageImages, page, chunkType, bbox, matchedObjects, objects, source, canFindSimilar, captionText, isImageOrVideoOnly }: Props) {
  const [similar, setSimilar] = useState<SimilarResult[] | null>(null);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [similarNote, setSimilarNote] = useState<string | null>(null);
  const [showFaces, setShowFaces] = useState(false);
  const [visualAction, setVisualAction] = useState<VisualAction>("");
  const faces = (objects ?? []).filter(o => o.label === "Human face");

  // Which detections actually draw on the image right now. In image/video-
  // only mode the dropdown (visualAction) decides; otherwise this is exactly
  // the original showFaces/matchedObjects logic, unchanged.
  const facesToShow = isImageOrVideoOnly
    ? (visualAction === "faces" ? faces : [])
    : (showFaces ? faces : []);
  const objectsToShow = isImageOrVideoOnly
    ? (visualAction === "objects" ? (objects ?? []) : visualAction === "faces" ? [] : (matchedObjects ?? []))
    : (showFaces ? [] : (matchedObjects ?? []));

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
        <div className="flex items-center gap-1.5">
          {isImageOrVideoOnly ? (
            <select value={visualAction} onChange={e => {
                const v = e.target.value as VisualAction;
                setVisualAction(v);
                if (v === "similar") findSimilar();
              }}
              className="text-[9px] rounded border"
              style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 7, color: ACCENT, padding: "2px 4px" }}>
              <option value="">Choose an action…</option>
              {captionText && <option value="description">Describe (caption + OCR)</option>}
              {objects && objects.length > 0 && <option value="objects">Detect objects ({objects.length})</option>}
              {faces.length > 0 && <option value="faces">Detect faces ({faces.length})</option>}
              {/* In image/video-only mode the clicked citation might be a
                  sibling "table"/OCR chunk of the same underlying photo
                  (e.g. Mistral OCR misreading the background as a table) —
                  the figure/image chunkType check below only makes sense
                  for a PDF's multiple distinct citation types, so it's
                  skipped here; there's only ever one real photo either way. */}
              {canFindSimilar && (isImageOrVideoOnly || chunkType === "figure" || chunkType === "image") && (
                <option value="similar">Find visually similar</option>
              )}
            </select>
          ) : (
            <>
              {faces.length > 0 && (
                <button onClick={() => setShowFaces(v => !v)}
                  className="text-[9px] px-2 py-0.5 rounded border transition-colors hover:bg-white/5"
                  style={showFaces
                    ? { borderColor: `${FACE_COLOR}55`, background: `${FACE_COLOR}22`, color: FACE_COLOR }
                    : { borderColor: `${FACE_COLOR}40`, color: FACE_COLOR }}>
                  {showFaces ? "Hide faces" : `Detect faces (${faces.length})`}
                </button>
              )}
              {canFindSimilar && (chunkType === "figure" || chunkType === "image") && (
                <button onClick={findSimilar} disabled={loadingSimilar}
                  className="text-[9px] px-2 py-0.5 rounded border transition-colors hover:bg-white/5"
                  style={{ borderColor: `${ACCENT}40`, color: ACCENT, opacity: loadingSimilar ? 0.5 : 1 }}>
                  {loadingSimilar ? "Checking…" : "Find similar figures"}
                </button>
              )}
            </>
          )}
        </div>
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
      <div className="w-full overflow-y-auto" style={{ maxHeight: 460, background: "#0a0f1a" }}>
        <div className="relative w-full">
          <img src={`data:image/png;base64,${img}`} alt={`Page ${page}`} className="w-full block" />
          {/* "Detect faces" takes priority when toggled on — an explicit,
              deliberate request to see every face, regardless of what
              question (if any) was asked. Shows ALL matching detections at
              once, not just one, so it maps over `faces` instead of the
              single-box pattern below.
              In image/video-only mode the dropdown drives which list is
              active instead of the showFaces boolean: "faces" -> facesToShow,
              "objects" -> ALL detections (not just question-matched, a new
              capability), anything else falls back to the existing
              question-driven matchedObjects behavior — unchanged in
              PDF/mixed-content mode. */}
          {facesToShow.length > 0 ? facesToShow.map((f, i) => (
            <div key={i} className="absolute pointer-events-none" style={{
              left: `${f.bbox[0] * 100}%`, top: `${f.bbox[1] * 100}%`,
              width: `${f.bbox[2] * 100}%`, height: `${f.bbox[3] * 100}%`,
              border: `2px solid ${FACE_COLOR}`, borderRadius: 3,
              background: `${FACE_COLOR}18`, boxShadow: `0 0 0 2px rgba(0,0,0,0.4)`,
            }}>
              <span className="absolute text-[9px] font-bold px-1.5 py-0.5 rounded"
                style={{ top: 2, left: 2, background: FACE_COLOR, color: "#0b0b12", whiteSpace: "nowrap" }}>
                Face ({Math.round(f.confidence * 100)}%)
              </span>
            </div>
          )) : objectsToShow.length > 0 ? objectsToShow.map((obj, i) => {
            // OIV7's hierarchical taxonomy (Tire/Wheel/Bicycle wheel etc.)
            // commonly fires several labels on the same physical region —
            // their boxes nearly coincide, so labels pinned at a fixed
            // top:2/left:2 land on the exact same pixels and render as
            // garbled overlapping text. Stack each later-arriving label
            // below the earlier one(s) sharing a near-identical top-left
            // corner instead, so every label stays independently readable.
            let stack = 0;
            for (let j = 0; j < i; j++) {
              if (Math.abs(obj.bbox[0] - objectsToShow[j].bbox[0]) < 0.04
                  && Math.abs(obj.bbox[1] - objectsToShow[j].bbox[1]) < 0.04) stack++;
            }
            return (
              <div key={i} className="absolute pointer-events-none" style={{
                left: `${obj.bbox[0] * 100}%`, top: `${obj.bbox[1] * 100}%`,
                width: `${obj.bbox[2] * 100}%`, height: `${obj.bbox[3] * 100}%`,
                border: `2px solid ${OBJECT_COLOR}`, borderRadius: 3,
                background: `${OBJECT_COLOR}18`, boxShadow: `0 0 0 2px rgba(0,0,0,0.4)`,
              }}>
                {/* Sits INSIDE the box's top edge, not floating above it — a
                    box near the top of the frame (bbox y close to 0, common
                    for a speaker/subject filling most of the shot) would push
                    an above-box label above the image itself, clipped by the
                    container with no way to scroll up to see it. Inside-top
                    placement can never go off-frame, whatever the box's
                    position. */}
                <span className="absolute text-[9px] font-bold px-1.5 py-0.5 rounded"
                  style={{ top: 2 + stack * 16, left: 2, background: OBJECT_COLOR, color: "#0b0b12", whiteSpace: "nowrap" }}>
                  {obj.label} ({Math.round(obj.confidence * 100)}%)
                </span>
              </div>
            );
          }) : bbox && (
            <div className="absolute pointer-events-none" style={{
              left: `${bbox[0] * 100}%`, top: `${bbox[1] * 100}%`,
              width: `${bbox[2] * 100}%`, height: `${bbox[3] * 100}%`,
              border: `2px solid ${ACCENT}`, borderRadius: 3,
              background: `${ACCENT}18`, boxShadow: `0 0 0 2px rgba(0,0,0,0.4)`,
            }} />
          )}
        </div>
      </div>
      {/* Capped + independently scrollable — this sits below a shrink-0
          sibling of the flex-1 Evidence panel in a fixed-height column
          (EvidenceColumn.tsx). An unbounded description/objects/similar
          block here would grow this panel's natural height with whatever
          action was picked, silently stealing space from Evidence every
          time. A fixed cap keeps this panel's footprint (and therefore
          Evidence's share of the column) stable regardless of selection. */}
      <div className="overflow-y-auto" style={{ maxHeight: 160 }}>
        {isImageOrVideoOnly && visualAction === "description" && captionText && (
          <p className="text-[10px] px-3 py-2 whitespace-pre-wrap" style={{ color: "rgba(255,255,255,0.6)" }}>{captionText}</p>
        )}
        {isImageOrVideoOnly && visualAction === "objects" && objects && objects.length > 0 && (
          <div className="px-3 py-2 flex flex-col gap-1">
            {objects.map((o, i) => (
              <div key={i} className="text-[9px]" style={{ color: "rgba(255,255,255,0.5)" }}>
                {o.label} — {Math.round(o.confidence * 100)}%
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
    </div>
  );
}