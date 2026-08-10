import { useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";

const SHARPEN_TIMEOUT_MS = 30_000;

/** Fetch/state logic for "Sharpen image" (AI deblur, /rag/mm-deblur) — kept
 * SEPARATE from useInpaint's resultImg/persisted edits on purpose. This is
 * generative (Gemini image editing), not true deconvolution: verified live
 * to produce a crisp, correct result on a synthetic test image, but it CAN
 * invent plausible-but-wrong detail on content that's genuinely lost to
 * real-world blur (see mm_deblur.py). So it must stay a disposable,
 * explicitly-toggled view — never silently become the base image other
 * actions (remove/fill/download) build on, and never persisted across a
 * citation switch.
 *
 * `syncKey` should combine the citation's own editKey with useInpaint's
 * `version` counter (e.g. `${editKey}-${version}`) so a fresh sharpen is
 * required whenever the underlying image changes (a new removal/fill), not
 * just when switching to a different citation — an old sharpened result
 * would otherwise silently point at a since-edited base image. */
export function useSharpen(syncKey: string) {
  const [sharpening, setSharpening] = useState(false);
  const [sharpenedImg, setSharpenedImg] = useState<string | null>(null);
  const [sharpenError, setSharpenError] = useState<string | null>(null);
  const [viewSharpened, setViewSharpened] = useState(true);
  const [syncedKey, setSyncedKey] = useState(syncKey);
  if (syncKey !== syncedKey) {
    setSyncedKey(syncKey);
    setSharpenedImg(null);
    setSharpenError(null);
    setViewSharpened(true);
  }

  const sharpen = async (baseImage: string) => {
    setSharpening(true);
    setSharpenError(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SHARPEN_TIMEOUT_MS);
    try {
      const res = await fetch(`${ML_UNIFIED_API}/rag/mm-deblur`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: baseImage }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSharpenedImg(data.image as string);
      setViewSharpened(true);
    } catch {
      setSharpenError("Sharpen is temporarily unavailable — try again in a moment.");
    } finally {
      clearTimeout(timeout);
      setSharpening(false);
    }
  };

  return { sharpening, sharpenedImg, sharpenError, viewSharpened, setViewSharpened, sharpen };
}