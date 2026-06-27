"use client";

import { type StageResult } from "./StageModal";

interface Props {
  stageId: string;
  config: Record<string, unknown>;
  setConfig: (c: Record<string, unknown>) => void;
  columns: string[];
  taskType: "classification" | "regression";
  existingResult?: StageResult | null;
}

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8,
  padding: "0.5rem 0.75rem",
  color: "#e2e8f0",
  fontSize: "0.82rem",
  width: "100%",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  fontSize: "0.78rem",
  color: "rgba(200,205,225,0.8)",
  marginBottom: 4,
  display: "block",
};

const sectionStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "1rem" };

const pillBase: React.CSSProperties = {
  padding: "0.28rem 0.7rem",
  borderRadius: 20,
  fontSize: "0.78rem",
  cursor: "pointer",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.05)",
  color: "rgba(200,210,230,0.7)",
  transition: "all 0.15s",
};

const pillActive: React.CSSProperties = {
  ...pillBase,
  background: "rgba(139,92,246,0.2)",
  border: "1px solid rgba(139,92,246,0.5)",
  color: "#c4b5fd",
};

const MODEL_OPTIONS = ["RandomForest", "XGBoost", "LightGBM", "CatBoost"];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <Field label={label}>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </Field>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", cursor: "pointer" }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
        style={{ width: 15, height: 15, accentColor: "#8b5cf6", cursor: "pointer" }} />
      <span style={{ ...labelStyle, marginBottom: 0 }}>{label}</span>
    </label>
  );
}

function SliderField({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <Field label={`${label}: ${value}`}>
      <input type="range" min={min} max={max} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: "#8b5cf6", cursor: "pointer" }} />
    </Field>
  );
}

function ModelPills({ selected, onChange }: { selected: string[]; onChange: (v: string[]) => void }) {
  const toggle = (m: string) =>
    onChange(selected.includes(m) ? selected.filter((x) => x !== m) : [...selected, m]);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
      {MODEL_OPTIONS.map((m) => (
        <button key={m} type="button" onClick={() => toggle(m)} style={selected.includes(m) ? pillActive : pillBase}>{m}</button>
      ))}
    </div>
  );
}

function get<T>(config: Record<string, unknown>, key: string, fallback: T): T {
  return key in config ? (config[key] as T) : fallback;
}

function s(config: Record<string, unknown>, setConfig: (c: Record<string, unknown>) => void, key: string, val: unknown) {
  setConfig({ ...config, [key]: val });
}

