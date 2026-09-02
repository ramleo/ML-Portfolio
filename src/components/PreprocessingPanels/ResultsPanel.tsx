"use client";

import MouseTiltCard from "@/components/MouseTiltCard";
import { AnalyzeResult, PrepResult } from "@/lib/preprocessingAlgorithms";
import { QualityScoreCard } from "./QualityScoreCard";
import { ComparisonView }   from "./ComparisonView";

const ACCENT  = "#22d3ee";
const CARD_BG = "rgba(17,24,39,0.80)";

export interface ResultsPanelProps {
  result: PrepResult;
  analyzed: AnalyzeResult | null;
  beforeScore: number;
  afterScore: number;
  onDownload: () => void;
  onPassToAutoML: () => void;
  onBackToConfigure: () => void;
  onReset: () => void;
}

export function ResultsPanel({
  result, analyzed, beforeScore, afterScore,
  onDownload, onPassToAutoML, onBackToConfigure, onReset,
}: ResultsPanelProps) {
  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text)", margin: "0 0 0.25rem", letterSpacing: "-0.02em" }}>Preprocessing Complete</h2>
        <p style={{ fontSize: "0.82rem", color: "var(--text3)", margin: 0 }}>{result.preprocessed_filename}</p>
      </div>

      <QualityScoreCard before={beforeScore} after={afterScore} />

      {/* Summary cards */}
      <div data-wt="prep-summary" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem", marginBottom: "1.25rem" }}>
        {[
          { label: "Rows",     before: result.rows_before,     after: result.rows_after },
          { label: "Columns",  before: result.cols_before,     after: result.cols_after },
          { label: "Features", before: result.features_before, after: result.features_after },
          { label: "Missing",  before: "—" as string | number, after: result.total_missing },
        ].map(s => {
          const changed  = s.before !== s.after && s.before !== "—";
          const improved = typeof s.before === "number" && typeof s.after === "number"
            ? (s.label === "Features" ? s.after >= s.before : s.after <= s.before) : true;
          return (
            <MouseTiltCard key={s.label} style={{ padding: "0.85rem 1rem", borderRadius: 12, background: CARD_BG, border: "1px solid var(--border)" }}>
              <div style={{ fontSize: "0.65rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.4rem" }}>{s.label}</div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "0.82rem", color: "var(--text3)" }}>{s.before}</span>
                <span style={{ color: "var(--border2)" }}>→</span>
                <span style={{ fontSize: "1rem", fontWeight: 700, color: changed ? (improved ? "#4ade80" : "#f87171") : ACCENT }}>{s.after}</span>
              </div>
            </MouseTiltCard>
          );
        })}
      </div>

      {analyzed && result.columns?.length > 0 && (
        <div data-wt="prep-columns">
        <ComparisonView before={analyzed} result={result} />
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <button onClick={onDownload} data-wt="prep-download"
          style={{ flex: 1, padding: "0.75rem 1.5rem", borderRadius: 9999, fontSize: "0.85rem", fontWeight: 700, background: ACCENT, color: "#0b1120", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", transition: "opacity 0.15s, box-shadow 0.15s, transform 0.15s" }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 0 24px ${ACCENT}66`; e.currentTarget.style.transform = "translateY(-1px)"; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "translateY(0)"; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download {result.preprocessed_filename}
        </button>
        <button onClick={onPassToAutoML}
          style={{ padding: "0.75rem 1.5rem", borderRadius: 9999, fontSize: "0.85rem", fontWeight: 700, background: "rgba(129,140,248,0.15)", border: "1px solid rgba(129,140,248,0.4)", color: "#818cf8", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem", transition: "box-shadow 0.15s, transform 0.15s" }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 0 24px rgba(129,140,248,0.5)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "translateY(0)"; }}
        >
          Train with AutoML
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 10L10 2M10 2H5M10 2v5" />
          </svg>
        </button>
        <button onClick={onBackToConfigure}
          style={{ padding: "0.75rem 1.5rem", borderRadius: 9999, fontSize: "0.85rem", fontWeight: 600, background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "var(--text2)", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.45rem", transition: "border-color 0.15s, box-shadow 0.15s, transform 0.15s" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.35)"; e.currentTarget.style.boxShadow = "0 0 16px rgba(255,255,255,0.08)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "translateY(0)"; }}
        >
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 12L4 7l5-5" />
          </svg>
          Back to Configure
        </button>
      </div>
      <div style={{ marginTop: "0.75rem", textAlign: "center" }}>
        <button onClick={onReset}
          style={{ padding: "0.55rem 1.2rem", borderRadius: 9999, fontSize: "0.8rem", background: "none", border: "1px solid var(--border2)", color: "var(--text3)", cursor: "pointer", transition: "border-color 0.15s, box-shadow 0.15s" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--text3)"; e.currentTarget.style.boxShadow = "0 0 12px rgba(255,255,255,0.06)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border2)"; e.currentTarget.style.boxShadow = "none"; }}
        >
          Process Another Dataset
        </button>
      </div>
    </div>
  );
}