"use client";

import { useCallback, useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";

const RUN_TIMEOUT_MS = 60_000; // two VLM read-attempts per request (original + hardened)

export type CaptchaResult = {
  original_answer: string;
  perturbed_answer: string;
  perturbed_image: string; // base64, no data-URL prefix
  original_correct?: boolean;
  perturbed_correct?: boolean;
};

/** Uploads a CAPTCHA image, asks a VLM to read it, applies classic
 * non-gradient hardening (noise + occlusion wave + contrast/color jitter,
 * all scaled by one intensity slider), and asks the VLM to read the
 * hardened version too — see mm_captcha.py's docstring for why this isn't
 * a gradient (FGSM/PGD) attack like the adversarial-robustness-lab tool. */
export function useCaptchaHardening() {
  const [preview, setPreview] = useState<string | null>(null);
  const [b64, setB64] = useState<string | null>(null);
  const [intensity, setIntensity] = useState(50);
  const [groundTruth, setGroundTruth] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<CaptchaResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setImage = useCallback((dataUrl: string) => {
    setPreview(dataUrl);
    setB64(dataUrl.split(",")[1] ?? "");
    setResult(null);
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setPreview(null);
    setB64(null);
    setResult(null);
    setError(null);
  }, []);

  const run = useCallback(async () => {
    if (!b64) return;
    setRunning(true);
    setError(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), RUN_TIMEOUT_MS);
    try {
      const res = await fetch(`${ML_UNIFIED_API}/rag/mm-captcha/solve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: b64, intensity, ground_truth: groundTruth.trim() || null }),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.detail || "Run failed — try again in a moment.");
      setResult(data as CaptchaResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Run failed — try again in a moment.");
    } finally {
      clearTimeout(timeout);
      setRunning(false);
    }
  }, [b64, intensity, groundTruth]);

  return { preview, setImage, reset, intensity, setIntensity, groundTruth, setGroundTruth, run, running, result, error };
}
