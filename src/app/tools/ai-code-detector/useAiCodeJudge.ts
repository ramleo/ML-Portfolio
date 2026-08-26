import { useCallback, useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";

const JUDGE_TIMEOUT_MS = 25_000;

export type AiCodeJudgeVerdict = { assessment: string; confidence: string; explanation: string } | null;

export function useAiCodeJudge() {
  const [running, setRunning] = useState(false);
  const [verdict, setVerdict] = useState<AiCodeJudgeVerdict | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const judge = useCallback(async (code: string) => {
    if (!code.trim()) return;
    setRunning(true);
    setError(null);
    setVerdict(undefined);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), JUDGE_TIMEOUT_MS);
    try {
      const res = await fetch(`${ML_UNIFIED_API}/ai-code-detect/judge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.detail?.[0]?.msg || data?.detail || "Judge call failed.");
      setVerdict(data as AiCodeJudgeVerdict);
    } catch (err) {
      setError(err instanceof Error && err.name === "AbortError" ? "Request timed out." : (err as Error).message || "Judge call failed.");
    } finally {
      clearTimeout(timeout);
      setRunning(false);
    }
  }, []);

  const reset = useCallback(() => {
    setVerdict(undefined);
    setError(null);
  }, []);

  return { judge, running, verdict, error, reset };
}
