"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ConstellationBackground from "@/components/ConstellationBackground";
import ToolsAIChat from "@/components/ToolsAIChat";
import MouseTiltCard from "@/components/MouseTiltCard";
import NumericTransformsPanel from "@/components/FEPanels/NumericTransformsPanel";
import CategoricalPanel from "@/components/FEPanels/CategoricalPanel";
import SidebarPanel from "@/components/FEPanels/SidebarPanel";
import ResultsPanel from "@/components/FEPanels/ResultsPanel";
import LDAPanel from "@/components/FEPanels/LDAPanel";
import FEUploadInfo from "@/components/FEPanels/FEUploadInfo";
import {
  ColInfo, FeResult, Step,
  serializeCSV,
} from "@/lib/feAlgorithms";
import { useFELDA } from "@/hooks/useFELDA";
import { useFETransforms } from "@/hooks/useFETransforms";
import { useFEAISuggest } from "@/hooks/useFEAISuggest";
import { useFEFileLoad } from "@/hooks/useFEFileLoad";

const ACCENT = "#38bdf8";

const CARD: React.CSSProperties = {
  background: "rgba(14,22,40,0.72)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 12,
  padding: "1.25rem 1.4rem",
};

function Pill({ label, color = ACCENT }: { label: string; color?: string }) {
  return (
    <span style={{ fontSize: "0.65rem", fontWeight: 600, color, background: `${color}14`, border: `1px solid ${color}30`, borderRadius: 9999, padding: "1px 8px" }}>
      {label}
    </span>
  );
}

