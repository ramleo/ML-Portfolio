"use client";

import { useRef, useState, useCallback, useEffect, DragEvent, ChangeEvent } from "react";
import { ML_UNIFIED_API } from "@/config/urls";
import { usePipeline } from "@/context/PipelineContext";
import EnsembleResults from "./EnsembleResults";

const CARD: React.CSSProperties = {
  background: "var(--bg-glass)",
  backdropFilter: "blur(14px)",
  border: "1px solid var(--border)",
  borderRadius: 16,
  padding: "1.25rem 1.4rem",
};

type Step = 1 | 2 | 3;

interface Column {
  name: string;
  is_numeric: boolean;
  nunique: number;
  missing: number;
}

interface AnalyzeResult {
  columns: Column[];
  suggested_target: string;
  suggested_task: "classification" | "regression";
  rows: number;
}

interface CVEntry { name: string; score: number }
interface TrainResult {
  winner: string;
  cv_results: CVEntry[];
  winner_metrics: Record<string, number | string>;
  feature_importance: { feature: string; importance: number }[];
}

const ALL_MODELS = ["Random Forest", "XGBoost", "LightGBM", "CatBoost", "Extra Trees"];

interface EnsembleRunnerProps {
  onReady?: (trigger: (f: File) => void) => void;
  onResult?: (r: TrainResult | null) => void;
  accent?: string;
}

