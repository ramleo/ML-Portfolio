import { useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";
import type { Bbox } from "./_types";

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
    } catch {
      setError("Could not remove that region right now.");
    } finally {
      setInpainting(false);
    }
  };

  const reset = () => {
    setResultImg(null);
    setError(null);
  };

  return { inpainting, resultImg, error, run, reset };
}