"use client";

import { useCallback } from "react";
import { ColInfo, FeResult } from "@/lib/feAlgorithms";
import { applyTransforms } from "@/lib/feTransforms";
import { LDATopicResult } from "@/lib/feLDA";

interface UseFETransformsParams {
  rawRows: string[][];
  cols: ColInfo[];
  colTransforms: Record<string, string[]>;
  dateCols: string[];
  dateParts: string[];
  interactions: [string, string][];
  polyCols: string[];
  freqCols: string[];
  ratios: [string, string][];
  sortCol: string;
  lagCols: string[];
  lagN: number;
  lagDiff: boolean;
  rollCols: string[];
  rollN: number;
  rollAgg: string;
  cyclicCols: Record<string, number>;
  rowAggCols: string[];
  rowAggFn: string;
  ldaResult: LDATopicResult | null;
  squareCols: string[];
  binConfigs: Record<string, number>;
  ratioDiffPairs: [string, string][];
  enabledDatetimeCols: string[];
  setStep: (step: "upload" | "configure" | "processing" | "results") => void;
  setResult: (result: FeResult) => void;
  setError: (error: string) => void;
}

export function useFETransforms({
  rawRows, cols, colTransforms, dateCols, dateParts, interactions, polyCols,
  freqCols, ratios, sortCol, lagCols, lagN, lagDiff, rollCols, rollN, rollAgg,
  cyclicCols, rowAggCols, rowAggFn, ldaResult,
  squareCols, binConfigs, ratioDiffPairs, enabledDatetimeCols,
  setStep, setResult, setError,
}: UseFETransformsParams) {
  const applyAllTransforms = useCallback(() => {
    setStep("processing");
    setTimeout(() => {
      try {
        const res = applyTransforms(
          rawRows, cols, colTransforms, dateCols, dateParts, interactions, polyCols,
          freqCols, ratios, sortCol, lagCols, lagN, lagDiff, rollCols, rollN, rollAgg,
          cyclicCols, rowAggCols, rowAggFn,
          squareCols, binConfigs, ratioDiffPairs, enabledDatetimeCols
        );
        if (ldaResult) {
          const nRows = res.csv.length - 1;
          for (const tc of ldaResult.topicColumns) {
            res.headers.push(tc.name);
            res.newColumns.push(tc.name);
            for (let i = 0; i < nRows; i++) res.csv[i + 1].push(String(tc.values[i] ?? ""));
          }
          res.colsAfter = res.headers.length;
        }
        setResult(res);
        setStep("results");
      } catch (e) {
        setError(String(e));
        setStep("configure");
      }
    }, 50);
  }, [rawRows, cols, colTransforms, dateCols, dateParts, interactions, polyCols,
      freqCols, ratios, sortCol, lagCols, lagN, lagDiff, rollCols, rollN, rollAgg,
      cyclicCols, rowAggCols, rowAggFn, ldaResult,
      squareCols, binConfigs, ratioDiffPairs, enabledDatetimeCols,
      setStep, setResult, setError]);

  return { applyAllTransforms };
}
