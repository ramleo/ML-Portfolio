import { useCallback, useEffect, useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";

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
  standard: ModelResult;
  adversarial_trained: ModelResult;
};

/** Attacks two small MNIST digit classifiers — one standard-trained, one
 * adversarially-trained (Madry-style PGD-in-the-loop) — with the SAME
 * white-box PGD attack at a chosen epsilon, and reports whether each
 * model was fooled. See mm_robust_training.py's module docstring for the
 * real training/eval numbers behind this demo. */
export function useRobustTrainingDefense() {
  const [samples, setSamples] = useState<SampleDigit[]>([]);
  const [samplesError, setSamplesError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState(0);
  const [epsilon, setEpsilon] = useState(0.2);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RobustTrainingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${ML_UNIFIED_API}/rag/mm-robust-training/samples`)
      .then(res => res.json())
      .then(data => { if (!cancelled) setSamples(data.samples ?? []); })
      .catch(() => { if (!cancelled) setSamplesError("Could not load sample digits."); });
    return () => { cancelled = true; };
  }, []);

  const run = useCallback(async () => {
    setRunning(true);
    setError(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), RUN_TIMEOUT_MS);
    try {
      const res = await fetch(`${ML_UNIFIED_API}/rag/mm-robust-training/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sample_id: selectedId, epsilon }),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.detail || "Attack failed — try again in a moment.");
      setResult(data as RobustTrainingResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Attack failed — try again in a moment.");
    } finally {
      clearTimeout(timeout);
      setRunning(false);
    }
  }, [selectedId, epsilon]);

  return {
    samples, samplesError, selectedId, setSelectedId,
    epsilon, setEpsilon, run, running, result, error,
  };
}
