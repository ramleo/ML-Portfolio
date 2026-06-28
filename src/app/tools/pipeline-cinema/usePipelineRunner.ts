import { useState, useCallback, useRef } from "react";
import {
  callPreprocess,
  callFeatureEng,
  callFeatureSelect,
  callAutoML,
} from "@/lib/pipelineCinemaApi";

export type StageKind = "preprocessing" | "feature-eng" | "feature-select" | "automl";

export const STAGES: StageKind[] = ["preprocessing", "feature-eng", "feature-select", "automl"];

export const STAGE_META: Record<StageKind, { label: string; accent: string }> = {
  preprocessing:    { label: "Preprocess",     accent: "#38bdf8" },
  "feature-eng":    { label: "Feature Eng",    accent: "#34d399" },
  "feature-select": { label: "Feature Select", accent: "#f59e0b" },
  automl:           { label: "AutoML",          accent: "#a78bfa" },
};

const STAGE_DURATIONS: Record<StageKind, number> = {
  preprocessing:    8400,
  "feature-eng":    8000,
  "feature-select": 7200,
  automl:           10000,
};

function X_PERCENT_FOR_STAGE(stage: StageKind): number {
  const percents: Record<StageKind, number> = {
    preprocessing:    0.12,
    "feature-eng":    0.37,
    "feature-select": 0.63,
    automl:           0.88,
  };
  return percents[stage];
}

function parseCsvHeader(b64: string): string[] {
  try {
    const text = atob(b64);
    return text
      .split("\n")[0]
      .split(",")
      .map((c) => c.trim().replace(/^"|"$/g, ""))
      .filter(Boolean);
  } catch {
    return [];
  }
}

export interface AutoMLResults {
  models: Array<{ name: string; score: number }>;
  winner: string;
  taskType: "classification" | "regression";
}

export interface PipelineRunnerState {
  activeStage: StageKind | null;
  doneStages: Set<StageKind>;
  running: boolean;
  orbProgress: number;
  dynamicLines: Partial<Record<StageKind, string[]>>;
  chapterStage: StageKind | null;
  apiError: string | null;
  paused: boolean;
  stageColumns: {
    afterPreprocess?: string[];
    afterFE?: string[];
    afterFS?: string[];
  };
  automlResults: AutoMLResults | null;
}

export interface PipelineRunnerHandlers {
  handleRunAnimation: () => Promise<void>;
  handleStop: () => void;
  handleReset: () => void;
  togglePause: () => void;
  handleStageClick: (stage: StageKind) => void;
  setChapterStage: (s: StageKind | null) => void;
}

interface UsePipelineRunnerParams {
  csvB64: string | null;
  target: string;
  taskType: "classification" | "regression";
}

