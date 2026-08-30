"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import StageCard from "@/components/pipeline/StageCard";
import StageModal, { type StageResult } from "@/components/pipeline/StageModal";
import ComparisonPanel from "@/components/pipeline/ComparisonPanel";
import ABRunner from "@/components/pipeline/ABRunner";

interface StageDef {
  id: string;
  title: string;
  accent: string;
  description: string;
  icon: React.ReactNode;
}

interface Props {
  stages: StageDef[];
  csvB64: string | null;
  target: string;
  taskType: "classification" | "regression";
  columns: string[];
  abResultA: { score: number; winner: string; time_ms: number } | null;
  abResultB: { score: number; winner: string; time_ms: number } | null;
  abDiff: number;
  abWinner: "a" | "b" | "tie" | null;
  abRunning: boolean;
  onRun: (
    configA: Record<string, Record<string, unknown>>,
    configB: Record<string, Record<string, unknown>>,
  ) => void;
}

const DEFAULT_CONFIGS: Record<string, Record<string, unknown>> = {
  preprocessing: { mv_num: "median", mv_cat: "most_frequent", remove_duplicates: true, remove_outliers: false, fix_skewness: false, drop_cols: [] },
  "feature-eng": { transforms: {}, date_cols: [], date_parts: [] },
  "feature-select": { method: "none", top_k: 15 },
  automl: { models: ["RandomForest", "XGBoost", "LightGBM", "CatBoost"], n_folds: 5 },
};

const STAGE_ORDER = ["preprocessing", "feature-eng", "feature-select", "automl"];

function cloneDefaults() {
  return Object.fromEntries(
    Object.entries(DEFAULT_CONFIGS).map(([k, v]) => [k, { ...v }])
  );
}

// Parse column headers from a base64-encoded CSV string
function parseCsvColumns(b64: string): string[] {
  try {
    const text = atob(b64);
    const firstLine = text.split("\n")[0];
    return firstLine.split(",").map((c) => c.trim().replace(/^"|"$/g, "")).filter(Boolean);
  } catch {
    return [];
  }
}

export default function ABPanel({
  stages,
  csvB64,
  target,
  taskType,
  columns,
  abResultA,
  abResultB,
  abDiff,
  abWinner,
  abRunning,
  onRun,
}: Props) {
  const [configA, setConfigA] = useState<Record<string, Record<string, unknown>>>(cloneDefaults);
  const [configB, setConfigB] = useState<Record<string, Record<string, unknown>>>(cloneDefaults);
  const [configuredA, setConfiguredA] = useState<Set<string>>(new Set());
  const [configuredB, setConfiguredB] = useState<Set<string>>(new Set());
  const [stageCsvsA, setStageCsvsA] = useState<Record<string, string>>({});
  const [stageCsvsB, setStageCsvsB] = useState<Record<string, string>>({});
  const [stageResultsA, setStageResultsA] = useState<Record<string, StageResult>>({});
  const [stageResultsB, setStageResultsB] = useState<Record<string, StageResult>>({});
  const [activeModal, setActiveModal] = useState<{ stageId: string; pipeline: "a" | "b" } | null>(null);

  function getInputCsv(stageId: string, pipeline: "a" | "b"): string {
    const csvs = pipeline === "a" ? stageCsvsA : stageCsvsB;
    const idx = STAGE_ORDER.indexOf(stageId);
    for (let i = idx - 1; i >= 0; i--) {
      const prev = csvs[STAGE_ORDER[i]];
      if (prev) return prev;
    }
    return csvB64 ?? "";
  }

  const pipelineDefs = [
    { label: "Pipeline A", accent: "#3e7c98", pipeline: "a" as const, configured: configuredA },
    { label: "Pipeline B", accent: "#7e68c0", pipeline: "b" as const, configured: configuredB },
  ];

  const activeStage = activeModal ? stages.find((s) => s.id === activeModal.stageId) : null;

  // Derive modal input CSV and columns from the chained pipeline state
  const modalCsv = activeModal ? getInputCsv(activeModal.stageId, activeModal.pipeline) : (csvB64 ?? "");
  const modalColumns = modalCsv ? parseCsvColumns(modalCsv) : columns;
  const modalExistingResult = activeModal
    ? ((activeModal.pipeline === "a" ? stageResultsA : stageResultsB)[activeModal.stageId] ?? null)
    : null;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "2rem" }}>
        {pipelineDefs.map(({ label, accent, pipeline, configured }) => (
          <div key={label}>
            <div style={{
              fontSize: "0.78rem", fontWeight: 700, color: accent,
              textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.75rem",
            }}>
              {label}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {stages.slice(0, 4).map((stage, i) => (
                <StageCard
                  key={`${pipeline}-${stage.id}`}
                  id={stage.id}
                  title={stage.title}
                  description={stage.description}
                  icon={stage.icon}
                  accent={stage.accent}
                  status={configured.has(stage.id) ? "done" : csvB64 ? "ready" : "locked"}
                  onOpen={() => setActiveModal({ stageId: stage.id, pipeline })}
                  index={i}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <ABRunner abRunning={abRunning} />

      {csvB64 && (
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <button
            onClick={() => onRun(configA, configB)}
            disabled={abRunning}
            style={{
              padding: "0.7rem 2rem", borderRadius: 10, background: "#a78bfa",
              color: "#000", fontWeight: 700, fontSize: "0.88rem", border: "none",
              cursor: abRunning ? "not-allowed" : "pointer",
              opacity: abRunning ? 0.6 : 1,
            }}
          >
            {abRunning ? "Running Comparison..." : "Run A/B Comparison"}
          </button>
        </div>
      )}

      <ComparisonPanel
        resultA={abResultA}
        resultB={abResultB}
        difference={abDiff}
        winner={abWinner}
        isRunning={abRunning}
      />

      <AnimatePresence>
        {activeModal !== null && csvB64 && activeStage && (
          <StageModal
            key={`${activeModal.pipeline}-${activeModal.stageId}`}
            stageId={activeModal.stageId}
            title={activeStage.title}
            accent={activeStage.accent}
            csvB64={modalCsv}
            target={target}
            taskType={taskType}
            columns={modalColumns}
            onClose={() => setActiveModal(null)}
            onComplete={(result: StageResult) => {
              const { stageId, pipeline } = activeModal;
              // Store result so right panel shows on reopen
              if (pipeline === "a") {
                setStageResultsA((p) => ({ ...p, [stageId]: result }));
                if (result.outputCsvB64) setStageCsvsA((p) => ({ ...p, [stageId]: result.outputCsvB64! }));
                setConfiguredA((p) => new Set([...p, stageId]));
              } else {
                setStageResultsB((p) => ({ ...p, [stageId]: result }));
                if (result.outputCsvB64) setStageCsvsB((p) => ({ ...p, [stageId]: result.outputCsvB64! }));
                setConfiguredB((p) => new Set([...p, stageId]));
              }
              setActiveModal(null);
            }}
            onConfigCapture={(cfg) => {
              const { stageId, pipeline } = activeModal;
              if (pipeline === "a") {
                setConfigA((p) => ({ ...p, [stageId]: cfg }));
              } else {
                setConfigB((p) => ({ ...p, [stageId]: cfg }));
              }
            }}
            existingResult={modalExistingResult}
          />
        )}
      </AnimatePresence>
    </div>
  );
}