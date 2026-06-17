"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { usePipeline } from "@/context/PipelineContext";
import { type ModelResult } from "@/types/pipeline";
import { ML_UNIFIED_API as API } from "@/config/urls";
const ACCENT = "#818cf8";
const MODAL_BG = "#0b1120";
const CARD_BG = "rgba(17,24,39,0.65)";

// ── Types ─────────────────────────────────────────────────────────────────────

type ColumnInfo = { name: string; is_numeric: boolean; nunique: number; missing: number };

type AnalyzeResult = {
  columns: ColumnInfo[];
  suggested_target: string;
  suggested_task: "classification" | "regression";
  rows: number;
  total_missing: number;
};

type CVResult = { algorithm: string; score: number; fold_scores: number[] };

type WinnerMetrics = {
  mae?: number; rmse?: number; mape?: number; max_error?: number; median_ae?: number; r2?: number;
  accuracy?: number; f1_weighted?: number; precision?: number; recall?: number; roc_auc?: number;
};

type FeatureImportanceItem = { feature: string; importance: number };

type Explanation = {
  why_won: string;
  score_analysis: string;
  key_drivers: string;
  recommendations: string[];
  model_comparison?: ModelComparisonItem[];
  actionable_insights?: ActionableInsight[];
};

type AutoMLResult = {
  winner: string;
  selection_metric: string;
  cv_results: CVResult[];
  task: "classification" | "regression";
  winner_metrics?: WinnerMetrics;
  feature_importance?: FeatureImportanceItem[];
  explanation?: Explanation;
  explanation_source?: string;
  is_imbalanced?: boolean;
  n_rows?: number;
};

export type TrainResult = {
  id: string;
  title: string;
  fileName?: string;
  metric: string;
  metricLabel: string;
  automl: AutoMLResult;
};

export type HistoryEntry = { ts: string; result: TrainResult };

type SavedRun = {
  id: string;
  datasetName: string;
  runNumber: number;
  winner: string;
  score: string;
  task: "classification" | "regression";
  date: string;
  result: TrainResult;
};

type LLMProvider = "gemini-2.5" | "anthropic" | "openai" | "groq" | "groq-mixtral" | "custom";

const LLM_PROVIDERS: { value: LLMProvider; label: string }[] = [
  { value: "gemini-2.5",   label: "Gemini 2.5 Flash" },
  { value: "anthropic",    label: "Claude Haiku" },
  { value: "openai",       label: "GPT-4o Mini" },
  { value: "groq",         label: "Groq Llama 3.3" },
  { value: "groq-mixtral", label: "Mixtral 8x7B (Groq)" },
  { value: "custom",       label: "Custom (OpenAI-compatible)" },
];

const LLM_KEY_HINTS: Record<LLMProvider, string> = {
  "gemini-2.5":   "Get a free key at aistudio.google.com",
  "anthropic":    "Get a key at console.anthropic.com",
  "openai":       "Get a key at platform.openai.com",
  "groq":         "Get a free key at console.groq.com",
  "groq-mixtral": "Get a free key at console.groq.com",
  "custom":       "Leave blank if your endpoint does not require authentication",
};

const DEFAULT_ML_MODELS = ["Random Forest", "XGBoost", "LightGBM", "CatBoost", "Extra Trees"] as const;
const SHARED_ML_MODELS = [...DEFAULT_ML_MODELS, "Decision Tree", "KNN"] as const;
const TASK_ML_MODELS: Record<"classification" | "regression", string[]> = {
  classification: ["Logistic Regression", "SVM", "Naive Bayes", "Gradient Boosting", "AdaBoost"],
  regression:     ["Ridge", "Lasso", "ElasticNet", "SVR", "Gradient Boosting"],
};

type ModelComparisonItem = { algorithm: string; fitness_score: number; reason: string };
type ActionableInsight   = { title: string; detail: string };

type Step = "upload" | "config" | "training" | "results";

// ── Helpers ───────────────────────────────────────────────────────────────────

