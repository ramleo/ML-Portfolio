import { useCallback, useEffect, useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";
import { trackedFetch } from "@/lib/trackedFetch";

const RUN_TIMEOUT_MS = 20_000;

export type SampleDigit = { id: number; label: number; image_b64: string };
export type ModelResult = {
  clean_pred: number;
  clean_conf: number;
  adv_pred: number;
  adv_conf: number;
  fooled: boolean;
  adversarial_image: string;
};
export type RobustTrainingResult = {
  label: number;
  preprocessed_image?: string; // only present for an uploaded photo
  standard: ModelResult;
  adversarial_trained: ModelResult;
};

/** Attacks two small MNIST digit classifiers — one standard-trained, one
 * adversarially-trained (Madry-style PGD-in-the-loop) — with the SAME
 * white-box PGD attack at a chosen epsilon, and reports whether each
 * model was fooled. Source can be a bundled sample digit OR a user photo
 * (preprocessed server-side: grayscale, auto-invert, crop-to-ink, center,
 * resize to 28x28 — see mm_robust_training.py's _preprocess_upload). See
 * that module's docstring for the real training/eval numbers behind this
 * demo, and its honest caveat that a real photo is out-of-distribution
 * input for a model trained only on clean MNIST. */
export function useRobustTrainingDefense() {
  const [samples, setSamples] = useState<SampleDigit[]>([]);
  const [samplesError, setSamplesError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState(0);
  const [epsilon, setEpsilon] = useState(0.2);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RobustTrainingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [mode, setMode] = useState<"sample" | "upload">("sample");
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadB64, setUploadB64] = useState<string | null>(null);
  const [intendedLabel, setIntendedLabel] = useState(0);

  useEffect(() => {
    let cancelled = false;
    trackedFetch(`${ML_UNIFIED_API}/rag/mm-robust-training/samples`, undefined, { tool: "adversarial-robustness-lab" })
      .then(res => res.json())
      .then(data => { if (!cancelled) setSamples(data.samples ?? []); })
      .catch(() => { if (!cancelled) setSamplesError("Could not load sample digits."); });
    return () => { cancelled = true; };
  }, []);

  const setUploadImage = useCallback((dataUrl: string) => {
    setUploadPreview(dataUrl);
    setUploadB64(dataUrl.split(",")[1] ?? "");
    setResult(null);
    setError(null);
  }, []);

  const clearUpload = useCallback(() => {
    setUploadPreview(null);
    setUploadB64(null);
    setResult(null);
    setError(null);
  }, []);

  const run = useCallback(async () => {
    if (mode === "upload" && !uploadB64) return;
    setRunning(true);
    setError(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), RUN_TIMEOUT_MS);
    try {
      const url = mode === "upload"
        ? `${ML_UNIFIED_API}/rag/mm-robust-training/run-upload`
        : `${ML_UNIFIED_API}/rag/mm-robust-training/run`;
      const body = mode === "upload"
        ? { image: uploadB64, intended_label: intendedLabel, epsilon }
        : { sample_id: selectedId, epsilon };
      const res = await trackedFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      }, { tool: "adversarial-robustness-lab" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.detail || "Attack failed — try again in a moment.");
      setResult(data as RobustTrainingResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Attack failed — try again in a moment.");
    } finally {
      clearTimeout(timeout);
      setRunning(false);
    }
  }, [mode, selectedId, uploadB64, intendedLabel, epsilon]);

  return {
    samples, samplesError, selectedId, setSelectedId,
    epsilon, setEpsilon, run, running, result, error,
    mode, setMode,
    uploadPreview, setUploadImage, clearUpload,
    intendedLabel, setIntendedLabel,
  };
}
