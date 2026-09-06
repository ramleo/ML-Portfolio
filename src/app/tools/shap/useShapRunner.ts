"use client";

import { useRef, useState, useCallback, useEffect, DragEvent, ChangeEvent } from "react";
import { ML_UNIFIED_API } from "@/config/urls";
import { usePipeline } from "@/context/PipelineContext";
import { track } from "@/hooks/useAnalytics";
import { trackedFetch } from "@/lib/trackedFetch";

export const MODELS = ["Random Forest", "XGBoost", "LightGBM"];

export type Step = 1 | 2 | 3;

export interface Column {
  name: string;
  is_numeric: boolean;
  nunique: number;
  missing: number;
}

export interface AnalyzeResult {
  columns: Column[];
  suggested_target: string;
  suggested_task: "classification" | "regression";
  rows: number;
}

export interface FIEntry { feature: string; importance: number }
export interface CVEntry { name: string; score: number }
export interface TrainResult {
  winner: string;
  cv_results: CVEntry[];
  winner_metrics: Record<string, number | string>;
  feature_importance: FIEntry[];
}

/** Was a hand-rolled copy of track(). Signature unchanged so callers are
 * untouched. */
function trackEvent(type: string, meta: Record<string, unknown>) {
  track(type, { meta });
}

interface UseShapRunnerOpts {
  onReady?: (trigger: (f: File) => void) => void;
  onResult?: (r: TrainResult | null) => void;
}

export function useShapRunner({ onReady, onResult }: UseShapRunnerOpts) {
  const { state, setState } = usePipeline();

  const [step, setStep] = useState<Step>(1);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [target, setTarget] = useState("");
  const [task, setTask] = useState<"classification" | "regression">("classification");
  const [model, setModel] = useState(MODELS[1]);

  useEffect(() => {
    const source = state.tunedModel ?? state.automlWinner;
    if (!source) return;
    const mapping: Record<string, string> = {
      RandomForest: "Random Forest", XGBoost: "XGBoost",
      LightGBM: "LightGBM", CatBoost: "CatBoost",
    };
    const mapped = mapping[source.algo];
    if (mapped && MODELS.includes(mapped)) setModel(mapped);
  }, [state.tunedModel, state.automlWinner]); // eslint-disable-line react-hooks/exhaustive-deps

  const [usePresetParams, setUsePresetParams] = useState(false);
  const [presetParams, setPresetParams] = useState<Record<string, number | string> | null>(null);

  useEffect(() => {
    if (state.tunedModel?.params && Object.keys(state.tunedModel.params).length > 0) {
      setPresetParams(state.tunedModel.params as Record<string, number | string>);
      setUsePresetParams(true);
    }
  }, [state.tunedModel]); // eslint-disable-line react-hooks/exhaustive-deps

  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<TrainResult | null>(null);
  const [training, setTraining] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const paramsInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setError(null);
    setAnalyzing(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await trackedFetch(`${ML_UNIFIED_API}/analyze`, { method: "POST", body: fd }, { tool: "shap" });
      if (!res.ok) throw new Error(`Analyze failed: ${res.statusText}`);
      const data: AnalyzeResult = await res.json();
      setAnalyzeResult(data);
      setTarget(data.suggested_target);
      setTask(data.suggested_task);
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to analyze CSV");
      trackEvent("error", { tool: "shap", error_type: "analyze_error" });
    } finally {
      setAnalyzing(false);
    }
  }, []);

  useEffect(() => {
    onReady?.(handleFile);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && f.name.endsWith(".csv")) handleFile(f);
    else setError("Please drop a .csv file");
  }, [handleFile]);

  const onInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleTrain = useCallback(async () => {
    if (!file || !target) return;
    setTraining(true);
    setProgress(0);
    setStatus("Starting...");
    setResult(null);
    setStep(3);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("target_col", target);
      fd.append("task", task);
      fd.append("model_name", "SHAP Run");
      fd.append("algorithm", "AutoML");
      fd.append("accent", "#f59e0b");
      fd.append("selected_models", JSON.stringify([model]));
      fd.append("tune", "false");
      fd.append("n_trials", "10");
      fd.append("feature_engineering", "{}");
      fd.append("fe_b64", "");
      fd.append("pre_fe_cols_json", "[]");
      fd.append("pre_fe_sample_json", "{}");
      fd.append("preset_params_json", usePresetParams && presetParams ? JSON.stringify(presetParams) : "{}");
      const res = await trackedFetch(`${ML_UNIFIED_API}/train`, { method: "POST", body: fd }, { tool: "shap" });
      if (!res.ok || !res.body) throw new Error(`Train failed: ${res.statusText}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split("\n").filter(Boolean);
        for (const line of lines) {
          try {
            const evt = JSON.parse(line.replace(/^data:\s*/, ""));
            if (evt.pct !== undefined) setProgress(evt.pct);
            if (evt.msg) setStatus(evt.msg);
            if (evt.result) {
              const raw = evt.result.automl ?? evt.result;
              // /train names each entry `algorithm`; everything on this page
              // reads `name`. Without the rename the AI panel was handed
              // "undefined=0.8114" as the model's CV score. Ensemble already
              // normalises the same field the same way.
              const data: TrainResult = {
                ...raw,
                cv_results: (raw.cv_results ?? []).map(
                  (r: { algorithm?: string; name?: string; score: number }) => ({
                    ...r, name: r.name ?? r.algorithm ?? "",
                  })),
              };
              setResult(data); onResult?.(data);
              if (data?.feature_importance) {
                const vals: Record<string, number> = {};
                data.feature_importance.forEach(e => { vals[e.feature] = e.importance; });
                setState(prev => ({ ...prev, shapValues: vals }));
              }
              trackEvent("query_run", {
                tool: "shap", action: "train",
                winner: data.winner,
                features: data.feature_importance?.length ?? 0,
              });
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Training failed");
      trackEvent("error", { tool: "shap", error_type: "train_error" });
    } finally {
      setTraining(false);
    }
  }, [file, target, task, model, usePresetParams, presetParams]);

  const reset = useCallback(() => {
    setStep(1);
    setFile(null);
    setAnalyzeResult(null);
    setResult(null);
    setError(null);
    setProgress(0);
    setStatus("");
  }, []);

  const loadParamsFromFile = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        setPresetParams(parsed);
        setUsePresetParams(true);
      } catch { /* ignore */ }
    };
    reader.readAsText(f);
  }, []);

  return {
    state,
    step, dragging, setDragging, file, analyzing, analyzeResult, error,
    target, setTarget, task, setTask, model, setModel,
    usePresetParams, setUsePresetParams, presetParams,
    progress, status, result, training,
    inputRef, paramsInputRef,
    onDrop, onInputChange, handleTrain, reset, loadParamsFromFile,
  };
}