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
          Top {Math.min(features.length, 7)} features ranked by importance. Lower-ranked features add noise without improving explainability. Select fewer input columns to see all.
        </p>
      </details>
    </div>
  );
}
