import { useCallback, useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";
import { trackedFetch } from "@/lib/trackedFetch";

const RUN_TIMEOUT_MS = 45_000;

export type PpeStatus = "present" | "missing" | "unclear";
export type PersonResult = {
  box: [number, number, number, number];
  person_confidence: number;
  hardhat: PpeStatus;
  hardhat_confidence: number | null;
  safety_vest: PpeStatus;
  safety_vest_confidence: number | null;
};
export type PpeCheckResult = {
  people: PersonResult[];
  unattributed: { label: string; confidence: number }[];
  annotated_image: string;
  warnings: string[];
};

export function usePpeCompliance() {
  const [preview, setPreview] = useState<string | null>(null);
  const [b64, setB64] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<PpeCheckResult | null>(null);
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
      const res = await trackedFetch(`${ML_UNIFIED_API}/rag/mm-ppe-compliance/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: b64 }),
        signal: controller.signal,
      }, { tool: "ppe-compliance-check" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.detail || "Check failed — try again in a moment.");
      setResult(data as PpeCheckResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check failed — try again in a moment.");
    } finally {
      clearTimeout(timeout);
      setRunning(false);
    }
  }, [b64]);

  return { preview, setImage, reset, run, running, result, error };
}
