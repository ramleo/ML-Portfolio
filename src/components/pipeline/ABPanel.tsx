"use client";

import StageCard from "@/components/pipeline/StageCard";
import ComparisonPanel from "@/components/pipeline/ComparisonPanel";

interface StageDef {
  id: string;
  title: string;
  accent: string;
  description: string;
  icon: React.ReactNode;
}

interface Props {
  stages: StageDef[];
  csvB64: string | null;
  abResultA: { score: number; winner: string; time_ms: number } | null;
  abResultB: { score: number; winner: string; time_ms: number } | null;
  abDiff: number;
  abWinner: "a" | "b" | "tie" | null;
  abRunning: boolean;
  onRunComparison: () => void;
  icons: Record<string, React.ReactNode>;
}

export default function ABPanel({
  stages,
  csvB64,
  abResultA,
  abResultB,
  abDiff,
  abWinner,
  abRunning,
  onRunComparison,
}: Props) {
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "2rem" }}>
        {["Pipeline A", "Pipeline B"].map((label, pi) => (
          <div key={label}>
            <div style={{
              fontSize: "0.78rem",
              fontWeight: 700,
              color: pi === 0 ? "#38bdf8" : "#a78bfa",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: "0.75rem",
            }}>
              {label}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {stages.slice(0, 4).map((stage, i) => (
                <StageCard
                  key={`${pi}-${stage.id}`}
                  id={stage.id}
                  title={stage.title}
                  description={stage.description}
                  icon={stage.icon}
                  accent={stage.accent}
                  status={csvB64 ? "ready" : "locked"}
                  onOpen={() => {}}
                  index={i}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {csvB64 && (
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <button
            onClick={onRunComparison}
            disabled={abRunning}
            style={{
              padding: "0.7rem 2rem",
              borderRadius: 10,
              background: "#a78bfa",
              color: "#000",
              fontWeight: 700,
              fontSize: "0.88rem",
              border: "none",
              cursor: abRunning ? "not-allowed" : "pointer",
              opacity: abRunning ? 0.6 : 1,
            }}
          >
            {abRunning ? "Running Comparison..." : "Run A/B Comparison"}
          </button>
        </div>
      )}

      <ComparisonPanel
        resultA={abResultA}
        resultB={abResultB}
        difference={abDiff}
        winner={abWinner}
        isRunning={abRunning}
      />
    </div>
  );
}