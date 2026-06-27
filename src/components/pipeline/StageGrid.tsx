"use client";

import { useRef } from "react";
import StageCard, { type StageStatus } from "@/components/pipeline/StageCard";
import CircuitBoard from "@/components/pipeline/CircuitBoard";
import WaterfallChart from "@/components/pipeline/WaterfallChart";

interface StageDef {
  id: string;
  title: string;
  accent: string;
  description: string;
  icon: React.ReactNode;
}

interface WaterfallStageDef {
  id: string;
  label: string;
  scoreDelta: number;
  accent: string;
}

interface Props {
  stages: StageDef[];
  stageResults: Record<string, { metric?: string; data: Record<string, unknown> }>;
  csvB64: string | null;
  runningStage: string | null;
  completedStages: string[];
  activeStage: string | null;
  onOpenStage: (id: string) => void;
  waterfallStages: WaterfallStageDef[];
  icons: Record<string, React.ReactNode>;
}

const LOCKED_UNTIL_AUTOML = new Set(["optuna", "shap", "ensemble"]);

function getStatus(
  id: string,
  hasCsv: boolean,
  stageResults: Record<string, unknown>,
  runningStage: string | null
): StageStatus {
  if (!hasCsv) return "locked";
  if (runningStage === id) return "running";
  if (stageResults[id]) return "done";
  if (LOCKED_UNTIL_AUTOML.has(id) && !stageResults["automl"]) return "locked";
  return "ready";
}

export default function StageGrid({
  stages,
  stageResults,
  csvB64,
  runningStage,
  completedStages,
  activeStage,
  onOpenStage,
  waterfallStages,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const r0 = useRef<HTMLDivElement>(null);
  const r1 = useRef<HTMLDivElement>(null);
  const r2 = useRef<HTMLDivElement>(null);
  const r3 = useRef<HTMLDivElement>(null);
  const r4 = useRef<HTMLDivElement>(null);
  const r5 = useRef<HTMLDivElement>(null);
  const r6 = useRef<HTMLDivElement>(null);
  const cardRefs = [r0, r1, r2, r3, r4, r5, r6];

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <CircuitBoard
        cardRefs={cardRefs}
        completedStages={completedStages}
        activeStage={activeStage}
        containerRef={containerRef}
      />
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
        gap: "1.25rem",
        position: "relative",
        zIndex: 2,
      }}>
        {stages.map((stage, i) => {
          const status = getStatus(stage.id, !!csvB64, stageResults, runningStage);
          const metric = stageResults[stage.id]?.metric ?? null;
          return (
            <StageCard
              key={stage.id}
              id={stage.id}
              title={stage.title}
              description={stage.description}
              icon={stage.icon}
              accent={stage.accent}
              status={status}
              metric={metric}
              onOpen={() => onOpenStage(stage.id)}
              index={i}
              cardRef={cardRefs[i]}
            />
          );
        })}
      </div>
      {waterfallStages.length >= 2 && (
        <WaterfallChart stages={waterfallStages} />
      )}
    </div>
  );
}