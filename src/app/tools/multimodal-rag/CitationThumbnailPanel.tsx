"use client";

import { useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";
import { useInpaint } from "./useInpaint";
import { useSharpen } from "./useSharpen";
import CitationResultsPanel from "./CitationResultsPanel";
import FreehandDrawLayer from "./FreehandDrawLayer";
import AddContentControls from "./AddContentControls";
import DetectionBoxOverlay from "./DetectionBoxOverlay";
import { downloadBase64Image } from "./imageComposite";
import { tamperingLevel } from "./tamperingLevel";
import type { Bbox, DetectedObject, DuplicateMatch, Entity, PersistedEdit } from "./_types";

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
  /** This document's persisted region-removal edits (Image Inpainting &
   * Object Remover), keyed by page number as a string — lifted up to
   * MmRagRunner's `documents` state so an edit survives switching to a
   * different citation and back, not just local component state. */
  edits?: Record<string, PersistedEdit>;
  /** Persists (or clears, on reset) this page's edit into the parent doc. */
  onEditChange?: (page: number, edit: PersistedEdit | null) => void;
};

const TYPE_LABEL: Record<string, string> = { table: "Table", figure: "Figure", text: "Text", image: "Image", video: "Video Frame" };
const FACE_COLOR = "#fbbf24"; // distinct from both the question-match green and the static table/figure accent
const SIGNATURE_COLOR = "#f472b6"; // distinct from face/object/bbox accents
const TAMPERING_COLOR = "#f87171"; // red-toned — distinct "warning" accent from the other detection colors

type VisualAction = "" | "description" | "objects" | "faces" | "similar" | "entities" | "pii" | "signatures" | "tampering" | "duplicates";

