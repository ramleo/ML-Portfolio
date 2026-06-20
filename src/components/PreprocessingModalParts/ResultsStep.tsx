"use client";

import ComparisonView from "./ComparisonView";
import { ACCENT, CARD_BG, type AnalyzeResult, type PrepResult } from "@/lib/preprocessingModalUtils";

interface ResultsStepProps {
  result: PrepResult;
  analyzed: AnalyzeResult | null;
  onDownload: () => void;
  onReset: () => void;
}

export default function ResultsStep({ result, analyzed, onDownload, onReset }: ResultsStepProps) {
  const stats = [
    { label: "Rows",     before: result.rows_before,     after: result.rows_after },
    { label: "Columns",  before: result.cols_before,     after: result.cols_after },
    { label: "Features", before: result.features_before, after: result.features_after },
    { label: "Missing",  before: "—" as string | number, after: result.total_missing },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        {stats.map(s => {
          const changed  = s.before !== s.after && s.before !== "—";
          const improved = typeof s.before === "number" && typeof s.after === "number"
            ? (s.label === "Features" ? s.after >= s.before : s.after <= s.before) : true;
          return (
            <div key={s.label} style={{ padding: "0.85rem 1rem", borderRadius: 12, background: CARD_BG, border: "1px solid var(--border)" }}>
              <div style={{ fontSize: "0.65rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.4rem" }}>
                {s.label}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "0.82rem", color: "var(--text3)" }}>{s.before}</span>
                <span style={{ color: "var(--border2)" }}>→</span>
                <span style={{ fontSize: "1rem", fontWeight: 700, color: changed ? (improved ? "#4ade80" : "#f87171") : ACCENT }}>
                  {s.after}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {analyzed && result.columns?.length > 0 && (
        <ComparisonView before={analyzed} result={result} />
      )}

      <button onClick={onDownload} style={{
        padding: "0.75rem 1.5rem", borderRadius: 9999, fontSize: "0.85rem", fontWeight: 700,
        background: ACCENT, color: "#0b1120", border: "none", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Download {result.preprocessed_filename}
      </button>

      <button onClick={onReset} style={{
        padding: "0.55rem 1.2rem", borderRadius: 9999, fontSize: "0.8rem",
        background: "none", border: "1px solid var(--border2)", color: "var(--text3)", cursor: "pointer",
      }}>
        Process Another Dataset
      </button>
    </div>
  );
}