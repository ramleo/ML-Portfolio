"use client";

import { type FeatureImportanceItem } from "@/lib/automlUtils";
import { FeatureImportanceChart } from "./AutoMLCharts";

interface Props {
  features: FeatureImportanceItem[];
}

export function FeatureImportanceSection({ features }: Props) {
  return (
    <div style={{ marginTop: "1.25rem" }}>
      <div style={{ fontSize: "0.72rem", color: "var(--text3)", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: "0.6rem" }}>
        Driving features
      </div>
      <FeatureImportanceChart features={features} />
      <details style={{ marginTop: "0.5rem", fontSize: "0.78rem", color: "#6b7280", cursor: "pointer" }}>
        <summary style={{ userSelect: "none" }}>
          Why only {Math.min(features.length, 7)} features shown?
        </summary>
        <p style={{ marginTop: "0.3rem", paddingLeft: "1rem" }}>
          The chart shows the top {Math.min(features.length, 7)} features by importance score. Features below this threshold have minimal predictive contribution and are omitted to keep the view readable.{features.length <= 7 ? " All features are shown." : ` ${features.length - 7} lower-ranked feature${features.length - 7 > 1 ? "s are" : " is"} hidden.`}
        </p>
      </details>
    </div>
  );
}
