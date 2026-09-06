import { useCallback, useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";
import { trackedFetch, trackRunStart, newRunId } from "@/lib/trackedFetch";

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
    const runId = newRunId();
    trackRunStart("ai-code-detector", runId, { chars: code.length });
    try {
      const res = await trackedFetch(`${ML_UNIFIED_API}/ai-code-detect/judge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
        signal: controller.signal,
      }, { tool: "ai-code-detector", runId, meta: { chars: code.length } });
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
