import { useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";
import type { Bbox, PersistedEdit } from "./_types";
import { compositeOntoImage, loadImageFile } from "./imageComposite";

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
const AI_FILL_TIMEOUT_MS = 30_000; // real Gemini calls measured at ~4-5s; generous margin for a slow one
// There's no real server-reported progress (one request, one response) — this
// paces a fake bar toward 90% over the typical ~5s call so it FEELS alive
// instead of frozen, then the actual response jumps it the rest of the way.
// Never claims 100% until the real result is back.
const AI_FILL_EXPECTED_MS = 5_000;

/** Fetch/state logic for "remove this detected region" (Image Inpainting &
 * Object Remover) AND for adding content back into an already-removed
 * region (text / pasted image / AI-fill) — split out of
 * CitationThumbnailPanel.tsx so that file (already near its 400-line cap)
 * only needs a few lines of glue. All three add-content paths mutate the
 * SAME resultImg/removedBboxes state removal already owns, rather than
 * living in a separate competing hook.
 *
 * State is seeded from `initialEdit` and bubbled back up via `onChange` so
 * the caller (ultimately MmRagRunner's `documents` state) can persist it
 * across citation switches — this component instance stays mounted while
 * the user clicks between citations, so `editKey` (source:page) tells the
 * logic below when to re-sync local state to a *different* citation's
 * persisted edit (or lack of one), rather than keep showing the previous
 * citation's result. In-memory only — resets on page reload, by design. */
export function useInpaint(
  imageB64: string | null,
  editKey: string,
  initialEdit: PersistedEdit | undefined,
  onChange: (edit: PersistedEdit | null) => void,
) {
  const [inpainting, setInpainting] = useState(false);
  const [aiFilling, setAiFilling] = useState(false);
  const [aiFillProgress, setAiFillProgress] = useState(0);
  const [resultImg, setResultImg] = useState<string | null>(initialEdit?.image ?? null);
  const [error, setError] = useState<string | null>(null);
  const [removedBboxes, setRemovedBboxes] = useState<Bbox[]>(initialEdit?.removedBboxes ?? []);
  const [filledIndices, setFilledIndices] = useState<number[]>(initialEdit?.filledIndices ?? []);
  // Bumped on every edit (and on reset) — the caller uses this in the <img>'s
  // React `key` to force a full element remount instead of an in-place `src`
  // mutation. A same-node src swap left the image showing blank (verified:
  // the new base64 decoded to the correct picture, but the live DOM node
  // rendered nothing) after add-text/add-image/AI-fill on a large page image
  // inside this scrollable/composited container — a stale-repaint bug a
  // remount sidesteps entirely rather than chasing the browser's paint path.
  const [version, setVersion] = useState(0);
  // Tracks which citation the state above belongs to. Adjusted DURING render
  // (React's documented pattern for "reset state when a prop changes")
  // rather than in a useEffect — an effect would let the previous
  // citation's image flash on screen for one frame before the re-sync fires.
  const [syncedKey, setSyncedKey] = useState(editKey);
  if (syncedKey !== editKey) {
    setSyncedKey(editKey);
    setResultImg(initialEdit?.image ?? null);
    setRemovedBboxes(initialEdit?.removedBboxes ?? []);
    setFilledIndices(initialEdit?.filledIndices ?? []);
    setError(null);
  }

  const persist = (image: string, bboxes: Bbox[], filled: number[]) => {
    setResultImg(image);
    setRemovedBboxes(bboxes);
    setFilledIndices(filled);
    setVersion(v => v + 1);
    onChange({ image, removedBboxes: bboxes, filledIndices: filled });
  };

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
      persist(data.image as string, [...removedBboxes, bbox], filledIndices);
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
    setFilledIndices([]);
    setVersion(v => v + 1);
    onChange(null);
  };

  const addText = async (index: number, text: string) => {
    if (!resultImg || !text.trim()) return;
    const bbox = removedBboxes[index];
    try {
      const next = await compositeOntoImage(resultImg, bbox, (ctx, rect) => {
        ctx.fillStyle = "#111";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `${Math.max(10, rect.h * 0.28)}px sans-serif`;
        ctx.fillText(text, rect.x + rect.w / 2, rect.y + rect.h / 2, rect.w * 0.92);
      });
      persist(next, removedBboxes, [...filledIndices, index]);
    } catch {
      setError("Could not add that text right now.");
    }
  };

  const addImage = async (index: number, file: File) => {
    if (!resultImg) return;
    const bbox = removedBboxes[index];
    try {
      const pasted = await loadImageFile(file);
      const next = await compositeOntoImage(resultImg, bbox, (ctx, rect) => {
        // Contain-fit: scale the pasted image to fit inside the region
        // without distorting its aspect ratio, centered.
        const scale = Math.min(rect.w / pasted.naturalWidth, rect.h / pasted.naturalHeight);
        const w = pasted.naturalWidth * scale, h = pasted.naturalHeight * scale;
        ctx.drawImage(pasted, rect.x + (rect.w - w) / 2, rect.y + (rect.h - h) / 2, w, h);
      });
      persist(next, removedBboxes, [...filledIndices, index]);
    } catch {
      setError("Could not add that image right now.");
    }
  };

  const addAiFill = async (index: number, prompt: string) => {
    if (!resultImg) return;
    const bbox = removedBboxes[index];
    setAiFilling(true);
    setAiFillProgress(0);
    setError(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AI_FILL_TIMEOUT_MS);
    const startedAt = Date.now();
    const progressTimer = setInterval(() => {
      // Caps at 90 — the last 10% is reserved for the real response landing,
      // so the bar never lies about being done before it actually is.
      setAiFillProgress(Math.min(90, ((Date.now() - startedAt) / AI_FILL_EXPECTED_MS) * 90));
    }, 300);
    try {
      const res = await fetch(`${ML_UNIFIED_API}/rag/mm-ai-fill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: resultImg, bbox, prompt: prompt || null }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      persist(data.image as string, removedBboxes, [...filledIndices, index]);
    } catch {
      setError("AI fill is temporarily unavailable — try again in a moment.");
    } finally {
      clearTimeout(timeout);
      clearInterval(progressTimer);
      setAiFilling(false);
      setAiFillProgress(0);
    }
  };

  const isCovered = (bbox: Bbox) => fractionCoveredByUnion(bbox, removedBboxes) >= COVERED_THRESHOLD;

  return {
    inpainting, aiFilling, aiFillProgress, resultImg, error, run, reset, isCovered, version,
    removedBboxes, filledIndices, addText, addImage, addAiFill,
  };
}