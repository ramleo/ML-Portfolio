"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import ConstellationBackground from "@/components/ConstellationBackground";
import ToolsAIChat from "@/components/ToolsAIChat";
import DriftRunner from "./DriftRunner";
import { DriftResult } from "./driftTypes";

function buildDriftContext(result: DriftResult | null): string {
  if (!result) {
    return "Data drift monitor comparing a new production batch CSV against the training baseline. No batch uploaded yet — ask the user to upload a CSV first.";
  }
  const pct = (n: number) => (n * 100).toFixed(1) + "%";
  const high   = result.features.filter(f => f.drift_level === "high");
  const medium = result.features.filter(f => f.drift_level === "medium");
  const low    = result.features.filter(f => f.drift_level === "low");

  const featLine = (f: FeatureDrift) =>
    `${f.label ?? f.name} (${f.type}, drift=${pct(f.drift_score)}, PSI=${f.psi?.toFixed(3) ?? "n/a"}${f.ks_stat != null ? `, KS=${f.ks_stat.toFixed(3)}` : ""})`;

  const lines = [
    `Tool: Data Drift Detection`,
    `Batch: ${result.label ?? result.filename ?? "unnamed"} | Rows: ${result.n_recent} | Overall drift: ${pct(result.overall_score)} (${result.overall_level})`,
    `Total features: ${result.features.length} | High drift: ${high.length} | Medium: ${medium.length} | Low: ${low.length}`,
    high.length   ? `HIGH drift features: ${high.map(featLine).join("; ")}` : "",
    medium.length ? `MEDIUM drift features: ${medium.map(featLine).join("; ")}` : "",
    low.length    ? `LOW drift features: ${low.map(featLine).join("; ")}` : "",
  ].filter(Boolean);

  return lines.join("\n");
}

export default function DriftPage() {
  const router = useRouter();
  const handleBack = useCallback(() => router.push("/#capabilities"), [router]);
  const [driftResult, setDriftResult] = useState<DriftResult | null>(null);

  return (
    <div style={{ minHeight: "100vh", color: "var(--text)" }}>
      <ConstellationBackground />

      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(6,13,26,0.92)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 1.5rem", height: 60, display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <button
            onClick={handleBack}
            style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: "0.78rem", fontWeight: 500, padding: 0, transition: "color 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text3)")}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 12L4 7l5-5" />
            </svg>
            Home
          </button>
          <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.12)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
            <span style={{ fontSize: "0.62rem", fontWeight: 600, color: "#fb923c", textTransform: "uppercase", letterSpacing: "0.08em", padding: "2px 8px", borderRadius: 9999, background: "#fb923c14", border: "1px solid #fb923c30" }}>Monitor</span>
            <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>Data Drift Detection</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "2.5rem 1.5rem 5rem" }}>
        <DriftRunner onResult={setDriftResult} />
      </div>

      <ToolsAIChat context={{
        tool: "Data Drift Detection",
        summary: buildDriftContext(driftResult),
      }} />
    </div>
  );
}