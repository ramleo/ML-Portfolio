import { useCallback, useState } from "react";
import { qaPost } from "../lib/qaClient";

export type GenerateResult = { code: string; provider: string | null };
export type AssertSuggestion = { title: string; code: string; why: string };

// Analytics/budget id kept as the original for continuity across the move.
const TOOL_ID = "qa-test-author";

export function useAuthor() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<AssertSuggestion[] | null>(null);
  const [suggestError, setSuggestError] = useState<string | null>(null);

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

  const suggestAssertions = useCallback(async (code: string) => {
    const src = code.trim();
    if (!src) return;
    setSuggesting(true);
    setSuggestError(null);
    setSuggestions(null);
    try {
      const data = await qaPost<{ suggestions?: AssertSuggestion[] }>(
        "/qa/author/assertions",
        { code: src },
        { tool: "qa-assertions", meta: { chars: src.length } },
      );
      const list = data?.suggestions ?? [];
      if (!list.length) {
        throw new Error("No new assertions to suggest — the test already covers what it does.");
      }
      setSuggestions(list);
    } catch (err) {
      setSuggestError((err as Error).message || "Could not suggest assertions.");
    } finally {
      setSuggesting(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setSuggestions(null);
    setSuggestError(null);
  }, []);

  return {
    generate, running, result, error, reset,
    suggestAssertions, suggesting, suggestions, suggestError,
  };
}
