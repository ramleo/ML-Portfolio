"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useAutoMLExplain } from "@/hooks/useAutoMLExplain";
import { useAutoMLSavedRuns } from "@/hooks/useAutoMLSavedRuns";
import { useAutoMLTrain } from "@/hooks/useAutoMLTrain";
import { usePipeline } from "@/context/PipelineContext";
import { type ModelResult } from "@/types/pipeline";
import { ML_UNIFIED_API as API } from "@/config/urls";
import ModalShell from "@/components/modals/ModalShell";

import {
  ACCENT,
  DEFAULT_ML_MODELS, SHARED_ML_MODELS, TASK_ML_MODELS,
  algoToKey, trainingEstimate as calcTrainingEstimate,
  type Step, type AnalyzeResult, type TrainResult, type HistoryEntry,
  type LLMProvider,
} from "@/lib/automlUtils";

import Step1Upload    from "@/components/AutoMLSteps/Step1Upload";
import Step2Configure from "@/components/AutoMLSteps/Step2Configure";
import Step3Train     from "@/components/AutoMLSteps/Step3Train";
import Step4Results   from "@/components/AutoMLSteps/Step4Results";
import SavedRunsView  from "@/components/AutoMLSteps/SavedRunsView";
import StepIndicator  from "@/components/AutoMLSteps/StepIndicator";
import AutoMLFooter   from "@/components/AutoMLSteps/AutoMLFooter";

export type { TrainResult, HistoryEntry };

interface AutoMLModalProps {
  onClose:            () => void;
  onSavedToPipeline?: () => void;
  initialResult?:     TrainResult | null;
  initialHistory?:    HistoryEntry[];
  onResultChange?:    (result: TrainResult | null, history: HistoryEntry[]) => void;
  isPage?:            boolean;
  onReady?:           (trigger: (f: File) => void) => void;
}

