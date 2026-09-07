import { useCallback, useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";
import { trackedFetch, trackRunStart, newRunId } from "@/lib/trackedFetch";

const CHECK_TIMEOUT_MS = 25_000;
const TOOL = "prompt-injection-playground";

export type PatternHit = { category: string; description: string; matched_text: string; position: number };
export type LlmVerdict = { is_injection: boolean; confidence: string; category: string; explanation: string };

export type PromptInjectionResult = {
  heuristic_hits: PatternHit[];
  llm_verdict: LlmVerdict | null;
  // False when no judge provider could be reached. Distinct from a null
  // verdict, which on its own cannot say whether the judge cleared the text
  // or never answered. Defaults true for responses from an older backend.
  judge_ran?: boolean;
  overall_risk: string;
  overall_reason: string;
};

export function usePromptInjectionCheck() {
  const [text, setText] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<PromptInjectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async () => {
    if (!text.trim()) return;
    setRunning(true);
    setError(null);
    setResult(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);
    // chars, not the text — the prompt being tested is exactly the kind of
    // content §6 rule 1 keeps out of the analytics table.
    const runId = newRunId();
    trackRunStart(TOOL, runId, { chars: text.length });
    try {
      const res = await trackedFetch(`${ML_UNIFIED_API}/prompt-injection/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      }, { tool: TOOL, runId });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.detail?.[0]?.msg || data?.detail || "Check failed.");
      setResult(data as PromptInjectionResult);
    } catch (err) {
      setError(err instanceof Error && err.name === "AbortError" ? "Request timed out — the LLM judge call took too long." : (err as Error).message || "Check failed.");
    } finally {
      clearTimeout(timeout);
      setRunning(false);
    }
  }, [text]);

  const reset = useCallback(() => {
    setText("");
    setResult(null);
    setError(null);
  }, []);

  return { text, setText, check, running, result, error, reset };
}