export default function EnsembleRunner({ onReady, onResult, accent }: EnsembleRunnerProps) {
  const ACCENT = accent ?? "#10b981";
  const { state, setState } = usePipeline();

  const [step, setStep] = useState<Step>(1);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [target, setTarget] = useState("");
  const [task, setTask] = useState<"classification" | "regression">("classification");
  const [selectedModels, setSelectedModels] = useState<string[]>(["Random Forest", "XGBoost", "LightGBM"]);

  // Pre-select top models from AutoML ranking in context
  useEffect(() => {
    if (!state.automlRanking || state.automlRanking.length === 0) return;
    const mapping: Record<string, string> = {
      RandomForest: "Random Forest", XGBoost: "XGBoost",
      LightGBM: "LightGBM", CatBoost: "CatBoost",
    };
    const top = state.automlRanking
      .slice(0, 3)
      .map(m => mapping[m.algo])
      .filter((m): m is string => !!m && ALL_MODELS.includes(m));
    if (top.length >= 2) setSelectedModels(top);
  }, [state.automlRanking]); // eslint-disable-line react-hooks/exhaustive-deps

  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<TrainResult | null>(null);
  const [training, setTraining] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const toggleModel = useCallback((m: string) => {
    setSelectedModels(prev =>
      prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]
    );
  }, []);

  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setError(null);
    setAnalyzing(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch(`${ML_UNIFIED_API}/analyze`, { method: "POST", body: fd });
      if (!res.ok) throw new Error(`Analyze failed: ${res.statusText}`);
      const data: AnalyzeResult = await res.json();
      setAnalyzeResult(data);
      setTarget(data.suggested_target);
      setTask(data.suggested_task);
      setStep(2);
      const sid = typeof window !== "undefined" ? (localStorage.getItem("_ml_session") ?? "") : "";
      fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "query_run", path: "/tools/ensemble", session_id: sid, meta: { tool: "ensemble", action: "analyze", rows: data.rows } }),
      }).catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to analyze CSV");
      const sid = typeof window !== "undefined" ? (localStorage.getItem("_ml_session") ?? "") : "";
      fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "error", path: "/tools/ensemble", session_id: sid, meta: { tool: "ensemble", error_type: "analyze_error" } }),
      }).catch(() => {});
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
    if (selectedModels.length < 3) {
      setError("Please select at least 3 algorithms for ensemble training.");
      return;
    }
    setError(null);
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
      fd.append("model_name", "Ensemble Run");
      fd.append("algorithm", "AutoML");
      fd.append("accent", ACCENT);
      fd.append("selected_models", JSON.stringify(selectedModels));
      fd.append("tune", "false");
      fd.append("n_trials", "10");
      fd.append("feature_engineering", "{}");
      fd.append("fe_b64", "");
      fd.append("pre_fe_cols_json", "[]");
      fd.append("pre_fe_sample_json", "{}");
      const res = await fetch(`${ML_UNIFIED_API}/train`, { method: "POST", body: fd });
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
              const data: TrainResult = {
                ...raw,
                cv_results: (raw.cv_results ?? []).map((r: { algorithm?: string; name?: string; score: number; fold_scores?: number[] }) => ({
                  ...r, name: r.name ?? r.algorithm ?? "",
                })),
              };
              setResult(data); onResult?.(data);
              const sid = typeof window !== "undefined" ? (localStorage.getItem("_ml_session") ?? "") : "";
              fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "query_run", path: "/tools/ensemble", session_id: sid,
                  meta: { tool: "ensemble", action: "train", winner: data.winner ?? "", score: Number(Object.values(data.winner_metrics ?? {})[0] ?? 0) } }),
              }).catch(() => {});
              // Write ensembleScore back to PipelineContext
              if (data?.winner_metrics) {
                setState(prev => ({
                  ...prev,
                  ensembleType: "voting",
                  ensembleScore: Number(Object.values(data.winner_metrics)[0] ?? 0),
                }));
              }
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Training failed");
      const sid = typeof window !== "undefined" ? (localStorage.getItem("_ml_session") ?? "") : "";
      fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "error", path: "/tools/ensemble", session_id: sid, meta: { tool: "ensemble", error_type: "train_error" } }),
      }).catch(() => {});
    } finally {
      setTraining(false);
    }
  }, [file, target, task, selectedModels]);

  const reset = useCallback(() => {
    setStep(1);
    setFile(null);
    setAnalyzeResult(null);
    setResult(null);
    setError(null);
    setProgress(0);
    setStatus("");
    setSelectedModels(["Random Forest", "XGBoost", "LightGBM"]);
  }, []);

  return (
    <div style={{ ...CARD, borderTop: `3px solid ${ACCENT}`, marginBottom: "1.5rem" }}>
      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
        <div>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: ACCENT, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.2rem" }}>
            Try It — Upload Your CSV
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text3)" }}>
            Run an ensemble competition on your own dataset
          </div>
        </div>
        {step > 1 && (
          <button onClick={reset} style={{ fontSize: "0.72rem", color: "var(--text3)", background: "none", border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>
            Reset
          </button>
        )}
      </div>

      {/* Step indicator */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
        {([1, 2, 3] as Step[]).map(s => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <div style={{
              width: 22, height: 22, borderRadius: 9999, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.65rem", fontWeight: 700,
              background: step >= s ? ACCENT : "rgba(255,255,255,0.06)",
              color: step >= s ? "#000" : "var(--text3)",
              border: step === s ? `2px solid ${ACCENT}` : "2px solid transparent",
            }}>{s}</div>
            <span style={{ fontSize: "0.72rem", color: step >= s ? "var(--text2)" : "var(--text3)" }}>
              {s === 1 ? "Upload" : s === 2 ? "Configure" : "Results"}
            </span>
            {s < 3 && <div style={{ width: 24, height: 1, background: "rgba(255,255,255,0.1)", marginLeft: "0.15rem" }} />}
          </div>
        ))}
      </div>

      {/* STEP 1: Upload */}
      {step === 1 && (
        <div>
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            style={{
              border: `2px dashed ${ACCENT}${dragging ? "99" : "4d"}`,
              borderRadius: 10, padding: "2rem 1rem", textAlign: "center", cursor: "pointer",
              background: dragging ? `${ACCENT}08` : "rgba(0,0,0,0.15)",
              transition: "all 0.2s",
            }}
          >
            <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>📂</div>
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
              <select value={target} onChange={e => setTarget(e.target.value)} style={{ width: "100%", background: "rgba(0,0,0,0.4)", border: `1px solid ${ACCENT}30`, borderRadius: 7, padding: "0.45rem 0.7rem", color: "var(--text)", fontSize: "0.82rem", outline: "none" }}>
                {analyzeResult.columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: "0.4rem" }}>Task Type</label>
              <div style={{ display: "flex", gap: "0.4rem" }}>
                {(["classification", "regression"] as const).map(t => (
                  <button key={t} onClick={() => setTask(t)} style={{ flex: 1, padding: "0.45rem 0.5rem", borderRadius: 7, border: `1px solid ${task === t ? ACCENT : "rgba(255,255,255,0.1)"}`, background: task === t ? `${ACCENT}20` : "rgba(0,0,0,0.3)", color: task === t ? ACCENT : "var(--text3)", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}>
                    {t === "classification" ? "Classification" : "Regression"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: "0.5rem" }}>
              Algorithms <span style={{ color: selectedModels.length < 3 ? "#f87171" : ACCENT }}>({selectedModels.length} selected — min 3)</span>
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {ALL_MODELS.map(m => {
                const sel = selectedModels.includes(m);
                return (
                  <button key={m} onClick={() => toggleModel(m)} style={{ padding: "0.4rem 0.85rem", borderRadius: 9999, border: `1px solid ${sel ? ACCENT + "44" : "var(--border2)"}`, background: sel ? `${ACCENT}22` : "var(--border)", color: sel ? ACCENT : "var(--text2)", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>
                    {m}
                  </button>
                );
              })}
            </div>
            {selectedModels.length < 3 && (
              <div style={{ marginTop: "0.4rem", fontSize: "0.72rem", color: "#f87171" }}>Select at least 3 algorithms for ensemble training</div>
            )}
          </div>

          <button onClick={handleTrain} disabled={selectedModels.length < 3}
            onMouseEnter={e => { if (selectedModels.length >= 3) { e.currentTarget.style.opacity = "0.88"; e.currentTarget.style.transform = "translateY(-1px)"; } }}
            onMouseLeave={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "translateY(0)"; }}
            style={{ padding: "0.65rem 1.4rem", borderRadius: 9999, border: "none", background: selectedModels.length < 3 ? "rgba(255,255,255,0.07)" : ACCENT, color: selectedModels.length < 3 ? "var(--text3)" : "#fff", fontSize: "0.84rem", fontWeight: 700, cursor: selectedModels.length < 3 ? "not-allowed" : "pointer", alignSelf: "flex-start", transition: "opacity 0.15s, transform 0.15s" }}>
            Run Ensemble Competition
          </button>
          {error && <div style={{ fontSize: "0.78rem", color: "#f87171" }}>{error}</div>}
        </div>
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
            <div style={{ height: 8, borderRadius: 9999, background: "rgba(255,255,255,0.07)" }}>
              <div style={{ height: "100%", width: `${progress}%`, borderRadius: 9999, background: ACCENT, boxShadow: `0 0 8px ${ACCENT}55`, transition: "width 0.3s" }} />
            </div>
          </div>

          {result && <EnsembleResults result={result} accent={ACCENT} />}

          {!training && !result && error && (
            <div style={{ fontSize: "0.78rem", color: "#f87171" }}>{error}</div>
          )}
        </div>
      )}
    </div>
  );
}
