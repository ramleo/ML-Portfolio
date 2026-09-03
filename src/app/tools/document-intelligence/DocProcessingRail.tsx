"use client";

import type { ProcessingStep, StepState } from "./_types";

const ACCENT = "#387e8a";

/* Split out of DocIntelRunner.tsx, which was 363 lines and could not take
   another feature under the 400-line limit. STEPS travels with the rail
   because it is the rail's own shape - the runner only seeds state from it. */
export const STEPS: { key: ProcessingStep; label: string }[] = [
  { key: "extract",  label: "Extract" },
  { key: "classify", label: "Classify" },
  { key: "analyze",  label: "Analyze" },
  { key: "validate", label: "Validate" },
];

export default function ProcessingRail({ steps }: { steps: StepState[] }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
              style={s.status === "done"
                ? { background: "#10b98130", color: "#10b981", border: "1px solid #10b98150" }
                : s.status === "running"
                ? { background: `${ACCENT}25`, color: ACCENT, border: `1px solid ${ACCENT}50`, animation: "pulse 1.5s infinite" }
                : { background: "var(--bg-glass)", color: "var(--text3)", border: "1px solid var(--border)" }}>
              {s.status === "done"
                ? <svg width="9" height="9" viewBox="0 0 10 10"><path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/></svg>
                : s.status === "running"
                ? <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>◌</span>
                : i + 1}
            </div>
            <span className="text-[9px]"
              style={{ color: s.status === "done" ? "#10b981" : s.status === "running" ? ACCENT : "var(--text3)" }}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className="w-6 h-px" style={{ background: "var(--border2)" }} />
          )}
        </div>
      ))}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
