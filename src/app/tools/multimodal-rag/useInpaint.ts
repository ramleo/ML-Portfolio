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

type PersistedEdit = { image: string; removedBboxes: Bbox[] };

/** Fetch/state logic for "remove this detected region" (Image Inpainting &
 * Object Remover), split out of CitationThumbnailPanel.tsx so that file
 * (already near its 400-line cap) only needs a few lines of glue: call the
 * hook, wire `run`/`reset` to a button, swap the displayed image for
 * `resultImg` once ready.
 *
 * State is seeded from `initialEdit` and bubbled back up via `onChange` so
 * the caller (ultimately MmRagRunner's `documents` state) can persist it
 * across citation switches — this component instance stays mounted while
 * the user clicks between citations, so `editKey` (source:page) tells the
 * effect below when to re-sync local state to a *different* citation's
 * persisted edit (or lack of one), rather than keep showing the previous
 * citation's result. In-memory only — resets on page reload, by design. */
export function useInpaint(
  imageB64: string | null,
  editKey: string,
  initialEdit: PersistedEdit | undefined,
  onChange: (edit: PersistedEdit | null) => void,
) {
  const [inpainting, setInpainting] = useState(false);
  const [resultImg, setResultImg] = useState<string | null>(initialEdit?.image ?? null);
  const [error, setError] = useState<string | null>(null);
  const [removedBboxes, setRemovedBboxes] = useState<Bbox[]>(initialEdit?.removedBboxes ?? []);
  // Tracks which citation the state above belongs to. Adjusted DURING render
  // (React's documented pattern for "reset state when a prop changes")
  // rather than in a useEffect — an effect would let the previous
  // citation's image flash on screen for one frame before the re-sync fires.
  const [syncedKey, setSyncedKey] = useState(editKey);
  if (syncedKey !== editKey) {
    setSyncedKey(editKey);
    setResultImg(initialEdit?.image ?? null);
    setRemovedBboxes(initialEdit?.removedBboxes ?? []);
    setError(null);
  }

  const run = async (bbox: Bbox, mask?: [number, number][] | null) => {
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
      const nextImg = data.image as string;
      const nextBboxes = [...removedBboxes, bbox];
      setResultImg(nextImg);
      setRemovedBboxes(nextBboxes);
      onChange({ image: nextImg, removedBboxes: nextBboxes });
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
    onChange(null);
  };

  const isCovered = (bbox: Bbox) => fractionCoveredByUnion(bbox, removedBboxes) >= COVERED_THRESHOLD;

  return { inpainting, resultImg, error, run, reset, isCovered };
}
