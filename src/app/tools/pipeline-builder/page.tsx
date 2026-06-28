"use client";

import { useState, useCallback } from "react";
import type { ReactElement } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ConstellationBackground from "@/components/ConstellationBackground";
import { ML_UNIFIED_API as API } from "@/config/urls";
import ModeSelector from "@/components/pipeline/ModeSelector";
import StageModal, { type StageResult } from "@/components/pipeline/StageModal";
import StageGrid from "@/components/pipeline/StageGrid";
import type { WaterfallStage } from "@/components/pipeline/pipeline-types";
import CodeExportModal from "@/components/pipeline/CodeExportModal";
import FileUploadSection from "@/components/pipeline/FileUploadSection";
import ExpressRunner from "@/components/pipeline/ExpressRunner";
import ABPanel from "@/components/pipeline/ABPanel";
import TargetDropdown from "@/components/pipeline/TargetDropdown";

// ── Types ─────────────────────────────────────────────────────────────────────

type PipelineMode = "guided" | "express" | "ab" | null;
type StageId = "preprocessing" | "feature-eng" | "feature-select" | "automl" | "optuna" | "shap" | "ensemble";

const S = { width: 22, height: 22, fill: "none" as const, stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, viewBox: "0 0 24 24" };

const ICONS: Record<string, ReactElement> = {
  preprocessing: <svg {...S}><path d="M22 3H2l8 9.46V19l4 2V12.46z" /></svg>,
  "feature-eng": <svg {...S}><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>,
  "feature-select": <svg {...S}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" /><path d="M12 3v3m0 12v3M3 12h3m12 0h3" /></svg>,
  automl: <svg {...S}><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h12" /></svg>,
  optuna: <svg {...S}><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18" /></svg>,
  shap: <svg {...S}><rect x="3" y="14" width="4" height="7" rx="1" /><rect x="9.5" y="9" width="4" height="12" rx="1" /><rect x="16" y="4" width="4" height="17" rx="1" /></svg>,
  ensemble: <svg {...S}><path d="M12 2 L15.09 8.26 L22 9.27 L17 14.14 L18.18 21.02 L12 17.77 L5.82 21.02 L7 14.14 L2 9.27 L8.91 8.26 Z" /></svg>,
};

const STAGES: { id: StageId; title: string; accent: string; description: string }[] = [
  { id: "preprocessing", title: "Preprocessing", accent: "#38bdf8", description: "Clean data, handle missing values and outliers" },
  { id: "feature-eng", title: "Feature Engineering", accent: "#f59e0b", description: "Create polynomial, date, and transform features" },
  { id: "feature-select", title: "Feature Selection", accent: "#34d399", description: "Remove noise, select top K features" },
  { id: "automl", title: "AutoML", accent: "#22c55e", description: "Train and benchmark multiple algorithms" },
  { id: "optuna", title: "Optuna Tuning", accent: "#a78bfa", description: "Hyperparameter optimization with Bayesian search" },
  { id: "shap", title: "SHAP", accent: "#f87171", description: "Explain model predictions with SHAP values" },
  { id: "ensemble", title: "Ensemble", accent: "#818cf8", description: "Combine models for higher accuracy" },
];


function fmtM(m: string) {
  const map: Record<string, string> = { neg_mean_absolute_error: "MAE", neg_root_mean_squared_error: "RMSE", r2: "R²", accuracy: "Accuracy", f1: "F1", roc_auc: "AUC-ROC" };
  return map[m] ?? m.replace(/^neg_/i, "").replace(/_/g, " ");
}

