"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useAutoMLExplain } from "@/hooks/useAutoMLExplain";
import { usePipeline } from "@/context/PipelineContext";
import { type ModelResult } from "@/types/pipeline";
import { ML_UNIFIED_API as API } from "@/config/urls";
import ModalShell from "@/components/modals/ModalShell";

import {
  ACCENT,
  DEFAULT_ML_MODELS, SHARED_ML_MODELS, TASK_ML_MODELS,
  MAX_SAVED_PER_DATASET,
  algoToKey, trainingEstimate as calcTrainingEstimate, formatWinnerScore,
  type Step, type AnalyzeResult, type TrainResult, type HistoryEntry,
  type SavedRun, type LLMProvider, type Explanation,
} from "@/lib/automlUtils";

import Step1Upload    from "@/components/AutoMLSteps/Step1Upload";
import Step2Configure from "@/components/AutoMLSteps/Step2Configure";
import Step3Train     from "@/components/AutoMLSteps/Step3Train";
import Step4Results   from "@/components/AutoMLSteps/Step4Results";
import SavedRunsView  from "@/components/AutoMLSteps/SavedRunsView";
import StepIndicator  from "@/components/AutoMLSteps/StepIndicator";
import AutoMLFooter   from "@/components/AutoMLSteps/AutoMLFooter";

export type { TrainResult, HistoryEntry };

// ── Props ─────────────────────────────────────────────────────────────────────

