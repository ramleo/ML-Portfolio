"use client";

type Step = 1 | 2 | 3;

interface Props {
  step: Step;
  ACCENT: string;
}

export default function OptunaStepBar({ step, ACCENT }: Props) {
  return (
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
  );
}