export function usePipelineRunner({
  csvB64,
  target,
  taskType,
}: UsePipelineRunnerParams): PipelineRunnerState & PipelineRunnerHandlers {
  const [activeStage, setActiveStage] = useState<StageKind | null>(null);
  const [doneStages, setDoneStages] = useState<Set<StageKind>>(new Set());
  const [running, setRunning] = useState(false);
  const [orbProgress, setOrbProgress] = useState(0);
  const [dynamicLines, setDynamicLines] = useState<Partial<Record<StageKind, string[]>>>({});
  const [chapterStage, setChapterStage] = useState<StageKind | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [stageColumns, setStageColumns] = useState<{
    afterPreprocess?: string[];
    afterFE?: string[];
    afterFS?: string[];
  }>({});
  const [automlResults, setAutomlResults] = useState<AutoMLResults | null>(null);

  const pausedRef = useRef(false);
  const stoppedRef = useRef(false);

  const togglePause = useCallback(() => {
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
  }, []);

  const waitPauseable = useCallback(async (ms: number) => {
    let remaining = ms;
    while (remaining > 0) {
      if (stoppedRef.current) return;
      await new Promise<void>((r) => setTimeout(r, 100));
      if (!pausedRef.current) remaining -= 100;
    }
  }, []);

  const handleRunAnimation = useCallback(async () => {
    stoppedRef.current = false;
    pausedRef.current = false;
    setPaused(false);
    setRunning(true);
    setDoneStages(new Set());
    setActiveStage(null);
    setOrbProgress(0);
    setDynamicLines({});
    setApiError(null);
    setStageColumns({});
    setAutomlResults(null);

    const hasCsv = !!csvB64 && !!target;
    let currentCsv = csvB64 ?? "";

    for (let i = 0; i < STAGES.length; i++) {
      if (stoppedRef.current) break;
      const stage = STAGES[i];

      setChapterStage(stage);
      await waitPauseable(1800);
      if (stoppedRef.current) { setChapterStage(null); break; }
      setChapterStage(null);

      setActiveStage(stage);
      setOrbProgress((i / (STAGES.length - 1)) * 0.85 + 0.06);

      if (hasCsv) {
        try {
          if (stage === "preprocessing") {
            const result = await callPreprocess(currentCsv, target);
            if (result) {
              currentCsv = result.csv;
              setDynamicLines((p) => ({ ...p, preprocessing: result.lines }));
              setStageColumns((p) => ({ ...p, afterPreprocess: parseCsvHeader(currentCsv) }));
            }
          } else if (stage === "feature-eng") {
            const result = await callFeatureEng(currentCsv, target);
            if (result) {
              currentCsv = result.csv;
              setDynamicLines((p) => ({ ...p, "feature-eng": result.lines }));
              setStageColumns((p) => ({ ...p, afterFE: parseCsvHeader(currentCsv) }));
            }
          } else if (stage === "feature-select") {
            const result = await callFeatureSelect(currentCsv, target);
            if (result) {
              currentCsv = result.csv;
              setDynamicLines((p) => ({ ...p, "feature-select": result.lines }));
              setStageColumns((p) => ({ ...p, afterFS: parseCsvHeader(currentCsv) }));
            }
          } else if (stage === "automl") {
            const result = await callAutoML(currentCsv, target, taskType);
            if (result) {
              setDynamicLines((p) => ({ ...p, automl: result.lines }));
              setAutomlResults({ models: result.models, winner: result.winner, taskType: result.taskType });
            }
          }
          await waitPauseable(STAGE_DURATIONS[stage]);
        } catch {
          setApiError("API error on one or more stages — falling back to demo mode.");
          await waitPauseable(2000);
        }
      } else {
        await waitPauseable(9000);
      }

      setDoneStages((prev) => new Set([...prev, stage]));
      setOrbProgress(((i + 1) / (STAGES.length - 1)) * 0.85 + 0.06);
      await waitPauseable(400);
    }

    setActiveStage(null);
    setRunning(false);
  }, [csvB64, target, taskType, waitPauseable]);

  const handleStop = useCallback(() => {
    stoppedRef.current = true;
    pausedRef.current = false;
    setPaused(false);
    setRunning(false);
    setActiveStage(null);
    setChapterStage(null);
  }, []);

  const handleReset = useCallback(() => {
    stoppedRef.current = true;
    pausedRef.current = false;
    setPaused(false);
    setRunning(false);
    setActiveStage(null);
    setDoneStages(new Set());
    setOrbProgress(0);
    setDynamicLines({});
    setChapterStage(null);
    setApiError(null);
    setStageColumns({});
    setAutomlResults(null);
  }, []);

  const handleStageClick = useCallback(
    (stage: StageKind) => {
      if (running) return;
      setActiveStage(stage);
      setOrbProgress(X_PERCENT_FOR_STAGE(stage));
      setTimeout(() => {
        setDoneStages((prev) => new Set([...prev, stage]));
        setActiveStage(null);
      }, 1500);
    },
    [running]
  );

  return {
    activeStage,
    doneStages,
    running,
    orbProgress,
    dynamicLines,
    chapterStage,
    apiError,
    paused,
    stageColumns,
    automlResults,
    handleRunAnimation,
    handleStop,
    handleReset,
    togglePause,
    handleStageClick,
    setChapterStage,
  };
}