"use client";

import { useCallback, useState } from "react";
import { ColInfo, NUM_TRANSFORMS } from "@/lib/feAlgorithms";

interface UseFEAISuggestParams {
  numCols: ColInfo[];
  rawRows: string[][];
  setColTransforms: (fn: (prev: Record<string, string[]>) => Record<string, string[]>) => void;
}

export function useFEAISuggest({ numCols, rawRows, setColTransforms }: UseFEAISuggestParams) {
  const [aiSuggestLoading, setAiSuggestLoading] = useState(false);
  const [aiSuggestError, setAiSuggestError]     = useState<string | null>(null);

  function extractTransformJSON(raw: string): Record<string, string[]> | null {
    const attempts = [
      raw.trim(),
      (raw.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [])[1]?.trim(),
      (raw.match(/\{[\s\S]*\}/) ?? [])[0],
    ];
    for (const candidate of attempts) {
      if (!candidate) continue;
      try { return JSON.parse(candidate) as Record<string, string[]>; } catch { /* try next */ }
    }
    return null;
  }

  const aiSuggest = useCallback(async () => {
    if (aiSuggestLoading || numCols.length === 0) return;
    setAiSuggestLoading(true);
    setAiSuggestError(null);
    const n = rawRows.length - 1;
    const colSummaries = numCols.map(col => {
      const valid = col.values.filter(v => v !== null) as number[];
      const sorted = [...valid].sort((a, b) => a - b);
      const min = sorted[0] ?? 0;
      const max = sorted[sorted.length - 1] ?? 0;
      const mean = valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : 0;
      const q1 = sorted[Math.floor(sorted.length * 0.25)] ?? 0;
      const q3 = sorted[Math.floor(sorted.length * 0.75)] ?? 0;
      return `${col.name}: skew=${col.skew.toFixed(2)}, missing=${((col.missing / n) * 100).toFixed(1)}%, min=${min.toFixed(2)}, max=${max.toFixed(2)}, mean=${mean.toFixed(2)}, Q1=${q1.toFixed(2)}, Q3=${q3.toFixed(2)}`;
    }).join("\n");

    const prompt = `Output a single raw JSON object — no markdown, no code fences, no explanation. Keys are column names, values are arrays of transform keys from this list: log1p, sqrt, zscore, minmax, percentile, outlier_flag, missing_flag, winsor, above_mean, bin_equal, bin_quantile.

Column statistics:
${colSummaries}

Example output: {"Age":["missing_flag","log1p"],"Fare":["winsor","zscore"]}`;

    try {
      const res = await fetch("/api/ai-tools", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }],
          provider: "cohere",
          jsonMode: true,
          toolContext: "Feature Engineering — AI Suggest transform selection. Return only raw JSON.",
        }),
      });
      const data = await res.json();
      if (data.error) {
        setAiSuggestError(data.error);
      } else {
        const parsed = extractTransformJSON(data.reply ?? "");
        if (parsed) {
          const VALID_KEYS = new Set(NUM_TRANSFORMS.map(t => t.key));
          setColTransforms(() => {
            const next: Record<string, string[]> = {};
            for (const col of numCols) {
              next[col.name] = (parsed[col.name] ?? []).filter(k => VALID_KEYS.has(k));
            }
            return next;
          });
        } else {
          setAiSuggestError(`Could not read AI response. Raw reply: "${(data.reply ?? "").slice(0, 80)}"`);
        }
      }
    } catch (e) {
      setAiSuggestError(`Request failed: ${(e as Error).message.slice(0, 80)}`);
    } finally {
      setAiSuggestLoading(false);
    }
  }, [aiSuggestLoading, numCols, rawRows.length, setColTransforms]);

  return { aiSuggest, aiSuggestLoading, aiSuggestError, setAiSuggestError };
}