function ActionBtn({ onClick, disabled = false, children, secondary = false }: {
  onClick: () => void; disabled?: boolean; children: React.ReactNode; secondary?: boolean;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        padding: "0.6rem 1.4rem", borderRadius: 9999,
        border: secondary ? "1px solid rgba(255,255,255,0.15)" : "none",
        background: disabled ? "rgba(255,255,255,0.06)" : secondary ? "transparent" : ACCENT,
        color: disabled ? "var(--text3)" : secondary ? "var(--text2)" : "#000",
        fontWeight: 600, fontSize: "0.82rem", cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.15s",
        boxShadow: hov && !disabled && !secondary ? `0 0 18px ${ACCENT}66` : "none",
        opacity: hov && !disabled ? 0.9 : 1,
      }}
    >{children}</button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function FeatureEngineeringPage() {
  const router  = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep]         = useState<Step>("upload");
  const [cols, setCols]         = useState<ColInfo[]>([]);
  const [rawRows, setRawRows]   = useState<string[][]>([]);
  const [filename, setFilename] = useState("");
  const [result, setResult]     = useState<FeResult | null>(null);
  const [error, setError]       = useState("");

  // Numeric column transforms
  const [colTransforms, setColTransforms] = useState<Record<string, string[]>>({});

  // Date extraction
  const [dateCols, setDateCols]   = useState<string[]>([]);
  const [dateParts, setDateParts] = useState<string[]>(["year", "month", "day", "dayofweek"]);

  // Interaction terms (A × B)
  const [interactions, setInteractions] = useState<[string, string][]>([]);
  const [interactA, setInteractA]       = useState("");
  const [interactB, setInteractB]       = useState("");

  // Polynomial cross-terms
  const [polyCols, setPolyCols] = useState<string[]>([]);

  // Ratio features (A ÷ B)
  const [ratios, setRatios] = useState<[string, string][]>([]);
  const [ratioA, setRatioA] = useState("");
  const [ratioB, setRatioB] = useState("");

  // Frequency encoding
  const [freqCols, setFreqCols] = useState<string[]>([]);

  // Time-series features
  const [sortCol, setSortCol]   = useState("");
  const [lagCols, setLagCols]   = useState<string[]>([]);
  const [lagN, setLagN]         = useState(1);
  const [lagDiff, setLagDiff]   = useState(false);
  const [rollCols, setRollCols] = useState<string[]>([]);
  const [rollN, setRollN]       = useState(3);
  const [rollAgg, setRollAgg]   = useState("mean");

  // Cyclical encoding (col → period)
  const [cyclicCols, setCyclicCols] = useState<Record<string, number>>({});

  // Row-wise aggregates
  const [rowAggCols, setRowAggCols] = useState<string[]>([]);
  const [rowAggFn, setRowAggFn]     = useState("mean");

  const numCols = cols.filter(c => c.isNumeric);
  const catCols = cols.filter(c => !c.isNumeric);

  // LDA Topic Model
  const {
    ldaTextCol: ldaCol, setLdaTextCol: setLdaCol,
    ldaNTopics, setLdaNTopics,
    ldaNIter, setLdaNIter,
    ldaOpts, setLdaOpts,
    ldaResult,
    ldaRunning,
    ldaError,
    handleRunLDA,
    resetLDA,
  } = useFELDA(cols);

  // AI Suggest
  const { aiSuggest, aiSuggestLoading, aiSuggestError, setAiSuggestError } = useFEAISuggest({
    numCols,
    rawRows,
    setColTransforms,
  });

  // Apply all transforms
  const { applyAllTransforms } = useFETransforms({
    rawRows, cols, colTransforms, dateCols, dateParts, interactions, polyCols,
    freqCols, ratios, sortCol, lagCols, lagN, lagDiff, rollCols, rollN, rollAgg,
    cyclicCols, rowAggCols, rowAggFn, ldaResult,
    setStep, setResult, setError,
  });

  useEffect(() => {
    if (step === "configure") document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [step]);

  // ── File handling ──────────────────────────────────────────────────────────

  const { handleFile, handleDrop } = useFEFileLoad({
    setError, setFilename, setRawRows, setCols, setColTransforms,
    setDateCols, setInteractions, setPolyCols, setRatios, setRatioA, setRatioB,
    setFreqCols, setSortCol, setLagCols, setLagN, setLagDiff,
    setRollCols, setRollN, setRollAgg, setCyclicCols,
    setRowAggCols, setRowAggFn, resetLDA, setStep,
  });

  // ── Config helpers ─────────────────────────────────────────────────────────

  const toggleTransform = (col: string, key: string) => {
    setColTransforms(prev => {
      const cur = prev[col] ?? [];
      return { ...prev, [col]: cur.includes(key) ? cur.filter(k => k !== key) : [...cur, key] };
    });
  };

  const toggleAllTransform = (key: string, on: boolean) => {
    setColTransforms(prev => {
      const next = { ...prev };
      for (const col of numCols) {
        const cur = next[col.name] ?? [];
        if (on && !cur.includes(key)) next[col.name] = [...cur, key];
        if (!on) next[col.name] = cur.filter(k => k !== key);
      }
      return next;
    });
  };

  const addInteraction = () => {
    if (!interactA || !interactB || interactA === interactB) return;
    const pair: [string, string] = [interactA, interactB];
    if (interactions.some(([a, b]) => a === pair[0] && b === pair[1])) return;
    setInteractions(prev => [...prev, pair]);
    setInteractA(""); setInteractB("");
  };

  const addRatio = () => {
    if (!ratioA || !ratioB || ratioA === ratioB) return;
    const pair: [string, string] = [ratioA, ratioB];
    if (ratios.some(([a, b]) => a === pair[0] && b === pair[1])) return;
    setRatios(prev => [...prev, pair]);
    setRatioA(""); setRatioB("");
  };

  const downloadResult = useCallback(() => {
    if (!result) return;
    const csvText = serializeCSV(result.csv);
    const blob = new Blob([csvText], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `engineered_${filename}`; a.click();
    URL.revokeObjectURL(url);
  }, [result, filename]);

  const totalSelected =
    Object.values(colTransforms).reduce((s, v) => s + v.length, 0) +
    dateCols.length * dateParts.length +
    interactions.length +
    ratios.length +
    (polyCols.length >= 2 ? polyCols.length * (polyCols.length - 1) / 2 : 0) +
    freqCols.length +
    (sortCol ? lagCols.length * (lagDiff ? 2 : 1) + rollCols.length : 0) +
    Object.keys(cyclicCols).length * 2 +
    (rowAggCols.length >= 2 ? 1 : 0) +
    (ldaResult ? ldaResult.nTopics : 0);

  const outerStyle: React.CSSProperties = step === "configure"
    ? { height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", color: "var(--text)" }
    : { minHeight: "100vh", color: "var(--text)" };

  return (
    <div style={outerStyle}>
      <ConstellationBackground />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Header ── */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, flexShrink: 0, background: "rgba(6,13,26,0.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ maxWidth: 1060, margin: "0 auto", padding: "0 1.5rem", height: 60, display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <button onClick={() => router.push("/#capabilities")} style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: "0.78rem", fontWeight: 500, padding: 0, transition: "color 0.15s" }} onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")} onMouseLeave={e => (e.currentTarget.style.color = "var(--text3)")}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12L4 7l5-5" /></svg>
            Portfolio
          </button>
          <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.12)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
            <Pill label="Step 3" />
            <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>Feature Engineering</span>
            <span style={{ fontSize: "0.7rem", color: "#34d399", background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)", borderRadius: 9999, padding: "1px 8px" }}>runs in browser</span>
          </div>
          {step === "configure" && (
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text3)" }}>{totalSelected} transform{totalSelected !== 1 ? "s" : ""} selected</span>
              <ActionBtn onClick={applyAllTransforms} disabled={totalSelected === 0}>Apply Transforms</ActionBtn>
            </div>
          )}
          {step === "results" && (
            <div style={{ marginLeft: "auto", display: "flex", gap: "0.75rem" }}>
              <ActionBtn secondary onClick={() => setStep("configure")}>Back to Configure</ActionBtn>
              <ActionBtn onClick={downloadResult}>Download CSV</ActionBtn>
            </div>
          )}
        </div>
      </div>

      {/* ── Upload ── */}
      {step === "upload" && (
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "4rem 1.5rem" }}>
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text)", marginBottom: "0.5rem" }}>Feature Engineering</div>
            <div style={{ fontSize: "0.87rem", color: "var(--text3)", lineHeight: 1.6 }}>Upload a CSV. Apply log transforms, date extraction, interaction terms, and more — all processed in your browser, nothing sent to any server.</div>
          </div>
          <MouseTiltCard onDrop={handleDrop} onDragOver={e => e.preventDefault()} onClick={() => fileRef.current?.click()}
            style={{ ...CARD, textAlign: "center", padding: "3rem 2rem", cursor: "pointer", borderStyle: "dashed", borderColor: `${ACCENT}40`, transition: "border-color 0.2s, box-shadow 0.2s" }}
          >
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke={ACCENT} strokeWidth="1.5" style={{ display: "block", margin: "0 auto 1rem", opacity: 0.7 }}>
              <path d="M20 26V14M14 20l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="6" y="6" width="28" height="28" rx="6" />
            </svg>
            <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text)", marginBottom: "0.3rem" }}>Drop CSV here or click to browse</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text3)" }}>Processed entirely in your browser — no upload to any server</div>
          </MouseTiltCard>
          <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          {error && <div style={{ marginTop: "1rem", color: "#f87171", fontSize: "0.8rem", textAlign: "center" }}>{error}</div>}
        </div>
      )}

      {/* ── Configure ── */}
      {step === "configure" && (
        <div style={{ flex: 1, overflow: "hidden", display: "flex", gap: "1rem", padding: "0.5rem 1.5rem 0", width: "100%" }}>
          <SidebarPanel
            filename={filename}
            rawRows={rawRows}
            cols={cols}
            numCols={numCols}
            interactions={interactions}
            interactA={interactA}
            interactB={interactB}
            onSetInteractA={setInteractA}
            onSetInteractB={setInteractB}
            onAddInteraction={addInteraction}
            onRemoveInteraction={i => setInteractions(prev => prev.filter((_, j) => j !== i))}
            ratios={ratios}
            ratioA={ratioA}
            ratioB={ratioB}
            onSetRatioA={setRatioA}
            onSetRatioB={setRatioB}
            onAddRatio={addRatio}
            onRemoveRatio={i => setRatios(prev => prev.filter((_, j) => j !== i))}
            polyCols={polyCols}
            onTogglePolyCols={col => setPolyCols(prev => prev.includes(col) ? prev.filter(x => x !== col) : [...prev, col])}
            cyclicCols={cyclicCols}
            onToggleCyclicCol={col => setCyclicCols(prev => {
              if (prev[col] !== undefined) { const n = { ...prev }; delete n[col]; return n; }
              return { ...prev, [col]: 12 };
            })}
            onSetCyclicPeriod={(col, period) => setCyclicCols(prev => ({ ...prev, [col]: period }))}
            rowAggCols={rowAggCols}
            rowAggFn={rowAggFn}
            onToggleRowAggCol={col => setRowAggCols(prev => prev.includes(col) ? prev.filter(x => x !== col) : [...prev, col])}
            onSetRowAggFn={setRowAggFn}
            sortCol={sortCol}
            onSetSortCol={col => { setSortCol(col); setLagCols([]); setRollCols([]); }}
            lagCols={lagCols}
            lagN={lagN}
            lagDiff={lagDiff}
            onToggleLagCol={col => setLagCols(prev => prev.includes(col) ? prev.filter(x => x !== col) : [...prev, col])}
            onSetLagN={setLagN}
            onToggleLagDiff={() => setLagDiff(p => !p)}
            rollCols={rollCols}
            rollN={rollN}
            rollAgg={rollAgg}
            onToggleRollCol={col => setRollCols(prev => prev.includes(col) ? prev.filter(x => x !== col) : [...prev, col])}
            onSetRollN={setRollN}
            onSetRollAgg={setRollAgg}
          />

          <div style={{ flex: 1, minWidth: 0, overflowY: "auto", paddingBottom: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <FEUploadInfo rowCount={rawRows.length > 1 ? rawRows.length - 1 : 0} numericColCount={numCols.length} ldaEnabled={!!ldaCol} ldaTopics={ldaNTopics} ldaIter={ldaNIter} />
            <NumericTransformsPanel
              numCols={numCols}
              colTransforms={colTransforms}
              onToggleTransform={toggleTransform}
              onToggleAllTransform={toggleAllTransform}
              onClearAll={() => { setColTransforms({}); setAiSuggestError(null); }}
              onAiSuggest={aiSuggest}
              aiSuggestLoading={aiSuggestLoading}
              aiSuggestError={aiSuggestError}
            />
            <CategoricalPanel
              catCols={catCols}
              freqCols={freqCols}
              dateCols={dateCols}
              dateParts={dateParts}
              onToggleFreqCol={col => setFreqCols(prev => prev.includes(col) ? prev.filter(x => x !== col) : [...prev, col])}
              onToggleDateCol={col => setDateCols(prev => prev.includes(col) ? prev.filter(x => x !== col) : [...prev, col])}
              onToggleDatePart={part => setDateParts(prev => prev.includes(part) ? prev.filter(x => x !== part) : [...prev, part])}
            />
            <LDAPanel
              catCols={catCols}
              ldaCol={ldaCol}
              ldaNTopics={ldaNTopics}
              ldaNIter={ldaNIter}
              ldaOpts={ldaOpts}
              ldaResult={ldaResult}
              ldaRunning={ldaRunning}
              ldaError={ldaError}
              onSetLdaCol={setLdaCol}
              onSetLdaNTopics={setLdaNTopics}
              onSetLdaNIter={setLdaNIter}
              setLdaOpts={setLdaOpts}
              onRunLDA={handleRunLDA}
            />
          </div>
        </div>
      )}

      {/* ── Processing ── */}
      {step === "processing" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1.25rem" }}>
          <div style={{ width: 48, height: 48, border: `3px solid ${ACCENT}33`, borderTop: `3px solid ${ACCENT}`, borderRadius: 9999, animation: "spin 0.9s linear infinite" }} />
          <div style={{ fontSize: "0.87rem", color: "var(--text2)" }}>Applying transforms in browser...</div>
        </div>
      )}

      {/* ── Results ── */}
      {step === "results" && result && (
        <ResultsPanel
          result={result}
          filename={filename}
          onBackToConfigure={() => setStep("configure")}
          onDownload={downloadResult}
        />
      )}

      <ToolsAIChat context={{
        tool: "Feature Engineering",
        summary: rawRows.length > 1
          ? [
              `Dataset: ${rawRows.length - 1} rows, ${numCols.length} numeric cols (${numCols.map(c => c.name).join(", ")}), ${catCols.length} categorical cols (${catCols.map(c => c.name).join(", ")}).`,
              numCols.length > 0 ? `Numeric stats: ${numCols.map(c => `${c.name} skew=${c.skew.toFixed(2)} missing=${c.missing}`).join("; ")}.` : "",
              Object.keys(colTransforms).length > 0 ? `Selected transforms: ${Object.entries(colTransforms).filter(([,v]) => v.length > 0).map(([k,v]) => `${k}→[${v.join(",")}]`).join("; ")}.` : "No transforms selected yet.",
              result ? `Last result: added ${result.newColumns.length} new columns (${result.newColumns.join(", ")}).` : "",
            ].filter(Boolean).join(" ")
          : "No dataset loaded yet.",
      }} />
    </div>
  );
}