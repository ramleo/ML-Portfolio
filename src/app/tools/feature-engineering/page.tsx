"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ConstellationBackground from "@/components/ConstellationBackground";

const ACCENT = "#38bdf8";

// ── Types ─────────────────────────────────────────────────────────────────────

type ColInfo = {
  name: string; isNumeric: boolean; dtype: string;
  nunique: number; missing: number; skew: number;
  values: (number | null)[];
  rawValues: string[];
};

type Step = "upload" | "configure" | "processing" | "results";

type FeResult = {
  csv: string[][];
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

// ── Transform engine ──────────────────────────────────────────────────────────

function applyTransforms(
  rawRows: string[][],
  cols: ColInfo[],
  colTransforms: Record<string, string[]>,
  dateCols: string[],
  dateParts: string[],
  interactions: [string, string][],
  polyCols: string[],
  freqCols: string[],
  ratios: [string, string][],
  sortCol: string,
  lagCols: string[],
  lagN: number,
  lagDiff: boolean,
  rollCols: string[],
  rollN: number,
  rollAgg: string,
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
    if (tList.includes("zscore")) {
      addCol(`${colName}_zscore`, vals.map(v => v === null ? null : parseFloat(((v - mean) / (std || 1)).toFixed(4))));
    }
    if (tList.includes("minmax")) {
      const range = maxV - minV || 1;
      addCol(`${colName}_minmax`, vals.map(v => v === null ? null : parseFloat(((v - minV) / range).toFixed(4))));
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
    if (tList.includes("winsor")) {
      const sorted = [...valid].sort((a, b) => a - b);
      const p1 = sorted[Math.floor(sorted.length * 0.01)] ?? minV;
      const p99 = sorted[Math.min(Math.ceil(sorted.length * 0.99) - 1, sorted.length - 1)] ?? maxV;
      addCol(`${colName}_winsor`, vals.map(v =>
        v === null ? null : parseFloat(Math.min(Math.max(v, p1), p99).toFixed(4))
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

  // 3. Interaction terms (A × B)
  for (const [a, b] of interactions) {
    const valsA = getNumVals(a);
    const valsB = getNumVals(b);
    addCol(`${a}_x_${b}`, valsA.map((va, i) => {
      const vb = valsB[i];
      return va === null || vb === null ? null : parseFloat((va * vb).toFixed(6));
    }));
  }

  // 4. Polynomial cross-terms
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

  // 5. Ratio features (A ÷ B)
  for (const [a, b] of ratios) {
    const valsA = getNumVals(a);
    const valsB = getNumVals(b);
    addCol(`${a}_div_${b}`, valsA.map((va, i) => {
      const vb = valsB[i];
      if (va === null || vb === null || vb === 0) return null;
      return parseFloat((va / vb).toFixed(6));
    }));
  }

  // 6. Frequency encoding
  for (const colName of freqCols) {
    const col = colMap[colName];
    if (!col) continue;
    const freq: Record<string, number> = {};
    for (const v of col.rawValues) {
      const lv = v.trim().toLowerCase();
      if (lv && lv !== "nan" && lv !== "null" && lv !== "na") {
        freq[v] = (freq[v] ?? 0) + 1;
      }
    }
    const total = col.rawValues.length;
    addCol(`${colName}_freq`, col.rawValues.map(v => {
      const lv = v.trim().toLowerCase();
      if (!lv || lv === "nan" || lv === "null" || lv === "na") return null;
      return parseFloat(((freq[v] ?? 0) / total).toFixed(4));
    }));
  }

  // Pre-compute sort order for time-series features
  let sortedToOrig: number[] = [];
  let origToRank: number[] = [];
  if (sortCol && (lagCols.length > 0 || rollCols.length > 0)) {
    const sIdx = headerIdx[sortCol];
    const indices = Array.from({ length: nRows }, (_, i) => i);
    indices.sort((a, b) => {
      const ra = dataRows[a][sIdx] ?? "";
      const rb = dataRows[b][sIdx] ?? "";
      const na = parseFloat(ra), nb = parseFloat(rb);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return ra < rb ? -1 : ra > rb ? 1 : 0;
    });
    sortedToOrig = indices;
    origToRank = new Array(nRows);
    for (let r = 0; r < nRows; r++) origToRank[sortedToOrig[r]] = r;
  }

  // 7. Lag / diff features
  if (sortCol && lagCols.length > 0) {
    for (const colName of lagCols) {
      const col = colMap[colName];
      if (!col) continue;
      const sortedVals = sortedToOrig.map(origIdx => col.values[origIdx]);
      const lagVals: (number | null)[] = new Array(nRows).fill(null);
      const diffVals: (number | null)[] = new Array(nRows).fill(null);
      for (let origIdx = 0; origIdx < nRows; origIdx++) {
        const rank = origToRank[origIdx];
        const prevRank = rank - lagN;
        if (prevRank >= 0) {
          lagVals[origIdx] = sortedVals[prevRank];
          if (lagDiff) {
            const cur = sortedVals[rank];
            const prev = sortedVals[prevRank];
            if (cur !== null && prev !== null) {
              diffVals[origIdx] = parseFloat(((cur as number) - (prev as number)).toFixed(4));
            }
          }
        }
      }
      addCol(`${colName}_lag${lagN}`, lagVals);
      if (lagDiff) addCol(`${colName}_diff${lagN}`, diffVals);
    }
  }

  // 8. Rolling window aggregates
  if (sortCol && rollCols.length > 0) {
    for (const colName of rollCols) {
      const col = colMap[colName];
      if (!col) continue;
      const sortedVals = sortedToOrig.map(origIdx => col.values[origIdx]);
      const rollVals: (number | null)[] = new Array(nRows).fill(null);
      for (let origIdx = 0; origIdx < nRows; origIdx++) {
        const rank = origToRank[origIdx];
        if (rank < rollN - 1) continue;
        const window = (sortedVals.slice(rank - rollN + 1, rank + 1).filter(v => v !== null)) as number[];
        if (window.length === 0) continue;
        let agg: number;
        switch (rollAgg) {
          case "std": {
            const m = window.reduce((a, b) => a + b, 0) / window.length;
            agg = Math.sqrt(window.reduce((a, b) => a + (b - m) ** 2, 0) / window.length);
            break;
          }
          case "min": agg = Math.min(...window); break;
          case "max": agg = Math.max(...window); break;
          default:    agg = window.reduce((a, b) => a + b, 0) / window.length;
        }
        rollVals[origIdx] = parseFloat(agg.toFixed(4));
      }
      addCol(`${colName}_roll${rollN}_${rollAgg}`, rollVals);
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
  { key: "log1p",        label: "log1p",    hint: "log(1+x) — reduces right skew" },
  { key: "sqrt",         label: "sqrt",     hint: "√x — milder skew reduction" },
  { key: "zscore",       label: "z-score",  hint: "(x−μ)/σ — standardize to zero mean, unit variance" },
  { key: "minmax",       label: "min-max",  hint: "Scale to [0,1]: (x−min)/(max−min)" },
  { key: "percentile",   label: "pct rank", hint: "Rank scaled to [0,1]" },
  { key: "outlier_flag", label: "outlier",  hint: "1 if |z-score| > 3, else 0" },
  { key: "missing_flag", label: "missing",  hint: "1 if value is NaN/null, else 0" },
  { key: "winsor",       label: "winsor",   hint: "Cap values at 1st/99th percentile" },
  { key: "bin_equal",    label: "bin=",     hint: "5 equal-width bins (0–4)" },
  { key: "bin_quantile", label: "bin~",     hint: "5 quantile bins (0–4)" },
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

const SELECT_STYLE: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  background: "rgba(0,0,0,0.35)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 6,
  color: "var(--text)",
  fontSize: "0.78rem",
  padding: "0.35rem 0.4rem",
  outline: "none",
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
      width: 30, height: 16, borderRadius: 9999, cursor: "pointer", flexShrink: 0,
      background: checked ? ACCENT : "rgba(255,255,255,0.12)", position: "relative",
      transition: "background 0.2s", boxShadow: checked ? `0 0 6px ${ACCENT}55` : "none",
    }}>
      <div style={{ position: "absolute", top: 2, left: checked ? 16 : 2, width: 12, height: 12, borderRadius: 9999, background: "#fff", transition: "left 0.2s" }} />
    </div>
  );
}

// ── Sidebar section header ────────────────────────────────────────────────────

function SideLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: "0.67rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: "0.7rem" }}>
      {children}
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
      setRatios([]);
      setRatioA(""); setRatioB("");
      setFreqCols([]);
      setSortCol("");
      setLagCols([]); setLagN(1); setLagDiff(false);
      setRollCols([]); setRollN(3); setRollAgg("mean");
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

  // ── Apply ──────────────────────────────────────────────────────────────────

  const applyAllTransforms = useCallback(() => {
    setStep("processing");
    setTimeout(() => {
      try {
        const res = applyTransforms_fn(
          rawRows, cols, colTransforms, dateCols, dateParts, interactions, polyCols,
          freqCols, ratios, sortCol, lagCols, lagN, lagDiff, rollCols, rollN, rollAgg
        );
        setResult(res);
        setStep("results");
      } catch (e) {
        setError(String(e));
        setStep("configure");
      }
    }, 50);
  }, [rawRows, cols, colTransforms, dateCols, dateParts, interactions, polyCols,
      freqCols, ratios, sortCol, lagCols, lagN, lagDiff, rollCols, rollN, rollAgg]);

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
    (sortCol ? lagCols.length * (lagDiff ? 2 : 1) + rollCols.length : 0);

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

      {/* ── Configure ── */}
      {step === "configure" && (
        <div style={{ flex: 1, overflow: "hidden", display: "flex", gap: "1rem", padding: "0.5rem 1.5rem 0", width: "100%" }}>

          {/* ── Left sidebar — unified card ── */}
          <div style={{ width: 278, flexShrink: 0, overflowY: "auto", paddingBottom: "1rem" }}>
            <div style={{ background: "rgba(10,18,35,0.88)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, overflow: "hidden" }}>

              {/* Dataset stats */}
              <div style={{ padding: "1.1rem 1.3rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: "0.65rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {filename}
                </div>
                <div style={{ display: "flex", gap: "1.6rem" }}>
                  {[
                    { label: "rows",    value: (rawRows.length - 1).toLocaleString() },
                    { label: "cols",    value: String(cols.length) },
                    { label: "numeric", value: String(numCols.length) },
                  ].map(s => (
                    <div key={s.label}>
                      <div style={{ fontSize: "1.45rem", fontWeight: 800, color: ACCENT, lineHeight: 1 }}>{s.value}</div>
                      <div style={{ fontSize: "0.67rem", color: "var(--text3)", marginTop: "0.22rem" }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Column Combinations */}
              <div style={{ padding: "1rem 1.3rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <SideLabel>Column Combinations</SideLabel>

                {/* A × B */}
                <div style={{ fontSize: "0.67rem", color: "var(--text3)", marginBottom: "0.3rem" }}>
                  Multiply (A × B) → <span style={{ color: ACCENT, fontFamily: "monospace" }}>colA_x_colB</span>
                </div>
                <div style={{ display: "flex", gap: "0.35rem", marginBottom: interactions.length > 0 ? "0.4rem" : "0.55rem" }}>
                  <select value={interactA} onChange={e => setInteractA(e.target.value)} style={SELECT_STYLE}>
                    <option value="">Col A</option>
                    {numCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                  <span style={{ color: "var(--text3)", alignSelf: "center", fontSize: "0.85rem", flexShrink: 0 }}>×</span>
                  <select value={interactB} onChange={e => setInteractB(e.target.value)} style={SELECT_STYLE}>
                    <option value="">Col B</option>
                    {numCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                  <button onClick={addInteraction} disabled={!interactA || !interactB || interactA === interactB}
                    style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(255,255,255,0.08)", color: "var(--text)", border: "1px solid rgba(255,255,255,0.12)", fontWeight: 700, fontSize: "1rem", cursor: (!interactA || !interactB || interactA === interactB) ? "not-allowed" : "pointer", opacity: (!interactA || !interactB || interactA === interactB) ? 0.3 : 1, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    +
                  </button>
                </div>
                {interactions.map(([a, b], i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.2rem 0.55rem", background: `${ACCENT}0c`, borderRadius: 5, marginBottom: "0.2rem" }}>
                    <span style={{ fontSize: "0.72rem", color: ACCENT, fontWeight: 600 }}>{a} × {b}</span>
                    <button onClick={() => setInteractions(prev => prev.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: "0.95rem", lineHeight: 1, padding: 0 }}>×</button>
                  </div>
                ))}

                {/* Divider */}
                <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "0.65rem 0" }} />

                {/* A ÷ B */}
                <div style={{ fontSize: "0.67rem", color: "var(--text3)", marginBottom: "0.3rem" }}>
                  Divide (A ÷ B) → <span style={{ color: "#a78bfa", fontFamily: "monospace" }}>colA_div_colB</span>
                </div>
                <div style={{ display: "flex", gap: "0.35rem", marginBottom: ratios.length > 0 ? "0.4rem" : 0 }}>
                  <select value={ratioA} onChange={e => setRatioA(e.target.value)} style={SELECT_STYLE}>
                    <option value="">Col A</option>
                    {numCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                  <span style={{ color: "var(--text3)", alignSelf: "center", fontSize: "0.85rem", flexShrink: 0 }}>÷</span>
                  <select value={ratioB} onChange={e => setRatioB(e.target.value)} style={SELECT_STYLE}>
                    <option value="">Col B</option>
                    {numCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                  <button onClick={addRatio} disabled={!ratioA || !ratioB || ratioA === ratioB}
                    style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(255,255,255,0.08)", color: "var(--text)", border: "1px solid rgba(255,255,255,0.12)", fontWeight: 700, fontSize: "1rem", cursor: (!ratioA || !ratioB || ratioA === ratioB) ? "not-allowed" : "pointer", opacity: (!ratioA || !ratioB || ratioA === ratioB) ? 0.3 : 1, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    +
                  </button>
                </div>
                {ratios.map(([a, b], i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.2rem 0.55rem", background: "rgba(167,139,250,0.08)", borderRadius: 5, marginBottom: "0.2rem" }}>
                    <span style={{ fontSize: "0.72rem", color: "#a78bfa", fontWeight: 600 }}>{a} ÷ {b}</span>
                    <button onClick={() => setRatios(prev => prev.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: "0.95rem", lineHeight: 1, padding: 0 }}>×</button>
                  </div>
                ))}
              </div>

              {/* Polynomial cross-terms */}
              <div style={{ padding: "1rem 1.3rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <SideLabel>Polynomial Cross-Terms</SideLabel>
                <div style={{ fontSize: "0.67rem", color: "var(--text3)", marginBottom: "0.55rem", lineHeight: 1.5 }}>
                  Generates every pairwise A×B product for the selected columns.
                  {polyCols.length >= 2 && (
                    <span style={{ color: ACCENT }}> → {polyCols.length * (polyCols.length - 1) / 2} new column{polyCols.length * (polyCols.length - 1) / 2 > 1 ? "s" : ""}</span>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.38rem" }}>
                  {numCols.map(c => (
                    <div key={c.name} style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
                      <Toggle checked={polyCols.includes(c.name)} onChange={() => setPolyCols(prev => prev.includes(c.name) ? prev.filter(x => x !== c.name) : [...prev, c.name])} />
                      <span style={{ fontSize: "0.78rem", color: polyCols.includes(c.name) ? "var(--text)" : "var(--text3)" }}>{c.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Frequency Encoding */}
              {catCols.length > 0 && (
                <div style={{ padding: "1rem 1.3rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <SideLabel>Frequency Encoding</SideLabel>
                  <div style={{ fontSize: "0.67rem", color: "var(--text3)", marginBottom: "0.55rem", lineHeight: 1.6 }}>
                    Replaces each value with its share of total rows.<br />
                    <span style={{ color: "var(--text2)" }}>e.g. Sex: male → 0.65, female → 0.35</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.38rem" }}>
                    {catCols.map(c => (
                      <div key={c.name} style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
                        <Toggle checked={freqCols.includes(c.name)} onChange={() => setFreqCols(prev => prev.includes(c.name) ? prev.filter(x => x !== c.name) : [...prev, c.name])} />
                        <span style={{ fontSize: "0.78rem", color: freqCols.includes(c.name) ? "var(--text)" : "var(--text3)" }}>{c.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Date extraction */}
              {catCols.length > 0 && (
                <div style={{ padding: "1rem 1.3rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <SideLabel>Date Extraction</SideLabel>
                  <div style={{ fontSize: "0.67rem", color: "var(--text3)", marginBottom: "0.55rem", lineHeight: 1.5 }}>
                    Toggle columns that contain dates → extracts year, month, day etc.
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", marginBottom: dateCols.length > 0 ? "0.7rem" : 0 }}>
                    {catCols.map(c => (
                      <div key={c.name} style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
                        <Toggle checked={dateCols.includes(c.name)} onChange={() => setDateCols(prev => prev.includes(c.name) ? prev.filter(x => x !== c.name) : [...prev, c.name])} />
                        <span style={{ fontSize: "0.78rem", color: dateCols.includes(c.name) ? "var(--text)" : "var(--text3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
                      </div>
                    ))}
                  </div>
                  {dateCols.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.28rem" }}>
                      {DATE_PARTS.map(p => (
                        <button key={p.key} onClick={() => setDateParts(prev => prev.includes(p.key) ? prev.filter(x => x !== p.key) : [...prev, p.key])}
                          style={{ padding: "3px 8px", borderRadius: 9999, fontSize: "0.69rem", fontWeight: 600, cursor: "pointer", border: `1px solid ${dateParts.includes(p.key) ? "#a78bfa" : "rgba(255,255,255,0.1)"}`, background: dateParts.includes(p.key) ? "rgba(167,139,250,0.12)" : "transparent", color: dateParts.includes(p.key) ? "#a78bfa" : "var(--text3)", transition: "all 0.13s" }}>
                          {p.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Time-Series Features */}
              <div style={{ padding: "1rem 1.3rem" }}>
                <SideLabel>Time-Series Features</SideLabel>
                <div style={{ fontSize: "0.72rem", color: "var(--text3)", marginBottom: "0.65rem", lineHeight: 1.5 }}>
                  Sort rows by a column, then apply lag/diff or rolling aggregates.
                </div>

                {/* Sort column selector */}
                <div style={{ marginBottom: "0.75rem" }}>
                  <div style={{ fontSize: "0.67rem", color: "var(--text3)", marginBottom: "0.28rem" }}>Sort column</div>
                  <select value={sortCol} onChange={e => { setSortCol(e.target.value); setLagCols([]); setRollCols([]); }}
                    style={{ ...SELECT_STYLE, width: "100%" }}>
                    <option value="">— none —</option>
                    {cols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>

                {sortCol && (
                  <>
                    {/* Lag / Diff */}
                    <div style={{ marginBottom: "0.6rem", padding: "0.65rem", background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div style={{ fontSize: "0.64rem", fontWeight: 700, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.5rem" }}>Lag / Diff</div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.45rem" }}>
                        <span style={{ fontSize: "0.71rem", color: "var(--text3)", flexShrink: 0 }}>N =</span>
                        <input
                          type="number" min={1} max={10} value={lagN}
                          onChange={e => setLagN(Math.max(1, parseInt(e.target.value) || 1))}
                          style={{ width: 42, background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 4, color: "var(--text)", fontSize: "0.78rem", padding: "0.2rem 0.3rem", outline: "none", textAlign: "center" }}
                        />
                        <div style={{ display: "flex", alignItems: "center", gap: "0.28rem", marginLeft: "auto" }}>
                          <span style={{ fontSize: "0.71rem", color: "var(--text3)" }}>+diff</span>
                          <Toggle checked={lagDiff} onChange={() => setLagDiff(p => !p)} />
                        </div>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                        {numCols.map(c => (
                          <button key={c.name}
                            onClick={() => setLagCols(prev => prev.includes(c.name) ? prev.filter(x => x !== c.name) : [...prev, c.name])}
                            style={{ padding: "2px 7px", borderRadius: 9999, fontSize: "0.67rem", fontWeight: 600, cursor: "pointer",
                              border: `1px solid ${lagCols.includes(c.name) ? "#f59e0b" : "rgba(255,255,255,0.1)"}`,
                              background: lagCols.includes(c.name) ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.03)",
                              color: lagCols.includes(c.name) ? "#f59e0b" : "var(--text3)",
                              transition: "all 0.13s" }}>
                            {c.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Rolling Window */}
                    <div style={{ padding: "0.65rem", background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div style={{ fontSize: "0.64rem", fontWeight: 700, color: "#e879f9", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.5rem" }}>Rolling Window</div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.45rem" }}>
                        <span style={{ fontSize: "0.71rem", color: "var(--text3)", flexShrink: 0 }}>N =</span>
                        <input
                          type="number" min={2} max={20} value={rollN}
                          onChange={e => setRollN(Math.max(2, parseInt(e.target.value) || 2))}
                          style={{ width: 42, background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 4, color: "var(--text)", fontSize: "0.78rem", padding: "0.2rem 0.3rem", outline: "none", textAlign: "center" }}
                        />
                        <select value={rollAgg} onChange={e => setRollAgg(e.target.value)}
                          style={{ flex: 1, background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 4, color: "var(--text)", fontSize: "0.74rem", padding: "0.22rem 0.3rem", outline: "none" }}>
                          <option value="mean">mean</option>
                          <option value="std">std</option>
                          <option value="min">min</option>
                          <option value="max">max</option>
                        </select>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                        {numCols.map(c => (
                          <button key={c.name}
                            onClick={() => setRollCols(prev => prev.includes(c.name) ? prev.filter(x => x !== c.name) : [...prev, c.name])}
                            style={{ padding: "2px 7px", borderRadius: 9999, fontSize: "0.67rem", fontWeight: 600, cursor: "pointer",
                              border: `1px solid ${rollCols.includes(c.name) ? "#e879f9" : "rgba(255,255,255,0.1)"}`,
                              background: rollCols.includes(c.name) ? "rgba(232,121,249,0.1)" : "rgba(255,255,255,0.03)",
                              color: rollCols.includes(c.name) ? "#e879f9" : "var(--text3)",
                              transition: "all 0.13s" }}>
                            {c.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

            </div>
          </div>

          {/* ── Right panel — pill chip transforms ── */}
          <div style={{ flex: 1, minWidth: 0, overflowY: "auto", paddingBottom: "1rem", display: "flex", flexDirection: "column" }}>
            <div style={{ ...CARD, flex: 1 }}>
              <SectionTitle>Numeric Column Transforms</SectionTitle>

              {numCols.length === 0 ? (
                <div style={{ color: "var(--text3)", fontSize: "0.8rem" }}>No numeric columns detected.</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                  <colgroup>
                    <col style={{ width: 118 }} />
                    <col style={{ width: 44 }} />
                    <col />
                  </colgroup>
                  <thead>
                    <tr>
                      <th style={{ padding: "0 0 0.6rem", textAlign: "left", fontSize: "0.59rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                        Apply to all
                      </th>
                      <th style={{ padding: "0 0 0.6rem", borderBottom: "1px solid rgba(255,255,255,0.07)" }} />
                      <th style={{ padding: "0 0 0.6rem", textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                          {NUM_TRANSFORMS.map(t => {
                            const allOn = numCols.length > 0 && numCols.every(c => (colTransforms[c.name] ?? []).includes(t.key));
                            const anyOn = numCols.some(c => (colTransforms[c.name] ?? []).includes(t.key));
                            return (
                              <button key={t.key} onClick={() => toggleAllTransform(t.key, !allOn)} title={t.hint}
                                style={{
                                  padding: "2px 9px", borderRadius: 9999, fontSize: "0.66rem", fontWeight: 600, cursor: "pointer",
                                  border: `1px solid ${allOn ? ACCENT : anyOn ? `${ACCENT}50` : "rgba(255,255,255,0.1)"}`,
                                  background: allOn ? `${ACCENT}1e` : anyOn ? `${ACCENT}09` : "rgba(255,255,255,0.03)",
                                  color: allOn ? ACCENT : anyOn ? `${ACCENT}99` : "var(--text3)",
                                  transition: "all 0.12s",
                                }}>
                                {t.label}
                              </button>
                            );
                          })}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {numCols.map((col, i) => {
                      const selected = colTransforms[col.name] ?? [];
                      const skewAbs = Math.abs(col.skew);
                      const skewColor = skewAbs > 1.5 ? "#f59e0b" : skewAbs > 0.5 ? "#94a3b8" : "#34d399";
                      const border = i < numCols.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none";
                      return (
                        <tr key={col.name}>
                          <td style={{ padding: "0.5rem 0", borderBottom: border, verticalAlign: "middle" }}>
                            <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={col.name}>
                              {col.name}
                            </div>
                            {col.missing > 0 && <div style={{ fontSize: "0.59rem", color: "#f87171" }}>{col.missing} missing</div>}
                          </td>
                          <td style={{ padding: "0.5rem 0", borderBottom: border, verticalAlign: "middle", textAlign: "center", fontSize: "0.69rem", fontWeight: 700, color: skewColor }}>
                            {col.skew.toFixed(1)}
                          </td>
                          <td style={{ padding: "0.5rem 0", borderBottom: border, verticalAlign: "middle" }}>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                              {NUM_TRANSFORMS.map(t => {
                                const on = selected.includes(t.key);
                                return (
                                  <button key={t.key} onClick={() => toggleTransform(col.name, t.key)} title={t.hint}
                                    style={{
                                      padding: "2px 9px", borderRadius: 9999, fontSize: "0.67rem", fontWeight: 600,
                                      cursor: "pointer",
                                      border: `1px solid ${on ? ACCENT : "rgba(255,255,255,0.1)"}`,
                                      background: on ? `${ACCENT}1a` : "rgba(255,255,255,0.03)",
                                      color: on ? ACCENT : "var(--text3)",
                                      transition: "all 0.12s",
                                      boxShadow: on ? `0 0 7px ${ACCENT}30` : "none",
                                    }}>
                                    {t.label}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
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

          {/* Data preview — first 5 rows */}
          {result.newColumns.length > 0 && (
            <div style={CARD}>
              <SectionTitle>Preview — First 5 Rows (new columns only)</SectionTitle>
              <div style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse", fontSize: "0.72rem", minWidth: "max-content" }}>
                  <thead>
                    <tr>
                      {result.newColumns.map(h => (
                        <th key={h} style={{ padding: "0.35rem 0.75rem 0.35rem 0", textAlign: "left", fontWeight: 700, color: ACCENT, whiteSpace: "nowrap", paddingRight: "1rem", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.csv.slice(1, 6).map((row, ri) => (
                      <tr key={ri} style={{ background: ri % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent" }}>
                        {result.newColumns.map(h => {
                          const idx = result.headers.indexOf(h);
                          const raw = row[idx] ?? "";
                          const num = parseFloat(raw);
                          const cell = raw !== "" && !isNaN(num) ? num.toFixed(2) : raw;
                          return (
                            <td key={h} style={{ padding: "0.3rem 1rem 0.3rem 0", color: "var(--text2)", whiteSpace: "nowrap" }}>
                              {cell}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

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

const applyTransforms_fn = applyTransforms;