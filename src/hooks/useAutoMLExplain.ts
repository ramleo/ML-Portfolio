"use client";

import { useState, useCallback } from "react";
import { type TrainResult, type Explanation, type LLMProvider } from "@/lib/automlUtils";

// Maps LLMProvider to /api/ai-tools provider+model
// baseUrl is NOT returned here — it is sourced directly from customLLMUrl in handleExplain
function mapProvider(
  llmProvider: LLMProvider,
  customLLMModel: string,
): { provider: string; model: string } {
  switch (llmProvider) {
    case "gemini-2.5":   return { provider: "gemini",  model: "gemini-2.5-flash" };
    case "anthropic":    return { provider: "claude",  model: "claude-haiku-4-5-20251001" };
    case "openai":       return { provider: "openai",  model: "gpt-4o-mini" };
    case "groq":         return { provider: "groq",    model: "llama-3.3-70b-versatile" };
    case "groq-mixtral": return { provider: "groq",    model: "llama-3.1-8b-instant" };
    default:             return { provider: "gemini",  model: "gemini-2.5-flash" };
  }
}

function buildPrompt(automl: TrainResult["automl"]): string {
  const winner  = automl.winner;
  const cv      = automl.cv_results
    .map((r: { algorithm: string; score: number }) => `${r.algorithm}: ${r.score.toFixed(4)}`)
    .join(", ");
  const featImp = (automl.feature_importance ?? [])
    .slice(0, 5)
    .map((f: { feature: string }) => f.feature)
    .join(", ");

  return `You are an ML expert. Explain the AutoML competition results in JSON.
Winner: ${winner}
CV Results: ${cv}
Task: ${automl.task} (${automl.selection_metric})
Top features: ${featImp}
Rows: ${automl.n_rows ?? "unknown"}

Return ONLY a JSON object with exactly these fields:
{"why_won":"2-3 sentences on why ${winner} outperformed others — cite score margins","score_analysis":"1-2 sentences on score meaning and reliability","key_drivers":"1-2 sentences on what features/patterns drove the win","recommendations":[{"title":"short title","detail":"specific suggestion"}],"model_comparison":[{"algorithm":"algorithm name exactly as given","fitness_score":85,"reason":"1 sentence on why this score — 0-100 scale where 100=perfect fit"}],"actionable_insights":[{"title":"short title","detail":"specific action"}]}`;
}

function toArr<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function extractJson(text: string): Explanation | null {
  const tryParse = (s: string): Explanation | null => {
    try {
      let parsed = JSON.parse(s);
      if (typeof parsed === "string") parsed = JSON.parse(parsed); // handle double-encoded
      if (parsed && typeof parsed === "object" && "why_won" in parsed) {
        // Normalize array fields — Gemini sometimes returns strings instead of arrays
        return {
          ...parsed,
          recommendations:    toArr(parsed.recommendations),
          model_comparison:   toArr(parsed.model_comparison),
          actionable_insights: toArr(parsed.actionable_insights),
        } as Explanation;
      }
    } catch { /* ignore */ }
    return null;
  };

  const direct = tryParse(text);
  if (direct) return direct;

  // Strip markdown fences then bracket-depth extract
  const cleaned = text.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < cleaned.length; i++) {
    if (cleaned[i] === "{") depth++;
    else if (cleaned[i] === "}") {
      depth--;
      if (depth === 0) {
        const result = tryParse(cleaned.slice(start, i + 1));
        if (result) return result;
        break;
      }
    }
  }
  return null;
}

export function useAutoMLExplain(
  trainResult: TrainResult | null,
  llmProvider: LLMProvider,
  userApiKey: string,
  customLLMUrl: string,
  customLLMModel: string,
) {
  const [llmExp,      setLlmExp]      = useState<Explanation | null>(null);
  const [llmLoading,  setLlmLoading]  = useState(false);
  const [llmProgress, setLlmProgress] = useState(0);
  const [llmError,    setLlmError]    = useState<string | null>(null);

  const handleExplain = useCallback(async () => {
    if (!trainResult?.automl) return;

    setLlmLoading(true);
    setLlmExp(null);
    setLlmError(null);
    setLlmProgress(8);

    const interval = setInterval(() => {
      setLlmProgress(p => (p < 85 ? p + Math.random() * 7 : p));
    }, 500);

    try {
      const { provider, model } = mapProvider(llmProvider, customLLMModel);
      const prompt = buildPrompt(trainResult.automl);

      const body: Record<string, unknown> = {
        messages:  [{ role: "user", content: prompt }],
        provider,
        model: (customLLMUrl?.trim() && customLLMModel?.trim()) ? customLLMModel.trim() : model,
        userKey:   userApiKey || undefined,
        jsonMode:  true,
        maxTokens: 3000,
      };
      if (customLLMUrl?.trim()) body.baseUrl = customLLMUrl.trim();

      const res = await fetch("/api/ai-tools", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });

      const data = await res.json() as { reply?: string; error?: string };

      if (data.error) {
        setLlmError(data.error);
        // Fall back to the rule-based explanation computed at training time
        if (trainResult?.automl?.explanation) {
          setLlmExp(trainResult.automl.explanation as Explanation);
        }
        return;
      }

      if (data.reply) {
        const parsed = extractJson(data.reply);
        if (parsed) {
          setLlmExp(parsed);
        } else {
          // Reply came back but wasn't valid JSON — show raw text in why_won
          setLlmExp({
            why_won:          data.reply,
            score_analysis:   "",
            key_drivers:      "",
            recommendations:  [],
          });
        }
      } else {
        setLlmError("No response received from the AI provider.");
      }

      setLlmProgress(100);
    } catch (e) {
      setLlmError(e instanceof Error ? e.message : "Explanation request failed.");
    } finally {
      clearInterval(interval);
      setLlmLoading(false);
    }
  }, [trainResult, llmProvider, userApiKey, customLLMUrl, customLLMModel]);

  return { llmExp, llmLoading, llmProgress, llmError, handleExplain, setLlmExp };
}
