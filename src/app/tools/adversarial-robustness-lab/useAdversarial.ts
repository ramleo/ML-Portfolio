import { useCallback, useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";

const RUN_TIMEOUT_MS = 45_000;

export type Prediction = { label: string; confidence: number; top3: { label: string; confidence: number }[] };
export type AdversarialResult = {
  original: Prediction & { heatmap: string };
  adversarial: Prediction & {
    fooled: boolean; image: string; heatmap: string;
    target_label?: string; target_achieved?: boolean;
  };
  defended: Prediction & { recovered: boolean; disrupted: boolean; image: string };
  smoothed: Prediction & { recovered: boolean; disrupted: boolean; vote_confidence: number; num_samples: number; sigma: number };
  perturbation_preview: string;
};

export type AttackMethod = "fgsm" | "pgd";

/** Runs a full attack+defense cycle in one request against a pretrained
 * ImageNet classifier: craft an adversarial perturbation (FGSM or PGD),
 * classify the result, then run a JPEG-recompression defense and classify
 * that too. See mm_adversarial.py's module docstring for why the defense
 * is reported honestly as partial/unreliable, not a guaranteed fix. */
export function useAdversarial() {
  const [preview, setPreview] = useState<string | null>(null);
  const [b64, setB64] = useState<string | null>(null);
  const [epsilon, setEpsilon] = useState(0.03);
  const [method, setMethod] = useState<AttackMethod>("fgsm");
  const [jpegQuality, setJpegQuality] = useState(50);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<AdversarialResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[] | null>(null);
  const [targetLabel, setTargetLabel] = useState<string>("");

  const loadCategories = useCallback(() => {
    if (categories !== null) return;
    fetch(`${ML_UNIFIED_API}/rag/mm-adversarial/categories`)
      .then(res => res.json())
      .then(data => setCategories(Array.isArray(data?.categories) ? data.categories : []))
      .catch(() => setCategories([]));
  }, [categories]);

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
      const res = await fetch(`${ML_UNIFIED_API}/rag/mm-adversarial/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: b64, epsilon, method, jpeg_quality: jpegQuality,
          target_label: targetLabel.trim() || null,
        }),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.detail || "Run failed — try again in a moment.");
      setResult(data as AdversarialResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Run failed — try again in a moment.");
    } finally {
      clearTimeout(timeout);
      setRunning(false);
    }
  }, [b64, epsilon, method, jpegQuality, targetLabel]);

  return {
    preview, setImage, reset, epsilon, setEpsilon, method, setMethod, jpegQuality, setJpegQuality,
    run, running, result, error,
    categories, loadCategories, targetLabel, setTargetLabel,
  };
}
