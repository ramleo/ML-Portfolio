"use client";

import MouseTiltCard from "@/components/MouseTiltCard";
import DatasetEstimator from "@/components/DatasetEstimator";
import {
  ACCENT, CARD_BG,
  type AnalyzeResult,
} from "@/lib/automlUtils";

interface Props {
  file:            File | null;
  analyzed:        AnalyzeResult;
  target:          string;
  taskType:        "classification" | "regression";
  modelName:       string;
  selectedModels:  Set<string>;
  availableModels: readonly string[];
  error:           string;
  trainingEst:     string;
  onTarget:        (v: string) => void;
  onTaskType:      (v: "classification" | "regression") => void;
  onModelName:     (v: string) => void;
  onToggleModel:   (m: string) => void;
  onBack:          () => void;
  onTrain:         () => void;
}

export default function Step2Configure({
  file, analyzed, target, taskType, modelName,
  selectedModels, availableModels, error, trainingEst,
  onTarget, onTaskType, onModelName, onToggleModel, onBack, onTrain,
}: Props) {
  const addableModels = availableModels.filter(m => !selectedModels.has(m));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <DatasetEstimator n={analyzed.rows} p={analyzed.columns.length} tool="automl" />
      {/* Dataset meta */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.6rem" }}>
        {[
          { label: "File",    value: file?.name ?? "" },
          { label: "Rows",    value: analyzed.rows.toLocaleString() },
          { label: "Columns", value: String(analyzed.columns.length) },
        ].map(m => (
          <MouseTiltCard key={m.label} style={{ padding: "0.6rem 0.85rem", borderRadius: 10, background: CARD_BG, border: "1px solid rgba(129,140,248,0.14)" }}>
            <div style={{ fontSize: "0.6rem", color: "var(--text3)", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: "0.2rem" }}>{m.label}</div>
            <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{m.value}</div>
          </MouseTiltCard>
        ))}
      </div>

      {/* Target column */}
      <div>
        <label style={{ fontSize: "0.78rem", color: "var(--text2)", fontWeight: 600, display: "block", marginBottom: "0.4rem" }}>Target column</label>
        <select
          value={target}
          onChange={(e) => onTarget(e.target.value)}
          style={{ width: "100%", padding: "0.55rem 0.85rem", borderRadius: 8, background: "#111827", border: "1px solid rgba(129,140,248,0.18)", color: "var(--text)", fontSize: "0.85rem", cursor: "pointer" }}
        >
          {analyzed.columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
      </div>

      {/* Task type */}
      <div>
        <label style={{ fontSize: "0.78rem", color: "var(--text2)", fontWeight: 600, display: "block", marginBottom: "0.5rem" }}>Task type</label>
        <div style={{ display: "flex", gap: "0.6rem" }}>
          {(["classification", "regression"] as const).map(t => (
            <button key={t} onClick={() => onTaskType(t)} style={{
              flex: 1, padding: "0.55rem 1rem", borderRadius: 8, cursor: "pointer",
              fontWeight: 600, fontSize: "0.82rem", textTransform: "capitalize" as const,
              background: taskType === t ? `${ACCENT}22` : "transparent",
              border: `1px solid ${taskType === t ? ACCENT + "66" : "var(--border2)"}`,
              color: taskType === t ? ACCENT : "var(--text2)", transition: "all 0.15s",
            }}>{t}</button>
          ))}
        </div>
      </div>

      {/* Model name */}
      <div>
        <label style={{ fontSize: "0.78rem", color: "var(--text2)", fontWeight: 600, display: "block", marginBottom: "0.4rem" }}>Model name</label>
        <input
          type="text"
          value={modelName}
          onChange={(e) => onModelName(e.target.value)}
          style={{ width: "100%", padding: "0.55rem 0.85rem", borderRadius: 8, background: "#111827", border: "1px solid rgba(129,140,248,0.18)", color: "var(--text)", fontSize: "0.85rem", boxSizing: "border-box" as const }}
        />
      </div>

      {/* Model selection */}
      <div>
        <label style={{ fontSize: "0.78rem", color: "var(--text2)", fontWeight: 600, display: "block", marginBottom: "0.5rem" }}>
          Models to compete
        </label>
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "0.35rem", marginBottom: "0.5rem" }}>
          {[...selectedModels].map(m => (
            <div key={m} style={{
              display: "flex", alignItems: "center", gap: "0.3rem",
              padding: "0.2rem 0.4rem 0.2rem 0.65rem", borderRadius: 9999,
              background: `${ACCENT}18`, border: `1px solid ${ACCENT}44`,
              fontSize: "0.73rem", color: ACCENT, fontWeight: 600,
            }}>
              {m}
              {selectedModels.size > 1 && (
                <button onClick={() => onToggleModel(m)} style={{
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
        {addableModels.length > 0 && (
          <select
            value=""
            onChange={(e) => { if (e.target.value) onToggleModel(e.target.value); }}
            style={{
              fontSize: "0.75rem", color: "var(--text3)", background: "var(--border)",
              border: "1px solid var(--border2)", borderRadius: 7,
              padding: "0.3rem 0.6rem", cursor: "pointer",
            }}
          >
            <option value="">+ Add model</option>
            {addableModels.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        )}
      </div>

      {/* Warnings */}
      {analyzed.total_missing > 0 && (
        <p style={{ fontSize: "0.75rem", color: "#fbbf24", margin: 0 }}>
          {analyzed.total_missing} missing values detected — AutoML will handle them automatically.
        </p>
      )}
      {trainingEst && (
        <p style={{ fontSize: "0.75rem", color: "var(--text3)", margin: 0 }}>
          Estimated time: <span style={{ color: ACCENT, fontWeight: 600 }}>{trainingEst}</span> (varies with server load)
        </p>
      )}
      {error && <p style={{ fontSize: "0.78rem", color: "#f87171", margin: 0 }}>{error}</p>}

      {/* Actions */}
      <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.25rem" }}>
        <button onClick={onBack} style={{ padding: "0.6rem 1.2rem", borderRadius: 9999, cursor: "pointer", background: "transparent", border: "1px solid var(--border2)", color: "var(--text2)", fontSize: "0.82rem", fontWeight: 600 }}>
          Back
        </button>
        <button onClick={onTrain} disabled={!target} style={{ flex: 1, padding: "0.6rem 1.2rem", borderRadius: 9999, cursor: "pointer", background: ACCENT, border: "none", color: "#000", fontSize: "0.85rem", fontWeight: 700, opacity: !target ? 0.5 : 1 }}>
          Run AutoML Competition
        </button>
      </div>
    </div>
  );
}
