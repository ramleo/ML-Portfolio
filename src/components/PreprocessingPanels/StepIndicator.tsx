"use client";

import { Step, STEP_KEYS, STEP_LABELS } from "@/lib/preprocessingAlgorithms";

const ACCENT = "#22d3ee";

export function StepIndicator({ step }: { step: Step }) {
  const currentIdx = STEP_KEYS.indexOf(step);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      {STEP_KEYS.map((s, i) => {
        const done   = i < currentIdx;
        const active = s === step;
        return (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{
              width: 24, height: 24, borderRadius: 9999,
              background: active ? ACCENT : done ? `${ACCENT}33` : "rgba(255,255,255,0.08)",
              border: `1px solid ${active || done ? ACCENT + "66" : "rgba(255,255,255,0.12)"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.65rem", fontWeight: 700,
              color: active ? "#000" : done ? ACCENT : "rgba(255,255,255,0.3)",
              transition: "all 0.2s",
            }}>
              {done ? (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="1.5,5 4,7.5 8.5,2.5" />
                </svg>
              ) : i + 1}
            </div>
            <span style={{ fontSize: "0.72rem", color: active ? "var(--text)" : "rgba(255,255,255,0.35)", fontWeight: active ? 600 : 400 }}>{STEP_LABELS[i]}</span>
            {i < 3 && <div style={{ width: 24, height: 1, background: "rgba(255,255,255,0.1)" }} />}
          </div>
        );
      })}
    </div>
  );
}