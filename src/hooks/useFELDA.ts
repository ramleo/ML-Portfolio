"use client";

import { useState, useCallback } from "react";
import { ColInfo } from "@/lib/feAlgorithms";
import type { LDATopicResult } from "@/lib/feLDA";

export interface LDAOpts {
  stopwords: string;
  minDocFreq: number;
  stemming: boolean;
}

export function useFELDA(cols: ColInfo[]) {
  const [ldaTextCol, setLdaTextCol] = useState("");
  const [ldaNTopics, setLdaNTopics] = useState(5);
  const [ldaNIter, setLdaNIter]     = useState(50);
  const [ldaOpts, setLdaOpts]       = useState<LDAOpts>({
    stopwords: "",
    minDocFreq: 2,
    stemming: false,
  });
  const [ldaResult, setLdaResult]   = useState<LDATopicResult | null>(null);
  const [ldaRunning, setLdaRunning] = useState(false);
  const [ldaError, setLdaError]     = useState<string | null>(null);

  const handleRunLDA = useCallback(() => {
    const col = cols.find(c => c.name === ldaTextCol);
    if (!col) return;
    if (typeof window === "undefined") return;

    setLdaRunning(true);
    setLdaError(null);

    const worker = new Worker(
      new URL("../workers/ldaWorker.ts", import.meta.url)
    );

    worker.onmessage = (e) => {
      const { type, payload, message } = e.data;
      if (type === "result") {
        setLdaResult(payload as LDATopicResult);
      } else if (type === "error") {
        setLdaError(message as string);
      }
      setLdaRunning(false);
      worker.terminate();
    };

    worker.onerror = (err) => {
      setLdaError(err.message);
      setLdaRunning(false);
      worker.terminate();
    };

    worker.postMessage({
      rawValues: col.rawValues,
      nTopics: ldaNTopics,
      nIter: ldaNIter,
      vocabCap: 8,
      opts: {
        userStopwords: ldaOpts.stopwords,
        minDocFreq: ldaOpts.minDocFreq,
        stemming: ldaOpts.stemming,
      },
    });
  }, [cols, ldaTextCol, ldaNTopics, ldaNIter, ldaOpts]);

  const resetLDA = useCallback(() => {
    setLdaTextCol("");
    setLdaResult(null);
    setLdaError(null);
  }, []);

  return {
    ldaTextCol, setLdaTextCol,
    ldaNTopics, setLdaNTopics,
    ldaNIter, setLdaNIter,
    ldaOpts, setLdaOpts,
    ldaResult,
    ldaRunning,
    ldaError,
    handleRunLDA,
    resetLDA,
  };
}
