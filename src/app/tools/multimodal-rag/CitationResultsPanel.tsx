"use client";

import type { Bbox, DetectedObject, DuplicateMatch, Entity, StegoResult } from "./_types";
import { tamperingLevel } from "./tamperingLevel";
import { useNarration } from "./useNarration";

const TAMPERING_COLOR = "#f87171"; // same accent as the box overlay in CitationThumbnailPanel

type SimilarResult = { source: string; page: number; similarity: number };
type VisualAction = "" | "description" | "objects" | "faces" | "similar" | "entities" | "pii" | "signatures" | "tampering" | "duplicates" | "plates" | "weapons" | "crowd" | "steganography";

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
  steganography?: StegoResult | null;
  /** "Show what the computer sees" illustration state (useStegoVisualize,
   * owned by CitationThumbnailPanel since it has the current image bytes) —
   * a black/white rendering of one color channel's last bit, NOT a claim
   * about where hidden data is (there's no "where", see mm_steganography.py). */
  stegoVisualizing?: boolean;
  stegoVizImage?: string | null;
  stegoVizError?: string | null;
  onVisualizeStego?: () => void;
  personCount?: number | null;
  /** Restricted-zone plate enforcement — set only when both a zone is
   * marked AND at least one plate exists; drives a violation summary line
   * shown alongside the plate boxes CitationThumbnailPanel already draws. */
  zoneViolationCount?: number | null;
  platesCount?: number | null;
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
export default function CitationResultsPanel({ inpaintError, isImageOrVideoOnly, visualAction, captionText, objects, entities, piiTypes, tampering, duplicates, steganography, stegoVisualizing, stegoVizImage, stegoVizError, onVisualizeStego, personCount, zoneViolationCount, platesCount, isCovered, similarNote, similar }: Props) {
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
              className="self-start text-[9px] px-2 py-0.5 rounded border transition-colors hover:bg-[rgba(var(--fg-rgb),0.05)]"
              style={{ borderColor: "rgba(56,189,248,0.4)", color: "#38bdf8" }}>
              {speaking ? "Stop reading" : "Read aloud"}
            </button>
          )}
          <p className="text-[10px] whitespace-pre-wrap" style={{ color: "var(--text2)" }}>{captionText}</p>
        </div>
      )}
      {isImageOrVideoOnly && visualAction === "objects" && objects && objects.length > 0 && (
        <div className="px-3 py-2 flex flex-col gap-1">
          {objects.filter(o => !isCovered(o.bbox)).map((o, i) => (
            <div key={i} className="text-[9px]" style={{ color: "var(--text2)" }}>
              {o.label} — {Math.round(o.confidence * 100)}%
            </div>
          ))}
        </div>
      )}
      {isImageOrVideoOnly && visualAction === "entities" && entities && entities.length > 0 && (
        <div className="px-3 py-2 flex flex-col gap-1">
          {entities.map((e, i) => (
            <div key={i} className="text-[9px]" style={{ color: "var(--text2)" }}>
              <span style={{ color: "var(--text3)" }}>{e.type}:</span> {e.value}
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
            <div key={i} className="text-[9px]" style={{ color: "var(--text2)" }}>
              Region {i + 1} — {tamperingLevel(t.confidence)} confidence ({Math.round(t.confidence * 100)}%)
            </div>
          ))}
        </div>
      )}
      {isImageOrVideoOnly && visualAction === "plates" && typeof zoneViolationCount === "number" && (
        <div className="px-3 py-2">
          <p className="text-[9px] font-bold" style={{ color: zoneViolationCount > 0 ? "#f87171" : "var(--text2)" }}>
            {zoneViolationCount > 0
              ? `${zoneViolationCount} of ${platesCount} plate${platesCount === 1 ? "" : "s"} inside the restricted zone`
              : `No plates inside the restricted zone (${platesCount} total)`}
          </p>
        </div>
      )}
      {isImageOrVideoOnly && visualAction === "crowd" && typeof personCount === "number" && (
        <div className="px-3 py-2 flex flex-col gap-1">
          <p className="text-[20px] font-bold" style={{ color: "var(--text)" }}>
            {personCount} {personCount === 1 ? "person" : "people"}
          </p>
          <p className="text-[9px]" style={{ color: "var(--text3)" }}>
            The real detected count — not capped like the boxes "Detect objects" draws. Heavy
            overlap/occlusion in a dense crowd can still undercount people hidden behind others.
          </p>
        </div>
      )}
      {isImageOrVideoOnly && visualAction === "steganography" && steganography?.detected && (
        <div className="px-3 py-2 flex flex-col gap-2">
          <p className="text-[20px] font-bold" style={{ color: TAMPERING_COLOR }}>
            {Math.round(steganography.confidence * 100)}% confidence
          </p>
          <p className="text-[9px]" style={{ color: "var(--text3)" }}>
            Every pixel has a color number, and hidden data quietly nudges some of those numbers
            so that certain pairs (like pixels colored 100 vs. 101) show up equally often —
            something a normal photo almost never does on its own. A strong hint, not proof, and
            only works on PNG-style images (a JPEG photo can&apos;t hide data this way).
          </p>
          {!stegoVizImage && (
            <button onClick={onVisualizeStego} disabled={stegoVisualizing}
              className="self-start text-[9px] px-2 py-0.5 rounded border transition-colors hover:bg-[rgba(var(--fg-rgb),0.05)]"
              style={{ borderColor: "rgba(56,189,248,0.4)", color: "#38bdf8", opacity: stegoVisualizing ? 0.5 : 1 }}>
              {stegoVisualizing ? "Generating…" : "Show what the computer sees"}
            </button>
          )}
          {stegoVizError && <p className="text-[9px]" style={{ color: TAMPERING_COLOR }}>{stegoVizError}</p>}
          {stegoVizImage && (
            <div className="flex flex-col gap-1">
              {/* eslint-disable-next-line @next/next/no-img-element -- small on-demand illustration, not the main citation image */}
              <img src={`data:image/png;base64,${stegoVizImage}`} alt="Last bit of each pixel, shown as black or white"
                className="rounded border max-w-[160px]" style={{ borderColor: "var(--border)" }} />
              <p className="text-[9px]" style={{ color: "var(--text3)" }}>
                This is the very last bit of every pixel in one color channel, shown as black or
                white. It&apos;s NOT a picture of the hidden message or where it is — a normal photo
                looks like this same static too. It just makes the invisible thing the detector
                measures visible.
              </p>
            </div>
          )}
        </div>
      )}
      {isImageOrVideoOnly && visualAction === "duplicates" && duplicates && duplicates.length > 0 && (
        <div className="px-3 py-2 flex flex-col gap-1">
          <p className="text-[9px]" style={{ color: "var(--text3)" }}>
            Closely matches other page(s) already uploaded this session:
          </p>
          {duplicates.map((d, i) => (
            <div key={i} className="text-[9px]" style={{ color: "var(--text2)" }}>
              {d.source} · Page {d.page} — {Math.round(d.similarity * 100)}% match
            </div>
          ))}
        </div>
      )}
      {similarNote && (
        <p className="text-[9px] px-3 py-2" style={{ color: "var(--text3)" }}>{similarNote}</p>
      )}
      {similar && (
        <div className="px-3 py-2 flex flex-col gap-1">
          {similar.map((s, i) => (
            <div key={i} className="text-[9px]" style={{ color: "var(--text2)" }}>
              Page {s.page} — {Math.round(s.similarity * 100)}% similar
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
