"use client";

import StageCard, { type StageStatus } from "@/components/pipeline/StageCard";
import WaterfallChart from "@/components/pipeline/WaterfallChart";

interface StageDef {
  id: string;
  title: string;
  accent: string;
  description: string;
  icon: React.ReactNode;
}

import type { WaterfallStageDef } from "./pipeline-types";
export type { WaterfallStageDef };

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

function RightArrow({ animated }: { animated: boolean }) {
  return (
    <>
      <style>{`
        @keyframes connector-pulse {
          0%   { opacity: 0.4; }
          50%  { opacity: 1; }
          100% { opacity: 0.4; }
        }
      `}</style>
      <svg
        width={24}
        height={24}
        viewBox="0 0 24 24"
        fill="none"
        stroke="rgba(56,189,248,0.6)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          flexShrink: 0,
          alignSelf: "center",
          animation: animated ? "connector-pulse 1.4s ease-in-out infinite" : "none",
        }}
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </>
  );
}

function DownArrow() {
  return (
    <div style={{ display: "flex", justifyContent: "center", margin: "0.5rem 0" }}>
      <svg
        width={24}
        height={24}
        viewBox="0 0 24 24"
        fill="none"
        stroke="rgba(56,189,248,0.6)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ flexShrink: 0 }}
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  );
}

export default function StageGrid({
  stages,
  stageResults,
  csvB64,
  runningStage,
  completedStages,
  onOpenStage,
  waterfallStages,
}: Props) {
  // Split stages into two rows: row1 = indices 0–3, row2 = indices 4–6
  const row1 = stages.slice(0, 4);
  const row2 = stages.slice(4, 7);

  const completedSet = new Set(completedStages);

  return (
    <div>
      {/* Row 1: preprocessing → feature-eng → feature-select → automl */}
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          gap: 0,
          flexWrap: "nowrap",
          overflowX: "auto",
        }}
      >
        {row1.map((stage, i) => {
          const status = getStatus(stage.id, !!csvB64, stageResults, runningStage);
          const metric = stageResults[stage.id]?.metric ?? null;
          const isLast = i === row1.length - 1;
          return (
            <div
              key={stage.id}
              style={{ display: "flex", alignItems: "center", flex: i < row1.length - 1 ? "1 1 0" : "none", minWidth: 200 }}
            >
              <div style={{ flex: 1 }}>
                <StageCard
                  id={stage.id}
                  title={stage.title}
                  description={stage.description}
                  icon={stage.icon}
                  accent={stage.accent}
                  status={status}
                  metric={metric}
                  onOpen={() => onOpenStage(stage.id)}
                  index={i}
                />
              </div>
              {!isLast && (
                <RightArrow animated={completedSet.has(stage.id)} />
              )}
            </div>
          );
        })}
      </div>

      {/* Down arrow between rows */}
      <DownArrow />

      {/* Row 2: optuna → shap → ensemble (centered) */}
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          gap: 0,
          flexWrap: "nowrap",
          justifyContent: "center",
          overflowX: "auto",
        }}
      >
        {row2.map((stage, i) => {
          const globalIndex = 4 + i;
          const status = getStatus(stage.id, !!csvB64, stageResults, runningStage);
          const metric = stageResults[stage.id]?.metric ?? null;
          const isLast = i === row2.length - 1;
          return (
            <div
              key={stage.id}
              style={{ display: "flex", alignItems: "center", flex: i < row2.length - 1 ? "1 1 0" : "none", minWidth: 200, maxWidth: 340 }}
            >
              <div style={{ flex: 1 }}>
                <StageCard
                  id={stage.id}
                  title={stage.title}
                  description={stage.description}
                  icon={stage.icon}
                  accent={stage.accent}
                  status={status}
                  metric={metric}
                  onOpen={() => onOpenStage(stage.id)}
                  index={globalIndex}
                />
              </div>
              {!isLast && (
                <RightArrow animated={completedSet.has(stage.id)} />
              )}
            </div>
          );
        })}
      </div>

      {waterfallStages.length >= 2 && (
        <WaterfallChart stages={waterfallStages} />
      )}
    </div>
  );
}