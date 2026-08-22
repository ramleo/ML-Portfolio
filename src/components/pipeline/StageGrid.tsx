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

import type { WaterfallStage } from "./pipeline-types";
export type { WaterfallStage };

interface Props {
  stages: StageDef[];
  stageResults: Record<string, { metric?: string; data: Record<string, unknown> }>;
  csvB64: string | null;
  runningStage: string | null;
  completedStages: string[];
  activeStage: string | null;
  onOpenStage: (id: string) => void;
  waterfallStages: WaterfallStage[];
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

function FlowConnector({ active }: { active: boolean }) {
  return (
    <div style={{ flexShrink: 0, alignSelf: "center", width: 32, position: "relative", height: 24, display: "flex", alignItems: "center" }}>
      <style>{`
        @keyframes flow-dot {
          0%   { left: 0px; opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { left: 28px; opacity: 0; }
        }
        @keyframes flow-dot-idle {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.5; }
        }
      `}</style>
      <div style={{
        position: "absolute", left: 0, right: 0, top: "50%", height: 1,
        background: active
          ? "linear-gradient(90deg, rgba(56,189,248,0.6), rgba(56,189,248,0.2))"
          : "var(--border)",
        transform: "translateY(-50%)",
      }} />
      <div style={{
        position: "absolute",
        top: "50%",
        transform: "translateY(-50%)",
        width: 5, height: 5,
        borderRadius: "50%",
        background: active ? "#38bdf8" : "var(--border2)",
        boxShadow: active ? "0 0 6px 2px rgba(56,189,248,0.7)" : "none",
        animation: active
          ? "flow-dot 1.2s ease-in-out infinite"
          : "flow-dot-idle 2s ease-in-out infinite",
      }} />
    </div>
  );
}

function DownArrow({ active }: { active: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", margin: "0.5rem 0" }}>
      <div style={{ position: "relative", width: 24, height: 32, display: "flex", justifyContent: "center" }}>
        <style>{`
          @keyframes flow-dot-down {
            0%   { top: 0px; opacity: 0; }
            10%  { opacity: 1; }
            90%  { opacity: 1; }
            100% { top: 28px; opacity: 0; }
          }
          @keyframes flow-dot-down-idle {
            0%, 100% { opacity: 0.2; }
            50% { opacity: 0.5; }
          }
        `}</style>
        <div style={{
          position: "absolute", top: 0, bottom: 0, left: "50%", width: 1,
          background: active
            ? "linear-gradient(180deg, rgba(56,189,248,0.6), rgba(56,189,248,0.2))"
            : "var(--border)",
          transform: "translateX(-50%)",
        }} />
        <div style={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          width: 5, height: 5,
          borderRadius: "50%",
          background: active ? "#38bdf8" : "var(--border2)",
          boxShadow: active ? "0 0 6px 2px rgba(56,189,248,0.7)" : "none",
          animation: active
            ? "flow-dot-down 1.2s ease-in-out infinite"
            : "flow-dot-down-idle 2s ease-in-out infinite",
        }} />
      </div>
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
                <FlowConnector active={completedSet.has(stage.id)} />
              )}
            </div>
          );
        })}
      </div>

      {/* Down arrow between rows */}
      <DownArrow active={row1.some((s) => completedSet.has(s.id))} />

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
                <FlowConnector active={completedSet.has(stage.id)} />
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