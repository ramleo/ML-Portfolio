import { useCallback, useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";

const CHECK_TIMEOUT_MS = 20_000;

export type LivenessResult = {
  foundFace: boolean;
  isReal: boolean | null;
  confidence: number | null;
};

/** Pure local ONNX inference (600KB model, no API key, no budget cost) —
 * unlike Text-to-Image/AI-fill, a failed call here is always a real error
 * (network/decode/model), never a rate limit or missing key, so no
 * budget-specific error message is needed like those tools have. */
export function useLivenessCheck() {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<LivenessResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async (b64: string) => {
    setChecking(true);
    setError(null);
    setResult(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);
    try {
      const res = await fetch(`${ML_UNIFIED_API}/rag/mm-liveness`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: b64 }),
        signal: controller.signal,
      });
      if (!res.ok) {
        setError("Liveness check failed — try again in a moment.");
        return;
      }
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      setResult({ foundFace: !!data.found_face, isReal: data.is_real ?? null, confidence: data.confidence ?? null });
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
  }, []);

  return { checking, result, error, check, reset };
}
