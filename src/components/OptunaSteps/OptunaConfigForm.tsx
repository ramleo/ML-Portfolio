"use client";

const ACCENT = "#a78bfa";
const MODELS = ["Random Forest", "XGBoost", "LightGBM", "CatBoost", "Extra Trees"];

interface Column { name: string; is_numeric: boolean; nunique: number; missing: number }
interface AnalyzeResult { columns: Column[]; suggested_target: string; suggested_task: "classification" | "regression"; rows: number }

interface Props {
  file: File | null;
  analyzeResult: AnalyzeResult;
  target: string;
  setTarget: (v: string) => void;
  task: "classification" | "regression";
  setTask: (v: "classification" | "regression") => void;
  model: string;
  setModel: (v: string) => void;
  dropCols: string[];
  setDropCols: (fn: (prev: string[]) => string[]) => void;
  nTrials: number;
  setNTrials: (v: number) => void;
  optMetric: string;
  setOptMetric: (v: string) => void;
  sampler: string;
  setSampler: (v: string) => void;
  secondaryMetric: string;
  setSecondaryMetric: (v: string) => void;
  onTrain: () => void;
  error: string | null;
}

export default function OptunaConfigForm({
  file, analyzeResult, target, setTarget, task, setTask, model, setModel,
  dropCols, setDropCols, nTrials, setNTrials, optMetric, setOptMetric,
  sampler, setSampler, secondaryMetric, setSecondaryMetric, onTrain, error,
}: Props) {
  return (
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
        <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: "0.4rem" }}>Model</label>
        <select value={model} onChange={e => setModel(e.target.value)} style={{ width: "100%", background: "rgba(0,0,0,0.4)", border: `1px solid ${ACCENT}30`, borderRadius: 7, padding: "0.45rem 0.7rem", color: "var(--text)", fontSize: "0.82rem", outline: "none" }}>
          {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {analyzeResult.columns.filter(c => c.name !== target).length > 0 && (
        <div>
          <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: "0.4rem" }}>
            Drop Columns <span style={{ color: "var(--text3)", fontWeight: 400, textTransform: "none" }}>(optional)</span>
          </label>
          <div style={{ maxHeight: 120, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.3rem", padding: "0.4rem", background: "rgba(0,0,0,0.3)", borderRadius: 7, border: `1px solid ${ACCENT}20` }}>
            {analyzeResult.columns.filter(c => c.name !== target).map(c => (
              <label key={c.name} style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.78rem", color: dropCols.includes(c.name) ? ACCENT : "var(--text2)" }}>
                <input
                  type="checkbox"
                  checked={dropCols.includes(c.name)}
                  onChange={e => setDropCols(prev => e.target.checked ? [...prev, c.name] : prev.filter(n => n !== c.name))}
                  style={{ accentColor: ACCENT }}
                />
                {c.name}
              </label>
            ))}
          </div>
          {dropCols.length > 0 && (
            <div style={{ fontSize: "0.68rem", color: "var(--text3)", marginTop: "0.25rem" }}>
              {dropCols.length} column{dropCols.length > 1 ? "s" : ""} will be excluded from training
            </div>
          )}
        </div>
      )}

      <div>
        <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: "0.4rem" }}>
          Optuna Trials: <span style={{ color: ACCENT }}>{nTrials}</span>
        </label>
        <input type="range" min={10} max={200} step={5} value={nTrials} onChange={e => setNTrials(Number(e.target.value))} style={{ width: "100%", accentColor: ACCENT }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.65rem", color: "var(--text3)", marginTop: "0.2rem" }}>
          <span>10</span><span>200</span>
        </div>
      </div>

      <div>
        <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: "0.4rem" }}>
          Optimization Metric
        </label>
        <select value={optMetric} onChange={e => setOptMetric(e.target.value)} style={{ width: "100%", background: "rgba(0,0,0,0.4)", border: `1px solid ${ACCENT}30`, borderRadius: 7, padding: "0.45rem 0.7rem", color: "var(--text)", fontSize: "0.82rem", outline: "none" }}>
          {task === "classification" ? (
            <>
              <option value="auto">Auto (F1 Weighted / F1 Macro)</option>
              <option value="f1_weighted">F1 Weighted</option>
              <option value="f1_macro">F1 Macro</option>
              <option value="accuracy">Accuracy</option>
              <option value="roc_auc">ROC-AUC</option>
            </>
          ) : (
            <>
              <option value="auto">Auto (MAE)</option>
              <option value="mae">MAE</option>
              <option value="rmse">RMSE</option>
              <option value="r2">R²</option>
            </>
          )}
        </select>
      </div>

      <div>
        <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: "0.4rem" }}>
          Sampler
        </label>
        <select value={sampler} onChange={e => setSampler(e.target.value)} style={{ width: "100%", background: "rgba(0,0,0,0.4)", border: `1px solid ${ACCENT}30`, borderRadius: 7, padding: "0.45rem 0.7rem", color: "var(--text)", fontSize: "0.82rem", outline: "none" }}>
          <option value="tpe">TPE (Tree Parzen Estimator)</option>
          <option value="qmc">QMC (Quasi-Monte Carlo / Sobol)</option>
        </select>
      </div>

      <div>
        <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: "0.4rem" }}>
          Secondary Metric <span style={{ color: "var(--text3)", fontWeight: 400, textTransform: "none" }}>(tracked, not optimized)</span>
        </label>
        <select value={secondaryMetric} onChange={e => setSecondaryMetric(e.target.value)} style={{ width: "100%", background: "rgba(0,0,0,0.4)", border: `1px solid ${ACCENT}30`, borderRadius: 7, padding: "0.45rem 0.7rem", color: "var(--text)", fontSize: "0.82rem", outline: "none" }}>
          <option value="none">None</option>
          {task === "classification" ? (
            <>
              <option value="accuracy">Accuracy</option>
              <option value="f1_weighted">F1 Weighted</option>
              <option value="f1_macro">F1 Macro</option>
            </>
          ) : (
            <>
              <option value="mae">MAE</option>
              <option value="rmse">RMSE</option>
              <option value="r2">R²</option>
            </>
          )}
        </select>
      </div>

      <button onClick={onTrain} style={{ padding: "0.65rem 1.2rem", borderRadius: 8, border: "none", background: ACCENT, color: "#000", fontSize: "0.84rem", fontWeight: 700, cursor: "pointer", alignSelf: "flex-start" }}>
        Run Optuna Tuning
      </button>
      {error && <div style={{ fontSize: "0.78rem", color: "#f87171" }}>{error}</div>}
    </div>
  );
}