"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ConstellationBackground from "@/components/ConstellationBackground";

const ACCENT = "#38bdf8";

// ── Types ─────────────────────────────────────────────────────────────────────

type ColInfo = {
  name: string; isNumeric: boolean; dtype: string;
  nunique: number; missing: number; skew: number;
  values: (number | null)[];  // parsed numeric values (null = missing)
  rawValues: string[];        // original string values for date parsing
};

type Step = "upload" | "configure" | "processing" | "results";

type FeResult = {
  csv: string[][];         // rows including header
  headers: string[];
  colsBefore: number; colsAfter: number;
  rows: number; newColumns: string[];
};

// ── CSV parser ────────────────────────────────────────────────────────────────

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let cur = "", inQ = false;
  const row: string[] = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') { inQ = false; }
      else { cur += ch; }
    } else {
      if (ch === '"') { inQ = true; }
      else if (ch === ',') { row.push(cur); cur = ""; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(cur); cur = "";
        if (row.some(c => c !== "")) rows.push([...row]);
        row.length = 0;
      } else { cur += ch; }
    }
  }
  row.push(cur);
  if (row.some(c => c !== "")) rows.push(row);
  return rows;
}

// ── Stats helpers ─────────────────────────────────────────────────────────────

function computeSkew(nums: number[]): number {
  if (nums.length < 3) return 0;
  const n = nums.length;
  const mean = nums.reduce((a, b) => a + b, 0) / n;
  const std = Math.sqrt(nums.reduce((a, b) => a + (b - mean) ** 2, 0) / n);
  if (std === 0) return 0;
  return nums.reduce((a, b) => a + ((b - mean) / std) ** 3, 0) / n;
}

function analyzeColumns(rows: string[][]): ColInfo[] {
  if (rows.length < 2) return [];
  const headers = rows[0];
  const data = rows.slice(1);
  return headers.map((name, ci) => {
    const rawValues = data.map(r => (r[ci] ?? "").trim());
    const missing = rawValues.filter(v => v === "" || v.toLowerCase() === "nan" || v.toLowerCase() === "null" || v.toLowerCase() === "na").length;
    const nonEmpty = rawValues.filter(v => v !== "" && v.toLowerCase() !== "nan" && v.toLowerCase() !== "null" && v.toLowerCase() !== "na");
    const nunique = new Set(nonEmpty).size;
    const numParsed = nonEmpty.map(v => parseFloat(v));
    const isNumeric = numParsed.length > 0 && numParsed.filter(v => isNaN(v)).length / numParsed.length < 0.05;
    const values: (number | null)[] = rawValues.map(v => {
      if (v === "" || v.toLowerCase() === "nan" || v.toLowerCase() === "null" || v.toLowerCase() === "na") return null;
      const n = parseFloat(v);
      return isNaN(n) ? null : n;
    });
    const validNums = values.filter(v => v !== null) as number[];
    const skew = isNumeric ? computeSkew(validNums) : 0;
    const dtype = isNumeric ? "float64" : "object";
    return { name, isNumeric, dtype, nunique, missing, skew, values, rawValues };
  });
}

// ── Transform engine (all client-side) ───────────────────────────────────────