interface AutoMLModalProps {
  onClose:           () => void;
  onSavedToPipeline?: () => void;
  initialResult?:    TrainResult | null;
  initialHistory?:   HistoryEntry[];
  onResultChange?:   (result: TrainResult | null, history: HistoryEntry[]) => void;
  isPage?:           boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AutoMLModal({
  onClose, onSavedToPipeline, initialResult, initialHistory, onResultChange, isPage = false,
}: AutoMLModalProps) {
  const { setState } = usePipeline();

  // ── Wizard state ─────────────────────────────────────────────────────────
  const [step, setStep]           = useState<Step>(initialResult ? "results" : "upload");
  const [file, setFile]           = useState<File | null>(null);
  const [analyzed, setAnalyzed]   = useState<AnalyzeResult | null>(null);
  const [target, setTarget]       = useState("");
  const [taskType, setTaskType]   = useState<"classification" | "regression">("classification");
  const [modelName, setModelName] = useState("My AutoML Model");
  const [pct, setPct]             = useState(0);
  const [statusMsg, setStatusMsg] = useState("Initializing...");
  const [trainResult, setTrainResult] = useState<TrainResult | null>(initialResult ?? null);
  const [history, setHistory]     = useState<HistoryEntry[]>(initialHistory ?? []);
  const [error, setError]         = useState("");
  const [dragging, setDragging]   = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  // ── LLM analysis state ────────────────────────────────────────────────────
  const [llmProvider, setLlmProvider]         = useState<LLMProvider>("gemini-2.5");
  const [userApiKey, setUserApiKey]           = useState("");
  const [showKeyInput, setShowKeyInput]       = useState(false);
  const [customLLMUrl, setCustomLLMUrl]       = useState("");
  const [customLLMModel, setCustomLLMModel]   = useState("");
  const [analysisExpanded, setAnalysisExpanded] = useState(false);

  // ── Explain hook ──────────────────────────────────────────────────────────
  const { llmExp, llmLoading, llmProgress, llmError, handleExplain, setLlmExp } = useAutoMLExplain(
    trainResult, llmProvider, userApiKey, customLLMUrl, customLLMModel,
  );

  // ── Saved runs + view ─────────────────────────────────────────────────────
  const [savedFlash, setSavedFlash]             = useState(false);
  const [isLoadedFromSaved, setIsLoadedFromSaved] = useState(false);
  const [view, setView]                         = useState<"wizard" | "saved">("wizard");
  const [savedRuns, setSavedRuns]               = useState<SavedRun[]>(() => {
    try { return JSON.parse(localStorage.getItem("automl_saved_runs") || "[]"); }
    catch { return []; }
  });
  const [expandedDatasets, setExpandedDatasets] = useState<Set<string>>(new Set());

  // ── Model selection ───────────────────────────────────────────────────────
  const availableModels = useMemo(
    () => [...SHARED_ML_MODELS, ...TASK_ML_MODELS[taskType]],
    [taskType],
  );
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set(DEFAULT_ML_MODELS));

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => { setSelectedModels(new Set(DEFAULT_ML_MODELS)); }, [taskType]);
  useEffect(() => { if (llmExp) setAnalysisExpanded(true); }, [llmExp]);
  useEffect(() => { if (llmError) setError(llmError); }, [llmError]);

  const onResultChangeRef = useRef(onResultChange);
  onResultChangeRef.current = onResultChange;
  useEffect(() => {
    if (!isLoadedFromSaved) onResultChangeRef.current?.(trainResult, history);
  }, [trainResult, history, isLoadedFromSaved]);

  useEffect(() => {
    localStorage.setItem("automl_saved_runs", JSON.stringify(savedRuns));
  }, [savedRuns]);

  // ── Training estimate (memoized) ──────────────────────────────────────────
  const trainingEst = useMemo(
    () => calcTrainingEstimate(analyzed?.rows, selectedModels),
    [analyzed, selectedModels],
  );

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleFile = useCallback(async (f: File) => {
    if (!f.name.endsWith(".csv")) { setError("Please upload a CSV file."); return; }
    setError(""); setFile(f); setAnalyzing(true);
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 30_000);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch(`${API}/analyze`, { method: "POST", body: fd, signal: abort.signal });
      if (!res.ok) throw new Error("Analysis failed — check the CSV format.");
      const data: AnalyzeResult = await res.json();
      setAnalyzed(data);
      setTarget(data.suggested_target);
      setTaskType(data.suggested_task);
      setStep("config");
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        setError("Server not responding — the backend may be starting up on Render (cold start). Wait 30s and try again.");
      } else {
        setError(e instanceof Error ? e.message : "Analysis failed.");
      }
    } finally {
      clearTimeout(timer);
      setAnalyzing(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleTrain = useCallback(async () => {
    if (!file || !target) return;
    setStep("training"); setPct(0); setStatusMsg("Starting AutoML competition..."); setError("");
    try {
      const fd = new FormData();
      fd.append("file",                file);
      fd.append("model_name",          modelName || "AutoML Model");
      fd.append("target_col",          target);
      fd.append("task",                taskType);
      fd.append("algorithm",           "AutoML");
      fd.append("accent",              ACCENT);
      fd.append("feature_engineering", "{}");
      fd.append("fe_b64",              "");
      fd.append("pre_fe_cols_json",    "[]");
      fd.append("pre_fe_sample_json",  "{}");
      fd.append("tune",                "false");
      fd.append("n_trials",            "10");
      fd.append("selected_models",     JSON.stringify([...selectedModels]));

      const res = await fetch(`${API}/train`, { method: "POST", body: fd });
      if (!res.ok || !res.body) throw new Error("Training request failed.");

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer    = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          try {
            const evt = JSON.parse(line.slice(5).trim());
            if (evt.pct != null && evt.pct >= 0) setPct(evt.pct);
            if (evt.msg) setStatusMsg(evt.msg);
            if (evt.done) {
              if (evt.error) throw new Error(evt.error);
              if (evt.result) {
                const r: TrainResult = { ...evt.result, fileName: file?.name };
                setTrainResult(r);
                setIsLoadedFromSaved(false);
                setHistory(prev => [{ ts: new Date().toLocaleTimeString(), result: r }, ...prev].slice(0, 3));
                setStep("results");
              }
            }
          } catch (parseErr) {
            if (parseErr instanceof Error && parseErr.message !== "Unexpected token") throw parseErr;
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Training failed.");
      setStep("config");
    }
  }, [file, target, taskType, modelName, selectedModels]);

  const handleSave = useCallback(() => {
    if (!trainResult?.automl) { onClose(); return; }
    const automl = trainResult.automl;
    setState(prev => ({
      ...prev,
      csv: file,
      fileName: file?.name ?? null,
      target,
      taskType,
      automlWinner: {
        algo:   algoToKey(automl.winner),
        params: {},
        score:  automl.cv_results.find(c => c.algorithm === automl.winner)?.score ?? 0,
        metric: automl.selection_metric as ModelResult["metric"],
      },
      automlRanking: automl.cv_results.map(c => ({
        algo:   algoToKey(c.algorithm),
        params: {},
        score:  c.score,
        metric: automl.selection_metric as ModelResult["metric"],
      })),
    }));
    onSavedToPipeline?.();
    onClose();
  }, [trainResult, file, target, taskType, setState, onClose, onSavedToPipeline]);

  const handleSaveVersion = useCallback(() => {
    if (!trainResult) return;
    const datasetName = file?.name ?? trainResult.fileName ?? trainResult.title;
    const existing    = savedRuns.filter(r => r.datasetName === datasetName);
    const runNumber   = existing.length + 1;
    const winnerCV    = trainResult.automl.cv_results.find(r => r.algorithm === trainResult.automl.winner);
    const score       = winnerCV ? formatWinnerScore(trainResult.automl.task, winnerCV.score) : trainResult.metric;
    const date        = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
    setSavedRuns(prev => {
      const newRun: SavedRun = { id: `${Date.now()}`, datasetName, runNumber, winner: trainResult.automl.winner, score, task: trainResult.automl.task, date, result: trainResult };
      const withNew          = [newRun, ...prev];
      const datasetCount: Record<string, number> = {};
      return withNew.filter(r => {
        datasetCount[r.datasetName] = (datasetCount[r.datasetName] ?? 0) + 1;
        return datasetCount[r.datasetName] <= MAX_SAVED_PER_DATASET;
      });
    });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
    onSavedToPipeline?.();
  }, [trainResult, file, savedRuns, onSavedToPipeline]);

  const toggleModel = useCallback((m: string) => {
    setSelectedModels(prev => {
      const next = new Set(prev);
      if (next.has(m)) { if (next.size > 1) next.delete(m); }
      else next.add(m);
      return next;
    });
  }, []);

  const handleRunAgain = useCallback(() => {
    setStep("upload"); setFile(null); setAnalyzed(null); setTrainResult(null);
    setPct(0); setLlmExp(null); setIsLoadedFromSaved(false);
  }, [setLlmExp]);

  // ── Render ────────────────────────────────────────────────────────────────

  const inner = (
    <>
      {/* Tab switcher */}
      <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1.5rem", borderBottom: "1px solid var(--border)" }}>
        {(["wizard", "saved"] as const).map(v => (
          <button key={v} onClick={() => setView(v)} style={{
            padding: "0.4rem 1rem", background: "none", border: "none",
            borderBottom: view === v ? `2px solid ${ACCENT}` : "2px solid transparent",
            color: view === v ? ACCENT : "var(--text3)",
            fontSize: "0.75rem", fontWeight: 600, cursor: "pointer",
            marginBottom: "-1px", transition: "color 0.15s",
          }}>
            {v === "wizard" ? "New Run" : `Saved${savedRuns.length > 0 ? ` (${savedRuns.length})` : ""}`}
          </button>
        ))}
      </div>

      {view === "wizard" && (
        <>
          <StepIndicator step={step} />

          {/* Step panels */}
          {step === "upload" && (
            <Step1Upload
              analyzing={analyzing}
              dragging={dragging}
              error={error}
              onFile={handleFile}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            />
          )}

          {step === "config" && analyzed && (
            <Step2Configure
              file={file}
              analyzed={analyzed}
              target={target}
              taskType={taskType}
              modelName={modelName}
              selectedModels={selectedModels}
              availableModels={availableModels}
              error={error}
              trainingEst={trainingEst}
              onTarget={setTarget}
              onTaskType={setTaskType}
              onModelName={setModelName}
              onToggleModel={toggleModel}
              onBack={() => setStep("upload")}
              onTrain={handleTrain}
            />
          )}

          {step === "training" && (
            <Step3Train
              pct={pct}
              statusMsg={statusMsg}
              selectedModels={selectedModels}
              analyzedRows={analyzed?.rows}
              trainingEst={trainingEst}
            />
          )}

          {step === "results" && trainResult?.automl && (
            <Step4Results
              trainResult={trainResult}
              history={history}
              file={file}
              savedRuns={savedRuns}
              savedFlash={savedFlash}
              isLoadedFromSaved={isLoadedFromSaved}
              analysisExpanded={analysisExpanded}
              llmProvider={llmProvider}
              llmExp={llmExp}
              llmLoading={llmLoading}
              llmProgress={llmProgress}
              showKeyInput={showKeyInput}
              userApiKey={userApiKey}
              customLLMUrl={customLLMUrl}
              customLLMModel={customLLMModel}
              onSetAnalysisExpanded={setAnalysisExpanded}
              onSetShowKeyInput={setShowKeyInput}
              onSetLlmProvider={setLlmProvider}
              onSetUserApiKey={setUserApiKey}
              onSetCustomLLMUrl={setCustomLLMUrl}
              onSetCustomLLMModel={setCustomLLMModel}
              onSetLlmExp={setLlmExp}
              llmError={llmError}
              onGenerateAnalysis={handleExplain}
              onSetTrainResult={setTrainResult}
              onRunAgain={handleRunAgain}
              onClose={onClose}
              onSaveVersion={handleSaveVersion}
              onSaveToPipeline={handleSave}
            />
          )}
        </>
      )}

      {view === "saved" && (
        <SavedRunsView
          savedRuns={savedRuns}
          expandedDatasets={expandedDatasets}
          onToggleDataset={(name) => setExpandedDatasets(prev => {
            const next = new Set(prev);
            next.has(name) ? next.delete(name) : next.add(name);
            return next;
          })}
          onLoadRun={(run) => {
            setTrainResult(run.result);
            setStep("results");
            setView("wizard");
            setIsLoadedFromSaved(true);
          }}
          onDeleteRun={(id) => setSavedRuns(prev => prev.filter(r => r.id !== id))}
        />
      )}

      <AutoMLFooter />
    </>
  );

  if (isPage) return inner;
  return (
    <ModalShell onClose={onClose} title="AutoML Pipeline" accent={ACCENT}>
      {inner}
    </ModalShell>
  );
}
