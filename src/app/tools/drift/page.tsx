"use client";
import { useToolTracking } from "@/hooks/useAnalytics";

import { useState } from "react";
import ConstellationBackground from "@/components/ConstellationBackground";
import ToolsAIChat from "@/components/ToolsAIChat";
import ThemeToggle from "@/components/ThemeToggle";
import DriftRunner from "./DriftRunner";
import { DriftResult, FeatureDrift } from "./driftTypes";
import ToolGuideModal from "@/components/ToolGuideModal";
import { DRIFT_GUIDE } from "./userGuide";
import ToolBackNav from "@/components/ToolBackNav";

const ACCENT = "#a9652d";

function buildDriftContext(result: DriftResult | null): string {
  if (!result) {
    return "Data drift monitor comparing a new production batch CSV against the training baseline. No batch uploaded yet — ask the user to upload a CSV first.";
  }
  const pct = (n: number) => (n * 100).toFixed(1) + "%";
  const high   = result.features.filter(f => f.drift_level === "high");
  const medium = result.features.filter(f => f.drift_level === "medium");
  const low    = result.features.filter(f => f.drift_level === "low");

  const featLine = (f: FeatureDrift) => {
    const parts = [`${f.label ?? f.name}`, `type=${f.type}`, `drift=${pct(f.drift_score)}`, `PSI=${f.psi?.toFixed(3) ?? "n/a"}`];
    if (f.ks_stat != null) parts.push(`KS=${f.ks_stat.toFixed(3)}`);
    if (f.recent_mean != null) parts.push(`batch_mean=${f.recent_mean.toFixed(2)}`);
    if (f.recent_std  != null) parts.push(`batch_std=${f.recent_std.toFixed(2)}`);
    if (f.recent_pct?.length === 5) parts.push(`batch_range=[${f.recent_pct[0].toFixed(2)}, ${f.recent_pct[4].toFixed(2)}]`);
    if (f.ref_mean    != null) parts.push(`ref_mean=${f.ref_mean.toFixed(2)}`);
    if (f.ref_std     != null) parts.push(`ref_std=${f.ref_std.toFixed(2)}`);
    return `  - ${parts.join(", ")}`;
  };

  const lines = [
    `Tool: Data Drift Detection`,
    `Batch: ${result.label ?? result.filename ?? "unnamed"} | Rows: ${result.n_recent} | Overall drift: ${pct(result.overall_score)} (${result.overall_level})`,
    `Total features: ${result.features.length} | High drift: ${high.length} | Medium: ${medium.length} | Low: ${low.length}`,
    `Feature statistics (batch vs reference):`,
    ...result.features.map(featLine),
  ].filter(Boolean);

  return lines.join("\n");
}

export default function DriftPage() {
  useToolTracking("drift");
  const [driftResult, setDriftResult] = useState<DriftResult | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <div style={{ minHeight: "100vh", color: "var(--text)" }}>
      <ConstellationBackground />

      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "var(--bg-nav)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border)",
      }}>
        <div className="tool-header-row" style={{ maxWidth: 1280, margin: "0 auto", padding: "0 1.5rem", height: 60, display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <ToolBackNav toolId={"drift"} />
          <div style={{ width: 1, height: 18, background: "var(--border2)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
            <span style={{ fontSize: "0.62rem", fontWeight: 600, color: "#fb923c", textTransform: "uppercase", letterSpacing: "0.08em", padding: "2px 8px", borderRadius: 9999, background: "#fb923c14", border: "1px solid #fb923c30" }}>Monitor</span>
            <h1 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)", margin: 0 }}>Data Drift Detection</h1>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button onClick={() => setGuideOpen(true)}
              className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border transition-colors hover:bg-[rgba(var(--fg-rgb),0.05)] shrink-0"
              style={{ borderColor: `${ACCENT}35`, color: ACCENT }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 006.5 22H20V2H6.5A2.5 2.5 0 004 4.5v15z"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              User Guide
            </button>
            <ThemeToggle />
          </div>
        </div>
      </div>

      <ToolGuideModal open={guideOpen} onClose={() => setGuideOpen(false)}
        guide={DRIFT_GUIDE} title="Data Drift Detection" accent={ACCENT} toolId="drift" />

      <div role="main" style={{ maxWidth: 1280, margin: "0 auto", padding: "2.5rem 1.5rem 5rem" }}>
        <DriftRunner onResult={setDriftResult} />
      </div>

      <ToolsAIChat context={{
        accent: "#a9652d",
        tool: "Data Drift Detection",
        summary: buildDriftContext(driftResult),
      }} />
    </div>
  );
}