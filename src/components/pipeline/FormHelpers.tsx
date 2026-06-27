"use client";

// Shared helper UI components for stage config forms

export const labelStyle: React.CSSProperties = {
  fontSize: "0.78rem",
  fontWeight: 600,
  color: "var(--text2, rgba(200,205,225,0.8))",
  marginBottom: "0.35rem",
  display: "block",
};

export const selectStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 8,
  color: "var(--text)",
  padding: "0.4rem 0.7rem",
  fontSize: "0.82rem",
  width: "100%",
};

export const toggleStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.6rem",
  cursor: "pointer",
  fontSize: "0.82rem",
  color: "var(--text2, rgba(200,205,225,0.8))",
};

export const MODELS = ["RandomForest", "XGBoost", "LightGBM", "CatBoost"];

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "0.85rem" }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

export function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label style={{ ...toggleStyle, marginBottom: "0.6rem", display: "flex" }}>
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        style={{ accentColor: "#38bdf8", width: 15, height: 15 }}
      />
      {label}
    </label>
  );
}

export function SliderField({
  label,
  min,
  max,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <Field label={`${label}: ${value}`}>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: "#38bdf8" }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "rgba(255,255,255,0.4)" }}>
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </Field>
  );
}

export function ModelPills({
  selected,
  models = MODELS,
  accentOn = "#22c55e22",
  borderOn = "#22c55e88",
  colorOn = "#4ade80",
  onChange,
}: {
  selected: string[];
  models?: string[];
  accentOn?: string;
  borderOn?: string;
  colorOn?: string;
  onChange: (v: string[]) => void;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
      {models.map((m) => {
        const on = selected.includes(m);
        return (
          <button
            key={m}
            type="button"
            onClick={() => onChange(on ? selected.filter((x) => x !== m) : [...selected, m])}
            style={{
              padding: "0.3rem 0.75rem",
              borderRadius: 99,
              fontSize: "0.75rem",
              fontWeight: 600,
              cursor: "pointer",
              background: on ? accentOn : "rgba(255,255,255,0.05)",
              border: `1px solid ${on ? borderOn : "rgba(255,255,255,0.12)"}`,
              color: on ? colorOn : "rgba(255,255,255,0.5)",
              transition: "all 0.15s",
            }}
          >
            {m}
          </button>
        );
      })}
    </div>
  );
}