export default function AutoMLModal({
  onClose, onSavedToPipeline, initialResult, initialHistory, onResultChange,
  isPage = false, onReady,
}: AutoMLModalProps) {
  const { setState } = usePipeline();
  const { handleTrain: runTrain } = useAutoMLTrain();

  const [step, setStep]           = useState<Step>(initialResult ? "results" : "upload");
  const [file, setFile]           = useState<File | null>(null);
  const [analyzed, setAnalyzed]   = useState<AnalyzeResult | null>(null);
  const [target, setTarget]       = useState("");
  const [taskType, setTaskType]   = useState<"classification" | "regression">("classification");
  const [useSMOTE, setUseSMOTE]   = useState(true);
  const [modelName, setModelName] = useState("My AutoML Model");
  const [pct, setPct]             = useState(0);
  const [statusMsg, setStatusMsg] = useState("Initializing...");
  const [trainResult, setTrainResult] = useState<TrainResult | null>(initialResult ?? null);
  const [history, setHistory]     = useState<HistoryEntry[]>(initialHistory ?? []);
  const [error, setError]         = useState("");
  const [dragging, setDragging]   = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [colEncodings, setColEncodings] = useState<Record<string, string>>({});
  const [dropCols, setDropCols]   = useState<string[]>([]);

  const [llmProvider, setLlmProvider]       = useState<LLMProvider>("gemini-2.5");
  const [userApiKey, setUserApiKey]         = useState("");
  const [showKeyInput, setShowKeyInput]     = useState(false);
  const [customLLMUrl, setCustomLLMUrl]     = useState("");
  const [customLLMModel, setCustomLLMModel] = useState("");
  const [analysisExpanded, setAnalysisExpanded] = useState(false);

  const { llmExp, llmLoading, llmProgress, llmError, ragUsed, handleExplain, setLlmExp } = useAutoMLExplain(
    trainResult, llmProvider, userApiKey, customLLMUrl, customLLMModel,
  );

  const {
    savedRuns, savedFlash, isLoadedFromSaved, view, expandedDatasets,
    setView, setIsLoadedFromSaved,
    handleSaveVersion, handleLoadRun, handleDeleteRun, toggleDataset,
  } = useAutoMLSavedRuns(onSavedToPipeline);

  const availableModels = useMemo(
    () => [...SHARED_ML_MODELS, ...TASK_ML_MODELS[taskType]],
    [taskType],
  );
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set(DEFAULT_ML_MODELS));

  useEffect(() => { setSelectedModels(new Set(DEFAULT_ML_MODELS)); }, [taskType]);
  useEffect(() => { if (llmExp) setAnalysisExpanded(true); }, [llmExp]);

  const onResultChangeRef = useRef(onResultChange);
  onResultChangeRef.current = onResultChange;
  useEffect(() => {
    if (!isLoadedFromSaved) onResultChangeRef.current?.(trainResult, history);
  }, [trainResult, history, isLoadedFromSaved]);

  const trainingEst = useMemo(
    () => calcTrainingEstimate(analyzed?.rows, selectedModels),
    [analyzed, selectedModels],
  );

  const handleFile = useCallback(async (f: File) => {
    if (!f.name.endsWith(".csv")) { setError("Please upload a CSV file."); return; }
    setError(""); setFile(f); setAnalyzing(true); setColEncodings({}); setDropCols([]);
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 30_000);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch(`${API}/analyze`, { method: "POST", body: fd, signal: abort.signal });
      if (!res.ok) throw new Error("Analysis failed — check the CSV format.");
      const data: AnalyzeResult = await res.json();
      setAnalyzed(data); setTarget(data.suggested_target); setTaskType(data.suggested_task);
      setStep("config");
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        setError("Server not responding — the backend may be starting up on Render (cold start). Wait 30s and try again.");
      } else {
        setError(e instanceof Error ? e.message : "Analysis failed.");
      }
      const sid = typeof window !== "undefined" ? (localStorage.getItem("_ml_session") ?? "") : "";
      fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "error", path: "/tools/automl", session_id: sid, meta: { tool: "automl", error_type: "analyze_error" } }),
      }).catch(() => {});
    } finally {
      clearTimeout(timer);
      setAnalyzing(false);
    }
  }, []);

  useEffect(() => {
    onReady?.(handleFile);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleTrain = useCallback(async () => {
    if (!file || !target) return;
    await runTrain(
      { file, target, taskType, modelName, selectedModels, colEncodings, dropCols, useSMOTE },
      {
        onStart:    () => { setStep("training"); setPct(0); setStatusMsg("Starting AutoML competition..."); setError(""); },
        onPct:      setPct,
        onMsg:      setStatusMsg,
        onResult:   (r) => {
          setTrainResult(r); setIsLoadedFromSaved(false); setStep("results");
          // Auto-write winner to context on training completion
          if (r?.automl) {
            const automl = r.automl;
            setState(prev => ({
              ...prev, csv: file, fileName: file?.name ?? null, target, taskType,
              automlWinner: {
                algo: algoToKey(automl.winner), params: {},
                score: automl.cv_results.find((c: { algorithm: string; score: number }) => c.algorithm === automl.winner)?.score ?? 0,
                metric: automl.selection_metric as ModelResult["metric"],
              },
              automlRanking: automl.cv_results.map((c: { algorithm: string; score: number }) => ({
                algo: algoToKey(c.algorithm), params: {}, score: c.score,
                metric: automl.selection_metric as ModelResult["metric"],
              })),
            }));
          }
        },
        onError:    (msg) => { setError(msg); setStep("config"); },
        addHistory: (entry) => setHistory(prev => [entry, ...prev].slice(0, 3)),
      },
    );
  }, [file, target, taskType, modelName, selectedModels, dropCols, colEncodings, useSMOTE, runTrain, setIsLoadedFromSaved]);

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
    setPct(0); setLlmExp(null); setIsLoadedFromSaved(false); setColEncodings({}); setDropCols([]);
  }, [setLlmExp, setIsLoadedFromSaved]);

  const inner = (
    <>
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
          {step === "upload" && (
            <Step1Upload
              analyzing={analyzing} dragging={dragging} error={error}
              onFile={handleFile}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            />
          )}
          {step === "config" && analyzed && (
            <Step2Configure
              file={file} analyzed={analyzed} target={target} taskType={taskType}
              modelName={modelName} selectedModels={selectedModels} availableModels={availableModels}
              error={error} trainingEst={trainingEst}
              onTarget={setTarget} onTaskType={setTaskType} onModelName={setModelName}
              onToggleModel={toggleModel} useSMOTE={useSMOTE} onUseSMOTE={setUseSMOTE}
              colEncodings={colEncodings}
              onColEncoding={(col, enc) => setColEncodings(prev => ({ ...prev, [col]: enc }))}
              dropCols={dropCols}
              onToggleDropCol={(col) => setDropCols(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col])}
              onBack={() => { setStep("upload"); setError(""); }}
              onTrain={handleTrain}
            />
          )}
          {step === "training" && (
            <Step3Train
              pct={pct} statusMsg={statusMsg} selectedModels={selectedModels}
              analyzedRows={analyzed?.rows} trainingEst={trainingEst}
            />
          )}
          {step === "results" && trainResult?.automl && (
            <Step4Results
              trainResult={trainResult} history={history} file={file}
              savedRuns={savedRuns} savedFlash={savedFlash} isLoadedFromSaved={isLoadedFromSaved}
              analysisExpanded={analysisExpanded} llmProvider={llmProvider} llmExp={llmExp}
              llmLoading={llmLoading} llmProgress={llmProgress} showKeyInput={showKeyInput}
              userApiKey={userApiKey} customLLMUrl={customLLMUrl} customLLMModel={customLLMModel}
              onSetAnalysisExpanded={setAnalysisExpanded} onSetShowKeyInput={setShowKeyInput}
              onSetLlmProvider={setLlmProvider} onSetUserApiKey={setUserApiKey}
              onSetCustomLLMUrl={setCustomLLMUrl} onSetCustomLLMModel={setCustomLLMModel}
              onSetLlmExp={setLlmExp} llmError={llmError} ragUsed={ragUsed} onGenerateAnalysis={handleExplain}
              onSetTrainResult={setTrainResult} onRunAgain={handleRunAgain} onClose={onClose}
              onSaveVersion={() => handleSaveVersion(trainResult, file?.name)}
            />
          )}
        </>
      )}

      {view === "saved" && (
        <SavedRunsView
          savedRuns={savedRuns} expandedDatasets={expandedDatasets}
          onToggleDataset={toggleDataset}
          onLoadRun={(run) => handleLoadRun(run, setTrainResult, setStep as (s: "results") => void)}
          onDeleteRun={handleDeleteRun}
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