"use client";

const STEPS = [
  { id: "routing",    label: "Route"    },
  { id: "retrieving", label: "Retrieve" },
  { id: "grading",    label: "Grade"    },
  { id: "rewriting",  label: "Rewrite"  },
  { id: "generating", label: "Generate" },
];

interface Props {
  activeStep:     string | null;
  completedSteps: string[];
  accent:         string;
}

export default function AgentStepRail({ activeStep, completedSteps, accent }: Props) {
  return (
    <div style={{
      padding: "0.3rem 1rem",
      display: "flex", alignItems: "center",
      borderBottom: "1px solid rgba(255,255,255,0.05)",
      overflowX: "auto", gap: 0,
    }}>
      <style>{`@keyframes railPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
      {STEPS.map((step, i) => {
        const isDone   = completedSteps.includes(step.id);
        const isActive = activeStep === step.id;
        return (
          <div key={step.id} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 3,
              padding: "2px 8px", borderRadius: 20,
              background:  isDone ? `${accent}1a` : isActive ? `${accent}12` : "transparent",
              border: `1px solid ${isDone ? accent + "55" : isActive ? accent + "44" : "rgba(255,255,255,0.07)"}`,
              fontSize: "0.55rem", fontWeight: isDone || isActive ? 700 : 400,
              color: isDone || isActive ? accent : "var(--text3)",
              letterSpacing: "0.04em", whiteSpace: "nowrap",
              animation: isActive ? "railPulse 1.2s ease-in-out infinite" : "none",
              transition: "all 0.2s",
            }}>
              {isDone && (
                <svg width={7} height={7} viewBox="0 0 10 10" fill="none"
                  stroke={accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="2,5 4,7.5 8,2.5" />
                </svg>
              )}
              {isActive && (
                <span style={{ width: 5, height: 5, borderRadius: "50%",
                  background: accent, display: "inline-block", flexShrink: 0 }} />
              )}
              {step.label}
            </div>
            {i < STEPS.length - 1 && (
              <div style={{
                width: 8, height: 1, flexShrink: 0,
                background: isDone ? `${accent}44` : "rgba(255,255,255,0.1)",
                transition: "background 0.3s",
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}