export default function CitationThumbnailPanel({ pageImages, page, chunkType, bbox, matchedObjects, objects, source, canFindSimilar, captionText, isImageOrVideoOnly, entities, piiTypes, signatures, tampering, duplicates, edits, onEditChange }: Props) {
  const [similar, setSimilar] = useState<SimilarResult[] | null>(null);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [similarNote, setSimilarNote] = useState<string | null>(null);
  const [showFaces, setShowFaces] = useState(false);
  const [visualAction, setVisualAction] = useState<VisualAction>("");
  // "Draw region" (freehand mask drawing) — stays on across multiple draws,
  // same as detected-box removal already chains; user explicitly toggles
  // off via "Stop drawing" when done.
  const [drawMode, setDrawMode] = useState(false);
  const faces = (objects ?? []).filter(o => o.label === "Human face");
  // "Remove object" (Image Inpainting & Object Remover) — a disposable edit
  // over whichever page image is currently shown; called with a `page` on
  // Props (not `img`, only computed after the early return below) since the
  // hook must run unconditionally on every render.
  const currentImg = page && page >= 1 && page <= pageImages.length ? pageImages[page - 1] : null;
  // editKey (source:page) tells useInpaint when the viewed citation itself
  // changed vs. just a re-render, so it re-syncs local state to THAT
  // citation's persisted edit (or lack of one) instead of keeping the
  // previous citation's result on screen.
  const editKey = `${source}:${page ?? ""}`;
  const {
    inpainting, aiFilling, aiFillProgress, resultImg, error: inpaintError, run: runInpaint, reset: resetInpaint, isCovered, version,
    removedBboxes, filledIndices, addText, addImage, addAiFill,
  } = useInpaint(
    currentImg, editKey, page ? edits?.[String(page)] : undefined,
    edit => page && onEditChange?.(page, edit),
  );
  // Keyed on editKey+version, not editKey alone — any removal/fill (which
  // bumps version) invalidates a previously sharpened result, since it was
  // sharpened against a now-stale base image. See useSharpen.ts.
  const { sharpening, sharpenedImg, sharpenError, viewSharpened, setViewSharpened, sharpen } =
    useSharpen(`${editKey}-${version}`);

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

  // Shared box+label overlay renderer (faces/objects/signatures/tampering
  // all draw the identical shape) — factored out into DetectionBoxOverlay.tsx
  // once this file neared its 400-line cap.
  const renderBoxes = (fullList: DetectedObject[], color: string, labelFor: (o: DetectedObject) => string, allowRemove = true) => (
    <DetectionBoxOverlay list={fullList} color={color} labelFor={labelFor} allowRemove={allowRemove}
      canEdit={canEdit} inpainting={inpainting} isCovered={isCovered} runInpaint={runInpaint} />
  );

  if (!page || page < 1 || page > pageImages.length) return null;
  const img = pageImages[page - 1];
  // Draw/remove/add-content/download/reset only ever need A page image and
  // a bbox — useInpaint and the backend (/rag/mm-inpaint, /rag/mm-ai-fill)
  // are already generic over file type, they just take an image+bbox in
  // and an image out. `isImageOrVideoOnly` gated this whole toolbar too,
  // which meant a PDF page's own figure/table/text citations could never
  // be edited even though `pageImages[page-1]` is exactly as valid an image
  // for them as it is for a standalone photo. `canEdit` is always true past
  // this point (the guard above already confirmed a real page image
  // exists) — kept as its own const, not inlined as `true`, so the
  // conditions below still document WHY editing is allowed rather than
  // reading as a stray boolean literal.
  const canEdit = true;

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
          ) : null}
          {canEdit && (
            <button onClick={() => setDrawMode(v => !v)}
              className="text-[9px] px-2 py-0.5 rounded border transition-colors hover:bg-white/5"
              style={drawMode
                ? { borderColor: `${ACCENT}55`, background: `${ACCENT}22`, color: ACCENT }
                : { borderColor: `${ACCENT}40`, color: ACCENT }}>
              {drawMode ? "Stop drawing" : "Draw region"}
            </button>
          )}
          {/* No longer gated on the "blurry" heuristic (blur.py) — that's a
              WHOLE-IMAGE score, so a photo that's mostly sharp with only a
              small locally-blurred area (e.g. a deliberately blurred logo/
              plate on an otherwise crisp product photo) never trips it.
              Always available instead, same as Draw region/Download —
              already safe to expose unconditionally since it's labeled,
              non-destructive, and toggleable. */}
          {canEdit && !sharpenedImg && (
            <button onClick={() => sharpen(resultImg ?? img)} disabled={sharpening}
              className="text-[9px] px-2 py-0.5 rounded border transition-colors hover:bg-white/5"
              style={{ borderColor: `${ACCENT}40`, color: ACCENT, opacity: sharpening ? 0.5 : 1 }}>
              {sharpening ? "Sharpening…" : "Sharpen image (AI)"}
            </button>
          )}
          {sharpenedImg && (
            <button onClick={() => setViewSharpened(v => !v)}
              className="text-[9px] px-2 py-0.5 rounded border transition-colors hover:bg-white/5"
              style={{ borderColor: `${ACCENT}40`, color: ACCENT }}>
              {viewSharpened ? "View original" : "View sharpened"}
            </button>
          )}
          {canEdit && resultImg && (
            <button onClick={() => downloadBase64Image(resultImg, `${source.replace(/\.[^/.]+$/, "")}-page${page}-edited.png`)}
              className="text-[9px] px-2 py-0.5 rounded border transition-colors hover:bg-white/5"
              style={{ borderColor: `${ACCENT}40`, color: ACCENT }}>
              Download
            </button>
          )}
          {canEdit && resultImg && (
            <button onClick={resetInpaint}
              className="text-[9px] px-2 py-0.5 rounded border transition-colors hover:bg-white/5"
              style={{ borderColor: `${ACCENT}40`, color: ACCENT }}>
              Reset
            </button>
          )}
          {!isImageOrVideoOnly && (
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
          <img key={`${editKey}-${version}`}
            src={sharpenedImg && viewSharpened
              ? `data:image/png;base64,${sharpenedImg}`
              : resultImg ? `data:image/png;base64,${resultImg}` : `data:image/png;base64,${img}`}
            alt={`Page ${page}`} className="w-full block" style={{ opacity: inpainting ? 0.5 : 1 }} />
          {/* AI-sharpened is generative, not a real deconvolution — can
              invent plausible-but-wrong detail on genuinely lost content
              (see mm_deblur.py). Never silently swapped in: always labeled,
              always one click from the original via "View original" above. */}
          {sharpenedImg && viewSharpened && (
            <div className="absolute left-0 right-0 bottom-0 pointer-events-none text-center text-[9px] py-1"
              style={{ background: "rgba(0,0,0,0.55)", color: "rgba(255,255,255,0.7)" }}>
              AI-enhanced — verify against original, may invent detail
            </div>
          )}
          {/* Boxes stay visible even after a removal — bbox/mask positions
              for the OTHER detections are still accurate, and keeping them
              clickable is what lets multiple regions be removed one after
              another (each click chains onto the already-edited image, see
              useInpaint.ts). Re-clicking an already-removed region's box is
              harmless (re-fills the same now-white area, a no-op). */}
          <>
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
            ? renderBoxes(tamperingToShow, TAMPERING_COLOR, t => tamperingLevel(t.confidence), false)
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
          </>
          {/* Freehand region drawing — the alternative to clicking a
              detected box's own ✕. Rendered LAST so it paints on top and
              captures every pointer event over the image while active,
              including over the boxes above (no separate disable needed).
              Skipped while a removal request is already in flight. */}
          {canEdit && drawMode && !inpainting && (
            <FreehandDrawLayer onComplete={(regionBbox, mask) => runInpaint(regionBbox, mask)} />
          )}
          {/* "+" affordance to add text/an image/an AI fill back into an
              already-removed region — mutually exclusive with draw mode,
              same reasoning as FreehandDrawLayer above (both want the
              image's pointer events for their own purpose). */}
          {canEdit && !drawMode && (
            <AddContentControls removedBboxes={removedBboxes} filledIndices={filledIndices} aiFilling={aiFilling}
              aiFillProgress={aiFillProgress}
              onAddText={addText} onAddImage={addImage} onAddAiFill={addAiFill} />
          )}
        </div>
      </div>
      <CitationResultsPanel inpaintError={inpaintError || sharpenError} isImageOrVideoOnly={isImageOrVideoOnly}
        visualAction={visualAction} captionText={captionText} objects={objects} entities={entities}
        piiTypes={piiTypes} tampering={tampering} duplicates={duplicates} isCovered={isCovered}
        similarNote={similarNote} similar={similar} />
    </div>
  );
}