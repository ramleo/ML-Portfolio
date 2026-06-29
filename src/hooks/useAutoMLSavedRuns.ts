"use client";

import { useState, useCallback, useEffect } from "react";
import {
  MAX_SAVED_PER_DATASET, formatWinnerScore,
  type SavedRun, type TrainResult,
} from "@/lib/automlUtils";

interface UseAutoMLSavedRunsReturn {
  savedRuns:         SavedRun[];
  savedFlash:        boolean;
  isLoadedFromSaved: boolean;
  view:              "wizard" | "saved";
  expandedDatasets:  Set<string>;
  setView:           (v: "wizard" | "saved") => void;
  setIsLoadedFromSaved: (v: boolean) => void;
  handleSaveVersion: (trainResult: TrainResult | null, fileName?: string | null) => void;
  handleLoadRun:     (run: SavedRun, setTrainResult: (r: TrainResult) => void, setStep: (s: "results") => void) => void;
  handleDeleteRun:   (id: string) => void;
  toggleDataset:     (name: string) => void;
}

export function useAutoMLSavedRuns(onSavedToPipeline?: () => void): UseAutoMLSavedRunsReturn {
  const [savedRuns, setSavedRuns] = useState<SavedRun[]>(() => {
    try { return JSON.parse(localStorage.getItem("automl_saved_runs") || "[]"); }
    catch { return []; }
  });
  const [savedFlash, setSavedFlash]             = useState(false);
  const [isLoadedFromSaved, setIsLoadedFromSaved] = useState(false);
  const [view, setView]                         = useState<"wizard" | "saved">("wizard");
  const [expandedDatasets, setExpandedDatasets] = useState<Set<string>>(new Set());

  useEffect(() => {
    localStorage.setItem("automl_saved_runs", JSON.stringify(savedRuns));
  }, [savedRuns]);

  const handleSaveVersion = useCallback((trainResult: TrainResult | null, fileName?: string | null) => {
    if (!trainResult) return;
    const datasetName = fileName ?? trainResult.fileName ?? trainResult.title;
    const existing    = savedRuns.filter(r => r.datasetName === datasetName);
    const runNumber   = existing.length + 1;
    const winnerCV    = trainResult.automl.cv_results.find(r => r.algorithm === trainResult.automl.winner);
    const score       = winnerCV ? formatWinnerScore(trainResult.automl.task, winnerCV.score) : trainResult.metric;
    const date        = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
    setSavedRuns(prev => {
      const newRun: SavedRun = {
        id: `${Date.now()}`, datasetName, runNumber,
        winner: trainResult.automl.winner, score,
        task: trainResult.automl.task, date, result: trainResult,
      };
      const withNew = [newRun, ...prev];
      const datasetCount: Record<string, number> = {};
      return withNew.filter(r => {
        datasetCount[r.datasetName] = (datasetCount[r.datasetName] ?? 0) + 1;
        return datasetCount[r.datasetName] <= MAX_SAVED_PER_DATASET;
      });
    });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
    onSavedToPipeline?.();
  }, [savedRuns, onSavedToPipeline]);

  const handleLoadRun = useCallback((
    run: SavedRun,
    setTrainResult: (r: TrainResult) => void,
    setStep: (s: "results") => void,
  ) => {
    setTrainResult(run.result);
    setStep("results");
    setView("wizard");
    setIsLoadedFromSaved(true);
  }, []);

  const handleDeleteRun = useCallback((id: string) => {
    setSavedRuns(prev => prev.filter(r => r.id !== id));
  }, []);

  const toggleDataset = useCallback((name: string) => {
    setExpandedDatasets(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }, []);

  return {
    savedRuns, savedFlash, isLoadedFromSaved, view, expandedDatasets,
    setView, setIsLoadedFromSaved,
    handleSaveVersion, handleLoadRun, handleDeleteRun, toggleDataset,
  };
}