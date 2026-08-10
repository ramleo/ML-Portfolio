import { useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";
import type { Bbox } from "./_types";

const SHARPEN_TIMEOUT_MS = 30_000;
// Real Gemini calls measured at ~4-5s (same model as AI-fill, see
// useInpaint.ts's identical constant) — paces a fake bar toward 90% so it
// FEELS alive instead of frozen, then the real response jumps the rest of
// the way. Never claims 100% before the response actually lands.
const SHARPEN_EXPECTED_MS = 5_000;

/** Fetch/state logic for "Sharpen image" (AI deblur, /rag/mm-deblur) — kept
 * SEPARATE from useInpaint's resultImg/persisted edits on purpose. This is
 * generative (Gemini image editing), not true deconvolution: it CAN invent
 * plausible-but-wrong detail on content that's genuinely lost to real-world
 * blur — caught live on a real photo where a blurred license plate came
 * back with invented text (see mm_deblur.py's module docstring for the full
 * story). So it must stay a disposable, explicitly-toggled view — never
 * silently become the base image other actions (remove/fill/download)
 * build on, and never persisted across a citation switch.
 *
 * `bbox` (optional, passed to `sharpen`) scopes the call to just one region
 * — the backend crops, sharpens, and pastes back pixel-exact everywhere
 * outside that box (see mm_deblur.py's `_sharpen_region`), which both lets
 * the user target the actual blurry spot instead of the whole photo AND
 * structurally contains any hallucination to that one region.
 *
 * `syncKey` should combine the citation's own editKey with useInpaint's
 * `version` counter (e.g. `${editKey}-${version}`) so a fresh sharpen is
 * required whenever the underlying image changes (a new removal/fill), not
 * just when switching to a different citation — an old sharpened result
 * would otherwise silently point at a since-edited base image. */
export function useSharpen(syncKey: string) {
  const [sharpening, setSharpening] = useState(false);
  const [sharpenProgress, setSharpenProgress] = useState(0);
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

  const sharpen = async (baseImage: string, bbox?: Bbox) => {
    setSharpening(true);
    setSharpenProgress(0);
    setSharpenError(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SHARPEN_TIMEOUT_MS);
    const startedAt = Date.now();
    const progressTimer = setInterval(() => {
      setSharpenProgress(Math.min(90, ((Date.now() - startedAt) / SHARPEN_EXPECTED_MS) * 90));
    }, 300);
    try {
      const res = await fetch(`${ML_UNIFIED_API}/rag/mm-deblur`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: baseImage, bbox: bbox ?? null }),
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
      clearInterval(progressTimer);
      setSharpening(false);
      setSharpenProgress(0);
    }
  };

  return { sharpening, sharpenProgress, sharpenedImg, sharpenError, viewSharpened, setViewSharpened, sharpen };
}