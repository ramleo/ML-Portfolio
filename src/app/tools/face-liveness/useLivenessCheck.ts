import { useCallback, useRef, useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";

const CHECK_TIMEOUT_MS = 20_000;
const FRAME_COUNT = 4;
const FRAME_INTERVAL_MS = 250;
// A single frame's score near 0.5 is genuinely uninformative — real-world
// testing found a live webcam face scoring 0.52 (near coin-flip) under dim/
// low-contrast conditions, not a rare edge case. Below this margin from 0.5,
// even after averaging several frames, report "uncertain" rather than a
// falsely confident verdict either way.
const UNCERTAIN_MARGIN = 0.15;

export type LivenessResult = {
  foundFace: boolean;
  verdict: "real" | "spoof" | "uncertain" | null;
  score: number | null; // averaged real_score, 0-1
};

/** Pure local ONNX inference (600KB model, no API key, no budget cost).
 * Captures FRAME_COUNT frames (via the caller's captureFrame callback,
 * spaced FRAME_INTERVAL_MS apart) and averages their real_score, rather
 * than trusting a single frame — see mm_liveness.py's check_liveness
 * docstring for why: a single low-confidence frame under real webcam
 * lighting isn't reliable enough to commit to a verdict on its own. */
export function useLivenessCheck() {
  const [checking, setChecking] = useState(false);
  const [progress, setProgress] = useState(0); // frames completed, 0..FRAME_COUNT
  const [result, setResult] = useState<LivenessResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef(false);

  const checkOneFrame = async (b64: string, signal: AbortSignal): Promise<{ foundFace: boolean; score: number | null }> => {
    const res = await fetch(`${ML_UNIFIED_API}/rag/mm-liveness`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: b64 }),
      signal,
    });
    if (!res.ok) throw new Error("request failed");
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return { foundFace: !!data.found_face, score: data.real_score ?? null };
  };

  /** `captureFrame` returns a fresh base64 JPEG each call — the webcam path
   * grabs a new video frame each time; the file-upload path (only one image
   * available) just returns the same photo every time, which still exercises
   * averaging safely since a static image is deterministic across frames. */
  const check = useCallback(async (captureFrame: () => string | null) => {
    setChecking(true);
    setProgress(0);
    setError(null);
    setResult(null);
    cancelRef.current = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);

    try {
      const scores: number[] = [];
      let sawFace = false;
      let anyFrame = false;

      for (let i = 0; i < FRAME_COUNT; i++) {
        if (cancelRef.current) break;
        const b64 = captureFrame();
        if (!b64) continue;
        anyFrame = true;
        const { foundFace, score } = await checkOneFrame(b64, controller.signal);
        if (foundFace) sawFace = true;
        if (score !== null) scores.push(score);
        setProgress(i + 1);
        if (i < FRAME_COUNT - 1) await new Promise(r => setTimeout(r, FRAME_INTERVAL_MS));
      }

      if (!anyFrame) {
        setError("Couldn't capture a frame — try again.");
        return;
      }
      if (!sawFace || scores.length === 0) {
        setResult({ foundFace: false, verdict: null, score: null });
        return;
      }

      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      const verdict: LivenessResult["verdict"] =
        avg >= 0.5 + UNCERTAIN_MARGIN ? "real" : avg <= 0.5 - UNCERTAIN_MARGIN ? "spoof" : "uncertain";
      setResult({ foundFace: true, verdict, score: avg });
    } catch {
      setError("Liveness check failed — try again in a moment.");
    } finally {
      clearTimeout(timeout);
      setChecking(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setProgress(0);
  }, []);

  return { checking, progress, frameCount: FRAME_COUNT, result, error, check, reset };
}
