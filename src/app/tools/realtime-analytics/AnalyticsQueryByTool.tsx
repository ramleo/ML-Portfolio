"use client";

import { RowBars } from "./AnalyticsBars";

interface QueryByToolItem {
  path: string;
  success_count: number;
  total_count: number;
  success_rate: number;
}

const PATH_NAMES: Record<string, string> = {
  "/tools/text-to-sql":         "Text → SQL",
  "/tools/automl":              "AutoML",
  "/tools/preprocessing":       "Preprocessing",
  "/tools/feature-engineering": "Feature Eng.",
  "/tools/feature-selection":   "Feature Sel.",
  "/tools/optuna":              "Optuna",
  "/tools/shap":                "SHAP",
  "/tools/drift":               "Drift",
  "/tools/ensemble":            "Ensemble",
  "/tools/pipeline-builder":    "Pipeline",
  "/tools/pipeline-cinema":          "Cinema",
  "/tools/document-intelligence":    "Doc Intel",
  "/eda":                       "EDA",
  "/vision":                    "Vision",
  "/":                          "ML Unified",
};

export function pathLabel(path: string): string {
  return PATH_NAMES[path] ?? (path.replace("/tools/", "").replace("/", "") || "Home");
}

interface Props {
  data: QueryByToolItem[];
  rangeLabel: string;
}

export default function AnalyticsQueryByTool({ data, rangeLabel }: Props) {
  if (data.length === 0) return null;

  // Success rate is a 0–100 SCORE, so the bars use the gradient fill (longer = toward
  // green = higher), matching the Conversion Funnel. The n/total is on hover.
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-glass)] backdrop-blur-[14px] p-5">
      <p className="text-[11px] font-bold font-mono text-[var(--text2)] uppercase tracking-[0.12em] mb-3">
        Query Success by Tool — {rangeLabel}
      </p>
      <RowBars score max={100} maxRows={data.length}
        data={data.map(t => ({
          label: pathLabel(t.path),
          value: t.success_rate,
          display: `${t.success_rate}%`,
          title: `${t.success_count}/${t.total_count} queries`,
        }))} />
    </div>
  );
}