import { useRef, useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";
import type { Bbox } from "./_types";
import { trackedFetch, trackRunStart, newRunId } from "@/lib/trackedFetch";

// A region-scoped call makes FOUR sequential network calls on the backend
// (two independent Gemini generations for corroboration + one OCR read
// each, see mm_deblur.py's `_sharpen_region`) instead of whole-image's one
// — both the abort timeout and the fake-progress pacing below account for
// that, keyed on whether `bbox` was passed to `sharpen`.
const SHARPEN_TIMEOUT_MS = 60_000;
const SHARPEN_EXPECTED_MS_WHOLE = 5_000; // single Gemini call, ~4-5s measured (same model as AI-fill)
const SHARPEN_EXPECTED_MS_REGION = 14_000; // two Gemini + two OCR calls, roughly in sequence

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
  // Only ever populated for a region-scoped call — the corroboration check
  // (two independent Gemini attempts + OCR agreement) only runs there; a
  // whole-image sharpen has no confidence/text opinion, see mm_deblur.py.
  const [sharpenConfidence, setSharpenConfidence] = useState<"high" | "low" | null>(null);
  const [sharpenText, setSharpenText] = useState<string | null>(null);
  // Only populated for a region-scoped call whose corroboration check found
  // a non-text graphic (see mm_deblur.py's `_describe_region`) — a single,
  // uncorroborated vision-model opinion of what the region shows, distinct
  // from `sharpenText` (which is only ever set after two independent OCR
  // readings agreed).
  const [sharpenDescription, setSharpenDescription] = useState<string | null>(null);
  const [sharpenError, setSharpenError] = useState<string | null>(null);
  const [viewSharpened, setViewSharpened] = useState(true);
  // Lets `cancelSharpen` (called from a user-clicked Cancel button, outside
  // the async `sharpen` function's own scope) reach the in-flight request's
  // controller. A ref, not state — aborting doesn't need a re-render itself,
  // the abort's own effects (catch block firing) already trigger one.
  const abortRef = useRef<AbortController | null>(null);
  const cancelledRef = useRef(false);
  const [syncedKey, setSyncedKey] = useState(syncKey);
  if (syncKey !== syncedKey) {
    setSyncedKey(syncKey);
    setSharpenedImg(null);
    setSharpenConfidence(null);
    setSharpenText(null);
    setSharpenDescription(null);
    setSharpenError(null);
    setViewSharpened(true);
  }

  const sharpen = async (baseImage: string, bbox?: Bbox) => {
    cancelledRef.current = false;
    setSharpening(true);
    setSharpenProgress(0);
    setSharpenError(null);
    const controller = new AbortController();
    abortRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), SHARPEN_TIMEOUT_MS);
    const startedAt = Date.now();
    const expectedMs = bbox ? SHARPEN_EXPECTED_MS_REGION : SHARPEN_EXPECTED_MS_WHOLE;
    const progressTimer = setInterval(() => {
      setSharpenProgress(Math.min(90, ((Date.now() - startedAt) / expectedMs) * 90));
    }, 300);
    const runId = newRunId();
    trackRunStart("mmrag-sharpen", runId, { region: !!bbox });
    try {
      const res = await trackedFetch(`${ML_UNIFIED_API}/rag/mm-deblur`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: baseImage, bbox: bbox ?? null }),
        signal: controller.signal,
      }, { tool: "mmrag-sharpen", runId, meta: { region: !!bbox } });
      if (!res.ok) throw new Error(res.status === 429 ? "rate_limited" : "failed");
      const data = await res.json();
      setSharpenedImg(data.image as string);
      setSharpenConfidence((data.confidence as "high" | "low" | undefined) ?? null);
      setSharpenText((data.text as string | undefined) ?? null);
      setSharpenDescription((data.description as string | undefined) ?? null);
      setViewSharpened(true);
    } catch (err) {
      // Note: the backend keeps running its (already-dispatched) Gemini/OCR
      // calls to completion even after this abort — cancelling only stops
      // the CLIENT from waiting on/showing a result, there's no server-side
      // cancellation. Fine for a best-effort feature; just wasted compute.
      const isRateLimited = err instanceof Error && err.message === "rate_limited";
      setSharpenError(
        cancelledRef.current ? "Sharpen cancelled."
        : isRateLimited ? "Sharpen is rate-limited right now — the image model has hit its usage quota. Try again in a few minutes."
        : "Sharpen is temporarily unavailable — try again in a moment."
      );
    } finally {
      clearTimeout(timeout);
      clearInterval(progressTimer);
      setSharpening(false);
      setSharpenProgress(0);
      abortRef.current = null;
    }
  };

  const cancelSharpen = () => {
    cancelledRef.current = true;
    abortRef.current?.abort();
  };

  return { sharpening, sharpenProgress, sharpenedImg, sharpenConfidence, sharpenText, sharpenDescription,
    sharpenError, viewSharpened, setViewSharpened, sharpen, cancelSharpen };
}