export function StageConfigForm({ stageId, config, setConfig, columns, taskType, existingResult }: Props) {
  const set = (key: string, val: unknown) => s(config, setConfig, key, val);

  if (stageId === "preprocessing") {
    const outliers = get(config, "remove_outliers", false);
    return (
      <div style={sectionStyle}>
        <SelectField label="Numeric imputation" value={get(config, "mv_num", "mean")}
          onChange={(v) => set("mv_num", v)} options={["mean", "median", "knn", "mice", "drop"]} />
        <SelectField label="Categorical imputation" value={get(config, "mv_cat", "most_frequent")}
          onChange={(v) => set("mv_cat", v)} options={["most_frequent", "constant", "drop"]} />
        <Toggle label="Remove duplicates" checked={get(config, "remove_duplicates", false)} onChange={(v) => set("remove_duplicates", v)} />
        <Toggle label="Remove outliers" checked={outliers} onChange={(v) => set("remove_outliers", v)} />
        {outliers && (
          <SelectField label="Outlier method" value={get(config, "outlier_method", "iqr")}
            onChange={(v) => set("outlier_method", v)} options={["iqr", "zscore", "winsorize"]} />
        )}
        <Toggle label="Fix skewness" checked={get(config, "fix_skewness", false)} onChange={(v) => set("fix_skewness", v)} />
        <Field label="Drop columns">
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", maxHeight: 150, overflowY: "auto" }}>
            {columns.length === 0 && <span style={{ fontSize: "0.75rem", color: "rgba(200,210,230,0.4)" }}>No columns loaded</span>}
            {columns.map((col) => {
              const dropped = get<string[]>(config, "drop_cols", []);
              return (
                <label key={col} style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                  <input type="checkbox" checked={dropped.includes(col)}
                    onChange={(e) => set("drop_cols", e.target.checked ? [...dropped, col] : dropped.filter((c) => c !== col))}
                    style={{ accentColor: "#8b5cf6" }} />
                  <span style={{ fontSize: "0.78rem", color: "rgba(200,210,230,0.75)" }}>{col}</span>
                </label>
              );
            })}
          </div>
        </Field>
      </div>
    );
  }

  if (stageId === "feature-eng") {
    const transforms = get<Record<string, string[]>>(config, "column_transforms", {});
    const dateCols = get<string[]>(config, "date_columns", []);
    const dateParts = get<string[]>(config, "date_parts", []);
    const TRANSFORM_OPTS = ["log1p", "sqrt", "outlier_flag", "missing_flag"];
    const DATE_PARTS = ["year", "month", "day", "dayofweek"];
    return (
      <div style={sectionStyle}>
        <div>
          <label style={labelStyle}>For each numeric column, select transforms to apply:</label>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: 220, overflowY: "auto" }}>
            {columns.map((col) => {
              const cur = transforms[col] ?? [];
              return (
                <div key={col} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 6, padding: "0.4rem 0.6rem" }}>
                  <div style={{ fontSize: "0.75rem", color: "rgba(200,210,230,0.6)", marginBottom: "0.3rem" }}>{col}</div>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    {TRANSFORM_OPTS.map((t) => (
                      <label key={t} style={{ display: "flex", alignItems: "center", gap: "0.3rem", cursor: "pointer" }}>
                        <input type="checkbox" checked={cur.includes(t)}
                          onChange={(e) => {
                            const next = e.target.checked ? [...cur, t] : cur.filter((x) => x !== t);
                            setConfig({ ...config, column_transforms: { ...transforms, [col]: next } });
                          }} style={{ accentColor: "#8b5cf6" }} />
                        <span style={{ fontSize: "0.72rem", color: "rgba(200,210,230,0.7)" }}>{t}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <Field label="Date columns (select which columns are dates)">
          <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", maxHeight: 100, overflowY: "auto" }}>
            {columns.map((col) => (
              <label key={col} style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                <input type="checkbox" checked={dateCols.includes(col)}
                  onChange={(e) => set("date_columns", e.target.checked ? [...dateCols, col] : dateCols.filter((c) => c !== col))}
                  style={{ accentColor: "#8b5cf6" }} />
                <span style={{ fontSize: "0.78rem", color: "rgba(200,210,230,0.75)" }}>{col}</span>
              </label>
            ))}
          </div>
        </Field>
        <Field label="Date parts to extract">
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {DATE_PARTS.map((p) => (
              <label key={p} style={{ display: "flex", alignItems: "center", gap: "0.3rem", cursor: "pointer" }}>
                <input type="checkbox" checked={dateParts.includes(p)}
                  onChange={(e) => set("date_parts", e.target.checked ? [...dateParts, p] : dateParts.filter((x) => x !== p))}
                  style={{ accentColor: "#8b5cf6" }} />
                <span style={{ fontSize: "0.78rem", color: "rgba(200,210,230,0.75)" }}>{p}</span>
              </label>
            ))}
          </div>
        </Field>
      </div>
    );
  }

  if (stageId === "feature-select") {
    return (
      <div style={sectionStyle}>
        <SelectField label="Method" value={get(config, "method", "kbest")}
          onChange={(v) => set("method", v)} options={["none", "variance", "correlation", "rfe", "kbest"]} />
        <SliderField label="Top K Features" value={get(config, "top_k", 15)} min={5} max={50}
          onChange={(v) => set("top_k", v)} />
      </div>
    );
  }

  if (stageId === "automl") {
    return (
      <div style={sectionStyle}>
        <Field label="Select models to compare:">
          <ModelPills selected={get<string[]>(config, "models", MODEL_OPTIONS)} onChange={(v) => set("models", v)} />
        </Field>
        <SliderField label="CV Folds" value={get(config, "n_folds", 5)} min={3} max={10}
          onChange={(v) => set("n_folds", v)} />
        <Field label="Task type">
          <div style={{ display: "flex", gap: "1rem" }}>
            {(["classification", "regression"] as const).map((t) => (
              <label key={t} style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer" }}>
                <input type="radio" name="task_type" value={t}
                  checked={get(config, "task_type", taskType) === t}
                  onChange={() => set("task_type", t)} style={{ accentColor: "#8b5cf6" }} />
                <span style={{ fontSize: "0.78rem", color: "rgba(200,210,230,0.8)" }}>{t}</span>
              </label>
            ))}
          </div>
        </Field>
      </div>
    );
  }

  if (stageId === "optuna") {
    const winner = existingResult?.data?.winner as string | undefined;
    return (
      <div style={sectionStyle}>
        <SliderField label="Trials" value={get(config, "n_trials", 30)} min={10} max={50}
          onChange={(v) => set("n_trials", v)} />
        {winner && (
          <div style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.25)", borderRadius: 8, padding: "0.6rem 0.75rem", fontSize: "0.78rem", color: "rgba(200,210,230,0.8)" }}>
            Tuning model: <span style={{ color: "#c4b5fd", fontWeight: 600 }}>{winner}</span>
          </div>
        )}
        <p style={{ fontSize: "0.78rem", color: "rgba(200,205,225,0.55)", margin: 0 }}>
          Hyperparameter tuning with Optuna Bayesian search on the best model from AutoML.
        </p>
      </div>
    );
  }

  if (stageId === "shap") {
    const winner = existingResult?.data?.winner as string | undefined;
    return (
      <div style={sectionStyle}>
        <p style={{ fontSize: "0.82rem", color: "rgba(200,205,225,0.7)", margin: 0 }}>
          SHAP will explain the trained model&apos;s predictions using Shapley values.
        </p>
        {winner && (
          <div style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.25)", borderRadius: 8, padding: "0.6rem 0.75rem", fontSize: "0.78rem", color: "rgba(200,210,230,0.8)" }}>
            Explaining: <span style={{ color: "#c4b5fd", fontWeight: 600 }}>{winner}</span>
          </div>
        )}
      </div>
    );
  }

  if (stageId === "ensemble") {
    return (
      <div style={sectionStyle}>
        <Field label="Ensemble type">
          <div style={{ display: "flex", gap: "1rem" }}>
            {["voting", "stacking"].map((t) => (
              <label key={t} style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer" }}>
                <input type="radio" name="ensemble_type" value={t}
                  checked={get(config, "ensemble_type", "voting") === t}
                  onChange={() => set("ensemble_type", t)} style={{ accentColor: "#8b5cf6" }} />
                <span style={{ fontSize: "0.78rem", color: "rgba(200,210,230,0.8)" }}>{t}</span>
              </label>
            ))}
          </div>
        </Field>
        <Field label="Models to combine:">
          <ModelPills selected={get<string[]>(config, "models", MODEL_OPTIONS)} onChange={(v) => set("models", v)} />
        </Field>
      </div>
    );
  }

  return <p style={{ fontSize: "0.82rem", color: "rgba(200,205,225,0.5)" }}>No configuration needed for this stage.</p>;
}