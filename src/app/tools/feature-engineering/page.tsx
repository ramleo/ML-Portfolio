"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ML_UNIFIED_API as API } from "@/config/urls";
import ConstellationBackground from "@/components/ConstellationBackground";

const ACCENT = "#38bdf8";

// ── Types ─────────────────────────────────────────────────────────────────────

type ColInfo = {
  name: string; is_numeric: boolean; dtype: string;
  nunique: number; missing: number; skew?: number;
};

type AnalyzeResult = { columns: ColInfo[]; rows: number; total_missing: number };

type FeResult = {
  csv_b64: string; filename: string;
  cols_before: number; cols_after: number;
  rows: number; new_columns: string[];
};

type Step = "upload" | "configure" | "processing" | "results";

const NUM_TRANSFORMS = [
  { key: "log1p",        label: "log1p",        hint: "log(1+x) — reduces right skew" },
  { key: "sqrt",         label: "sqrt",          hint: "√x — milder skew reduction" },
  { key: "yeo_johnson",  label: "Yeo-Johnson",   hint: "Optimal power transform" },
  { key: "percentile",   label: "Percentile rank", hint: "Rank to [0,1] range" },
  { key: "outlier_flag", label: "Outlier flag",  hint: "1 if |z| > 3, else 0" },
  { key: "missing_flag", label: "Missing flag",  hint: "1 if NaN, else 0" },
  { key: "bin_equal",    label: "Bin (equal)",   hint: "5 equal-width bins" },
  { key: "bin_quantile", label: "Bin (quantile)", hint: "5 quantile bins" },
];

const DATE_PARTS = [
  { key: "year", label: "Year" },
  { key: "month", label: "Month" },
  { key: "day", label: "Day" },
  { key: "dayofweek", label: "Day of week" },
  { key: "hour", label: "Hour" },
  { key: "quarter", label: "Quarter" },
];

const CARD: React.CSSProperties = {
  background: "rgba(14,22,40,0.72)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 12,
  padding: "1.25rem 1.4rem",
};

// ── Small helpers ─────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.85rem" }}>
      {children}
    </div>
  );
}

function Pill({ label, color = ACCENT }: { label: string; color?: string }) {
  return (
    <span style={{ fontSize: "0.65rem", fontWeight: 600, color, background: `${color}14`, border: `1px solid ${color}30`, borderRadius: 9999, padding: "1px 8px" }}>
      {label}
    </span>
  );
}

