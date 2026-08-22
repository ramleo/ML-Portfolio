"use client";

const ACCENT_DEFAULT = "#22d3ee";

/** Generic step-progress indicator for a tool page's sticky header. Takes
 * plain labels + a current index instead of any one tool's own Step type,
 * so every pipeline-stage page (Preprocessing, Feature Engineering,
 * Feature Selection, AutoML, Optuna, SHAP, Ensemble) can share it even
 * though each tracks a different number of steps under different names. */
export function StepIndicator({ labels, currentIndex, accent = ACCENT_DEFAULT }: { labels: string[]; currentIndex: number; accent?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      {labels.map((label, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{
              width: 24, height: 24, borderRadius: 9999,
              background: active ? accent : done ? `${accent}33` : "var(--border)",
              border: `1px solid ${active || done ? accent + "66" : "var(--border2)"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.65rem", fontWeight: 700,
              color: active ? "#000" : done ? accent : "var(--text3)",
              transition: "all 0.2s",
            }}>
              {done ? (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="1.5,5 4,7.5 8.5,2.5" />
                </svg>
              ) : i + 1}
            </div>
            <span style={{ fontSize: "0.72rem", color: active ? "var(--text)" : "var(--text3)", fontWeight: active ? 600 : 400 }}>{label}</span>
            {i < labels.length - 1 && <div style={{ width: 24, height: 1, background: "var(--border)" }} />}
          </div>
        );
      })}
    </div>
  );
}
