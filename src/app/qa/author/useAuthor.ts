import { useCallback, useState } from "react";
import { qaPost } from "../lib/qaClient";

export type GenerateResult = { code: string; provider: string | null };

// Analytics/budget id kept as the original for continuity across the move.
const TOOL_ID = "qa-test-author";

export function useAuthor() {
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
    try {
      const data = await qaPost<{ code?: string; provider?: string | null }>(
        "/qa/author/generate",
        { instructions: steps, base_url: baseUrl.trim(), test_name: testName.trim() },
        { tool: TOOL_ID, meta: { chars: steps.length } },
      );
      const code = data?.code ?? "";
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
      setRunning(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { generate, running, result, error, reset };
}
