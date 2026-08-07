"use client";

import { useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";
import type { Bbox, DetectedObject, DuplicateMatch, Entity } from "./_types";

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
  /** Named entities (person/org/location) already extracted from this exact
   * citation's text (MMRAG-26) — only ever populated when the citation was
   * clicked from an Evidence card (the richer retrieval-time metadata);
   * null from the auto-shown preview or a document-summary click, same as
   * any other data this dropdown gates on being present. */
  entities?: Entity[] | null;
  /** Comma-ish string naming PII types found in this citation's text (e.g.
   * "email, phone") — already computed at ingest (NotableChunk.piiTypes),
   * same field RagSourceCard already flags elsewhere; just not previously
   * surfaced in this per-image dropdown. */
  piiTypes?: string | null;
  /** Detected handwritten-signature regions (backlog item 1) — own model/
   * vocabulary from `objects`, same {label,confidence,bbox} shape, same
   * sibling-media-chunk fallback as objects/entities/piiTypes upstream. */
  signatures?: DetectedObject[] | null;
  /** Suspicious ELA (Error Level Analysis) regions (backlog item 2) — same
   * {label,confidence,bbox} shape as objects/signatures, but a compression-
   * error heuristic rather than a labeled detector; own field, own color,
   * own dropdown option. */
  tampering?: DetectedObject[] | null;
  /** Near-duplicate matches (backlog item 3) — perceptual-hash comparison
   * against every image already uploaded this session, computed at ingest
   * like signatures/tampering above. No bbox: a match is "this whole image
   * closely matches that whole other page," not a sub-region, so it renders
   * as a plain list (same shape as `similar` below), not a box overlay. */
  duplicates?: DuplicateMatch[] | null;
};

const TYPE_LABEL: Record<string, string> = { table: "Table", figure: "Figure", text: "Text", image: "Image", video: "Video Frame" };
const FACE_COLOR = "#fbbf24"; // distinct from both the question-match green and the static table/figure accent
const SIGNATURE_COLOR = "#f472b6"; // distinct from face/object/bbox accents
const TAMPERING_COLOR = "#f87171"; // red-toned — distinct "warning" accent from the other detection colors

type VisualAction = "" | "description" | "objects" | "faces" | "similar" | "entities" | "pii" | "signatures" | "tampering" | "duplicates";

export default function CitationThumbnailPanel({ pageImages, page, chunkType, bbox, matchedObjects, objects, source, canFindSimilar, captionText, isImageOrVideoOnly, entities, piiTypes, signatures, tampering, duplicates }: Props) {
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
  const signaturesToShow = isImageOrVideoOnly && visualAction === "signatures" ? (signatures ?? []) : [];
  const tamperingToShow = isImageOrVideoOnly && visualAction === "tampering" ? (tampering ?? []) : [];
  const objectsToShow = isImageOrVideoOnly
    ? (visualAction === "objects" ? (objects ?? [])
      : (visualAction === "faces" || visualAction === "signatures" || visualAction === "tampering") ? [] : (matchedObjects ?? []))
    : (showFaces ? [] : (matchedObjects ?? []));

  // Shared box+label overlay renderer — faces/objects/signatures all draw
  // the identical shape (absolute box + inside-top label pill), differing
  // only in color and label text. Three near-identical JSX blocks crossed
  // from "a little repetition" into worth factoring once signatures made
  // it a third copy.
  const renderBoxes = (list: DetectedObject[], color: string, labelFor: (o: DetectedObject) => string) =>
    list.map((o, i) => {
      // Stack any label whose box is close enough that the two label pills
      // would likely overlap — not just near-identical top-left corners.
      // Several same-type detections (e.g. tampering regions) often sit
      // side-by-side at similar height, not stacked diagonally, so both
      // axes need a wider catch than "basically the same box."
      let stack = 0;
      for (let j = 0; j < i; j++) {
        if (Math.abs(o.bbox[0] - list[j].bbox[0]) < 0.18 && Math.abs(o.bbox[1] - list[j].bbox[1]) < 0.05) stack++;
      }
      return (
        <div key={i} className="absolute pointer-events-none" style={{
          left: `${o.bbox[0] * 100}%`, top: `${o.bbox[1] * 100}%`,
          width: `${o.bbox[2] * 100}%`, height: `${o.bbox[3] * 100}%`,
          border: `2px solid ${color}`, borderRadius: 3,
          background: `${color}18`, boxShadow: `0 0 0 2px rgba(0,0,0,0.4)`,
        }}>
          <span className="absolute text-[9px] font-bold px-1.5 py-0.5 rounded"
            style={{ top: 2 + stack * 16, left: 2, background: color, color: "#0b0b12", whiteSpace: "nowrap" }}>
            {labelFor(o)}
          </span>
        </div>
      );
    });

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
              {entities && entities.length > 0 && <option value="entities">Key facts ({entities.length})</option>}
              {piiTypes && <option value="pii">PII detected</option>}
              {signatures && signatures.length > 0 && <option value="signatures">Detect signatures ({signatures.length})</option>}
              {tampering && tampering.length > 0 && <option value="tampering">Check for tampering ({tampering.length})</option>}
              {duplicates && duplicates.length > 0 && <option value="duplicates">Possible duplicate ({duplicates.length})</option>}
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
          {facesToShow.length > 0
            ? renderBoxes(facesToShow, FACE_COLOR, f => `Face (${Math.round(f.confidence * 100)}%)`)
            : signaturesToShow.length > 0
            ? renderBoxes(signaturesToShow, SIGNATURE_COLOR, s => `Signature (${Math.round(s.confidence * 100)}%)`)
            : tamperingToShow.length > 0
            ? renderBoxes(tamperingToShow, TAMPERING_COLOR, t => `${Math.round(t.confidence * 100)}%`)
            : objectsToShow.length > 0
            ? renderBoxes(objectsToShow, OBJECT_COLOR, obj => `${obj.label} (${Math.round(obj.confidence * 100)}%)`)
            : bbox && (
            <div className="absolute pointer-events-none" style={{
              left: `${bbox[0] * 100}%`, top: `${bbox[1] * 100}%`,
              width: `${bbox[2] * 100}%`, height: `${bbox[3] * 100}%`,
              border: `2px solid ${ACCENT}`, borderRadius: 3,
              background: `${ACCENT}18`, boxShadow: `0 0 0 2px rgba(0,0,0,0.4)`,
            }} />
          )}
        </div>
      </div>
      {/* FIXED height, not max-height — this block sits in a row that
          shares one fixed total budget with Evidence's flex-1 (see
          EvidenceColumn.tsx). A max-height cap still lets this block go
          from 0 (nothing selected) to 160 (an action selected), and that
          growth comes straight out of Evidence's share every time. A fixed
          height means this reserves the same 160px always — blank when
          there's nothing to show, scrolls internally when there's more
          than fits — so the row's total height, and therefore Evidence's
          share, never moves regardless of what's selected. */}
      <div className="overflow-y-auto" style={{ height: 160 }}>
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
              Possible tampering — signs of possible editing, not a certainty. Verify visually.
            </p>
            {tampering.map((t, i) => (
              <div key={i} className="text-[9px]" style={{ color: "rgba(255,255,255,0.5)" }}>
                Region {i + 1} — {Math.round(t.confidence * 100)}% confidence
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
    </div>
  );
}