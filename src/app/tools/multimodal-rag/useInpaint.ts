import { useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";
import type { Bbox } from "./_types";

const COVERAGE_GRID = 8; // 8x8 sample points — coarse but cheap, plenty for a UI-only check

/** Fraction of `inner`'s own area covered by the UNION of `removed` boxes —
 * used to tell whether a detection's box now points at already-removed
 * (white-filled) space. Checking against the union, not each removed box
 * individually, matters when a region got split across two separate
 * removals (e.g. a "Fish" box overlapping two different goldfish boxes,
 * each removed separately) — no single removal covers 60% alone, but
 * together they cover the whole thing. Point-sampled rather than an exact
 * rectangle-union area calc since this is only a UI hide/show decision. */
function fractionCoveredByUnion(inner: Bbox, removed: Bbox[]): number {
  const [ix, iy, iw, ih] = inner;
  if (iw <= 0 || ih <= 0 || removed.length === 0) return 0;
  let covered = 0;
  for (let gx = 0; gx < COVERAGE_GRID; gx++) {
    for (let gy = 0; gy < COVERAGE_GRID; gy++) {
      const px = ix + (iw * (gx + 0.5)) / COVERAGE_GRID;
      const py = iy + (ih * (gy + 0.5)) / COVERAGE_GRID;
      if (removed.some(([rx, ry, rw, rh]) => px >= rx && px <= rx + rw && py >= ry && py <= ry + rh)) covered++;
    }
  }
  return covered / (COVERAGE_GRID * COVERAGE_GRID);
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

  const isCovered = (bbox: Bbox) => fractionCoveredByUnion(bbox, removedBboxes) >= COVERED_THRESHOLD;

  return { inpainting, resultImg, error, run, reset, isCovered };
}