function applyTransforms(
  rawRows: string[][],
  cols: ColInfo[],
  colTransforms: Record<string, string[]>,
  dateCols: string[],
  dateParts: string[],
  interactions: [string, string][],
  polyCols: string[],
): FeResult {
  const headers = [...rawRows[0]];
  const dataRows = rawRows.slice(1).map(r => [...r]);
  const nRows = dataRows.length;
  const newColumns: string[] = [];

  const colMap = Object.fromEntries(cols.map(c => [c.name, c]));
  const headerIdx = Object.fromEntries(headers.map((h, i) => [h, i]));

  const addCol = (name: string, values: (number | string | null)[]) => {
    newColumns.push(name);
    headers.push(name);
    for (let i = 0; i < nRows; i++) {
      const v = values[i];
      dataRows[i].push(v === null || v === undefined ? "" : String(v));
    }
  };

  const getNumVals = (colName: string): (number | null)[] =>
    colMap[colName]?.values ?? dataRows.map(r => { const v = parseFloat(r[headerIdx[colName]] ?? ""); return isNaN(v) ? null : v; });

  // 1. Per-column numeric transforms
  for (const [colName, tList] of Object.entries(colTransforms)) {
    if (!tList.length) continue;
    const col = colMap[colName];
    if (!col) continue;
    const vals = col.values;
    const valid = vals.filter(v => v !== null) as number[];
    const mean = valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : 0;
    const std = valid.length > 1 ? Math.sqrt(valid.reduce((a, b) => a + (b - mean) ** 2, 0) / valid.length) : 1;
    const minV = valid.length ? Math.min(...valid) : 0;
    const maxV = valid.length ? Math.max(...valid) : 1;

    if (tList.includes("log1p")) {
      addCol(`${colName}_log1p`, vals.map(v => v === null ? null : Math.log1p(Math.max(v, 0))));
    }
    if (tList.includes("sqrt")) {
      addCol(`${colName}_sqrt`, vals.map(v => v === null ? null : Math.sqrt(Math.max(v, 0))));
    }
    if (tList.includes("percentile")) {
      const sorted = [...valid].sort((a, b) => a - b);
      addCol(`${colName}_pct`, vals.map(v => {
        if (v === null) return null;
        const rank = sorted.filter(s => s <= v).length;
        return parseFloat((rank / sorted.length).toFixed(4));
      }));
    }
    if (tList.includes("outlier_flag")) {
      addCol(`${colName}_outlier`, vals.map(v => {
        if (v === null) return null;
        return Math.abs((v - mean) / (std || 1)) > 3 ? 1 : 0;
      }));
    }
    if (tList.includes("missing_flag")) {
      addCol(`${colName}_missing`, col.rawValues.map(v =>
        (v === "" || v.toLowerCase() === "nan" || v.toLowerCase() === "null" || v.toLowerCase() === "na") ? 1 : 0
      ));
    }
    if (tList.includes("bin_equal")) {
      const range = maxV - minV || 1;
      addCol(`${colName}_bin`, vals.map(v => {
        if (v === null) return null;
        return Math.min(Math.floor(((v - minV) / range) * 5), 4);
      }));
    }
    if (tList.includes("bin_quantile")) {
      const sorted = [...valid].sort((a, b) => a - b);
      addCol(`${colName}_qbin`, vals.map(v => {
        if (v === null) return null;
        const rank = sorted.filter(s => s <= v).length;
        return Math.min(Math.floor((rank / sorted.length) * 5), 4);
      }));
    }
  }

  // 2. Date extraction
  for (const colName of dateCols) {
    const col = colMap[colName];
    if (!col) continue;
    for (const part of dateParts) {
      const extracted = col.rawValues.map(v => {
        if (!v || v === "") return null;
        const d = new Date(v);
        if (isNaN(d.getTime())) return null;
        switch (part) {
          case "year": return d.getFullYear();
          case "month": return d.getMonth() + 1;
          case "day": return d.getDate();
          case "dayofweek": return d.getDay();
          case "hour": return d.getHours();
          case "quarter": return Math.floor(d.getMonth() / 3) + 1;
          default: return null;
        }
      });
      addCol(`${colName}_${part}`, extracted);
    }
  }

  // 3. Interaction terms
  for (const [a, b] of interactions) {
    const valsA = getNumVals(a);
    const valsB = getNumVals(b);
    addCol(`${a}_x_${b}`, valsA.map((va, i) => {
      const vb = valsB[i];
      return va === null || vb === null ? null : parseFloat((va * vb).toFixed(6));
    }));
  }

  // 4. Polynomial cross-terms (degree 2, interaction_only)
  const validPoly = polyCols.filter(c => colMap[c]);
  if (validPoly.length >= 2) {
    for (let i = 0; i < validPoly.length; i++) {
      for (let j = i + 1; j < validPoly.length; j++) {
        const valsA = getNumVals(validPoly[i]);
        const valsB = getNumVals(validPoly[j]);
        const name = `${validPoly[i]}_x_${validPoly[j]}`;
        if (!newColumns.includes(name)) {
          addCol(name, valsA.map((va, k) => {
            const vb = valsB[k];
            return va === null || vb === null ? null : parseFloat((va * vb).toFixed(6));
          }));
        }
      }
    }
  }

  return {
    csv: [headers, ...dataRows],
    headers,
    colsBefore: rawRows[0].length,
    colsAfter: headers.length,
    rows: nRows,
    newColumns,
  };
}

