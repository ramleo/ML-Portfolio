import { useCallback, useState } from "react";
import type { ColInfo, SelectionOpts } from "@/lib/fsAlgorithms";
import { trackedFetch, trackRunStart, newRunId } from "@/lib/trackedFetch";

interface UseFSAISuggestResult {
  aiLoading: boolean;
  aiError: string;
  handleAISuggest: () => Promise<void>;
}

export function useFSAISuggest(
  cols: ColInfo[],
  rowCount: number,
  opts: SelectionOpts,
  setOpts: React.Dispatch<React.SetStateAction<SelectionOpts>>,
): UseFSAISuggestResult {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string>("");

  const handleAISuggest = useCallback(async () => {
    if (!cols.length) return;
    setAiLoading(true);
    setAiError("");
    try {
      const numCols = cols.filter(c => c.type === "numeric");
      const catCols = cols.filter(c => c.type === "categorical");
      const targetType = cols.find(c => c.name === opts.targetCol)?.type ?? "none";
      const stats = {
        rowCount,
        colCount: cols.length,
        numericCount: numCols.length,
        categoricalCount: catCols.length,
        targetCol: opts.targetCol,
        targetType,
        sampleFeatures: numCols.slice(0, 8).map(c => {
          const finiteNums = c.nums.filter(isFinite);
          const sorted = [...finiteNums].sort((a, b) => a - b);
          const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
          const skew = (c.mean - median) / (Math.sqrt(c.variance) || 1);
          return { name: c.name, variance: c.variance, nunique: c.nunique, missing: c.missing, skew };
        }),
      };
      const toolContext = `OVERRIDE: Your response MUST be a raw JSON object only. No explanation, no markdown, no backticks. Start with { and end with }.\n\nDataset stats: ${JSON.stringify(stats)}`;
      const prompt = `Suggest feature selection methods for this dataset. Return ONLY a compact JSON object. Include ONLY the fields you want to enable (boolean true) and any non-default numeric values. Skip fields that should stay disabled or at their defaults. Boolean fields: useVariance,useCorrelation,useTopK,useSelectKBest,useKendall,useChiSq,useRFE,useLasso,useRidge,useTree,useForward,usePCA,useUMAP. Numeric fields: varianceThreshold,corrThreshold,topK,selectKBestK,kendallTopK,chiSqTopK,rfeTargetK,lassoAlpha,ridgeAlpha,treeTopK,forwardK,pcaComponents,umapComponents,umapNeighbors. Example: {"useLasso":true,"lassoAlpha":0.05,"useTree":true,"treeTopK":8}`;
      const runId = newRunId();
      trackRunStart("feature-selection-ai-suggest", runId, { provider: "cohere" });
      const res = await trackedFetch("/api/ai-tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }],
          toolContext,
          provider: "cohere",
          jsonMode: true,
          maxTokens: 2048,
        }),
      }, { tool: "feature-selection-ai-suggest", runId, meta: { provider: "cohere" } });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({})) as { error?: string };
        setAiError(errData.error ?? `API error ${res.status} — check API key in chat settings`);
        return;
      }
      const data = await res.json() as { reply?: string; content?: string; error?: string };
      if (data.error) { setAiError(data.error); return; }
      const raw = (data.reply ?? data.content ?? "").trim();

      // Try 1: direct parse (jsonMode should give clean JSON)
      const tryApply = (jsonStr: string): boolean => {
        try {
          const patch = JSON.parse(jsonStr) as Partial<SelectionOpts>;
          if (typeof patch !== "object" || patch === null) return false;
          setOpts(o => ({ ...o, ...patch }));
          setAiError("Done — methods updated");
          return true;
        } catch { return false; }
      };

      if (tryApply(raw)) return;

      // Try 2: bracket-depth extraction (handles JSON in prose/fenced blocks)
      const extractJSON = (s: string): string | null => {
        const clean = s.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim();
        const start = clean.indexOf("{");
        if (start === -1) return null;
        let depth = 0;
        for (let i = start; i < clean.length; i++) {
          if (clean[i] === "{") depth++;
          else if (clean[i] === "}") { depth--; if (depth === 0) return clean.slice(start, i + 1); }
        }
        return null;
      };

      const jsonStr = extractJSON(raw);
      if (jsonStr && tryApply(jsonStr)) return;

      setAiError(`Could not parse response — AI replied: "${raw.slice(0, 100)}"`);
    } catch {
      setAiError("Network error — check connection and try again");
    } finally {
      setAiLoading(false);
    }
  }, [cols, rowCount, opts.targetCol, setOpts]);

  return { aiLoading, aiError, handleAISuggest };
}