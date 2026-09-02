"use client";
import { useToolTracking } from "@/hooks/useAnalytics";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import ConstellationBackground from "@/components/ConstellationBackground";
import ThemeToggle from "@/components/ThemeToggle";
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
import { toolBackHref, toolBackLabel } from "@/lib/toolNav";

// ── Types ─────────────────────────────────────────────────────────────────────

type PipelineMode = "guided" | "express" | "ab" | null;
import { ICONS, STAGES, fmtM, getStageCsv, type StageId } from "./stages";
import { runExpressPipeline } from "./runExpressPipeline";

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PipelineBuilderPage() {
  useToolTracking("pipeline-builder");
  const router = useRouter();
  const handleHome = useCallback(() => router.push(toolBackHref("pipeline-builder")), [router]);
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

  async function runExpress() {
    if (!csvB64 || !target) return;
    setStageResults({});
    setStageCsvs({});
    await runExpressPipeline({
      csvB64, target, taskType,
      onStage: setRunningStage,
      onResult: (r) => setStageResults((p) => ({ ...p, [r.stageId]: r })),
      onCsv: (id, csv) => setStageCsvs((p) => ({ ...p, [id]: csv })),
    });
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
        <div style={{ position: "relative", zIndex: 2 }}>
          <div style={{ padding: "1rem 1.5rem", display: "flex", alignItems: "center" }}>
            <button onClick={handleHome} style={{ background: "transparent", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: 4 }}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
              {toolBackLabel("pipeline-builder")}
            </button>
            <div style={{ marginLeft: "auto" }}>
              <ThemeToggle />
            </div>
          </div>
          <div data-wt="pb-modes">
            <ModeSelector onSelect={setMode} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", position: "relative", fontFamily: "inherit" }}>
      <ConstellationBackground />

      {/* Header */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1.5rem", background: "var(--bg-nav)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--border)" }}>
        <button onClick={handleHome} style={{ background: "transparent", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: 4 }}>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
          {toolBackLabel("pipeline-builder")}
        </button>
        <button onClick={handleReset} style={{ background: "transparent", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: 4 }}>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
          Back
        </button>
        <span style={{ color: "var(--border2)" }}>|</span>
        <span style={{ fontWeight: 700, fontSize: "0.92rem", color: "var(--text)" }}>ML Pipeline Builder</span>
        <span style={{ padding: "0.2rem 0.65rem", borderRadius: 99, fontSize: "0.7rem", fontWeight: 600, background: "var(--border)", color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {mode === "guided" ? "Guided" : mode === "express" ? "Express" : "A/B Compare"}
        </span>
        <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: "#4ade80", fontWeight: 600 }}>{doneCount}/{STAGES.length}</span>
        <ThemeToggle />
      </header>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "1.5rem 1.5rem 5rem", position: "relative", zIndex: 2 }}>
        {/* Progress bar */}
        <div style={{ height: 4, background: "var(--border)", borderRadius: 99, marginBottom: "1.75rem", overflow: "hidden" }}>
          <motion.div style={{ height: "100%", background: "linear-gradient(90deg,#22c55e,#4ade80)", borderRadius: 99 }} initial={{ width: 0 }} animate={{ width: `${progressPct}%` }} transition={{ duration: 0.5 }} />
        </div>

        {/* File upload */}
        {!csvB64 && (
          <div data-wt="pb-upload">
            <FileUploadSection onFile={(b64, cols) => handleFile(b64, cols)} />
          </div>
        )}

        {/* File info + target */}
        {csvB64 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "1rem", marginBottom: "1.75rem", padding: "0.85rem 1.25rem", background: "var(--bg-glass)", border: "1px solid var(--border)", borderRadius: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
              <span style={{ fontSize: "0.8rem", color: "#4ade80", fontWeight: 600 }}>CSV loaded</span>
              {columns.length > 0 && <span style={{ fontSize: "0.75rem", color: "var(--text3)" }}>({columns.length} cols)</span>}
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
              <div style={{ fontSize: "0.75rem", color: "var(--text3)" }}>Runs all 4 pipeline stages automatically with optimal defaults. Results appear as each stage completes.</div>
            </div>
            <button onClick={runExpress} disabled={!!runningStage} data-wt="pb-run"
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
          <div data-wt="pb-stages">
          {/* The grid is what is still on screen when the run ends, so it —
              not the runner, which unmounts — carries the "finished" anchor. */}
          <div data-wt={doneCount === 4 ? "pb-done" : undefined}>
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
          </div>
          </div>
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