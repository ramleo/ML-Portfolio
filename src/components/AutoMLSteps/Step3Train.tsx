"use client";

import { ACCENT } from "@/lib/automlUtils";
import { ProgressBar } from "./AutoMLCharts";

interface Props {
  pct:           number;
  statusMsg:     string;
  selectedModels: Set<string>;
  analyzedRows?: number;
  trainingEst:   string;
}

export default function Step3Train({ pct, statusMsg, selectedModels, analyzedRows, trainingEst }: Props) {
  return (
    <div>
      <p style={{ fontSize: "0.88rem", color: "var(--text2)", marginBottom: "0.5rem", lineHeight: 1.6 }}>
        Running 5-fold cross-validation on {selectedModels.size} algorithm{selectedModels.size !== 1 ? "s" : ""}
        {analyzedRows != null
          ? <> across {analyzedRows.toLocaleString()} rows. Estimated time: <span style={{ color: ACCENT, fontWeight: 600 }}>{trainingEst}</span> (varies with server load).</>
          : ". This may take a few minutes."}
      </p>
      <ProgressBar pct={pct} label={statusMsg} />
      <div style={{ marginTop: "1.5rem", display: "grid", gridTemplateColumns: `repeat(${Math.min(selectedModels.size, 4)}, 1fr)`, gap: "0.5rem" }}>
        {[...selectedModels].map(algo => (
          <div key={algo} style={{ padding: "0.6rem", borderRadius: 10, textAlign: "center" as const, background: `${ACCENT}08`, border: `1px solid ${ACCENT}22` }}>
            <div style={{ fontSize: "0.68rem", color: "var(--text2)", fontWeight: 500 }}>{algo}</div>
            <div style={{ fontSize: "0.6rem", color: "var(--text3)", marginTop: "0.2rem" }}>competing...</div>
          </div>
        ))}
      </div>
    </div>
  );
}