// ── CSV serialiser ────────────────────────────────────────────────────────────

function serializeCSV(rows: string[][]): string {
  return rows.map(row =>
    row.map(cell => (cell.includes(",") || cell.includes('"') || cell.includes("\n")) ? `"${cell.replace(/"/g, '""')}"` : cell).join(",")
  ).join("\n");
}

// ── Constants ─────────────────────────────────────────────────────────────────

const NUM_TRANSFORMS = [
  { key: "log1p",        label: "log1p",          hint: "log(1+x) — reduces right skew" },
  { key: "sqrt",         label: "sqrt",            hint: "√x — milder skew reduction" },
  { key: "percentile",   label: "Percentile rank", hint: "Rank scaled to [0,1]" },
  { key: "outlier_flag", label: "Outlier flag",    hint: "1 if |z-score| > 3" },
  { key: "missing_flag", label: "Missing flag",    hint: "1 if value is NaN/null" },
  { key: "bin_equal",    label: "Bin (equal)",     hint: "5 equal-width bins" },
  { key: "bin_quantile", label: "Bin (quantile)",  hint: "5 quantile bins" },
];

const DATE_PARTS = [
  { key: "year", label: "Year" }, { key: "month", label: "Month" },
  { key: "day", label: "Day" }, { key: "dayofweek", label: "Day of week" },
  { key: "hour", label: "Hour" }, { key: "quarter", label: "Quarter" },
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

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <div onClick={onChange} style={{
      width: 34, height: 18, borderRadius: 9999, cursor: "pointer", flexShrink: 0,
      background: checked ? ACCENT : "rgba(255,255,255,0.12)", position: "relative",
      transition: "background 0.2s", boxShadow: checked ? `0 0 8px ${ACCENT}55` : "none",
    }}>
      <div style={{ position: "absolute", top: 2, left: checked ? 18 : 2, width: 14, height: 14, borderRadius: 9999, background: "#fff", transition: "left 0.2s" }} />
    </div>
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

  const [colTransforms, setColTransforms] = useState<Record<string, string[]>>({});
  const [dateCols, setDateCols]           = useState<string[]>([]);
  const [dateParts, setDateParts]         = useState<string[]>(["year", "month", "day", "dayofweek"]);
  const [interactions, setInteractions]   = useState<[string, string][]>([]);
  const [interactA, setInteractA]         = useState("");
  const [interactB, setInteractB]         = useState("");
  const [polyCols, setPolyCols]           = useState<string[]>([]);

  useEffect(() => {
    if (step === "configure") document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [step]);

  const numCols = cols.filter(c => c.isNumeric);
  const catCols = cols.filter(c => !c.isNumeric);

  // ── File handling ──────────────────────────────────────────────────────────

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv")) { setError("Please upload a CSV file."); return; }
    setError("");
    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const rows = parseCSV(text);
      if (rows.length < 2) { setError("CSV must have at least 2 rows."); return; }
      const analyzed = analyzeColumns(rows);
      setRawRows(rows);
      setCols(analyzed);
      const initT: Record<string, string[]> = {};
      for (const col of analyzed) {
        if (col.isNumeric) initT[col.name] = Math.abs(col.skew) > 1.5 ? ["log1p"] : [];
      }
      setColTransforms(initT);
      setDateCols([]);
      setInteractions([]);
      setPolyCols([]);
      setStep("configure");
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  // ── Config helpers ─────────────────────────────────────────────────────────

  const toggleTransform = (col: string, key: string) => {
    setColTransforms(prev => {
      const cur = prev[col] ?? [];
      return { ...prev, [col]: cur.includes(key) ? cur.filter(k => k !== key) : [...cur, key] };
    });
  };

  const addInteraction = () => {
    if (!interactA || !interactB || interactA === interactB) return;
    const pair: [string, string] = [interactA, interactB];
    if (interactions.some(([a, b]) => a === pair[0] && b === pair[1])) return;
    setInteractions(prev => [...prev, pair]);
    setInteractA(""); setInteractB("");
  };

  // ── Apply ──────────────────────────────────────────────────────────────────

  const applyTransforms = useCallback(() => {
    setStep("processing");
    setTimeout(() => {
      try {
        const res = applyTransforms_fn(rawRows, cols, colTransforms, dateCols, dateParts, interactions, polyCols);
        setResult(res);
        setStep("results");
      } catch (e) {
        setError(String(e));
        setStep("configure");
      }
    }, 50);
  }, [rawRows, cols, colTransforms, dateCols, dateParts, interactions, polyCols]);

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
    (polyCols.length >= 2 ? polyCols.length * (polyCols.length - 1) / 2 : 0);

  const outerStyle: React.CSSProperties = step === "configure"
    ? { height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", color: "var(--text)" }
    : { minHeight: "100vh", color: "var(--text)" };

  return (
    <div style={outerStyle}>
      <ConstellationBackground />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
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
              <ActionBtn onClick={applyTransforms} disabled={totalSelected === 0}>Apply Transforms</ActionBtn>
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

      {/* Upload */}
      {step === "upload" && (
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "4rem 1.5rem" }}>
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text)", marginBottom: "0.5rem" }}>Feature Engineering</div>
            <div style={{ fontSize: "0.87rem", color: "var(--text3)", lineHeight: 1.6 }}>Upload a CSV. Apply log transforms, date extraction, interaction terms, and more — all processed in your browser, nothing sent to any server.</div>
          </div>
          <div onDrop={handleDrop} onDragOver={e => e.preventDefault()} onClick={() => fileRef.current?.click()}
            style={{ ...CARD, textAlign: "center", padding: "3rem 2rem", cursor: "pointer", borderStyle: "dashed", borderColor: `${ACCENT}40`, transition: "border-color 0.2s, box-shadow 0.2s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = ACCENT; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 20px ${ACCENT}22`; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `${ACCENT}40`; (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}
          >
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke={ACCENT} strokeWidth="1.5" style={{ display: "block", margin: "0 auto 1rem", opacity: 0.7 }}>
              <path d="M20 26V14M14 20l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="6" y="6" width="28" height="28" rx="6" />
            </svg>
            <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text)", marginBottom: "0.3rem" }}>Drop CSV here or click to browse</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text3)" }}>Processed entirely in your browser — no upload to any server</div>
          </div>
          <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          {error && <div style={{ marginTop: "1rem", color: "#f87171", fontSize: "0.8rem", textAlign: "center" }}>{error}</div>}
        </div>
      )}

      {/* Configure */}
      {step === "configure" && (
        <div style={{ flex: 1, overflow: "hidden", display: "flex", gap: "1rem", padding: "1rem 1.5rem 0", maxWidth: 1060, margin: "0 auto", width: "100%" }}>

          {/* Left panel */}
          <div style={{ width: 300, flexShrink: 0, overflowY: "auto", paddingBottom: "2rem", display: "flex", flexDirection: "column", gap: "1rem" }}>

            <div style={CARD}>
              <SectionTitle>Dataset — {filename}</SectionTitle>
              <div style={{ display: "flex", gap: "1.5rem" }}>
                {[
                  { label: "rows", value: (rawRows.length - 1).toLocaleString() },
                  { label: "columns", value: String(cols.length) },
                  { label: "numeric", value: String(numCols.length) },
                ].map(s => (
                  <div key={s.label}>
                    <div style={{ fontSize: "1.2rem", fontWeight: 800, color: ACCENT }}>{s.value}</div>
                    <div style={{ fontSize: "0.68rem", color: "var(--text3)" }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Interactions */}
            <div style={CARD}>
              <SectionTitle>Interaction Terms (A × B)</SectionTitle>
              <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.6rem" }}>
                <select value={interactA} onChange={e => setInteractA(e.target.value)} style={{ flex: 1, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "var(--text)", fontSize: "0.75rem", padding: "0.35rem 0.4rem" }}>
                  <option value="">Col A</option>
                  {numCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
                <span style={{ color: "var(--text3)", alignSelf: "center", fontSize: "0.9rem" }}>×</span>
                <select value={interactB} onChange={e => setInteractB(e.target.value)} style={{ flex: 1, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "var(--text)", fontSize: "0.75rem", padding: "0.35rem 0.4rem" }}>
                  <option value="">Col B</option>
                  {numCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
                <button onClick={addInteraction} disabled={!interactA || !interactB || interactA === interactB}
                  style={{ padding: "0.35rem 0.65rem", borderRadius: 6, background: ACCENT, color: "#000", border: "none", fontWeight: 700, fontSize: "0.85rem", cursor: (!interactA || !interactB || interactA === interactB) ? "not-allowed" : "pointer", opacity: (!interactA || !interactB || interactA === interactB) ? 0.4 : 1 }}>
                  +
                </button>
              </div>
              {interactions.length === 0
                ? <div style={{ fontSize: "0.72rem", color: "var(--text3)" }}>No interactions added yet.</div>
                : interactions.map(([a, b], i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.25rem 0.6rem", background: `${ACCENT}0d`, borderRadius: 6, marginBottom: "0.25rem" }}>
                    <span style={{ fontSize: "0.73rem", color: ACCENT, fontWeight: 600 }}>{a} × {b}</span>
                    <button onClick={() => setInteractions(prev => prev.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: "1rem", lineHeight: 1, padding: 0 }}>×</button>
                  </div>
                ))
              }
            </div>

            {/* Polynomial */}
            <div style={CARD}>
              <SectionTitle>Polynomial Cross-Terms</SectionTitle>
              <div style={{ fontSize: "0.72rem", color: "var(--text3)", marginBottom: "0.65rem" }}>Select 2+ columns — all pairwise products are generated.</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                {numCols.map(c => (
                  <button key={c.name} onClick={() => setPolyCols(prev => prev.includes(c.name) ? prev.filter(x => x !== c.name) : [...prev, c.name])}
                    style={{ padding: "2px 9px", borderRadius: 9999, fontSize: "0.72rem", fontWeight: 600, cursor: "pointer", border: `1px solid ${polyCols.includes(c.name) ? ACCENT : "rgba(255,255,255,0.15)"}`, background: polyCols.includes(c.name) ? `${ACCENT}18` : "transparent", color: polyCols.includes(c.name) ? ACCENT : "var(--text3)", transition: "all 0.15s" }}>
                    {c.name}
                  </button>
                ))}
              </div>
              {polyCols.length >= 2 && (
                <div style={{ marginTop: "0.6rem", fontSize: "0.72rem", color: ACCENT }}>
                  {polyCols.length * (polyCols.length - 1) / 2} cross-term{polyCols.length > 2 ? "s" : ""} will be added
                </div>
              )}
            </div>

            {/* Date extraction */}
            {catCols.length > 0 && (
              <div style={CARD}>
                <SectionTitle>Date Extraction</SectionTitle>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "0.75rem" }}>
                  {catCols.map(c => (
                    <div key={c.name} style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <Toggle checked={dateCols.includes(c.name)} onChange={() => setDateCols(prev => prev.includes(c.name) ? prev.filter(x => x !== c.name) : [...prev, c.name])} />
                      <span style={{ fontSize: "0.78rem", color: dateCols.includes(c.name) ? "var(--text)" : "var(--text3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
                    </div>
                  ))}
                </div>
                {dateCols.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                    {DATE_PARTS.map(p => (
                      <button key={p.key} onClick={() => setDateParts(prev => prev.includes(p.key) ? prev.filter(x => x !== p.key) : [...prev, p.key])}
                        style={{ padding: "2px 8px", borderRadius: 9999, fontSize: "0.7rem", fontWeight: 600, cursor: "pointer", border: `1px solid ${dateParts.includes(p.key) ? "#a78bfa" : "rgba(255,255,255,0.1)"}`, background: dateParts.includes(p.key) ? "rgba(167,139,250,0.15)" : "transparent", color: dateParts.includes(p.key) ? "#a78bfa" : "var(--text3)", transition: "all 0.15s" }}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right panel: transform table */}
          <div style={{ flex: 1, minWidth: 0, overflowY: "auto", paddingBottom: "2rem" }}>
            <div style={CARD}>
              <SectionTitle>Numeric Column Transforms</SectionTitle>
              {numCols.length === 0
                ? <div style={{ color: "var(--text3)", fontSize: "0.8rem" }}>No numeric columns detected.</div>
                : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 580 }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: "left", fontSize: "0.65rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em", padding: "0 0.5rem 0.6rem 0", minWidth: 130 }}>Column</th>
                          <th style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", padding: "0 0.4rem 0.6rem", width: 44 }}>Skew</th>
                          {NUM_TRANSFORMS.map(t => (
                            <th key={t.key} title={t.hint} style={{ fontSize: "0.6rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.04em", padding: "0 0.3rem 0.6rem", textAlign: "center", whiteSpace: "nowrap" }}>
                              {t.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {numCols.map((col, i) => {
                          const selected = colTransforms[col.name] ?? [];
                          const skewColor = Math.abs(col.skew) > 1.5 ? "#f59e0b" : Math.abs(col.skew) > 0.5 ? "#94a3b8" : "#34d399";
                          return (
                            <tr key={col.name} style={{ background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent" }}>
                              <td style={{ padding: "0.5rem 0.5rem 0.5rem 0", fontSize: "0.78rem", fontWeight: 600, color: "var(--text)" }}>
                                <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 125 }} title={col.name}>{col.name}</div>
                                {col.missing > 0 && <div style={{ fontSize: "0.62rem", color: "#f87171" }}>{col.missing} missing</div>}
                              </td>
                              <td style={{ textAlign: "center", fontSize: "0.72rem", fontWeight: 700, color: skewColor, padding: "0 0.4rem" }}>
                                {col.skew.toFixed(1)}
                              </td>
                              {NUM_TRANSFORMS.map(t => (
                                <td key={t.key} style={{ textAlign: "center", padding: "0 0.3rem" }}>
                                  <div onClick={() => toggleTransform(col.name, t.key)}
                                    style={{ width: 18, height: 18, borderRadius: 4, margin: "0 auto", cursor: "pointer", background: selected.includes(t.key) ? ACCENT : "rgba(255,255,255,0.08)", border: `1px solid ${selected.includes(t.key) ? ACCENT : "rgba(255,255,255,0.12)"}`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: selected.includes(t.key) ? `0 0 6px ${ACCENT}55` : "none", transition: "all 0.15s" }}>
                                    {selected.includes(t.key) && (
                                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round"><path d="M1.5 5l2.5 2.5L8.5 2" /></svg>
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
                )
              }
            </div>
          </div>
        </div>
      )}

      {/* Processing */}
      {step === "processing" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1.25rem" }}>
          <div style={{ width: 48, height: 48, border: `3px solid ${ACCENT}33`, borderTop: `3px solid ${ACCENT}`, borderRadius: 9999, animation: "spin 0.9s linear infinite" }} />
          <div style={{ fontSize: "0.87rem", color: "var(--text2)" }}>Applying transforms in browser...</div>
        </div>
      )}

      {/* Results */}
      {step === "results" && result && (
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "2.5rem 1.5rem 5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
            {[
              { label: "Rows", value: result.rows.toLocaleString() },
              { label: "Columns Before", value: String(result.colsBefore) },
              { label: "Columns After", value: String(result.colsAfter), accent: true },
              { label: "New Features", value: String(result.newColumns.length), accent: true },
            ].map(s => (
              <div key={s.label} style={{ ...CARD, textAlign: "center" }}>
                <div style={{ fontSize: "1.6rem", fontWeight: 800, color: s.accent ? ACCENT : "var(--text)" }}>{s.value}</div>
                <div style={{ fontSize: "0.73rem", color: "var(--text3)", marginTop: "0.2rem" }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={CARD}>
            <SectionTitle>New Columns Added ({result.newColumns.length})</SectionTitle>
            {result.newColumns.length === 0
              ? <div style={{ color: "var(--text3)", fontSize: "0.8rem" }}>No transforms selected — go back and choose some.</div>
              : <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                  {result.newColumns.map(c => (
                    <span key={c} style={{ fontSize: "0.72rem", fontWeight: 500, color: ACCENT, background: `${ACCENT}10`, border: `1px solid ${ACCENT}28`, borderRadius: 6, padding: "2px 10px" }}>{c}</span>
                  ))}
                </div>
            }
          </div>

          <div style={{ ...CARD, borderColor: `${ACCENT}22`, background: `${ACCENT}07`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: "0.93rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.2rem" }}>Ready to download</div>
              <div style={{ fontSize: "0.78rem", color: "var(--text3)" }}>engineered_{filename} — {result.colsAfter} columns, {result.rows.toLocaleString()} rows</div>
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <ActionBtn secondary onClick={() => setStep("configure")}>Back to Configure</ActionBtn>
              <ActionBtn onClick={downloadResult}>Download CSV</ActionBtn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Named alias to avoid recursive reference inside useCallback
const applyTransforms_fn = applyTransforms;