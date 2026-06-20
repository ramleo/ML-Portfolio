"use client";

import type { ColInfo } from "@/lib/fsAlgorithms";
import RepulsionCard from "@/components/RepulsionCard";

const CARD: React.CSSProperties = {
  background: "rgba(14,22,40,0.72)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 12,
  padding: "1.25rem 1.4rem",
};

interface FSExcludePanelProps {
  cols: ColInfo[];
  targetCol: string;
  excludedCols: string[];
  excludeOpen: boolean;
  setExcludeOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setExcludedCols: React.Dispatch<React.SetStateAction<string[]>>;
}

export default function FSExcludePanel({
  cols,
  targetCol,
  excludedCols,
  excludeOpen,
  setExcludeOpen,
  setExcludedCols,
}: FSExcludePanelProps) {
  return (
    <RepulsionCard style={{ ...CARD }}>
      <button
        onClick={() => setExcludeOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: "0.4rem",
          background: "none", border: "none", cursor: "pointer", padding: 0,
          fontSize: "0.78rem", fontWeight: 700, color: "var(--text3)",
          textTransform: "uppercase", letterSpacing: "0.07em",
        }}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"
          style={{ transform: excludeOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s", flexShrink: 0 }}
        >
          <path d="M3 2l4 3-4 3z" />
        </svg>
        Exclude columns from selection
        {excludedCols.length > 0 && (
          <span style={{ marginLeft: "0.35rem", fontSize: "0.68rem", color: "#f87171", fontWeight: 600 }}>
            ({excludedCols.length} excluded)
          </span>
        )}
      </button>
      {excludeOpen && (
        <div style={{ marginTop: "0.75rem", display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
          {cols.map(c => {
            const isTarget = c.name === targetCol;
            const isExcluded = excludedCols.includes(c.name);
            return (
              <button
                key={c.name}
                onClick={() => {
                  if (isTarget) return;
                  setExcludedCols(prev =>
                    prev.includes(c.name) ? prev.filter(x => x !== c.name) : [...prev, c.name]
                  );
                }}
                title={isTarget ? "Target column — always excluded from features" : isExcluded ? "Click to include" : "Click to exclude"}
                style={{
                  fontSize: "0.72rem", fontWeight: 600,
                  padding: "3px 10px", borderRadius: 9999,
                  border: `1px solid ${isExcluded ? "#f8717144" : isTarget ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.15)"}`,
                  background: isExcluded ? "rgba(248,113,113,0.1)" : isTarget ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.06)",
                  color: isExcluded ? "#f87171" : isTarget ? "var(--text3)" : "var(--text)",
                  textDecoration: isExcluded ? "line-through" : "none",
                  cursor: isTarget ? "default" : "pointer",
                  opacity: isTarget ? 0.5 : 1,
                  transition: "all 0.15s",
                }}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      )}
    </RepulsionCard>
  );
}