import { useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";
import type { Bbox } from "./_types";

/** Fraction of `inner`'s own area that overlaps `outer` — used to tell
 * whether a detection's box now points at an already-removed (white-filled)
 * area, e.g. "Bicycle wheel" sitting entirely inside a removed "Bicycle"
 * box. Fraction, not exact containment, since sibling detections (a tire
 * vs. its wheel) rarely share pixel-exact bounds. */
function overlapFraction(inner: Bbox, outer: Bbox): number {
  const [ix, iy, iw, ih] = inner;
  const [ox, oy, ow, oh] = outer;
  const x0 = Math.max(ix, ox), y0 = Math.max(iy, oy);
  const x1 = Math.min(ix + iw, ox + ow), y1 = Math.min(iy + ih, oy + oh);
  const w = Math.max(0, x1 - x0), h = Math.max(0, y1 - y0);
  const innerArea = iw * ih;
  return innerArea > 0 ? (w * h) / innerArea : 0;
}

const COVERED_THRESHOLD = 0.6;

/** Fetch/state logic for "remove this detected region" (Image Inpainting &
 * Object Remover), split out of CitationThumbnailPanel.tsx so that file
 * (already near its 400-line cap) only needs a few lines of glue: call the
 * hook, wire `run`/`reset` to a button, swap the displayed image for
 * `resultImg` once ready. A disposable preview edit — never persisted, gone
 * on citation change (the caller re-mounts/re-calls this per image). */
export function useInpaint(imageB64: string | null) {
  const [inpainting, setInpainting] = useState(false);
  const [resultImg, setResultImg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Every region removed so far this session, oldest first — lets the
  // caller hide/disable OTHER detections whose box now mostly overlaps
  // already-white space (e.g. removing the whole "Bicycle" box should also
  // stop showing its "Bicycle wheel" sub-detections, not just itself).
  const [removedBboxes, setRemovedBboxes] = useState<Bbox[]>([]);

  const run = async (bbox: Bbox, mask?: [number, number][] | null) => {
    // Chain onto the already-edited image (if any) rather than always the
    // original — otherwise removing a second region would overwrite the
    // first instead of stacking both removals onto the same image.
    const base = resultImg ?? imageB64;
    if (!base) return;
    setInpainting(true);
    setError(null);
    try {
      const res = await fetch(`${ML_UNIFIED_API}/rag/mm-inpaint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base, bbox, mask: mask ?? null }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setResultImg(data.image as string);
      setRemovedBboxes(prev => [...prev, bbox]);
    } catch {
      setError("Could not remove that region right now.");
    } finally {
      setInpainting(false);
    }
  };

  const reset = () => {
    setResultImg(null);
    setError(null);
    setRemovedBboxes([]);
  };

  const isCovered = (bbox: Bbox) => removedBboxes.some(r => overlapFraction(bbox, r) >= COVERED_THRESHOLD);

  return { inpainting, resultImg, error, run, reset, isCovered };
}