"use client";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import ConstellationBackground from "@/components/ConstellationBackground";
import ToolsAIChat from "@/components/ToolsAIChat";
import ThemeToggle from "@/components/ThemeToggle";
import { useToolTracking } from "@/hooks/useAnalytics";
import { toolBackHref, toolBackLabel } from "@/lib/toolNav";
import EdaRunner from "./EdaRunner";
import EdaUserGuideModal from "./EdaUserGuideModal";
import { EDA_GUIDE, EDA_SUGGESTIONS } from "./userGuide";
import type { EdaResult } from "./edaTypes";

const TOOL = "exploratory-data-analysis";

function buildContext(result: EdaResult | null): string {
  if (!result) {
    return "Exploratory data analysis on an uploaded CSV. Nothing uploaded yet — ask the user for a CSV first.";
  }
  const { overview, quality_score, readiness, columns, stats, low_variance_cols } = result;
  const col = (name: string) => {
    const c = columns.find((x) => x.name === name);
    const s = stats[name];
    const bits = [`${name}`, c?.is_numeric ? "numeric" : (c?.dtype ?? "text"),
                  `missing=${c?.missing_pct ?? "?"}%`, `unique=${c?.nunique ?? "?"}`];
    // Null means the statistic is undefined for this column, not zero. Saying
    // "std 0" to the assistant would have it explain a constant column that
    // is not constant.
    if (s) {
      bits.push(`mean=${s.mean ?? "undefined"}`, `std=${s.std ?? "undefined"}`,
                `skew=${s.skew ?? "undefined"}`, `outliers=${s.outliers}`);
    }
    return "  - " + bits.join(", ");
  };
  return [
    "Tool: Exploratory Data Analysis",
    `Shape: ${overview.rows} rows × ${overview.cols} columns | duplicates ${overview.duplicates} | missing ${overview.missing_pct}%`,
    `Quality score: ${quality_score}/100`,
    `Narrative: ${result.narrative}`,
    result.insights.length ? `Insights:\n${result.insights.map((i) => `  - [${i.type}] ${i.text}`).join("\n")}` : "",
    `Readiness: ${readiness.map((r) => `${r.name}=${r.verdict}`).join(", ")}`,
    low_variance_cols.length ? `Low variance: ${low_variance_cols.join(", ")}` : "",
    // What the reader can see on screen. Without this the assistant offers to
    // "run a PCA" on a page that is already showing one.
    `Charts on screen: distributions, box plots${result.mi ? ", mutual information" : ""}` +
      `${result.splom ? ", scatter matrix" : ""}${result.pca ? ", 3D PCA projection" : ""}` +
      `${result.correlations ? ", correlation heatmap" : ""}. A PDF and HTML report can be downloaded.`,
    "Columns:",
    ...columns.map((c) => col(c.name)),
  ].filter(Boolean).join("\n");
}

// The guide goes in `summary`, deliberately not in ToolsAIChat's `guide` slot.
// That slot switches the widget into help mode — it hides the document upload
// and Deep Search controls, and buildToolContext() rewrites the prompt into a
// help bot that declines "general ML theory". Both are wrong here: half of what
// people ask this assistant is what a skew of 3.4 means, and the upload button
// is how they bring a data dictionary along. So the assistant is given the
// guide as more context rather than as a narrower job. Costs about 1.5k tokens
// a message; worth it for an assistant that can explain its own panels.
function assistantContext(result: EdaResult | null): string {
  return `${buildContext(result)}\n\nUSER GUIDE for this tool:\n${EDA_GUIDE}`;
}

export default function ExploratoryDataAnalysisPage() {
  useToolTracking(TOOL);
  const router = useRouter();
  const handleBack = useCallback(() => router.push(toolBackHref(TOOL)), [router]);
  const [result, setResult] = useState<EdaResult | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <div style={{ minHeight: "100vh", color: "var(--text)" }}>
      <ConstellationBackground />

      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "var(--bg-nav)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border)",
      }}>
        <div className="tool-header-row" style={{ maxWidth: 1280, margin: "0 auto", padding: "0 1.5rem", height: 60, display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <button
            onClick={handleBack}
            style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: "0.78rem", fontWeight: 500, padding: 0, transition: "color 0.15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text3)")}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 12L4 7l5-5" />
            </svg>
            {toolBackLabel(TOOL)}
          </button>
          <div style={{ width: 1, height: 18, background: "var(--border2)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
            <span style={{ fontSize: "0.62rem", fontWeight: 600, color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.08em", padding: "2px 8px", borderRadius: 9999, background: "#38bdf814", border: "1px solid #38bdf830" }}>
              Profile
            </span>
            {/* A heading element, not a styled span. Six pages shipped with a
                span here and gave screen readers no document outline. */}
            <h1 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)", margin: 0 }}>
              Exploratory Data Analysis
            </h1>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.85rem" }}>
            <button
              onClick={() => setGuideOpen(true)}
              style={{ display: "flex", alignItems: "center", gap: "0.35rem", background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: "0.78rem", fontWeight: 500, padding: 0, transition: "color 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text3)")}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="8" cy="8" r="6.5" />
                <path d="M6.2 6.1a1.9 1.9 0 1 1 2.4 2.2c-.4.2-.6.5-.6.9v.4" />
                <path d="M8 12.1v.01" />
              </svg>
              User guide
            </button>
            <ThemeToggle />
          </div>
        </div>
      </div>

      <div role="main" style={{ maxWidth: 1280, margin: "0 auto", padding: "2.5rem 1.5rem 5rem" }}>
        <EdaRunner onResult={setResult} />
      </div>

      <EdaUserGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />

      <ToolsAIChat context={{
        accent: "#2d7ea9",
        tool: "Exploratory Data Analysis",
        summary: assistantContext(result),
        suggestions: EDA_SUGGESTIONS,
      }} />
    </div>
  );
}
