"use client";

import FreehandDrawLayer from "./FreehandDrawLayer";
import type { Bbox } from "./_types";

const ACCENT = "#a78bfa";

type ButtonsProps = {
  sharpening: boolean;
  sharpenedImg: string | null;
  viewSharpened: boolean;
  setViewSharpened: (fn: (v: boolean) => boolean) => void;
  regionMode: boolean;
  setRegionMode: (fn: (v: boolean) => boolean) => void;
  setDrawMode: (v: boolean) => void;
  onSharpenWhole: () => void;
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
 * region-only pass instead. */
export function SharpenButtons({ sharpening, sharpenedImg, viewSharpened, setViewSharpened, regionMode, setRegionMode, setDrawMode, onSharpenWhole }: ButtonsProps) {
  return (
    <>
      <button onClick={onSharpenWhole} disabled={sharpening || regionMode}
        className="text-[9px] px-2 py-0.5 rounded border transition-colors hover:bg-white/5"
        style={{ borderColor: `${ACCENT}40`, color: ACCENT, opacity: sharpening || regionMode ? 0.5 : 1 }}>
        {sharpening && !regionMode ? "Sharpening…" : sharpenedImg ? "Re-sharpen (whole)" : "Sharpen image (AI)"}
      </button>
      <button onClick={() => { setRegionMode(v => !v); setDrawMode(false); }} disabled={sharpening}
        className="text-[9px] px-2 py-0.5 rounded border transition-colors hover:bg-white/5"
        style={regionMode
          ? { borderColor: `${ACCENT}55`, background: `${ACCENT}22`, color: ACCENT }
          : { borderColor: `${ACCENT}40`, color: ACCENT, opacity: sharpening ? 0.5 : 1 }}>
        {regionMode ? "Cancel region" : sharpening ? "Sharpening…" : "Sharpen region…"}
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
  viewSharpened: boolean;
  onRegionComplete: (bbox: Bbox) => void;
};

/** Image-overlay half: the region-draw layer (while picking a region to
 * sharpen), a progress bar while a call is in flight (paced fake progress,
 * same convention as AI-fill's — see useSharpen.ts), and the "AI-enhanced"
 * disclaimer while viewing a sharpened result. Rendered inside the image's
 * relative wrapper, same convention as FreehandDrawLayer/AddContentControls
 * in CitationThumbnailPanel.tsx. */
export function SharpenOverlay({ regionMode, sharpening, sharpenProgress, sharpenedImg, viewSharpened, onRegionComplete }: OverlayProps) {
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
          style={{ background: "rgba(0,0,0,0.55)", color: "rgba(255,255,255,0.7)" }}>
          AI-enhanced — verify against original, may invent detail
        </div>
      )}
    </>
  );
}