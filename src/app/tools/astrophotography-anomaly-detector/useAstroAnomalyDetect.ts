import { useCallback, useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";
import { trackedFetch } from "@/lib/trackedFetch";

const DETECT_TIMEOUT_MS = 60_000;

export type Anomaly = {
  frame_pair: [number, number];
  label: string;
  length_px: number;
  angle_deg: number;
  preview: string;
};

export type AstroAnomalyResult = {
  anomalies: Anomaly[];
  median_stack: string;
  warnings: string[];
  frame_count: number;
};

export function useAstroAnomalyDetect() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<AstroAnomalyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const detect = useCallback(async (images: File[]) => {
    if (images.length < 2) return;
    setRunning(true);
    setError(null);
    setResult(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DETECT_TIMEOUT_MS);
    try {
      const fd = new FormData();
      images.forEach(img => fd.append("images", img));
      const res = await trackedFetch(`${ML_UNIFIED_API}/rag/mm-astro-anomaly/detect`, {
        method: "POST", body: fd, signal: controller.signal,
      }, { tool: "astrophotography-anomaly-detector" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.detail?.[0]?.msg || data?.detail || "Detection failed.");
      setResult(data as AstroAnomalyResult);
    } catch (err) {
      setError(err instanceof Error && err.name === "AbortError" ? "Request timed out — try fewer or smaller photos." : (err as Error).message || "Detection failed.");
    } finally {
      clearTimeout(timeout);
      setRunning(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { detect, running, result, error, reset };
}
