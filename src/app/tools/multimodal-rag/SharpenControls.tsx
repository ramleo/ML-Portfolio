"use client";

import FreehandDrawLayer from "./FreehandDrawLayer";
import type { Bbox } from "./_types";

const ACCENT = "#a78bfa";
const WARNING_COLOR = "#f87171"; // same red-toned accent used for tampering warnings and the low-confidence caption below

type ButtonsProps = {
  sharpening: boolean;
  sharpenedImg: string | null;
  viewSharpened: boolean;
  setViewSharpened: (fn: (v: boolean) => boolean) => void;
  regionMode: boolean;
  setRegionMode: (fn: (v: boolean) => boolean) => void;
  setDrawMode: (v: boolean) => void;
  onSharpenWhole: () => void;
  onCancel: () => void;
};

/** Header-row trigger buttons for AI-sharpen: whole-image, region-only
 * (toggles SharpenOverlay's draw layer below), and an original/sharpened
 * view toggle once a result exists. Split from SharpenOverlay only because
 * they render in a different DOM location (the header's button row vs.
 * inside the image's relative wrapper) — both pieces share state owned by
 * useSharpen.ts in the parent (CitationThumbnailPanel.tsx).
 *
 * Re-sharpening (whole or a different region) stays available even after a
 * result exists, rather than hiding behind a Reset — the first attempt
 * hallucinating in one spot (see mm_deblur.py's module docstring for the
 * real incident this guards against) shouldn't block trying a narrower
 * region-only pass instead.
 *
 * While a call is in flight, the trigger buttons are replaced by a single
 * Cancel — simpler than three separately-disabled buttons, and gives the
 * user an actual way out of a slow region call (four sequential backend
 * calls, see useSharpen.ts) instead of just waiting out the 60s timeout. */
export function SharpenButtons({ sharpening, sharpenedImg, viewSharpened, setViewSharpened, regionMode, setRegionMode, setDrawMode, onSharpenWhole, onCancel }: ButtonsProps) {
  if (sharpening) {
    return (
      <button onClick={onCancel}
        className="text-[9px] px-2 py-0.5 rounded border transition-colors hover:bg-white/5"
        style={{ borderColor: `${WARNING_COLOR}55`, color: WARNING_COLOR }}>
        Cancel sharpening
      </button>
    );
  }
  return (
    <>
      <button onClick={onSharpenWhole} disabled={regionMode}
        className="text-[9px] px-2 py-0.5 rounded border transition-colors hover:bg-white/5"
        style={{ borderColor: `${ACCENT}40`, color: ACCENT, opacity: regionMode ? 0.5 : 1 }}>
        {sharpenedImg ? "Re-sharpen (whole)" : "Sharpen image (AI)"}
      </button>
      <button onClick={() => { setRegionMode(v => !v); setDrawMode(false); }}
        className="text-[9px] px-2 py-0.5 rounded border transition-colors hover:bg-white/5"
        style={regionMode
          ? { borderColor: `${ACCENT}55`, background: `${ACCENT}22`, color: ACCENT }
          : { borderColor: `${ACCENT}40`, color: ACCENT }}>
        {regionMode ? "Cancel region" : "Sharpen region…"}
      </button>
      {sharpenedImg && (
        <button onClick={() => setViewSharpened(v => !v)}
          className="text-[9px] px-2 py-0.5 rounded border transition-colors hover:bg-white/5"
          style={{ borderColor: `${ACCENT}40`, color: ACCENT }}>
          {viewSharpened ? "View original" : "View sharpened"}
        </button>
      )}
    </>
  );
}

type OverlayProps = {
  regionMode: boolean;
  sharpening: boolean;
  sharpenProgress: number;
  sharpenedImg: string | null;
  sharpenConfidence: "high" | "low" | null;
  sharpenText: string | null;
  sharpenDescription: string | null;
  viewSharpened: boolean;
  onRegionComplete: (bbox: Bbox) => void;
};

/** Image-overlay half: the region-draw layer (while picking a region to
 * sharpen), a progress bar while a call is in flight (paced fake progress,
 * same convention as AI-fill's — see useSharpen.ts), and a disclaimer while
 * viewing a sharpened result. Rendered inside the image's relative wrapper,
 * same convention as FreehandDrawLayer/AddContentControls in
 * CitationThumbnailPanel.tsx.
 *
 * The disclaimer itself depends on `sharpenConfidence` (only ever set for a
 * region-scoped result, see mm_deblur.py's corroboration check): "high"
 * means two independent AI attempts read the same text, worth surfacing as
 * an actual finding; "low" means they disagreed, which is the stronger,
 * more specific warning than the generic whole-image one — that disagreement
 * is direct evidence the content is unrecoverable, not just a blanket
 * caveat. When the region was classified as a non-text graphic instead (no
 * OCR agreement possible), `sharpenDescription` — a single, uncorroborated
 * vision-model opinion of what the region shows (see mm_deblur.py's
 * `_describe_region`) — is shown instead of the plain generic line, still
 * labeled as an identification to verify rather than a confirmed fact. `null`
 * for both (whole-image, or the description call itself failed) falls back
 * to the original generic wording. */
export function SharpenOverlay({ regionMode, sharpening, sharpenProgress, sharpenedImg, sharpenConfidence, sharpenText, sharpenDescription, viewSharpened, onRegionComplete }: OverlayProps) {
  return (
    <>
      {regionMode && !sharpening && (
        <FreehandDrawLayer onComplete={bbox => onRegionComplete(bbox)} />
      )}
      {sharpening && (
        <div className="absolute left-2 right-2 bottom-2 rounded overflow-hidden pointer-events-none"
          style={{ height: 4, background: "rgba(255,255,255,0.15)" }}>
          <div className="h-full transition-all" style={{ width: `${sharpenProgress}%`, background: ACCENT }} />
        </div>
      )}
      {sharpenedImg && viewSharpened && !sharpening && (
        <div className="absolute left-0 right-0 bottom-0 pointer-events-none text-center text-[9px] py-1"
          style={sharpenConfidence === "low"
            ? { background: "rgba(0,0,0,0.7)", color: WARNING_COLOR }
            : { background: "rgba(0,0,0,0.55)", color: "rgba(255,255,255,0.7)" }}>
          {sharpenConfidence === "high" && sharpenText
            ? `Confirmed by two independent AI reads: "${sharpenText}" — still verify against original`
            : sharpenConfidence === "low"
            ? "Two independent AI attempts disagreed — likely unreliable, do not trust this detail"
            : sharpenDescription
            ? `Identified as: "${sharpenDescription}" — unverified, single AI opinion`
            : "AI-enhanced — verify against original, may invent detail"}
        </div>
      )}
    </>
  );
}