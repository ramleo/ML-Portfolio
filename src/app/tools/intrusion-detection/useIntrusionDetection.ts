"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";
import { trackedFetch } from "@/lib/trackedFetch";

const RUN_TIMEOUT_MS = 45_000;
const BATCH = 15;      // rows revealed per tick
const TICK_MS = 90;    // pace of the live feed; classification is already done

const BUNDLE_URL = "/data/nsl-kdd-sample.json";

export interface Bundle {
  source: string;
  featureNames: string[];
  classNames: string[];
  train: { X: number[][]; y: number[] };
  test: { X: number[][]; y: number[] };
}

export interface ClassifiedRow {
  index: number;
  trueClass: number;
  pred: number;
  confidence: number;
  correct: boolean;
}

export interface ClassMetric {
  name: string;
  precision: number;
  recall: number;
  support: number;
  f1: number;
}

/** Everything the model got right and wrong, computed against ground truth the
 *  backend never saw — honest by construction. */
export interface Scorecard {
  accuracy: number;
  total: number;
  correct: number;
  confusion: number[][];        // [true][pred]
  perClass: ClassMetric[];
  importances: { name: string; value: number }[];
  classNames: string[];
}

type Phase = "idle" | "classifying" | "streaming" | "done";

interface ApiResponse {
  results: { pred: number; confidence: number }[];
  feature_importances: number[];
  classes: number[];
  n_train: number;
  n_test: number;
}

function buildScorecard(
  bundle: Bundle, rows: ClassifiedRow[], importances: number[],
): Scorecard {
  const k = bundle.classNames.length;
  const confusion = Array.from({ length: k }, () => new Array(k).fill(0));
  let correct = 0;
  for (const r of rows) {
    confusion[r.trueClass][r.pred]++;
    if (r.correct) correct++;
  }
  const perClass: ClassMetric[] = bundle.classNames.map((name, c) => {
    const tp = confusion[c][c];
    const support = confusion[c].reduce((a, b) => a + b, 0);
    let predCol = 0;
    for (let t = 0; t < k; t++) predCol += confusion[t][c];
    const precision = predCol ? tp / predCol : 0;
    const recall = support ? tp / support : 0;
    const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
    return { name, precision, recall, support, f1 };
  });
  const paired = bundle.featureNames
    .map((name, i) => ({ name, value: importances[i] ?? 0 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
  return {
    accuracy: rows.length ? correct / rows.length : 0,
    total: rows.length, correct, confusion, perClass,
    importances: paired, classNames: bundle.classNames,
  };
}

/** Loads the bundled NSL-KDD subset, sends train+test to the real RandomForest
 *  backend once, then reveals the test connections on a timer so the feed reads
 *  as live while the scorecard fills in against ground truth. */
export function useIntrusionDetection() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [rows, setRows] = useState<ClassifiedRow[]>([]);
  const [revealed, setRevealed] = useState(0);
  const [scorecard, setScorecard] = useState<Scorecard | null>(null);
  const [nTrain, setNTrain] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const bundleRef = useRef<Bundle | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = useCallback(() => {
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
  }, []);
  useEffect(() => () => stopTimer(), [stopTimer]);

  const run = useCallback(async () => {
    stopTimer();
    setError(null);
    setRows([]);
    setRevealed(0);
    setScorecard(null);
    setPhase("classifying");

    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), RUN_TIMEOUT_MS);
    try {
      let bundle = bundleRef.current;
      if (!bundle) {
        const br = await fetch(BUNDLE_URL, { signal: controller.signal });
        if (!br.ok) throw new Error("Could not load the NSL-KDD sample.");
        bundle = (await br.json()) as Bundle;
        bundleRef.current = bundle;
      }

      const res = await trackedFetch(`${ML_UNIFIED_API}/intrusion-detection/classify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          train_X: bundle.train.X,
          train_y: bundle.train.y,
          test_X: bundle.test.X,
        }),
        signal: controller.signal,
      }, { tool: "intrusion-detection" });
      const data: ApiResponse | null = await res.json().catch(() => null);
      if (!res.ok || !data) {
        throw new Error((data as { detail?: string } | null)?.detail || "Classification failed — try again in a moment.");
      }

      const yte = bundle.test.y;
      const classified: ClassifiedRow[] = data.results.map((r, i) => ({
        index: i,
        trueClass: yte[i],
        pred: r.pred,
        confidence: r.confidence,
        correct: r.pred === yte[i],
      }));

      setNTrain(data.n_train);
      setRows(classified);
      setScorecard(buildScorecard(bundle, classified, data.feature_importances));
      setPhase("streaming");

      timer.current = setInterval(() => {
        setRevealed((n) => {
          const next = Math.min(n + BATCH, classified.length);
          if (next >= classified.length) { stopTimer(); setPhase("done"); }
          return next;
        });
      }, TICK_MS);
    } catch (err) {
      setError(err instanceof Error && err.name === "AbortError"
        ? "The classifier timed out — the ML Space may be waking up. Try again."
        : err instanceof Error ? err.message : "Classification failed — try again in a moment.");
      setPhase("idle");
    } finally {
      clearTimeout(to);
    }
  }, [stopTimer]);

  const reset = useCallback(() => {
    stopTimer();
    setPhase("idle");
    setRows([]);
    setRevealed(0);
    setScorecard(null);
    setError(null);
  }, [stopTimer]);

  const visible = rows.slice(0, revealed);
  const correctSoFar = visible.filter((r) => r.correct).length;

  return {
    phase, error, run, reset, nTrain,
    visible, revealed, total: rows.length, correctSoFar,
    scorecard,
  };
}