function ActionBtn({
  onClick, disabled = false, children, secondary = false,
}: { onClick: () => void; disabled?: boolean; children: React.ReactNode; secondary?: boolean }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: "0.6rem 1.4rem", borderRadius: 9999, border: secondary ? `1px solid rgba(255,255,255,0.15)` : "none",
        background: disabled ? "rgba(255,255,255,0.06)" : secondary ? "transparent" : ACCENT,
        color: disabled ? "var(--text3)" : secondary ? "var(--text2)" : "#000",
        fontWeight: 600, fontSize: "0.82rem", cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.15s",
        boxShadow: hov && !disabled && !secondary ? `0 0 18px ${ACCENT}66` : "none",
        opacity: hov && !disabled ? (secondary ? 1 : 0.9) : 1,
      }}
    >
      {children}
    </button>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <div
      onClick={onChange}
      style={{
        width: 34, height: 18, borderRadius: 9999, cursor: "pointer", flexShrink: 0,
        background: checked ? ACCENT : "rgba(255,255,255,0.12)",
        position: "relative", transition: "background 0.2s",
        boxShadow: checked ? `0 0 8px ${ACCENT}55` : "none",
      }}
    >
      <div style={{
        position: "absolute", top: 2, left: checked ? 18 : 2, width: 14, height: 14,
        borderRadius: 9999, background: "#fff", transition: "left 0.2s",
      }} />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function FeatureEngineeringPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep]         = useState<Step>("upload");
  const [analyzed, setAnalyzed] = useState<AnalyzeResult | null>(null);
  const [csvB64, setCsvB64]     = useState("");
  const [filename, setFilename] = useState("");
  const [error, setError]       = useState("");
  const [result, setResult]     = useState<FeResult | null>(null);

  // Transform config state
  const [colTransforms, setColTransforms]   = useState<Record<string, string[]>>({});
  const [dateCols, setDateCols]             = useState<string[]>([]);
  const [dateParts, setDateParts]           = useState<string[]>(["year", "month", "day", "dayofweek"]);
  const [interactions, setInteractions]     = useState<[string, string][]>([]);
  const [interactA, setInteractA]           = useState("");
  const [interactB, setInteractB]           = useState("");
  const [polyCols, setPolyCols]             = useState<string[]>([]);

  // Body overflow lock in configure mode
  useEffect(() => {
    if (step === "configure") { document.body.style.overflow = "hidden"; }
    else { document.body.style.overflow = ""; }
    return () => { document.body.style.overflow = ""; };
  }, [step]);

  const numCols = analyzed?.columns.filter(c => c.is_numeric) ?? [];
  const allCols = analyzed?.columns ?? [];

  // ── File handling ──────────────────────────────────────────────────────────

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith(".csv")) { setError("Please upload a CSV file."); return; }
    setError("");
    setFilename(file.name);

    const toB64 = (): Promise<string> => new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => {
        const b64 = (reader.result as string).split(",")[1];
        res(b64);
      };
      reader.onerror = rej;
      reader.readAsDataURL(file);
    });

    try {
      const b64 = await toB64();
      setCsvB64(b64);

      const fd = new FormData();
      fd.append("file", file);
      const resp = await fetch(`${API}/analyze`, { method: "POST", body: fd });
      if (!resp.ok) throw new Error(await resp.text());
      const data: AnalyzeResult & { suggested_target?: string } = await resp.json();
      setAnalyzed(data);

      // Pre-select log1p for skewed numeric cols
      const initTransforms: Record<string, string[]> = {};
      for (const col of data.columns) {
        if (col.is_numeric) {
          initTransforms[col.name] = (col.skew ?? 0) > 1.5 ? ["log1p"] : [];
        }
      }
      setColTransforms(initTransforms);

      // Pre-detect date-like columns
      const dateLike = data.columns.filter(c =>
        !c.is_numeric && (c.dtype.includes("date") || c.dtype.includes("object") && c.nunique < 500 &&
        /date|time|dt|_at|_on/i.test(c.name))
      ).map(c => c.name);
      setDateCols(dateLike);

      setStep("configure");
    } catch (e) {
      setError(String(e));
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  // ── Toggle helpers ─────────────────────────────────────────────────────────

  const toggleTransform = (col: string, key: string) => {
    setColTransforms(prev => {
      const cur = prev[col] ?? [];
      return { ...prev, [col]: cur.includes(key) ? cur.filter(k => k !== key) : [...cur, key] };
    });
  };

  const toggleDateCol = (col: string) => {
    setDateCols(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);
  };

  const toggleDatePart = (part: string) => {
    setDateParts(prev => prev.includes(part) ? prev.filter(p => p !== part) : [...prev, part]);
  };

  const addInteraction = () => {
    if (!interactA || !interactB || interactA === interactB) return;
    const pair: [string, string] = [interactA, interactB];
    if (interactions.some(([a, b]) => a === pair[0] && b === pair[1])) return;
    setInteractions(prev => [...prev, pair]);
    setInteractA(""); setInteractB("");
  };

  const togglePolyCol = (col: string) => {
    setPolyCols(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);
  };

  // ── Apply transforms ───────────────────────────────────────────────────────

  const applyTransforms = useCallback(async () => {
    setStep("processing");
    try {
      const config = {
        transforms: colTransforms,
        date_cols: dateCols,
        date_parts: dateParts,
        interactions,
        poly_cols: polyCols,
        poly_degree: 2,
      };
      const resp = await fetch(`${API}/feature-engineer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv_b64: csvB64, config }),
      });
      if (!resp.ok) throw new Error(await resp.text());
      const data: FeResult = await resp.json();
      setResult(data);
      setStep("results");
    } catch (e) {
      setError(String(e));
      setStep("configure");
    }
  }, [csvB64, colTransforms, dateCols, dateParts, interactions, polyCols]);

  // ── Download ───────────────────────────────────────────────────────────────

  const downloadResult = useCallback(() => {
    if (!result) return;
    const bytes = atob(result.csv_b64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    const blob = new Blob([arr], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = result.filename; a.click();
    URL.revokeObjectURL(url);
  }, [result]);

  const totalSelected = Object.values(colTransforms).reduce((s, v) => s + v.length, 0)
    + dateCols.length * dateParts.length
    + interactions.length
    + (polyCols.length >= 2 ? 1 : 0);

  // ── Render ─────────────────────────────────────────────────────────────────

  const outerStyle: React.CSSProperties = step === "configure"
    ? { height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", color: "var(--text)" }
    : { minHeight: "100vh", color: "var(--text)" };

  return (
    <div style={outerStyle}>
      <ConstellationBackground />

      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50, flexShrink: 0,
        background: "rgba(6,13,26,0.92)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}>
        <div style={{ maxWidth: 1040, margin: "0 auto", padding: "0 1.5rem", height: 60, display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <button
            onClick={() => router.push("/#capabilities")}
            style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: "0.78rem", fontWeight: 500, padding: 0, transition: "color 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text3)")}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 12L4 7l5-5" />
            </svg>
            Portfolio
          </button>
          <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.12)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
            <Pill label="Step 3" />
            <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>Feature Engineering</span>
          </div>
          {step === "configure" && (
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text3)" }}>
                {totalSelected} transform{totalSelected !== 1 ? "s" : ""} selected
              </span>
              <ActionBtn onClick={applyTransforms} disabled={totalSelected === 0}>
                Apply Transforms
              </ActionBtn>
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

      {/* ── Upload step ──────────────────────────────────────────────────────── */}
      {step === "upload" && (
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "4rem 1.5rem" }}>
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text)", marginBottom: "0.5rem" }}>Feature Engineering</div>
            <div style={{ fontSize: "0.87rem", color: "var(--text3)", lineHeight: 1.6 }}>
              Upload a CSV to apply log transforms, date extraction, interaction terms, and more. Download the engineered dataset ready for model training.
            </div>
          </div>
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            style={{
              ...CARD, textAlign: "center", padding: "3rem 2rem", cursor: "pointer",
              borderStyle: "dashed", borderColor: `${ACCENT}40`,
              transition: "border-color 0.2s, box-shadow 0.2s",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLDivElement).style.borderColor = ACCENT;
              (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 20px ${ACCENT}22`;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLDivElement).style.borderColor = `${ACCENT}40`;
              (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
            }}
          >
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke={ACCENT} strokeWidth="1.5" style={{ marginBottom: "1rem", opacity: 0.7 }}>
              <path d="M20 26V14M14 20l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="6" y="6" width="28" height="28" rx="6" />
            </svg>
            <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text)", marginBottom: "0.3rem" }}>Drop CSV here or click to browse</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text3)" }}>Any CSV — no size limit</div>
          </div>
          <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          {error && <div style={{ marginTop: "1rem", color: "#f87171", fontSize: "0.8rem", textAlign: "center" }}>{error}</div>}
        </div>
      )}

      {/* ── Configure step ────────────────────────────────────────────────────── */}
      {step === "configure" && analyzed && (
        <div style={{ flex: 1, overflow: "hidden", display: "flex", gap: "1rem", padding: "1rem 1.5rem 0", maxWidth: 1040, margin: "0 auto", width: "100%" }}>

          {/* Left: Numeric transforms */}
          <div style={{ width: 320, flexShrink: 0, overflowY: "auto", paddingBottom: "2rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={CARD}>
              <SectionTitle>Dataset — {filename}</SectionTitle>
              <div style={{ display: "flex", gap: "1.5rem", marginBottom: "0.5rem" }}>
                <div>
                  <div style={{ fontSize: "1.2rem", fontWeight: 800, color: ACCENT }}>{analyzed.rows.toLocaleString()}</div>
                  <div style={{ fontSize: "0.68rem", color: "var(--text3)" }}>rows</div>
                </div>
                <div>
                  <div style={{ fontSize: "1.2rem", fontWeight: 800, color: ACCENT }}>{analyzed.columns.length}</div>
                  <div style={{ fontSize: "0.68rem", color: "var(--text3)" }}>columns</div>
                </div>
                <div>
                  <div style={{ fontSize: "1.2rem", fontWeight: 800, color: numCols.length > 0 ? "#34d399" : "var(--text2)" }}>{numCols.length}</div>
                  <div style={{ fontSize: "0.68rem", color: "var(--text3)" }}>numeric</div>
                </div>
              </div>
            </div>

            {/* Interaction terms */}
            <div style={CARD}>
              <SectionTitle>Interaction Terms</SectionTitle>
              <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.6rem" }}>
                <select
                  value={interactA}
                  onChange={e => setInteractA(e.target.value)}
                  style={{ flex: 1, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "var(--text)", fontSize: "0.75rem", padding: "0.35rem 0.5rem" }}
                >
                  <option value="">Col A</option>
                  {numCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
                <span style={{ color: "var(--text3)", alignSelf: "center", fontSize: "0.8rem" }}>×</span>
                <select
                  value={interactB}
                  onChange={e => setInteractB(e.target.value)}
                  style={{ flex: 1, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "var(--text)", fontSize: "0.75rem", padding: "0.35rem 0.5rem" }}
                >
                  <option value="">Col B</option>
                  {numCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
                <button
                  onClick={addInteraction}
                  disabled={!interactA || !interactB || interactA === interactB}
                  style={{ padding: "0.35rem 0.7rem", borderRadius: 6, background: ACCENT, color: "#000", border: "none", fontWeight: 700, fontSize: "0.8rem", cursor: (!interactA || !interactB || interactA === interactB) ? "not-allowed" : "pointer", opacity: (!interactA || !interactB || interactA === interactB) ? 0.4 : 1 }}
                >+</button>
              </div>
              {interactions.length === 0 && <div style={{ fontSize: "0.72rem", color: "var(--text3)" }}>No interactions added yet.</div>}
              {interactions.map(([a, b], i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.25rem 0.5rem", background: `${ACCENT}0d`, borderRadius: 6, marginBottom: "0.25rem" }}>
                  <span style={{ fontSize: "0.73rem", color: ACCENT, fontWeight: 600 }}>{a} × {b}</span>
                  <button onClick={() => setInteractions(prev => prev.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: "0.9rem", padding: 0, lineHeight: 1 }}>×</button>
                </div>
              ))}
            </div>

            {/* Polynomial */}
            <div style={CARD}>
              <SectionTitle>Polynomial Cross-Terms (degree 2)</SectionTitle>
              <div style={{ fontSize: "0.72rem", color: "var(--text3)", marginBottom: "0.65rem" }}>Select 2+ columns to generate all pairwise products.</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                {numCols.map(c => (
                  <button
                    key={c.name}
                    onClick={() => togglePolyCol(c.name)}
                    style={{
                      padding: "2px 10px", borderRadius: 9999, fontSize: "0.72rem", fontWeight: 600, cursor: "pointer", border: `1px solid ${polyCols.includes(c.name) ? ACCENT : "rgba(255,255,255,0.15)"}`,
                      background: polyCols.includes(c.name) ? `${ACCENT}18` : "transparent",
                      color: polyCols.includes(c.name) ? ACCENT : "var(--text3)",
                      transition: "all 0.15s",
                    }}
                  >{c.name}</button>
                ))}
              </div>
              {polyCols.length >= 2 && (
                <div style={{ marginTop: "0.6rem", fontSize: "0.72rem", color: ACCENT }}>
                  Will generate {polyCols.length * (polyCols.length - 1) / 2} cross-term{polyCols.length > 2 ? "s" : ""}
                </div>
              )}
            </div>

            {/* Date extraction */}
            <div style={CARD}>
              <SectionTitle>Date Extraction</SectionTitle>
              <div style={{ fontSize: "0.72rem", color: "var(--text3)", marginBottom: "0.65rem" }}>Select columns to extract date parts from.</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "0.75rem" }}>
                {allCols.filter(c => !c.is_numeric).map(c => (
                  <div key={c.name} style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <Toggle checked={dateCols.includes(c.name)} onChange={() => toggleDateCol(c.name)} />
                    <span style={{ fontSize: "0.78rem", color: dateCols.includes(c.name) ? "var(--text)" : "var(--text3)" }}>{c.name}</span>
                    <span style={{ fontSize: "0.65rem", color: "var(--text3)", marginLeft: "auto" }}>{c.dtype}</span>
                  </div>
                ))}
                {allCols.filter(c => !c.is_numeric).length === 0 && (
                  <div style={{ fontSize: "0.72rem", color: "var(--text3)" }}>No non-numeric columns detected.</div>
                )}
              </div>
              {dateCols.length > 0 && (
                <>
                  <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.4rem" }}>Parts to extract</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                    {DATE_PARTS.map(p => (
                      <button
                        key={p.key}
                        onClick={() => toggleDatePart(p.key)}
                        style={{
                          padding: "2px 8px", borderRadius: 9999, fontSize: "0.7rem", fontWeight: 600, cursor: "pointer",
                          border: `1px solid ${dateParts.includes(p.key) ? "#a78bfa" : "rgba(255,255,255,0.1)"}`,
                          background: dateParts.includes(p.key) ? "rgba(167,139,250,0.15)" : "transparent",
                          color: dateParts.includes(p.key) ? "#a78bfa" : "var(--text3)",
                          transition: "all 0.15s",
                        }}
                      >{p.label}</button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right: Per-column transform toggles */}
          <div style={{ flex: 1, minWidth: 0, overflowY: "auto", paddingBottom: "2rem" }}>
            <div style={CARD}>
              <SectionTitle>Numeric Column Transforms</SectionTitle>
              {numCols.length === 0 && (
                <div style={{ color: "var(--text3)", fontSize: "0.8rem" }}>No numeric columns detected.</div>
              )}

              {/* Header row */}
              {numCols.length > 0 && (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: "left", fontSize: "0.65rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em", padding: "0 0.5rem 0.6rem 0", width: 140 }}>Column</th>
                        <th style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em", padding: "0 0.25rem 0.6rem", width: 40 }}>Skew</th>
                        {NUM_TRANSFORMS.map(t => (
                          <th key={t.key} style={{ fontSize: "0.62rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.05em", padding: "0 0.3rem 0.6rem", textAlign: "center" }} title={t.hint}>
                            {t.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {numCols.map((col, i) => {
                        const selected = colTransforms[col.name] ?? [];
                        const skew = col.skew ?? 0;
                        const skewColor = Math.abs(skew) > 1.5 ? "#f59e0b" : Math.abs(skew) > 0.5 ? "#94a3b8" : "#34d399";
                        return (
                          <tr key={col.name} style={{ background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent" }}>
                            <td style={{ padding: "0.55rem 0.5rem 0.55rem 0", fontSize: "0.78rem", fontWeight: 600, color: "var(--text)" }}>
                              <div style={{ display: "flex", flexDirection: "column" }}>
                                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 130 }}>{col.name}</span>
                                {col.missing > 0 && <span style={{ fontSize: "0.62rem", color: "#f87171" }}>{col.missing} missing</span>}
                              </div>
                            </td>
                            <td style={{ textAlign: "center", fontSize: "0.72rem", fontWeight: 700, color: skewColor, padding: "0 0.25rem" }}>
                              {skew.toFixed(1)}
                            </td>
                            {NUM_TRANSFORMS.map(t => (
                              <td key={t.key} style={{ textAlign: "center", padding: "0 0.3rem" }}>
                                <div
                                  onClick={() => toggleTransform(col.name, t.key)}
                                  style={{
                                    width: 18, height: 18, borderRadius: 4, margin: "0 auto", cursor: "pointer",
                                    background: selected.includes(t.key) ? ACCENT : "rgba(255,255,255,0.08)",
                                    border: `1px solid ${selected.includes(t.key) ? ACCENT : "rgba(255,255,255,0.12)"}`,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    boxShadow: selected.includes(t.key) ? `0 0 6px ${ACCENT}55` : "none",
                                    transition: "all 0.15s",
                                  }}
                                >
                                  {selected.includes(t.key) && (
                                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round">
                                      <path d="M1.5 5l2.5 2.5L8.5 2" />
                                    </svg>
                                  )}
                                </div>
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Processing step ───────────────────────────────────────────────────── */}
      {step === "processing" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1.25rem" }}>
          <div style={{ width: 48, height: 48, border: `3px solid ${ACCENT}33`, borderTop: `3px solid ${ACCENT}`, borderRadius: 9999, animation: "spin 0.9s linear infinite" }} />
          <div style={{ fontSize: "0.87rem", color: "var(--text2)" }}>Applying transforms...</div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* ── Results step ──────────────────────────────────────────────────────── */}
      {step === "results" && result && (
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "2.5rem 1.5rem 5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
            {[
              { label: "Rows", value: result.rows.toLocaleString() },
              { label: "Columns Before", value: String(result.cols_before) },
              { label: "Columns After", value: String(result.cols_after), accent: true },
              { label: "New Features Added", value: String(result.new_columns.length), accent: true },
            ].map(s => (
              <div key={s.label} style={{ ...CARD, textAlign: "center" }}>
                <div style={{ fontSize: "1.6rem", fontWeight: 800, color: s.accent ? ACCENT : "var(--text)" }}>{s.value}</div>
                <div style={{ fontSize: "0.73rem", color: "var(--text3)", marginTop: "0.2rem" }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* New columns list */}
          <div style={CARD}>
            <SectionTitle>New Columns Added ({result.new_columns.length})</SectionTitle>
            {result.new_columns.length === 0 ? (
              <div style={{ color: "var(--text3)", fontSize: "0.8rem" }}>No transforms were applied — try selecting some transforms and applying again.</div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                {result.new_columns.map(c => (
                  <span key={c} style={{ fontSize: "0.72rem", fontWeight: 500, color: ACCENT, background: `${ACCENT}10`, border: `1px solid ${ACCENT}28`, borderRadius: 6, padding: "2px 10px" }}>{c}</span>
                ))}
              </div>
            )}
          </div>

          {/* Download CTA */}
          <div style={{ ...CARD, borderColor: `${ACCENT}22`, background: `${ACCENT}07`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: "0.93rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.2rem" }}>Ready to download</div>
              <div style={{ fontSize: "0.78rem", color: "var(--text3)" }}>engineered.csv — {result.cols_after} columns, {result.rows.toLocaleString()} rows</div>
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <ActionBtn secondary onClick={() => setStep("configure")}>Back to Configure</ActionBtn>
              <ActionBtn onClick={downloadResult}>Download engineered.csv</ActionBtn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}