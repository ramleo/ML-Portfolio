"use client";

import { useRef, useState, useCallback, useEffect, DragEvent, ChangeEvent } from "react";
import { ML_UNIFIED_API } from "@/config/urls";
import { trackedFetch, trackRunStart, trackRunError, newRunId } from "@/lib/trackedFetch";
import { STAGE, ERR, classifyThrown } from "@/lib/logEvents";
import { usePipeline } from "@/context/PipelineContext";
import { track } from "@/hooks/useAnalytics";
import OptunaResults from "./OptunaResults";
import OptunaConfigForm from "@/components/OptunaSteps/OptunaConfigForm";

const ACCENT = "#7e68c0";

import {
  CARD, MODELS,
  type Step, type AnalyzeResult, type TrainResult,
} from "./optunaTypes";
import { EV } from "@/lib/logEvents";

interface OptunaRunnerProps {
  onReady?: (trigger: (f: File) => void) => void;
  onResult?: (r: TrainResult | null) => void;
  onStepChange?: (step: Step) => void;
}

export default function OptunaRunner({ onReady, onResult, onStepChange }: OptunaRunnerProps) {
  const { state, setState } = usePipeline();

  const [step, setStep] = useState<Step>(1);
  useEffect(() => { onStepChange?.(step); }, [step]); // eslint-disable-line react-hooks/exhaustive-deps
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [target, setTarget] = useState("");
  const [task, setTask] = useState<"classification" | "regression">("classification");
  const [model, setModel] = useState(MODELS[1]);
  const [nTrials, setNTrials] = useState(30);

  // Pre-select model from AutoML winner in context
  useEffect(() => {
    if (!state.automlWinner) return;
    const mapping: Record<string, string> = {
      RandomForest: "Random Forest", XGBoost: "XGBoost",
      LightGBM: "LightGBM", CatBoost: "CatBoost",
    };
    const mapped = mapping[state.automlWinner.algo];
    if (mapped && MODELS.includes(mapped)) setModel(mapped);
  }, [state.automlWinner]); // eslint-disable-line react-hooks/exhaustive-deps
  const [dropCols, setDropCols] = useState<string[]>([]);
  const [optMetric, setOptMetric] = useState("auto");
  const [sampler, setSampler] = useState("tpe");
  const [secondaryMetric, setSecondaryMetric] = useState("none");

  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<TrainResult | null>(null);
  const [training, setTraining] = useState(false);

  useEffect(() => { setOptMetric("auto"); setSecondaryMetric("none"); }, [task]);

  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setError(null);
    setAnalyzing(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await trackedFetch(`${ML_UNIFIED_API}/analyze`,
        { method: "POST", body: fd },
        { tool: "optuna", stage: STAGE.UPLOAD, meta: { size_bytes: f.size } });
      if (!res.ok) throw new Error(`Analyze failed: ${res.statusText}`);
      const data: AnalyzeResult = await res.json();
      setAnalyzeResult(data);
      setTarget(data.suggested_target);
      setTask(data.suggested_task);
      setStep(2);
      track(EV.UPLOAD, { meta: { tool: "optuna", rows: data.rows, cols: data.columns.length } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to analyze CSV");
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
    const runId = newRunId();
    trackRunStart("optuna", runId, { model, n_trials: nTrials, task, sampler });
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("target_col", target);
      fd.append("task", task);
      fd.append("model_name", "Optuna Run");
      fd.append("algorithm", "AutoML");
      fd.append("accent", "#a78bfa");
      fd.append("selected_models", JSON.stringify([model]));
      fd.append("tune", "true");
      fd.append("n_trials", String(nTrials));
      fd.append("feature_engineering", "{}");
      fd.append("fe_b64", "");
      fd.append("pre_fe_cols_json", "[]");
      fd.append("pre_fe_sample_json", "{}");
      fd.append("drop_cols_json", JSON.stringify(dropCols));
      fd.append("opt_metric", optMetric);
      fd.append("sampler", sampler);
      fd.append("secondary_metric", secondaryMetric);
      const res = await trackedFetch(`${ML_UNIFIED_API}/train`,
        { method: "POST", body: fd },
        { tool: "optuna", runId, streaming: true, meta: { opt_metric: optMetric, sampler } });
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
              const data: TrainResult = { ...raw, best_params: raw.optuna_params ?? raw.best_params };
              setResult(data); onResult?.(data);
              track(EV.RESULT_VIEW, { meta: { tool: "optuna", run_id: runId, model, n_trials: nTrials, winner: raw.winner, metric_value: Number(Object.values(raw.winner_metrics ?? {})[0] ?? 0) } });
              // Write tunedModel back to PipelineContext
              if (data?.best_params && data?.winner_metrics) {
                setState(prev => ({
                  ...prev,
                  tunedModel: {
                    algo: model as "RandomForest" | "XGBoost" | "LightGBM" | "CatBoost",
                    score: Number(Object.values(data.winner_metrics)[0] ?? 0),
                    metric: (optMetric === "auto" ? "accuracy" : optMetric) as import("@/types/pipeline").Metric,
                    params: data.best_params as Record<string, number | string>,
                  },
                }));
              }
            }
            if (evt.error) {
              setError(`Server error: ${evt.error}`);
              // In-band: this arrives INSIDE a healthy 200 stream, which then
              // closes cleanly, so the stream wrapper would record a success
              // while the visitor is looking at an error. Same shape as
              // text-to-sql's {type:"error"} events.
              trackRunError("optuna", runId, STAGE.RUN,
                /429|rate limit/i.test(String(evt.error)) ? ERR.RATE_LIMITED : ERR.UNKNOWN,
                { model, reason: "in_band_stream_error",
                  message: String(evt.error).slice(0, 120) });
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Training failed");
      // Was the ONLY track("error") call site in the codebase, and it recorded
      // no run_id, no stage and no error class — so a failure here could not
      // be joined to the attempt or counted by kind. §3 stage 7.
      trackRunError("optuna", runId, STAGE.RUN, classifyThrown(e), { model });
    } finally {
      setTraining(false);
    }
  }, [file, target, task, model, nTrials, dropCols, optMetric, sampler, secondaryMetric]);

  const handleDownloadParams = useCallback(() => {
    if (!result?.best_params) return;
    const blob = new Blob([JSON.stringify(result.best_params, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "optuna_best_params.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [result]);

  const reset = useCallback(() => {
    setStep(1);
    setFile(null);
    setAnalyzeResult(null);
    setResult(null);
    setError(null);
    setProgress(0);
    setStatus("");
    setDropCols([]);
    setOptMetric("auto");
    setSampler("tpe");
    setSecondaryMetric("none");
  }, []);

  return (
    <div style={{ ...CARD, marginBottom: "1.5rem" }}>
      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
        <div>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: ACCENT, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.2rem" }}>
            Try It — Upload Your CSV
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text3)" }}>
            Run Optuna Bayesian tuning on your own dataset
          </div>
        </div>
        {step > 1 && (
          <button onClick={reset} style={{ fontSize: "0.72rem", color: "var(--text3)", background: "none", border: `1px solid var(--border2)`, borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>
            Reset
          </button>
        )}
      </div>

      {/* STEP 1: Upload */}
      {step === 1 && (
        <div>
          <div
            className="subtle-card"
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            data-wt="opt-upload"
            onClick={() => inputRef.current?.click()}
            style={{
              border: `2px dashed ${ACCENT}${dragging ? "99" : "4d"}`,
              borderRadius: 10, padding: "2rem 1rem", textAlign: "center", cursor: "pointer",
              background: dragging ? `${ACCENT}08` : "var(--bg-glass)",
              transition: "all 0.2s",
              ["--acc-glow" as string]: `${ACCENT}14`,
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={ACCENT}
              strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ margin: "0 auto 0.5rem" }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text2)", marginBottom: "0.25rem" }}>
              {analyzing ? "Analyzing..." : "Drop CSV or click to upload"}
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--text3)" }}>Accepts .csv files only</div>
          </div>
          <input ref={inputRef} type="file" accept=".csv" style={{ display: "none" }} onChange={onInputChange} />
          {error && <div style={{ marginTop: "0.75rem", fontSize: "0.78rem", color: "#f87171" }}>{error}</div>}
        </div>
      )}

      {/* STEP 2: Configure */}
      {step === 2 && analyzeResult && (
        <OptunaConfigForm
          file={file}
          analyzeResult={analyzeResult}
          target={target}
          setTarget={setTarget}
          task={task}
          setTask={setTask}
          model={model}
          setModel={setModel}
          dropCols={dropCols}
          setDropCols={setDropCols}
          nTrials={nTrials}
          setNTrials={setNTrials}
          optMetric={optMetric}
          setOptMetric={setOptMetric}
          sampler={sampler}
          setSampler={setSampler}
          secondaryMetric={secondaryMetric}
          setSecondaryMetric={setSecondaryMetric}
          onTrain={handleTrain}
          error={error}
        />
      )}

      {/* STEP 3: Results */}
      {step === 3 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Progress */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--text3)", marginBottom: "0.35rem" }}>
              <span>{status || "Running..."}</span>
              <span style={{ color: ACCENT, fontWeight: 700 }}>{progress}%</span>
            </div>
            <div style={{ height: 8, borderRadius: 9999, background: "var(--border)" }}>
              <div style={{ height: "100%", width: `${progress}%`, borderRadius: 9999, background: ACCENT, boxShadow: `0 0 8px ${ACCENT}55`, transition: "width 0.3s" }} />
            </div>
          </div>

          {result && <div data-wt="opt-results"><OptunaResults result={result} /></div>}

          {result?.best_params && (
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <button
                data-wt="opt-download"
                onClick={handleDownloadParams}
                style={{
                  display: "flex", alignItems: "center", gap: "0.4rem",
                  padding: "0.5rem 1rem", borderRadius: 9999, cursor: "pointer",
                  background: "transparent", border: `1px solid ${ACCENT}55`,
                  color: ACCENT, fontSize: "0.78rem", fontWeight: 600,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 1v8M4 6l3 3 3-3" />
                  <path d="M2 11h10" />
                </svg>
                Download Params (JSON)
              </button>
            </div>
          )}

          {!training && !result && error && (
            <div style={{ fontSize: "0.78rem", color: "#f87171" }}>{error}</div>
          )}
        </div>
      )}
    </div>
  );
}
