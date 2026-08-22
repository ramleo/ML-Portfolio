"use client";

import { useEffect } from "react";
import { MODELS, Step, useShapRunner } from "./useShapRunner";
import type { TrainResult } from "./useShapRunner";
import ShapResults from "./ShapResults";

const ACCENT = "#f59e0b";

const CARD: React.CSSProperties = {
  background: "var(--bg-glass)",
  backdropFilter: "blur(14px)",
  border: "1px solid var(--border)",
  borderRadius: 16,
  padding: "1.25rem 1.4rem",
};

interface ShapRunnerProps {
  onReady?: (trigger: (f: File) => void) => void;
  onResult?: (r: TrainResult | null) => void;
  onStepChange?: (step: Step) => void;
}

export default function ShapRunner({ onReady, onResult, onStepChange }: ShapRunnerProps) {
  const {
    state,
    step, dragging, setDragging, file, analyzing, analyzeResult, error,
    target, setTarget, task, setTask, model, setModel,
    usePresetParams, setUsePresetParams, presetParams,
    progress, status, result, training,
    inputRef, paramsInputRef,
    onDrop, onInputChange, handleTrain, reset, loadParamsFromFile,
  } = useShapRunner({ onReady, onResult });

  useEffect(() => { onStepChange?.(step); }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ ...CARD, marginBottom: "1.5rem" }}>
      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
        <div>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: ACCENT, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.2rem" }}>
            Try It — Upload Your CSV
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text3)" }}>
            Get SHAP-style feature importance on your own dataset
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
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ fontSize: "0.78rem", color: "var(--text2)" }}>
            <strong style={{ color: "var(--text)" }}>{file?.name}</strong> — {analyzeResult.rows.toLocaleString()} rows, {analyzeResult.columns.length} columns
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
            <div>
              <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: "0.4rem" }}>Target Column</label>
              <select value={target} onChange={e => setTarget(e.target.value)} style={{ width: "100%", background: "var(--border)", border: `1px solid ${ACCENT}30`, borderRadius: 7, padding: "0.45rem 0.7rem", color: "var(--text)", fontSize: "0.82rem", outline: "none" }}>
                {analyzeResult.columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: "0.4rem" }}>Task Type</label>
              <div style={{ display: "flex", gap: "0.4rem" }}>
                {(["classification", "regression"] as const).map(t => (
                  <button key={t} onClick={() => setTask(t)} style={{ flex: 1, padding: "0.45rem 0.5rem", borderRadius: 7, border: `1px solid ${task === t ? ACCENT : "var(--border2)"}`, background: task === t ? `${ACCENT}20` : "var(--border)", color: task === t ? ACCENT : "var(--text3)", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}>
                    {t === "classification" ? "Classification" : "Regression"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: "0.4rem" }}>Model</label>
            <select value={model} onChange={e => setModel(e.target.value)} style={{ width: "100%", background: "var(--border)", border: `1px solid ${ACCENT}30`, borderRadius: 7, padding: "0.45rem 0.7rem", color: "var(--text)", fontSize: "0.82rem", outline: "none" }}>
              {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* Hyperparameters */}
          <div>
            <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: "0.5rem" }}>
              Hyperparameters
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", fontSize: "0.8rem", color: "var(--text2)" }}>
                <input
                  type="checkbox"
                  checked={usePresetParams}
                  onChange={e => setUsePresetParams(e.target.checked)}
                  style={{ accentColor: ACCENT }}
                />
                {state.tunedModel?.params && Object.keys(state.tunedModel.params).length > 0
                  ? "Use Optuna-tuned parameters (auto-detected)"
                  : "Use custom parameters"}
              </label>
              <button
                onClick={() => paramsInputRef.current?.click()}
                style={{ fontSize: "0.72rem", padding: "0.3rem 0.75rem", borderRadius: 6, background: "transparent", border: `1px solid ${ACCENT}44`, color: ACCENT, cursor: "pointer" }}
              >
                Upload params JSON
              </button>
              <input ref={paramsInputRef} type="file" accept=".json" style={{ display: "none" }} onChange={loadParamsFromFile} />
            </div>
            {usePresetParams && presetParams && (
              <div style={{ marginTop: "0.5rem", fontSize: "0.72rem", color: "var(--text3)", background: "var(--border)", borderRadius: 6, padding: "0.4rem 0.65rem" }}>
                {Object.entries(presetParams).slice(0, 5).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                {Object.keys(presetParams).length > 5 && ` · +${Object.keys(presetParams).length - 5} more`}
              </div>
            )}
          </div>

          <button onClick={handleTrain}
            onMouseEnter={e => { e.currentTarget.style.opacity = "0.88"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "translateY(0)"; }}
            style={{ padding: "0.65rem 1.4rem", borderRadius: 9999, border: "none", background: ACCENT, color: "#fff", fontSize: "0.84rem", fontWeight: 700, cursor: "pointer", alignSelf: "flex-start", transition: "opacity 0.15s, transform 0.15s" }}>
            Explain Features
          </button>
          {error && <div style={{ fontSize: "0.78rem", color: "#f87171" }}>{error}</div>}
        </div>
      )}

      {/* STEP 3: Results */}
      {step === 3 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--text3)", marginBottom: "0.35rem" }}>
              <span>{status || "Running..."}</span>
              <span style={{ color: ACCENT, fontWeight: 700 }}>{progress}%</span>
            </div>
            <div style={{ height: 8, borderRadius: 9999, background: "var(--border)" }}>
              <div style={{ height: "100%", width: `${progress}%`, borderRadius: 9999, background: ACCENT, boxShadow: `0 0 8px ${ACCENT}55`, transition: "width 0.3s" }} />
            </div>
          </div>

          {result && <ShapResults result={result} />}

          {!training && !result && error && (
            <div style={{ fontSize: "0.78rem", color: "#f87171" }}>{error}</div>
          )}
        </div>
      )}
    </div>
  );
}