function algoToKey(algo: string): ModelResult["algo"] {
  if (algo.includes("XGBoost"))  return "XGBoost";
  if (algo.includes("LightGBM")) return "LightGBM";
  if (algo.includes("CatBoost")) return "CatBoost";
  return "RandomForest";
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ProgressBar({ pct, label }: { pct: number; label: string }) {
  return (
    <div style={{ marginTop: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
        <span style={{ fontSize: "0.78rem", color: "var(--text2)" }}>{label}</span>
        <span style={{ fontSize: "0.78rem", color: ACCENT, fontVariantNumeric: "tabular-nums" }}>{pct}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 9999, background: "var(--border2)", overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${pct}%`,
          background: `linear-gradient(90deg, ${ACCENT}99, ${ACCENT})`,
          borderRadius: 9999, transition: "width 0.4s cubic-bezier(.4,0,.2,1)",
        }} />
      </div>
    </div>
  );
}

function RankingTable({ results, winner, task }: {
  results: CVResult[]; winner: string; task: "classification" | "regression";
}) {
  const sorted = [...results].sort((a, b) =>
    task === "regression" ? a.score - b.score : b.score - a.score
  );
  const winnerScore = sorted[0].score;
  const barOpacities = [1, 0.65, 0.45, 0.3, 0.2];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", marginTop: "0.5rem" }}>
      {sorted.map((r, i) => {
        const isWinner = r.algorithm === winner;
        const barPct = task === "regression"
          ? Math.max(15, 100 - ((r.score - winnerScore) / (winnerScore || 1)) * 100)
          : Math.round((r.score / (winnerScore || 1)) * 100);
        const opacity = barOpacities[Math.min(i, barOpacities.length - 1)];
        const scoreLabel = task === "regression"
          ? r.score.toFixed(4)
          : (r.score * 100).toFixed(2) + "%";
        const delta = task === "regression"
          ? r.score - winnerScore
          : (r.score - winnerScore) * 100;
        const deltaLabel = task === "regression"
          ? `+${delta.toFixed(4)}`
          : `${delta.toFixed(2)}%`;

        return (
          <div key={r.algorithm} style={{
            padding: "0.55rem 0.85rem", borderRadius: 10,
            background: isWinner ? `${ACCENT}12` : "var(--bg-glass)",
            border: `1px solid ${isWinner ? ACCENT + "44" : "var(--border)"}`,
            display: "flex", alignItems: "center", gap: "0.65rem",
          }}>
            <span style={{
              fontSize: "0.68rem", fontWeight: isWinner ? 700 : 500,
              color: isWinner ? ACCENT : "var(--text3)",
              width: 18, flexShrink: 0, fontVariantNumeric: "tabular-nums",
            }}>
              #{i + 1}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", width: 140, flexShrink: 0 }}>
              <span style={{ fontSize: "0.8rem", fontWeight: isWinner ? 700 : 500, color: isWinner ? "var(--text)" : "var(--text2)" }}>
                {r.algorithm}
              </span>
              {isWinner && (
                <span style={{
                  fontSize: "0.58rem", fontWeight: 700, padding: "1px 6px", borderRadius: 9999,
                  background: `${ACCENT}22`, color: ACCENT, border: `1px solid ${ACCENT}44`,
                  letterSpacing: "0.06em", textTransform: "uppercase", flexShrink: 0,
                }}>WINNER</span>
              )}
            </div>
            <div style={{ flex: 1, height: 6, borderRadius: 9999, background: "var(--border2)", overflow: "hidden" }}>
              <div style={{
                height: "100%", width: `${barPct}%`,
                background: ACCENT, opacity,
                borderRadius: 9999, transition: "width 0.6s ease",
              }} />
            </div>
            <span style={{
              fontSize: "0.8rem", fontWeight: 600, fontVariantNumeric: "tabular-nums",
              color: isWinner ? ACCENT : "var(--text3)",
              width: 58, textAlign: "right", flexShrink: 0,
            }}>
              {scoreLabel}
            </span>
            <span style={{
              fontSize: "0.7rem", fontVariantNumeric: "tabular-nums",
              color: isWinner ? "transparent" : "var(--text3)",
              width: 52, textAlign: "right", flexShrink: 0,
            }}>
              {!isWinner ? deltaLabel : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function WinnerMetricsGrid({ metrics, task }: { metrics: WinnerMetrics; task: "classification" | "regression" }) {
  const entries: { label: string; value: string }[] = [];
  if (task === "regression") {
    if (metrics.mae      != null) entries.push({ label: "MAE",       value: metrics.mae.toFixed(2) });
    if (metrics.rmse     != null) entries.push({ label: "RMSE",      value: metrics.rmse.toFixed(2) });
    if (metrics.mape     != null) entries.push({ label: "MAPE",      value: (metrics.mape * 100).toFixed(2) + "%" });
    if (metrics.r2       != null) entries.push({ label: "R²",        value: metrics.r2.toFixed(2) });
    if (metrics.max_error!= null) entries.push({ label: "Max Error", value: metrics.max_error.toFixed(2) });
    if (metrics.median_ae!= null) entries.push({ label: "Median AE", value: metrics.median_ae.toFixed(2) });
  } else {
    if (metrics.accuracy   != null) entries.push({ label: "Accuracy",  value: (metrics.accuracy * 100).toFixed(1) + "%" });
    if (metrics.f1_weighted!= null) entries.push({ label: "F1",        value: metrics.f1_weighted.toFixed(3) });
    if (metrics.precision  != null) entries.push({ label: "Precision", value: metrics.precision.toFixed(3) });
    if (metrics.recall     != null) entries.push({ label: "Recall",    value: metrics.recall.toFixed(3) });
    if (metrics.roc_auc    != null) entries.push({ label: "ROC-AUC",   value: metrics.roc_auc.toFixed(3) });
  }
  if (!entries.length) return null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem", marginTop: "0.85rem" }}>
      {entries.map(e => (
        <div key={e.label} style={{
          padding: "0.5rem 0.75rem", borderRadius: 8,
          background: `${ACCENT}0a`, border: `1px solid ${ACCENT}1a`, textAlign: "center",
        }}>
          <div style={{ fontSize: "0.58rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.15rem" }}>
            {e.label}
          </div>
          <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>
            {e.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function FeatureImportanceChart({ features }: { features: FeatureImportanceItem[] }) {
  const top = features.slice(0, 7);
  const max = top[0]?.importance ?? 1;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
      {top.map(f => (
        <div key={f.feature} style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <span style={{
            fontSize: "0.72rem", color: "var(--text2)", minWidth: 110,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "right",
          }}>
            {f.feature}
          </span>
          <div style={{ flex: 1, height: 6, borderRadius: 9999, background: "var(--border2)", overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${(f.importance / max) * 100}%`,
              background: `linear-gradient(90deg, ${ACCENT}88, ${ACCENT})`,
              borderRadius: 9999, transition: "width 0.6s ease",
            }} />
          </div>
          <span style={{ fontSize: "0.7rem", color: ACCENT, fontVariantNumeric: "tabular-nums", minWidth: 38, textAlign: "right" }}>
            {f.importance.toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  );
}

function ModelComparisonChart({ items }: { items: ModelComparisonItem[] }) {
  const sorted = [...items].sort((a, b) => b.fitness_score - a.fitness_score);
  const W = 540, H = 150;
  const padL = 28, padR = 12, padT = 20, padB = 38;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const n = sorted.length;
  const xFor = (i: number) => padL + (n < 2 ? chartW / 2 : (i / (n - 1)) * chartW);
  const yFor = (s: number) => padT + chartH - (s / 100) * chartH;
  const dotColor = (s: number) => s >= 80 ? ACCENT : s >= 60 ? "#fbbf24" : "#f87171";
  const polyline = sorted.map((item, i) => `${xFor(i)},${yFor(item.fitness_score)}`).join(" ");
  const shortName = (name: string) => name.replace("Random Forest", "Rand. Forest");

  return (
    <div style={{ marginTop: "0.75rem" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", overflow: "visible", display: "block" }}>
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map(v => (
          <g key={v}>
            <line x1={padL} y1={yFor(v)} x2={W - padR} y2={yFor(v)}
              stroke="var(--border2)" strokeWidth="0.6" strokeDasharray="3,3" />
            <text x={padL - 4} y={yFor(v) + 3.5} fontSize="8" fill="var(--text3)" textAnchor="end">{v}</text>
          </g>
        ))}
        {/* Connecting line */}
        {n > 1 && (
          <polyline points={polyline} fill="none" stroke={`${ACCENT}44`} strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round" />
        )}
        {/* Dots + labels */}
        {sorted.map((item, i) => {
          const cx = xFor(i);
          const cy = yFor(item.fitness_score);
          const color = dotColor(item.fitness_score);
          return (
            <g key={item.algorithm}>
              <text x={cx} y={cy - 9} fontSize="9" fill={color} textAnchor="middle" fontWeight="700">
                {item.fitness_score}
              </text>
              <circle cx={cx} cy={cy} r={6} fill={color} opacity={0.18} />
              <circle cx={cx} cy={cy} r={3.5} fill={color} />
              <text x={cx} y={H - 4} fontSize="8.5" fill="var(--text3)" textAnchor="middle">
                {shortName(item.algorithm)}
              </text>
            </g>
          );
        })}
      </svg>
      {/* Descriptions */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", marginTop: "0.5rem" }}>
        {sorted.map(item => (
          <div key={item.algorithm} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
            <div style={{
              width: 7, height: 7, borderRadius: "50%", flexShrink: 0, marginTop: 4,
              background: dotColor(item.fitness_score),
            }} />
            <p style={{ fontSize: "0.68rem", color: "var(--text3)", margin: 0, lineHeight: 1.45 }}>
              <span style={{ fontWeight: 600, color: "var(--text2)" }}>{item.algorithm}:</span>{" "}{item.reason}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────────

export default function AutoMLModal({
  onClose,
  onSavedToPipeline,
  initialResult,
  initialHistory,
  onResultChange,
}: {
  onClose: () => void;
  onSavedToPipeline?: () => void;
  initialResult?: TrainResult | null;
  initialHistory?: HistoryEntry[];
  onResultChange?: (result: TrainResult | null, history: HistoryEntry[]) => void;
}) {
  const { setState } = usePipeline();

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
  const [llmProvider, setLlmProvider]       = useState<LLMProvider>("gemini-2.5");
  const [llmExp, setLlmExp]                 = useState<Explanation | null>(null);
  const [llmLoading, setLlmLoading]         = useState(false);
  const [llmProgress, setLlmProgress]       = useState(0);
  const [userApiKey, setUserApiKey]         = useState("");
  const [showKeyInput, setShowKeyInput]     = useState(false);
  const [customLLMUrl, setCustomLLMUrl]     = useState("");
  const [customLLMModel, setCustomLLMModel] = useState("");
  const [analysisExpanded, setAnalysisExpanded] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [isLoadedFromSaved, setIsLoadedFromSaved] = useState(false);
  const [view, setView] = useState<"wizard" | "saved">("wizard");
  const [savedRuns, setSavedRuns] = useState<SavedRun[]>(() => {
    try { return JSON.parse(localStorage.getItem("automl_saved_runs") || "[]"); }
    catch { return []; }
  });
  const [expandedDatasets, setExpandedDatasets] = useState<Set<string>>(new Set());
  const availableModels = useMemo(
    () => [...SHARED_ML_MODELS, ...TASK_ML_MODELS[taskType]],
    [taskType]
  );
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set(DEFAULT_ML_MODELS));

  useEffect(() => {
    setSelectedModels(new Set(DEFAULT_ML_MODELS));
  }, [taskType]);

  useEffect(() => {
    if (llmExp) setAnalysisExpanded(true);
  }, [llmExp]);

  const onResultChangeRef = useRef(onResultChange);
  onResultChangeRef.current = onResultChange;
  useEffect(() => {
    onResultChangeRef.current?.(trainResult, history);
  }, [trainResult, history]); // ref keeps callback current without making it a dep

  useEffect(() => {
    localStorage.setItem("automl_saved_runs", JSON.stringify(savedRuns));
  }, [savedRuns]);

  const handleSaveVersion = useCallback(() => {
    if (!trainResult) return;
    const datasetName = file?.name ?? trainResult.fileName ?? trainResult.title;
    const existing = savedRuns.filter(r => r.datasetName === datasetName);
    const runNumber = existing.length + 1;
    const isReg = trainResult.automl.task === "regression";
    const winnerCV = trainResult.automl.cv_results.find(r => r.algorithm === trainResult.automl.winner);
    const score = winnerCV
      ? isReg ? winnerCV.score.toFixed(4) : `${(winnerCV.score * 100).toFixed(2)}%`
      : trainResult.metric;
    const date = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const MAX_PER_DATASET = 5;
    setSavedRuns(prev => {
      const newRun: SavedRun = {
        id: `${Date.now()}`,
        datasetName,
        runNumber,
        winner: trainResult.automl.winner,
        score,
        task: trainResult.automl.task,
        date,
        result: trainResult,
      };
      const withNew = [newRun, ...prev];
      // Keep only the MAX_PER_DATASET most recent per dataset; evict oldest (last in array)
      const datasetCount: Record<string, number> = {};
      return withNew.filter(r => {
        datasetCount[r.datasetName] = (datasetCount[r.datasetName] ?? 0) + 1;
        return datasetCount[r.datasetName] <= MAX_PER_DATASET;
      });
    });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
    onSavedToPipeline?.();
  }, [trainResult, file, savedRuns, onSavedToPipeline]); // file may be null after modal reopen; falls back to trainResult.fileName

  const toggleModel = useCallback((m: string) => {
    setSelectedModels(prev => {
      const next = new Set(prev);
      if (next.has(m)) { if (next.size > 1) next.delete(m); }
      else next.add(m);
      return next;
    });
  }, []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Step 1: analyze CSV ──────────────────────────────────────────────────
  const handleFile = useCallback(async (f: File) => {
    if (!f.name.endsWith(".csv")) { setError("Please upload a CSV file."); return; }
    setError(""); setFile(f); setAnalyzing(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch(`${API}/analyze`, { method: "POST", body: fd });
      if (!res.ok) throw new Error("Analysis failed — check the CSV format.");
      const data: AnalyzeResult = await res.json();
      setAnalyzed(data);
      setTarget(data.suggested_target);
      setTaskType(data.suggested_task);
      setStep("config");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed.");
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  // ── Step 2 → Step 3: train ───────────────────────────────────────────────
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

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

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

  // ── Save to pipeline ─────────────────────────────────────────────────────
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
        algo: algoToKey(automl.winner),
        params: {},
        score: automl.cv_results.find(c => c.algorithm === automl.winner)?.score ?? 0,
        metric: automl.selection_metric as ModelResult["metric"],
      },
      automlRanking: automl.cv_results.map(c => ({
        algo: algoToKey(c.algorithm),
        params: {},
        score: c.score,
        metric: automl.selection_metric as ModelResult["metric"],
      })),
    }));
    onSavedToPipeline?.();
    onClose();
  }, [trainResult, file, target, taskType, setState, onClose, onSavedToPipeline]);

  // ── Generate LLM analysis ────────────────────────────────────────────────
  const handleGenerateAnalysis = useCallback(async () => {
    if (!trainResult?.automl) return;
    setLlmLoading(true);
    setLlmExp(null);
    setLlmProgress(8);
    setAnalysisExpanded(true);

    // Animate progress bar while waiting for LLM
    const interval = setInterval(() => {
      setLlmProgress(p => p < 85 ? p + Math.random() * 7 : p);
    }, 500);

    try {
      const body: Record<string, unknown> = {
        automl_data: trainResult.automl,
        provider: llmProvider,
      };
      if (userApiKey.trim())     body.user_api_key    = userApiKey.trim();
      if (customLLMUrl.trim())   body.custom_base_url = customLLMUrl.trim();
      if (customLLMModel.trim()) body.custom_model    = customLLMModel.trim();

      const res = await fetch(`${API}/explain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Explain request failed");
      const data = await res.json();
      setLlmProgress(100);
      setLlmExp(data.explanation as Explanation);
    } catch {
      // silently fall back — rule explanation still shown
    } finally {
      clearInterval(interval);
      setLlmLoading(false);
    }
  }, [trainResult, llmProvider, userApiKey]);

  // ── Training time estimate ────────────────────────────────────────────────
  const trainingEstimate = useMemo(() => {
    const rows = analyzed?.rows ?? 1000;
    const base = rows < 500 ? 5 : rows < 2000 ? 12 : rows < 10000 ? 25 : 50;
    const SLOW = new Set(["XGBoost", "LightGBM", "CatBoost", "Gradient Boosting", "SVM", "SVR", "Extra Trees"]);
    const FAST = new Set(["Naive Bayes", "Decision Tree", "Ridge", "Lasso", "ElasticNet"]);
    let total = 0;
    for (const m of selectedModels) {
      total += SLOW.has(m) ? base * 1.8 : FAST.has(m) ? base * 0.6 : base;
    }
    total = Math.round(total * 1.2); // Render overhead buffer
    const lo = Math.round(total * 0.8);
    const hi = Math.round(total * 1.4);
    const fmt = (s: number) => s < 60 ? `${s}s` : `${Math.round(s / 60 * 2) / 2} min`;
    return lo === hi ? `~${fmt(lo)}` : `${fmt(lo)}–${fmt(hi)}`;
  }, [analyzed, selectedModels]);

  // ── Step indicator ────────────────────────────────────────────────────────
  const stepLabels = ["Upload", "Configure", "Training", "Results"];
  const stepKeys   = ["upload", "config", "training", "results"] as Step[];
  const currentIdx = stepKeys.indexOf(step);

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 9000,
        background: "rgba(2,8,22,0.92)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
      }}
    >
      <div style={{
        width: "100%", maxWidth: 660, maxHeight: "92vh", overflowY: "auto",
        background: MODAL_BG,
        border: "1px solid rgba(129,140,248,0.14)", borderRadius: 20,
        boxShadow: "0 0 0 1px rgba(129,140,248,0.07), 0 40px 100px rgba(0,0,0,0.85)",
      }}>

        <div style={{ padding: "1.75rem 2rem 2rem" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
            <div>
              <span style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: ACCENT, display: "block", marginBottom: "0.2rem" }}>
                ML Capabilities
              </span>
              <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "var(--text)" }}>AutoML Pipeline</h2>
            </div>
            <button onClick={onClose} style={{
              width: 32, height: 32, borderRadius: 9999,
              background: "var(--border)", border: "1px solid var(--border2)",
              color: "var(--text2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="1" y1="1" x2="13" y2="13" /><line x1="13" y1="1" x2="1" y2="13" />
              </svg>
            </button>
          </div>

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

          {view === "wizard" && <>
          {/* Step indicator */}
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem" }}>
            {stepKeys.map((s, i) => {
              const done   = i < currentIdx;
              const active = s === step;
              return (
                <div key={s} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 9999,
                    background: active ? ACCENT : done ? `${ACCENT}33` : "var(--border)",
                    border: `1px solid ${active || done ? ACCENT + "66" : "var(--border2)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.65rem", fontWeight: 700,
                    color: active ? "#000" : done ? ACCENT : "var(--text3)",
                    transition: "all 0.2s",
                  }}>
                    {done ? (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polyline points="1.5,5 4,7.5 8.5,2.5" />
                      </svg>
                    ) : i + 1}
                  </div>
                  <span style={{ fontSize: "0.72rem", color: active ? "var(--text)" : "var(--text3)", fontWeight: active ? 600 : 400 }}>
                    {stepLabels[i]}
                  </span>
                  {i < 3 && <div style={{ width: 20, height: 1, background: "var(--border2)" }} />}
                </div>
              );
            })}
          </div>

          {/* ── Upload ── */}
          {step === "upload" && (
            <div>
              <p style={{ fontSize: "0.88rem", color: "var(--text2)", marginBottom: "1.25rem", lineHeight: 1.6 }}>
                Upload any labeled CSV. AutoML will run RF, XGBoost, LightGBM, and CatBoost via 5-fold CV and pick the winner.
              </p>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragging ? ACCENT : "var(--border2)"}`,
                  borderRadius: 14, padding: "2.5rem 1.5rem", textAlign: "center",
                  cursor: "pointer", background: dragging ? `${ACCENT}08` : "transparent",
                  transition: "border-color 0.2s, background 0.2s",
                }}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 0.75rem" }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <div style={{ fontSize: "0.88rem", color: "var(--text)", fontWeight: 600, marginBottom: "0.3rem" }}>
                  {analyzing ? "Analyzing..." : "Drop CSV here or click to browse"}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text3)" }}>Any labeled CSV with a target column</div>
                <input ref={fileInputRef} type="file" accept=".csv" style={{ display: "none" }}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              </div>
              {error && <p style={{ marginTop: "0.75rem", fontSize: "0.78rem", color: "#f87171" }}>{error}</p>}
            </div>
          )}

          {/* ── Configure ── */}
          {step === "config" && analyzed && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.6rem" }}>
                {[{ label: "File", value: file?.name ?? "" }, { label: "Rows", value: analyzed.rows.toLocaleString() }, { label: "Columns", value: String(analyzed.columns.length) }].map(m => (
                  <div key={m.label} style={{ padding: "0.6rem 0.85rem", borderRadius: 10, background: CARD_BG, border: "1px solid rgba(129,140,248,0.14)" }}>
                    <div style={{ fontSize: "0.6rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.2rem" }}>{m.label}</div>
                    <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.value}</div>
                  </div>
                ))}
              </div>

              <div>
                <label style={{ fontSize: "0.78rem", color: "var(--text2)", fontWeight: 600, display: "block", marginBottom: "0.4rem" }}>Target column</label>
                <select value={target} onChange={(e) => setTarget(e.target.value)}
                  style={{ width: "100%", padding: "0.55rem 0.85rem", borderRadius: 8, background: "#111827", border: "1px solid rgba(129,140,248,0.18)", color: "var(--text)", fontSize: "0.85rem", cursor: "pointer" }}>
                  {analyzed.columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: "0.78rem", color: "var(--text2)", fontWeight: 600, display: "block", marginBottom: "0.5rem" }}>Task type</label>
                <div style={{ display: "flex", gap: "0.6rem" }}>
                  {(["classification", "regression"] as const).map(t => (
                    <button key={t} onClick={() => setTaskType(t)} style={{
                      flex: 1, padding: "0.55rem 1rem", borderRadius: 8, cursor: "pointer",
                      fontWeight: 600, fontSize: "0.82rem", textTransform: "capitalize",
                      background: taskType === t ? `${ACCENT}22` : "transparent",
                      border: `1px solid ${taskType === t ? ACCENT + "66" : "var(--border2)"}`,
                      color: taskType === t ? ACCENT : "var(--text2)", transition: "all 0.15s",
                    }}>{t}</button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.78rem", color: "var(--text2)", fontWeight: 600, display: "block", marginBottom: "0.4rem" }}>Model name</label>
                <input type="text" value={modelName} onChange={(e) => setModelName(e.target.value)}
                  style={{ width: "100%", padding: "0.55rem 0.85rem", borderRadius: 8, background: "#111827", border: "1px solid rgba(129,140,248,0.18)", color: "var(--text)", fontSize: "0.85rem", boxSizing: "border-box" }} />
              </div>

              {/* ML model selection */}
              <div>
                <label style={{ fontSize: "0.78rem", color: "var(--text2)", fontWeight: 600, display: "block", marginBottom: "0.5rem" }}>
                  Models to compete
                </label>
                {/* Chips */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginBottom: "0.5rem" }}>
                  {[...selectedModels].map(m => (
                    <div key={m} style={{
                      display: "flex", alignItems: "center", gap: "0.3rem",
                      padding: "0.2rem 0.4rem 0.2rem 0.65rem", borderRadius: 9999,
                      background: `${ACCENT}18`, border: `1px solid ${ACCENT}44`,
                      fontSize: "0.73rem", color: ACCENT, fontWeight: 600,
                    }}>
                      {m}
                      {selectedModels.size > 1 && (
                        <button onClick={() => toggleModel(m)} style={{
                          background: "none", border: "none", cursor: "pointer",
                          color: ACCENT, padding: 0, lineHeight: 1, fontSize: "0.8rem",
                          display: "flex", alignItems: "center",
                        }}>
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <line x1="1" y1="1" x2="9" y2="9" /><line x1="9" y1="1" x2="1" y2="9" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {/* Add model dropdown */}
                {availableModels.filter(m => !selectedModels.has(m)).length > 0 && (
                  <select
                    value=""
                    onChange={(e) => { if (e.target.value) toggleModel(e.target.value); }}
                    style={{
                      fontSize: "0.75rem", color: "var(--text3)", background: "var(--border)",
                      border: "1px solid var(--border2)", borderRadius: 7,
                      padding: "0.3rem 0.6rem", cursor: "pointer",
                    }}
                  >
                    <option value="">+ Add model</option>
                    {availableModels.filter(m => !selectedModels.has(m)).map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                )}
              </div>

              {analyzed.total_missing > 0 && (
                <p style={{ fontSize: "0.75rem", color: "#fbbf24", margin: 0 }}>
                  {analyzed.total_missing} missing values detected — AutoML will handle them automatically.
                </p>
              )}
              {error && <p style={{ fontSize: "0.78rem", color: "#f87171", margin: 0 }}>{error}</p>}

              <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.25rem" }}>
                <button onClick={() => setStep("upload")} style={{ padding: "0.6rem 1.2rem", borderRadius: 9999, cursor: "pointer", background: "transparent", border: "1px solid var(--border2)", color: "var(--text2)", fontSize: "0.82rem", fontWeight: 600 }}>Back</button>
                <button onClick={handleTrain} disabled={!target} style={{ flex: 1, padding: "0.6rem 1.2rem", borderRadius: 9999, cursor: "pointer", background: ACCENT, border: "none", color: "#000", fontSize: "0.85rem", fontWeight: 700, opacity: !target ? 0.5 : 1 }}>
                  Run AutoML Competition
                </button>
              </div>
            </div>
          )}

          {/* ── Training ── */}
          {step === "training" && (
            <div>
              <p style={{ fontSize: "0.88rem", color: "var(--text2)", marginBottom: "0.5rem", lineHeight: 1.6 }}>
                Running 5-fold cross-validation on {selectedModels.size} algorithm{selectedModels.size !== 1 ? "s" : ""}
                {analyzed ? <> across {analyzed.rows.toLocaleString()} rows. Estimated time: <span style={{ color: ACCENT, fontWeight: 600 }}>{trainingEstimate}</span> (varies with server load).</> : ". This may take a few minutes."}
              </p>
              <ProgressBar pct={pct} label={statusMsg} />
              <div style={{ marginTop: "1.5rem", display: "grid", gridTemplateColumns: `repeat(${Math.min(selectedModels.size, 4)}, 1fr)`, gap: "0.5rem" }}>
                {[...selectedModels].map(algo => (
                  <div key={algo} style={{ padding: "0.6rem", borderRadius: 10, textAlign: "center", background: `${ACCENT}08`, border: `1px solid ${ACCENT}22` }}>
                    <div style={{ fontSize: "0.68rem", color: "var(--text2)", fontWeight: 500 }}>{algo}</div>
                    <div style={{ fontSize: "0.6rem", color: "var(--text3)", marginTop: "0.2rem" }}>competing...</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Results ── */}
          {step === "results" && trainResult?.automl && (
            <div>
              {/* Winner banner */}
              {(() => {
                const isReg = trainResult.automl.task === "regression";
                const winnerCV = trainResult.automl.cv_results.find(r => r.algorithm === trainResult.automl.winner);
                const cvDisplay = winnerCV
                  ? isReg ? winnerCV.score.toFixed(4) : `${(winnerCV.score * 100).toFixed(2)}%`
                  : null;
                const testDisplay = isReg
                  ? trainResult.metric
                  : `${(parseFloat(trainResult.metric) * 100).toFixed(2)}%`;
                return (
                  <div style={{
                    padding: "1rem 1.25rem", borderRadius: 12, marginBottom: "0.75rem",
                    background: `${ACCENT}14`, border: `1px solid ${ACCENT}44`,
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}>
                    <div>
                      <div style={{ fontSize: "0.62rem", color: ACCENT, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.2rem" }}>Winner</div>
                      <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--text)" }}>{trainResult.automl.winner}</div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text3)", marginTop: "0.15rem" }}>
                        {trainResult.automl.selection_metric} · {trainResult.automl.cv_results.length}-model competition · 5-fold CV
                      </div>
                      <div style={{ fontSize: "0.68rem", color: "var(--text3)", marginTop: "0.1rem" }}>
                        Test set: <span style={{ color: "var(--text2)", fontVariantNumeric: "tabular-nums" }}>{testDisplay}</span>
                        {cvDisplay && testDisplay !== cvDisplay && (
                          <span style={{ color: "var(--text3)", marginLeft: "0.4rem" }}>
                            {isReg ? "(CV: " + cvDisplay + ")" : "(CV: " + cvDisplay + ")"}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "1.6rem", fontWeight: 800, color: ACCENT, lineHeight: 1 }}>
                        {cvDisplay ?? testDisplay}
                      </div>
                      <div style={{ fontSize: "0.6rem", color: "var(--text3)", marginTop: "0.2rem" }}>5-fold CV · {trainResult.metricLabel}</div>
                    </div>
                  </div>
                );
              })()}

              {/* Extended metrics */}
              {trainResult.automl.winner_metrics && (
                <WinnerMetricsGrid metrics={trainResult.automl.winner_metrics} task={trainResult.automl.task} />
              )}

              {/* Driving features */}
              {trainResult.automl.feature_importance && trainResult.automl.feature_importance.length > 0 && (
                <div style={{ marginTop: "1.25rem" }}>
                  <div style={{ fontSize: "0.72rem", color: "var(--text3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.6rem" }}>
                    Driving features
                  </div>
                  <FeatureImportanceChart features={trainResult.automl.feature_importance} />
                </div>
              )}

              {/* AI Analysis */}
              <div style={{ marginTop: "1.25rem", padding: "0.85rem 1rem", borderRadius: 10, background: "var(--bg-glass)", border: "1px solid var(--border)" }}>
                {/* Header row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
                  <button
                    onClick={() => setAnalysisExpanded(v => !v)}
                    style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  >
                    <div style={{ fontSize: "0.65rem", color: "var(--text3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                      AI Analysis
                    </div>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="var(--text3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                      style={{ transition: "transform 0.2s", transform: analysisExpanded ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}>
                      <polyline points="2,3 5,7 8,3" />
                    </svg>
                  </button>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <button
                      onClick={() => setShowKeyInput(v => !v)}
                      style={{
                        padding: "0.2rem 0.55rem", borderRadius: 6, cursor: "pointer",
                        background: showKeyInput ? `${ACCENT}22` : "transparent",
                        border: `1px solid ${showKeyInput ? ACCENT + "44" : "var(--border2)"}`,
                        color: showKeyInput ? ACCENT : "var(--text3)", fontSize: "0.68rem", fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {showKeyInput ? "Hide key" : "Use my API key"}
                    </button>
                    <select
                      value={llmProvider}
                      onChange={(e) => { setLlmProvider(e.target.value as LLMProvider); setLlmExp(null); }}
                      style={{
                        fontSize: "0.72rem", color: "var(--text2)", background: "var(--border)",
                        border: "1px solid var(--border2)", borderRadius: 6,
                        padding: "0.25rem 0.5rem", cursor: "pointer",
                      }}
                    >
                      {LLM_PROVIDERS.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                    <button
                      onClick={handleGenerateAnalysis}
                      disabled={llmLoading}
                      style={{
                        padding: "0.25rem 0.7rem", borderRadius: 6, cursor: llmLoading ? "default" : "pointer",
                        background: `${ACCENT}22`, border: `1px solid ${ACCENT}44`,
                        color: ACCENT, fontSize: "0.72rem", fontWeight: 600, opacity: llmLoading ? 0.6 : 1,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {llmLoading ? "Generating..." : llmExp ? "Regenerate" : "Generate"}
                    </button>
                  </div>
                </div>

                {/* Own API key + custom LLM fields — always visible when toggled */}
                {(showKeyInput || llmProvider === "custom") && (
                  <div style={{ marginTop: "0.65rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    <input
                      type="password"
                      value={userApiKey}
                      onChange={(e) => setUserApiKey(e.target.value)}
                      placeholder="API key (overrides server key)"
                      style={{
                        width: "100%", padding: "0.45rem 0.7rem", borderRadius: 7,
                        background: "var(--bg-input, var(--border))", border: "1px solid var(--border2)",
                        color: "var(--text)", fontSize: "0.75rem", boxSizing: "border-box",
                      }}
                    />
                    {llmProvider === "custom" && (
                      <input
                        type="text"
                        value={customLLMUrl}
                        onChange={(e) => setCustomLLMUrl(e.target.value)}
                        placeholder="API base URL (e.g. http://localhost:11434/v1)"
                        style={{
                          width: "100%", padding: "0.45rem 0.7rem", borderRadius: 7,
                          background: "var(--bg-input, var(--border))", border: "1px solid var(--border2)",
                          color: "var(--text)", fontSize: "0.75rem", boxSizing: "border-box",
                        }}
                      />
                    )}
                    {(showKeyInput || llmProvider === "custom") && (
                      <input
                        type="text"
                        value={customLLMModel}
                        onChange={(e) => setCustomLLMModel(e.target.value)}
                        placeholder={llmProvider === "custom" ? "Model name (e.g. llama3, mistral)" : "Model override (optional, e.g. gpt-4o, claude-opus-4-8)"}
                        style={{
                          width: "100%", padding: "0.45rem 0.7rem", borderRadius: 7,
                          background: "var(--bg-input, var(--border))", border: "1px solid var(--border2)",
                          color: "var(--text)", fontSize: "0.75rem", boxSizing: "border-box",
                        }}
                      />
                    )}
                    <p style={{ fontSize: "0.65rem", color: "var(--text3)", margin: 0, lineHeight: 1.45 }}>
                      {LLM_KEY_HINTS[llmProvider]}
                    </p>
                    <p style={{ fontSize: "0.65rem", color: "var(--text3)", margin: 0 }}>
                      Key is used only for this request and never stored. Server key is shared and may be rate-limited — use yours for faster responses.
                    </p>
                  </div>
                )}

                {analysisExpanded && (
                <div>
                {/* Progress bar while loading */}
                {llmLoading && (
                  <div style={{ marginTop: "0.75rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem" }}>
                      <span style={{ fontSize: "0.72rem", color: "var(--text3)" }}>
                        Asking {LLM_PROVIDERS.find(p => p.value === llmProvider)?.label}...
                      </span>
                      <span style={{ fontSize: "0.72rem", color: ACCENT, fontVariantNumeric: "tabular-nums" }}>{Math.round(llmProgress)}%</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 9999, background: "var(--border2)", overflow: "hidden" }}>
                      <div style={{
                        height: "100%", width: `${llmProgress}%`,
                        background: `linear-gradient(90deg, ${ACCENT}88, ${ACCENT})`,
                        borderRadius: 9999, transition: "width 0.4s ease",
                      }} />
                    </div>
                  </div>
                )}

                {/* Model comparison chart — shown first for visual impact */}
                {!llmLoading && llmExp?.model_comparison && llmExp.model_comparison.length > 0 && (
                  <div style={{ marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border)" }}>
                    <div style={{ marginBottom: "0.5rem" }}>
                      <div style={{ fontSize: "0.65rem", color: "var(--text)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                        Model fitness for this dataset
                      </div>
                      <p style={{ fontSize: "0.65rem", color: "var(--text3)", margin: "0.2rem 0 0", lineHeight: 1.5 }}>
                        LLM-rated 0–100 for your specific data. <span style={{ color: ACCENT }}>90–100</span> = excellent fit.{" "}
                        <span style={{ color: "#fbbf24" }}>60–89</span> = good, may benefit from tuning.{" "}
                        <span style={{ color: "#f87171" }}>Below 60</span> = poor fit — consider more data or different features.
                      </p>
                    </div>
                    <ModelComparisonChart items={llmExp.model_comparison} />
                  </div>
                )}

                {/* LLM explanation text */}
                {!llmLoading && llmExp?.why_won && (
                  <div style={{ marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border)" }}>
                    <div style={{ fontSize: "0.65rem", color: "var(--text3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.4rem" }}>
                      Why {trainResult.automl.winner} won
                    </div>
                    <p style={{ fontSize: "0.82rem", color: "var(--text)", lineHeight: 1.7, margin: 0, fontWeight: 500 }}>
                      {llmExp.why_won}
                    </p>
                    {llmExp.score_analysis && (
                      <p style={{ fontSize: "0.76rem", color: "var(--text2)", lineHeight: 1.6, margin: "0.6rem 0 0", paddingLeft: "0.75rem", borderLeft: `2px solid ${ACCENT}44` }}>
                        {llmExp.score_analysis}
                      </p>
                    )}
                  </div>
                )}

                {/* Rule-based fallback (italic) */}
                {!llmLoading && !llmExp && trainResult.automl.explanation?.why_won && (
                  <p style={{ fontSize: "0.8rem", color: "var(--text3)", lineHeight: 1.65, margin: "0.75rem 0 0", fontStyle: "italic" }}>
                    {trainResult.automl.explanation.why_won}
                  </p>
                )}

                {/* Actionable insights */}
                {!llmLoading && llmExp?.actionable_insights && llmExp.actionable_insights.length > 0 && (
                  <div style={{ marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border)" }}>
                    <div style={{ fontSize: "0.65rem", color: "var(--text3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.5rem" }}>
                      Actionable insights
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                      {llmExp.actionable_insights.map((ins, i) => (
                        <div key={i} style={{ padding: "0.6rem 0.75rem", borderRadius: 8, background: `${ACCENT}08`, border: `1px solid ${ACCENT}22`, display: "flex", gap: "0.6rem", alignItems: "flex-start" }}>
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: ACCENT, flexShrink: 0, marginTop: 5 }} />
                          <div>
                            <div style={{ fontSize: "0.73rem", fontWeight: 700, color: ACCENT, marginBottom: "0.2rem" }}>{ins.title}</div>
                            <div style={{ fontSize: "0.72rem", color: "var(--text2)", lineHeight: 1.55 }}>{ins.detail}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                </div>
                )}
              </div>

              {/* Full ranking */}
              <div style={{ marginTop: "1.25rem" }}>
                <div style={{ fontSize: "0.72rem", color: "var(--text3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.25rem" }}>
                  Full ranking
                </div>
                <RankingTable results={trainResult.automl.cv_results} winner={trainResult.automl.winner} task={trainResult.automl.task} />
              </div>

              {/* Previous runs (version history) */}
              {history.length > 1 && (
                <div style={{ marginTop: "1.25rem" }}>
                  <div style={{ fontSize: "0.72rem", color: "var(--text3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.4rem" }}>
                    Previous runs
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                    {history.slice(1).map((h, i) => (
                      <div key={i} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "0.5rem 0.85rem", borderRadius: 8,
                        background: "var(--bg-glass)", border: "1px solid var(--border)", gap: "0.75rem",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", minWidth: 0 }}>
                          <span style={{ fontSize: "0.7rem", color: "var(--text3)", flexShrink: 0 }}>{h.ts}</span>
                          <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text2)" }}>{h.result.automl.winner}</span>
                          <span style={{ fontSize: "0.72rem", color: "var(--text3)" }}>
                            {h.result.automl.task === "regression" ? h.result.metric : (parseFloat(h.result.metric) * 100).toFixed(2) + "%"}
                          </span>
                        </div>
                        <button onClick={() => setTrainResult(h.result)} style={{
                          padding: "0.25rem 0.65rem", borderRadius: 6, cursor: "pointer", flexShrink: 0,
                          background: "transparent", border: `1px solid ${ACCENT}44`,
                          color: ACCENT, fontSize: "0.7rem", fontWeight: 600,
                        }}>View</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: "flex", gap: "0.6rem", marginTop: "1.5rem", flexWrap: "wrap" }}>
                <button
                  onClick={() => { setStep("upload"); setFile(null); setAnalyzed(null); setTrainResult(null); setPct(0); setLlmExp(null); setLlmProgress(0); setIsLoadedFromSaved(false); }}
                  style={{ padding: "0.6rem 1.2rem", borderRadius: 9999, cursor: "pointer", background: "transparent", border: "1px solid var(--border2)", color: "var(--text2)", fontSize: "0.82rem", fontWeight: 600 }}
                >Run Again</button>
                <button
                  onClick={onClose}
                  style={{ padding: "0.6rem 1.2rem", borderRadius: 9999, cursor: "pointer", background: "transparent", border: "1px solid var(--border2)", color: "var(--text2)", fontSize: "0.82rem", fontWeight: 600 }}
                >Close</button>
                {(() => {
                  const dsName = file?.name ?? trainResult?.title ?? "";
                  const dsCount = savedRuns.filter(r => r.datasetName === dsName).length;
                  const atCap = dsCount >= 5;
                  const blocked = savedFlash || isLoadedFromSaved || atCap;
                  const tipText = isLoadedFromSaved ? "Already saved — load is read-only" : atCap ? "Cap reached (5/5) — delete a run first" : undefined;
                  return (
                    <button
                      onClick={handleSaveVersion}
                      disabled={blocked}
                      title={tipText}
                      style={{ padding: "0.6rem 1.2rem", borderRadius: 9999, cursor: blocked ? "default" : "pointer", background: savedFlash ? `${ACCENT}33` : `${ACCENT}18`, border: `1px solid ${ACCENT}44`, color: blocked && !savedFlash ? "var(--text3)" : ACCENT, fontSize: "0.82rem", fontWeight: 600, transition: "background 0.2s, color 0.2s", opacity: blocked && !savedFlash ? 0.45 : 1 }}
                    >{savedFlash ? "Saved!" : atCap ? "5 / 5 Full" : "Save Version"}</button>
                  );
                })()}
                <button
                  onClick={handleSave}
                  style={{ flex: 1, padding: "0.6rem 1.2rem", borderRadius: 9999, cursor: "pointer", background: ACCENT, border: "none", color: "#000", fontSize: "0.85rem", fontWeight: 700 }}
                >Save to Pipeline</button>
              </div>
            </div>
          )}

          </>}

          {/* ── Saved runs view ── */}
          {view === "saved" && (
            <div>
              {savedRuns.length === 0 ? (
                <div style={{ textAlign: "center", padding: "3rem 0", color: "var(--text3)", fontSize: "0.82rem" }}>
                  No saved runs yet. Run AutoML and click "Save Version" to save a result.
                </div>
              ) : (() => {
                const grouped = savedRuns.reduce<Record<string, SavedRun[]>>((acc, r) => {
                  (acc[r.datasetName] ??= []).push(r);
                  return acc;
                }, {});
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {Object.entries(grouped).map(([dataset, runs]) => {
                      const isOpen = expandedDatasets.has(dataset);
                      return (
                        <div key={dataset} style={{ borderRadius: 10, border: "1px solid var(--border)", overflow: "hidden" }}>
                          <button
                            onClick={() => setExpandedDatasets(prev => {
                              const next = new Set(prev);
                              isOpen ? next.delete(dataset) : next.add(dataset);
                              return next;
                            })}
                            style={{
                              width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                              padding: "0.65rem 0.9rem", background: "var(--bg-glass)",
                              border: "none", cursor: "pointer", gap: "0.5rem",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="var(--text3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                                style={{ transition: "transform 0.2s", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)", flexShrink: 0 }}>
                                <polyline points="2,2 7,5 2,8" />
                              </svg>
                              <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text)" }}>{dataset}</span>
                            </div>
                            <span style={{ fontSize: "0.68rem", color: runs.length >= 5 ? "#f87171" : "var(--text3)", fontVariantNumeric: "tabular-nums" }}>
                              {runs.length} / 5
                            </span>
                          </button>
                          {isOpen && (
                            <div style={{ borderTop: "1px solid var(--border)" }}>
                              {runs.map((run) => (
                                <div key={run.id} style={{
                                  display: "flex", alignItems: "center", gap: "0.75rem",
                                  padding: "0.55rem 0.9rem", borderBottom: "1px solid var(--border)",
                                  background: "transparent",
                                }}>
                                  <span style={{ fontSize: "0.68rem", color: "var(--text3)", width: 42, flexShrink: 0 }}>Run {run.runNumber}</span>
                                  <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text)", flex: 1 }}>{run.winner}</span>
                                  <span style={{ fontSize: "0.75rem", fontVariantNumeric: "tabular-nums", color: ACCENT, fontWeight: 600 }}>{run.score}</span>
                                  <span style={{ fontSize: "0.65rem", color: "var(--text3)", width: 36, textAlign: "right", flexShrink: 0 }}>{run.date}</span>
                                  <button
                                    onClick={() => { setTrainResult(run.result); setStep("results"); setView("wizard"); setIsLoadedFromSaved(true); }}
                                    style={{
                                      padding: "0.2rem 0.6rem", borderRadius: 6, cursor: "pointer", flexShrink: 0,
                                      background: "transparent", border: `1px solid ${ACCENT}44`,
                                      color: ACCENT, fontSize: "0.68rem", fontWeight: 600,
                                    }}
                                  >Load</button>
                                  <button
                                    onClick={() => setSavedRuns(prev => prev.filter(r => r.id !== run.id))}
                                    style={{
                                      background: "none", border: "none", cursor: "pointer",
                                      color: "var(--text3)", padding: "0 2px", flexShrink: 0,
                                    }}
                                    title="Delete"
                                  >
                                    <svg width="11" height="11" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                                      <line x1="1" y1="1" x2="9" y2="9" /><line x1="9" y1="1" x2="1" y2="9" />
                                    </svg>
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Footer links */}
          <div style={{ marginTop: "1.75rem", paddingTop: "1rem", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "center", gap: "1.75rem" }}>
            <a href={`${API}/?mode=ml`} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: "0.73rem", color: "var(--text3)", textDecoration: "none", display: "flex", alignItems: "center", gap: "0.3rem", transition: "color 0.15s" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text2)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text3)"; }}
            >
              Open in ML Unified
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M2 10L10 2M10 2H5M10 2v5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
            <a href="https://github.com/ramleo/ML-Unified" target="_blank" rel="noopener noreferrer"
              style={{ fontSize: "0.73rem", color: "var(--text3)", textDecoration: "none", display: "flex", alignItems: "center", gap: "0.3rem", transition: "color 0.15s" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text2)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text3)"; }}
            >
              View on GitHub
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}