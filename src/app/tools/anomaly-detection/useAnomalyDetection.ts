"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";
import { trackedFetch } from "@/lib/trackedFetch";
import {
  generateScenario, featureRow, type TrafficEvent, type AttackType,
} from "./trafficSimulator";

const RUN_TIMEOUT_MS = 30_000;
const REVEAL_MS = 650; // pace of the live feed; scoring is already done by now

export interface ScoredEvent extends TrafficEvent {
  isAnomaly: boolean;
  severity: number;
  decision: number;
  topFeature: string;
  topFeatureZ: number;
}

type Phase = "idle" | "scoring" | "streaming" | "done";

interface ApiResult {
  is_anomaly: boolean;
  severity: number;
  decision: number;
  top_feature: string;
  top_feature_z: number;
}
interface ApiResponse {
  results: ApiResult[];
  feature_names: string[];
  n_baseline: number;
  n_flagged: number;
}

/** How the model did against the ground truth we kept from it. Honest by
 *  construction: the backend never saw the labels. */
export interface Scorecard {
  attacks: number;      // planted attacks
  caught: number;       // true positives
  missed: number;       // false negatives
  falseAlarms: number;  // false positives
  precision: number;
  recall: number;
}

function scorecardOf(events: ScoredEvent[]): Scorecard {
  let tp = 0, fp = 0, fn = 0, attacks = 0;
  for (const e of events) {
    const isAttack = e.label !== "normal";
    if (isAttack) attacks++;
    if (isAttack && e.isAnomaly) tp++;
    if (!isAttack && e.isAnomaly) fp++;
    if (isAttack && !e.isAnomaly) fn++;
  }
  return {
    attacks, caught: tp, missed: fn, falseAlarms: fp,
    precision: tp + fp ? tp / (tp + fp) : 1,
    recall: tp + fn ? tp / (tp + fn) : 1,
  };
}

/** Drives the dashboard: builds a labelled simulated scenario, scores it with
 *  the real IsolationForest backend once, then reveals events on a timer so the
 *  feed reads as live while counters climb. See trafficSimulator.ts for why the
 *  traffic is simulated and how the honesty holds. */
export function useAnomalyDetection() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [scored, setScored] = useState<ScoredEvent[]>([]);
  const [revealed, setRevealed] = useState(0);
  const [baselineSize, setBaselineSize] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const seedRef = useRef(42);

  const stopTimer = useCallback(() => {
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
  }, []);

  useEffect(() => () => stopTimer(), [stopTimer]);

  const run = useCallback(async () => {
    stopTimer();
    setError(null);
    setScored([]);
    setRevealed(0);
    setPhase("scoring");

    // New seed each run so repeat clicks show a fresh (but still deterministic
    // per-seed) scenario rather than the identical one every time.
    const seed = seedRef.current++;
    const { baseline, stream } = generateScenario(seed);

    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), RUN_TIMEOUT_MS);
    try {
      const res = await trackedFetch(`${ML_UNIFIED_API}/anomaly-detection/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseline: baseline.map(featureRow),
          events: stream.map(featureRow),
          // IsolationForest's "auto" threshold flags far too much (~19 false
          // alarms on a 34-event stream — 24% precision, verified live). A tight
          // contamination prior fixes it: on the real captured scenario, 0.05
          // gives all 6 attacks caught with 1 false alarm (86% precision, 100%
          // recall). Validated against the exact features the page sends, after
          // fixing the path-randomness feature and the single-feature payload
          // spike that IsolationForest was under-ranking.
          contamination: 0.05,
        }),
        signal: controller.signal,
      }, { tool: "anomaly-detection" });
      const data: ApiResponse | null = await res.json().catch(() => null);
      if (!res.ok || !data) throw new Error((data as { detail?: string } | null)?.detail || "Scoring failed — try again in a moment.");

      const merged: ScoredEvent[] = stream.map((e, i) => ({
        ...e,
        isAnomaly: data.results[i].is_anomaly,
        severity: data.results[i].severity,
        decision: data.results[i].decision,
        topFeature: data.results[i].top_feature,
        topFeatureZ: data.results[i].top_feature_z,
      }));

      setBaselineSize(data.n_baseline);
      setScored(merged);
      setPhase("streaming");

      // Live reveal.
      timer.current = setInterval(() => {
        setRevealed((n) => {
          const next = n + 1;
          if (next >= merged.length) {
            stopTimer();
            setPhase("done");
            return merged.length;
          }
          return next;
        });
      }, REVEAL_MS);
    } catch (err) {
      setError(err instanceof Error && err.name === "AbortError"
        ? "The detector timed out — the ML Space may be waking up. Try again."
        : err instanceof Error ? err.message : "Scoring failed — try again in a moment.");
      setPhase("idle");
    } finally {
      clearTimeout(to);
    }
  }, [stopTimer]);

  const reset = useCallback(() => {
    stopTimer();
    setPhase("idle");
    setScored([]);
    setRevealed(0);
    setError(null);
  }, [stopTimer]);

  const visible = scored.slice(0, revealed);
  const flaggedSoFar = visible.filter((e) => e.isAnomaly).length;
  const scorecard = phase === "done" ? scorecardOf(scored) : null;

  return {
    phase, error, run, reset,
    baselineSize,
    visible,              // events revealed so far, newest handled by the UI
    total: scored.length,
    revealed,
    processed: revealed,
    flaggedSoFar,
    scorecard,
  };
}

export const ATTACK_TYPES: AttackType[] = [
  "brute-force", "scraping", "payload-spike", "off-hours",
];
