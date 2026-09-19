import { useCallback, useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";
import { trackedFetch, trackRunStart, newRunId } from "@/lib/trackedFetch";

const GEN_TIMEOUT_MS = 30_000;

export type GenerateResult = { code: string; provider: string | null };

export function useQaTestAuthor() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (
    instructions: string,
    baseUrl: string,
    testName: string,
  ) => {
    const steps = instructions.trim();
    if (!steps) return;

    setRunning(true);
    setError(null);
    setResult(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GEN_TIMEOUT_MS);
    const runId = newRunId();
    trackRunStart("qa-test-author", runId, { chars: steps.length });
    try {
      const res = await trackedFetch(`${ML_UNIFIED_API}/qa-test-author/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instructions: steps,
          base_url: baseUrl.trim(),
          test_name: testName.trim(),
        }),
        signal: controller.signal,
      }, { tool: "qa-test-author", runId, meta: { chars: steps.length } });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.detail?.[0]?.msg || data?.detail || "Generation failed.");
      }
      const code: string = data?.code ?? "";
      if (!code) {
        throw new Error("The model didn't return a usable test. Try rephrasing your steps and generating again.");
      }
      setResult({ code, provider: data?.provider ?? null });
    } catch (err) {
      setError(
        err instanceof Error && err.name === "AbortError"
          ? "Request timed out. Try again."
          : (err as Error).message || "Generation failed.",
      );
    } finally {
      clearTimeout(timeout);
      setRunning(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { generate, running, result, error, reset };
}