function getStageCsv(id: StageId, raw: string, csvs: Record<string, string>): string {
  const order: StageId[] = ["preprocessing", "feature-eng", "feature-select", "automl", "optuna", "shap", "ensemble"];
  const idx = order.indexOf(id);
  for (let i = idx - 1; i >= 0; i--) {
    if (csvs[order[i]]) return csvs[order[i]];
  }
  return raw;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PipelineBuilderPage() {
  const [mode, setMode] = useState<PipelineMode>(null);
  const [csvB64, setCsvB64] = useState<string | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [target, setTarget] = useState("");
  const [taskType, setTaskType] = useState<"classification" | "regression">("classification");
  const [stageResults, setStageResults] = useState<Record<string, StageResult>>({});
  const [stageCsvs, setStageCsvs] = useState<Record<string, string>>({});
  const [activeModal, setActiveModal] = useState<StageId | null>(null);
  const [runningStage, setRunningStage] = useState<StageId | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [exportedCode, setExportedCode] = useState("");
  const [abResultA, setAbResultA] = useState<{ score: number; winner: string; time_ms: number } | null>(null);
  const [abResultB, setAbResultB] = useState<{ score: number; winner: string; time_ms: number } | null>(null);
  const [abRunning, setAbRunning] = useState(false);


  const completedStages = STAGES.filter((s) => stageResults[s.id]).map((s) => s.id);
  const doneCount = completedStages.length;
  const progressPct = Math.round((doneCount / STAGES.length) * 100);

  const handleFile = useCallback((b64: string, cols: string[]) => {
    setCsvB64(b64);
    setColumns(cols);
    if (cols.length > 0) setTarget(cols[cols.length - 1]);
  }, []);

  async function runExpressPipeline() {
    if (!csvB64 || !target) return;
    setStageResults({});
    setStageCsvs({});
    const AUTO_STAGES: StageId[] = ["preprocessing", "feature-eng", "feature-select", "automl"];
    const DEFAULT_CONFIGS: Record<string, Record<string, unknown>> = {
      preprocessing: { mv_num: "median", mv_cat: "most_frequent", remove_duplicates: true, remove_outliers: false, fix_skewness: false, drop_cols: [] },
      "feature-eng": { transforms: {}, date_cols: [], date_parts: [] },
      "feature-select": { method: "none", top_k: 15 },
      automl: { models: ["RandomForest", "XGBoost", "LightGBM", "CatBoost"], n_folds: 5 },
    };
    const ENDPOINTS: Record<string, string> = { preprocessing: "preprocess", "feature-eng": "feature-eng", "feature-select": "feature-select", automl: "automl" };
    let currentCsv = csvB64;
    for (const stageId of AUTO_STAGES) {
      setRunningStage(stageId);
      try {
        const config = DEFAULT_CONFIGS[stageId];
        const extraFields = stageId === "automl" ? { task_type: taskType } : {};
        const res = await fetch(`${API}/pipeline-builder/${ENDPOINTS[stageId]}`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ csv_b64: currentCsv, target, config, ...extraFields }),
        });
        if (!res.ok) break;
        const json = await res.json() as Record<string, unknown>;
        const result: StageResult = { stageId, outputCsvB64: json.processed_csv_b64 as string | undefined, metric: json.metric as string | undefined, data: json };
        setStageResults((p) => ({ ...p, [stageId]: result }));
        if (json.processed_csv_b64) {
          const nextCsv = json.processed_csv_b64 as string;
          setStageCsvs((p) => ({ ...p, [stageId]: nextCsv }));
          currentCsv = nextCsv;
        }
      } catch { break; }
    }
    setRunningStage(null);
  }

  function handleStageComplete(result: StageResult) {
    setStageResults((p) => ({ ...p, [result.stageId]: result }));
    if (result.outputCsvB64) setStageCsvs((p) => ({ ...p, [result.stageId]: result.outputCsvB64! }));
    setActiveModal(null);
  }

  async function handleExportCode() {
    const winner = stageResults["automl"]?.data?.winner as Record<string, unknown> | undefined;
    const res = await fetch(`${API}/pipeline-builder/export-code`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target, task_type: taskType, winner_algo: winner?.algo, winner_params: stageResults["optuna"]?.data?.best_params ?? {}, preprocess_config: stageResults["preprocessing"]?.data ?? null, fe_config: stageResults["feature-eng"]?.data ?? null, fs_config: stageResults["feature-select"]?.data ?? null }),
    });
    if (res.ok) { const { code } = await res.json() as { code: string }; setExportedCode(code); setShowCode(true); }
  }

  async function handleRunAB(
    configA: Record<string, Record<string, unknown>>,
    configB: Record<string, Record<string, unknown>>,
  ) {
    if (!csvB64) return;
    setAbRunning(true);
    try {
      const buildSpec = (cfg: Record<string, Record<string, unknown>>) => ({
        preprocess: cfg["preprocessing"] ?? null,
        fe: cfg["feature-eng"] ?? null,
        fs: cfg["feature-select"] ?? null,
        automl: cfg["automl"] ?? null,
      });
      const res = await fetch(`${API}/pipeline-builder/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csv_b64: csvB64,
          target,
          task_type: taskType,
          pipeline_a: buildSpec(configA),
          pipeline_b: buildSpec(configB),
        }),
      });
      if (res.ok) {
        const j = await res.json() as { pipeline_a?: { score: number; winner: string; time_ms: number }; pipeline_b?: { score: number; winner: string; time_ms: number } };
        setAbResultA(j.pipeline_a ?? null);
        setAbResultB(j.pipeline_b ?? null);
      }
    } finally { setAbRunning(false); }
  }

  function handleReset() {
    setMode(null); setCsvB64(null); setColumns([]); setTarget(""); setStageResults({});
    setStageCsvs({}); setActiveModal(null); setAbResultA(null); setAbResultB(null);
  }

  const waterfallStages: WaterfallStage[] = STAGES.filter((s) => stageResults[s.id]).map((s) => {
    const d = stageResults[s.id].data;
    const stats = d.stats as Record<string, number> | undefined;

    if (s.id === "preprocessing") {
      const rb = stats?.rows_before ?? (d.rows_before as number ?? 0);
      const ra = stats?.rows_after ?? (d.rows_after as number ?? 0);
      const cb = stats?.cols_before ?? (d.cols_before as number ?? 0);
      const ca = stats?.cols_after ?? (d.cols_after as number ?? 0);
      const tooltip = `Missing values filled (imputation preserves row count). Shape: ${rb} rows × ${cb} cols → ${ra} rows × ${ca} cols`;
      return { id: s.id, label: s.title, accent: s.accent, rowDelta: ra - rb, colDelta: ca - cb, rowsBefore: rb, rowsAfter: ra, colsBefore: cb, colsAfter: ca, tooltip };
    }
    if (s.id === "feature-eng" || s.id === "feature-select") {
      const cb = stats?.cols_before ?? 0;
      const ca = stats?.cols_after ?? 0;
      const stageLabel = s.id === "feature-eng" ? "Feature transforms applied" : "Top features selected";
      if (cb > 0 || ca > 0) {
        const tooltip = `${stageLabel}. Columns: ${cb} → ${ca}`;
        return { id: s.id, label: s.title, accent: s.accent, colDelta: ca - cb, colsBefore: cb, colsAfter: ca, tooltip };
      }
      const tooltip = `${stageLabel} (no column stats)`;
      return { id: s.id, label: s.title, accent: s.accent, tooltip };
    }
    if (s.id === "automl") {
      const winner = d.winner as Record<string, unknown> | undefined;
      const scoreDelta = Math.round((winner?.score as number ?? 0) * 10000) / 100;
      const scoreUnit = winner?.metric as string ?? "";
      const nFolds = (d.n_folds as number | undefined) ?? 5;
      const sampledFrom = d.sampled_from as number | null | undefined;
      const sampleNote = sampledFrom ? ` · sampled 15K/${sampledFrom} rows` : "";
      const tooltip = `Winner: ${winner?.algo ?? "unknown"} · Score: ${scoreDelta} ${fmtM(scoreUnit)} · ${nFolds}-fold CV${sampleNote}`;
      return { id: s.id, label: s.title, accent: s.accent, scoreDelta, scoreUnit, tooltip };
    }
    if (s.id === "optuna") {
      const improvement = d.improvement as number ?? 0;
      // classification improvement is 0-1 F1 → convert to %; regression is MAE units → keep as-is
      const scoreDelta = taskType === "classification" ? Math.round(improvement * 10000) / 100 : Math.round(improvement * 100) / 100;
      const tooltip = "Hyperparameter tuning improved score";
      return { id: s.id, label: s.title, accent: s.accent, scoreDelta, tooltip };
    }
    if (s.id === "ensemble") {
      const base = (stageResults["automl"]?.data?.winner as Record<string, unknown>)?.score as number ?? 0;
      const scoreDelta = Math.round(((d.ensemble_score as number ?? 0) - base) * 10000) / 100;
      const tooltip = "Ensemble of top models";
      return { id: s.id, label: s.title, accent: s.accent, scoreDelta, tooltip };
    }
    return { id: s.id, label: s.title, accent: s.accent, tooltip: "Stage completed" };
  });

  const abScoreA = abResultA?.score ?? null;
  const abScoreB = abResultB?.score ?? null;
  const abDiff = abScoreA !== null && abScoreB !== null ? Math.abs(abScoreA - abScoreB) : 0;
  const abWinner: "a" | "b" | "tie" | null = abScoreA === null || abScoreB === null ? null : abScoreA > abScoreB ? "a" : abScoreB > abScoreA ? "b" : "tie";

  if (!mode) {
    return (
      <div style={{ minHeight: "100vh", position: "relative" }}>
        <ConstellationBackground />
        <div style={{ position: "relative", zIndex: 2 }}><ModeSelector onSelect={setMode} /></div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", position: "relative", fontFamily: "inherit" }}>
      <ConstellationBackground />

      {/* Header */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1.5rem", background: "rgba(6,13,26,0.88)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <button onClick={handleReset} style={{ background: "transparent", border: "none", color: "rgba(180,185,210,0.7)", cursor: "pointer", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: 4 }}>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
          Back
        </button>
        <span style={{ color: "rgba(255,255,255,0.15)" }}>|</span>
        <span style={{ fontWeight: 700, fontSize: "0.92rem", color: "var(--text)" }}>ML Pipeline Builder</span>
        <span style={{ padding: "0.2rem 0.65rem", borderRadius: 99, fontSize: "0.7rem", fontWeight: 600, background: "rgba(255,255,255,0.07)", color: "rgba(200,205,225,0.7)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {mode === "guided" ? "Guided" : mode === "express" ? "Express" : "A/B Compare"}
        </span>
        <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: "#4ade80", fontWeight: 600 }}>{doneCount}/{STAGES.length}</span>
      </header>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "1.5rem 1.5rem 5rem", position: "relative", zIndex: 2 }}>
        {/* Progress bar */}
        <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 99, marginBottom: "1.75rem", overflow: "hidden" }}>
          <motion.div style={{ height: "100%", background: "linear-gradient(90deg,#22c55e,#4ade80)", borderRadius: 99 }} initial={{ width: 0 }} animate={{ width: `${progressPct}%` }} transition={{ duration: 0.5 }} />
        </div>

        {/* File upload */}
        {!csvB64 && <FileUploadSection onFile={(b64, cols) => handleFile(b64, cols)} />}

        {/* File info + target */}
        {csvB64 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "1rem", marginBottom: "1.75rem", padding: "0.85rem 1.25rem", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
              <span style={{ fontSize: "0.8rem", color: "#4ade80", fontWeight: 600 }}>CSV loaded</span>
              {columns.length > 0 && <span style={{ fontSize: "0.75rem", color: "rgba(180,185,210,0.6)" }}>({columns.length} cols)</span>}
            </div>
            {columns.length > 0 && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <label style={{ fontSize: "0.78rem", color: "var(--text2)", whiteSpace: "nowrap" }}>Target:</label>
                  <TargetDropdown value={target} options={columns} onChange={setTarget} />
                </div>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  {(["classification", "regression"] as const).map((t) => (
                    <label key={t} style={{ display: "flex", alignItems: "center", gap: "0.35rem", cursor: "pointer", fontSize: "0.78rem", color: "var(--text2)" }}>
                      <input type="radio" name="task" value={t} checked={taskType === t} onChange={() => setTaskType(t)} style={{ accentColor: "#22c55e" }} />
                      {t}
                    </label>
                  ))}
                </div>
              </>
            )}
            <button onClick={() => { setCsvB64(null); setColumns([]); setStageResults({}); setStageCsvs({}); }} style={{ marginLeft: "auto", fontSize: "0.72rem", color: "rgba(248,113,113,0.7)", background: "transparent", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 6, padding: "0.25rem 0.65rem", cursor: "pointer" }}>Remove</button>
          </motion.div>
        )}

        {/* A/B mode */}
        {mode === "ab" && (
          <ABPanel
            stages={STAGES.map((s) => ({ ...s, icon: ICONS[s.id] }))}
            csvB64={csvB64}
            target={target}
            taskType={taskType}
            columns={columns}
            abResultA={abResultA}
            abResultB={abResultB}
            abDiff={abDiff}
            abWinner={abWinner}
            abRunning={abRunning}
            onRun={(cfgA, cfgB) => handleRunAB(cfgA, cfgB)}
          />
        )}

        {/* Express mode banner + auto-run */}
        {mode === "express" && csvB64 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.5rem", padding: "0.9rem 1.25rem", background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 12 }}>
            <div>
              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#4ade80", marginBottom: 2 }}>Express Mode</div>
              <div style={{ fontSize: "0.75rem", color: "rgba(200,210,230,0.65)" }}>Runs all 4 pipeline stages automatically with optimal defaults. Results appear as each stage completes.</div>
            </div>
            <button onClick={runExpressPipeline} disabled={!!runningStage}
              style={{ padding: "0.6rem 1.4rem", borderRadius: 9, background: "#22c55e", color: "#000", fontWeight: 700, fontSize: "0.85rem", border: "none", cursor: runningStage ? "not-allowed" : "pointer", opacity: runningStage ? 0.6 : 1, whiteSpace: "nowrap" }}>
              {runningStage ? `Running ${runningStage}…` : "Auto-Run Pipeline"}
            </button>
          </motion.div>
        )}

        {/* Express running animation */}
        {mode === "express" && (
          <ExpressRunner runningStage={runningStage} completedStages={completedStages} />
        )}

        {/* Guided / Express stage grid */}
        {mode !== "ab" && (
          <StageGrid
            stages={STAGES.map((s) => ({ ...s, icon: ICONS[s.id] }))}
            stageResults={stageResults}
            csvB64={csvB64}
            runningStage={runningStage}
            completedStages={completedStages}
            activeStage={activeModal}
            onOpenStage={(id) => setActiveModal(id as StageId)}
            waterfallStages={waterfallStages}
            icons={ICONS}
          />
        )}

        {/* Bottom actions */}
        <div style={{ display: "flex", gap: "0.75rem", marginTop: "2rem", flexWrap: "wrap" }}>
          {doneCount >= 4 && (
            <button onClick={handleExportCode} style={{ padding: "0.6rem 1.25rem", borderRadius: 9, background: "#22c55e", color: "#000", fontWeight: 700, fontSize: "0.82rem", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
              Export Python Code
            </button>
          )}
          <button onClick={handleReset} style={{ padding: "0.6rem 1.25rem", borderRadius: 9, background: "transparent", color: "rgba(248,113,113,0.75)", fontWeight: 600, fontSize: "0.82rem", border: "1px solid rgba(248,113,113,0.25)", cursor: "pointer" }}>
            Reset Pipeline
          </button>
        </div>
      </div>

      {/* Stage modal */}
      <AnimatePresence>
        {activeModal && csvB64 && (
          <StageModal key={activeModal} stageId={activeModal} title={STAGES.find((s) => s.id === activeModal)?.title ?? activeModal} accent={STAGES.find((s) => s.id === activeModal)?.accent ?? "#38bdf8"} csvB64={getStageCsv(activeModal, csvB64, stageCsvs)} target={target} taskType={taskType} columns={columns} modelId={stageResults["automl"]?.data?.model_id as string | undefined} onClose={() => setActiveModal(null)} onComplete={handleStageComplete} existingResult={stageResults[activeModal] ?? null} />
        )}
      </AnimatePresence>

      {/* Code export modal */}
      <AnimatePresence>
        {showCode && <CodeExportModal key="code" code={exportedCode} onClose={() => setShowCode(false)} />}
      </AnimatePresence>
    </div>
  );
}