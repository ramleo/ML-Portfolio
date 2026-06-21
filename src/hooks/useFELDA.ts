"use client";

import { useState, useCallback } from "react";
import { ColInfo } from "@/lib/feAlgorithms";
import { runLDA, LDATopicResult } from "@/lib/feLDA";

export function useFELDA(cols: ColInfo[]) {
  const [ldaTextCol, setLdaTextCol] = useState("");
  const [ldaNTopics, setLdaNTopics] = useState(5);
  const [ldaNIter, setLdaNIter]     = useState(50);
  const [ldaResult, setLdaResult]   = useState<LDATopicResult | null>(null);
  const [ldaRunning, setLdaRunning] = useState(false);
  const [ldaError, setLdaError]     = useState<string | null>(null);

  const handleRunLDA = useCallback(() => {
    const col = cols.find(c => c.name === ldaTextCol);
    if (!col) return;
    setLdaRunning(true);
    setLdaError(null);
    setTimeout(() => {
      try {
        const result = runLDA(col.rawValues, ldaNTopics, ldaNIter, 8);
        setLdaResult(result);
      } catch (e) {
        setLdaError(String(e));
      } finally {
        setLdaRunning(false);
      }
    }, 20);
  }, [cols, ldaTextCol, ldaNTopics, ldaNIter]);

  const resetLDA = useCallback(() => {
    setLdaTextCol("");
    setLdaResult(null);
    setLdaError(null);
  }, []);

  return {
    ldaTextCol, setLdaTextCol,
    ldaNTopics, setLdaNTopics,
    ldaNIter, setLdaNIter,
    ldaResult,
    ldaRunning,
    ldaError,
    handleRunLDA,
    resetLDA,
  };
}