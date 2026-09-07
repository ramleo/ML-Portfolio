"use client";

import { useState, useCallback } from "react";
import { type TrainResult, type Explanation, type LLMProvider } from "@/lib/automlUtils";
import { ML_UNIFIED_API } from "@/config/urls";
import { trackedFetch, trackRunStart, newRunId } from "@/lib/trackedFetch";

// Maps LLMProvider to /api/ai-tools provider+model (used for Vercel fallback only)
function mapProvider(
  llmProvider: LLMProvider,
  customLLMModel: string,
): { provider: string; model: string } {
  switch (llmProvider) {
    case "gemini-2.5":   return { provider: "gemini",  model: "gemini-2.5-flash" };
    case "anthropic":    return { provider: "claude",  model: "claude-haiku-4-5-20251001" };
    case "openai":       return { provider: "openai",  model: "gpt-4o-mini" };
    // Both Llama names were retired by Groq and 404'd. The two options stay
    // distinct so an existing saved preference still resolves to something.
    case "groq":         return { provider: "groq",    model: "qwen/qwen3.8-27b" };
    case "groq-mixtral": return { provider: "groq",    model: "qwen/qwen3.6-27b" };
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
  const normalize = (parsed: Record<string, unknown>): Explanation | null => {
    if ("why_won" in parsed) {
      return {
        ...parsed,
        recommendations:     toArr(parsed.recommendations),
        model_comparison:    toArr(parsed.model_comparison),
        actionable_insights: toArr(parsed.actionable_insights),
      } as Explanation;
    }
    for (const val of Object.values(parsed)) {
      if (val && typeof val === "object" && "why_won" in (val as object)) {
        return normalize(val as Record<string, unknown>);
      }
    }
    return null;
  };

  const tryParse = (s: string): Explanation | null => {
    try {
      let parsed = JSON.parse(s);
      if (typeof parsed === "string") parsed = JSON.parse(parsed);
      if (parsed && typeof parsed === "object") return normalize(parsed as Record<string, unknown>);
    } catch { /* ignore */ }
    return null;
  };

  const direct = tryParse(text);
  if (direct) return direct;

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
  const lastClose = cleaned.lastIndexOf("}");
  if (lastClose > start) {
    const result = tryParse(cleaned.slice(start, lastClose + 1));
    if (result) return result;
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
  const [ragUsed,     setRagUsed]     = useState(false);

  const handleExplain = useCallback(async () => {
    if (!trainResult?.automl) return;

    // Declared once for the whole action so the primary call and the fallback
    // share it — see the fallback comment below.
    const runId = newRunId();
    trackRunStart("automl-explain", runId, { provider: llmProvider });

    setLlmLoading(true);
    setLlmExp(null);
    setLlmError(null);
    setRagUsed(false);
    setLlmProgress(8);

    const interval = setInterval(() => {
      setLlmProgress(p => (p < 85 ? p + Math.random() * 7 : p));
    }, 500);

    try {
      // Primary: FastAPI /explain — RAG-enhanced; injects KB context about the winning algorithm
      if (ML_UNIFIED_API) {
        const body: Record<string, unknown> = {
          automl_data:  trainResult.automl,
          provider:     llmProvider,
        };
        if (userApiKey?.trim())       body.user_api_key    = userApiKey.trim();
        if (customLLMUrl?.trim())     body.custom_base_url = customLLMUrl.trim();
        if (customLLMModel?.trim())   body.custom_model    = customLLMModel.trim();

        try {
          const res = await trackedFetch(`${ML_UNIFIED_API}/explain`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify(body),
          }, { tool: "automl-explain", runId, meta: { provider: llmProvider } });
          if (res.ok) {
            const data = await res.json() as { explanation?: Explanation; source?: string; rag_used?: boolean };
            if (data.explanation?.why_won) {
              setLlmExp({
                ...data.explanation,
                recommendations:     toArr(data.explanation.recommendations),
                model_comparison:    toArr(data.explanation.model_comparison),
                actionable_insights: toArr(data.explanation.actionable_insights),
              });
              setRagUsed(data.rag_used ?? false);
              setLlmProgress(100);
              return;
            }
          }
        } catch { /* network error — fall through to Vercel path */ }
      }

      // Fallback: /api/ai-tools (Vercel, no RAG) — used when backend unreachable
      const { provider, model } = mapProvider(llmProvider, customLLMModel);
      const prompt = buildPrompt(trainResult.automl);

      const fallbackBody: Record<string, unknown> = {
        messages:  [{ role: "user", content: prompt }],
        provider,
        model: (customLLMUrl?.trim() && customLLMModel?.trim()) ? customLLMModel.trim() : model,
        userKey:   userApiKey || undefined,
        jsonMode:  true,
        maxTokens: 3000,
      };
      if (customLLMUrl?.trim() && userApiKey?.trim()) fallbackBody.baseUrl = customLLMUrl.trim();

      // The fallback path. Same run_id on purpose: this is the same user
      // action, and keeping the id makes "primary failed, fallback served"
      // one readable sequence rather than two unrelated runs.
      const res = await trackedFetch("/api/ai-tools", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(fallbackBody),
      }, { tool: "automl-explain", runId, meta: { path: "fallback" } });

      const data = await res.json() as { reply?: string; error?: string };

      if (data.error) {
        setLlmError(data.error);
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
          setLlmError("AI returned an unreadable response. Try regenerating.");
          if (trainResult?.automl?.explanation) {
            setLlmExp(trainResult.automl.explanation as Explanation);
          }
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

  return { llmExp, llmLoading, llmProgress, llmError, ragUsed, handleExplain, setLlmExp };
}