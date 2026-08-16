import { useCallback, useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";

const REQUEST_TIMEOUT_MS = 30_000;

export type DepthResult = { depthMapUrl: string; width: number; height: number };

/** Pure local ONNX inference (Depth-Anything-V2-Small, ~37MB, no API key, no
 * budget cost). One photo in, one grayscale depth-map PNG back — relative
 * depth only (brighter = nearer), not metric distance. */
export function useDepthEstimate() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DepthResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (b64: string) => {
    setLoading(true);
    setError(null);
    setResult(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(`${ML_UNIFIED_API}/rag/mm-depth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: b64 }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error("request failed");
      const data = await res.json();
      if (data.error || !data.depth_map) throw new Error(data.error || "no depth map returned");
      setResult({ depthMapUrl: `data:image/png;base64,${data.depth_map}`, width: data.width, height: data.height });
    } catch {
      setError("Depth estimation failed — try again in a moment.");
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { loading, result, error, run, reset };
}
