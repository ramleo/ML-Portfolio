"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ConstellationBackground from "@/components/ConstellationBackground";

const ACCENT = "#fb923c";

// ── Styles ────────────────────────────────────────────────────────────────────

const CARD: React.CSSProperties = {
  background: "rgba(14,22,40,0.72)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 12,
  padding: "1.25rem 1.4rem",
};

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      fontSize: "0.62rem", fontWeight: 600, color,
      textTransform: "uppercase", letterSpacing: "0.08em",
      padding: "2px 8px", borderRadius: 9999,
      background: `${color}14`, border: `1px solid ${color}30`,
    }}>{label}</span>
  );
}

function TechPill({ label }: { label: string }) {
  return (
    <span style={{
      fontSize: "0.72rem", fontWeight: 500, color: ACCENT,
      background: `${ACCENT}12`, border: `1px solid ${ACCENT}28`,
      borderRadius: 6, padding: "2px 10px",
    }}>{label}</span>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface ColInfo {
  name: string;
  type: "numeric" | "categorical";
  nums: number[];
  rawVals: string[];
  variance: number;
  mean: number;
  missing: number;
  nunique: number;
}

type KBestMethod = "mi" | "f_regression" | "f_classif";
type TabId = "variance" | "correlation" | "topk" | "rfe" | "selectkbest";

interface SelectionOpts {
  targetCol: string;
  useVariance: boolean;
  varianceThreshold: number;
  useCorrelation: boolean;
  corrThreshold: number;
  useTopK: boolean;
  topK: number;
  useRFE: boolean;
  rfeTargetK: number;
  useSelectKBest: boolean;
  selectKBestK: number;
  kBestMethod: KBestMethod;
}

interface FeatureScore {
  name: string;
  score: number;      // normalized MI score 0..1 — bar
  fScore: number;     // normalized F/KBest score 0..1 — shown when SKB active
  rfeRound: number;   // round at which RFE eliminated it (0 = not eliminated by RFE)
  variance: number;
  reasons: string[];
  kept: boolean;
}

interface SelectionResult {
  features: FeatureScore[];
  keptCount: number;
  droppedCount: number;
  csvText: string;
  kBestActive: boolean;
  rfeActive: boolean;
}

// ── CSV ───────────────────────────────────────────────────────────────────────

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines: string[] = [];
  let cur = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') { inQ = !inQ; cur += ch; }
    else if (!inQ && (ch === "\n" || ch === "\r")) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      lines.push(cur); cur = "";
    } else cur += ch;
  }
  if (cur.trim()) lines.push(cur);

  function splitLine(line: string): string[] {
    const cells: string[] = [];
    let cell = "", inQq = false;
    for (let i = 0; i <= line.length; i++) {
      const ch = line[i];
      if (i === line.length || (!inQq && ch === ",")) {
        const t = cell.trim();
        cells.push(t.startsWith('"') && t.endsWith('"')
          ? t.slice(1, -1).replace(/""/g, '"') : t);
        cell = "";
      } else { cell += ch; if (ch === '"') inQq = !inQq; }
    }
    return cells;
  }

  const nonEmpty = lines.filter(l => l.trim());
  if (nonEmpty.length < 2) return { headers: [], rows: [] };
  return {
    headers: splitLine(nonEmpty[0]).map(h => h.trim()),
    rows: nonEmpty.slice(1).map(splitLine),
  };
}

function analyzeColumns(headers: string[], rows: string[][]): ColInfo[] {
  return headers.map((name, ci) => {
    const rawVals = rows.map(r => (r[ci] ?? "").trim());
    const parsed = rawVals.map(v => parseFloat(v.replace(/,/g, "")));
    const finiteCount = parsed.filter(isFinite).length;
    const isNumeric = rawVals.length > 0 && finiteCount / rawVals.length > 0.7;

    let nums: number[];
    if (isNumeric) {
      nums = parsed.map(n => (isFinite(n) ? n : NaN));
    } else {
      const cats = [...new Set(rawVals.filter(Boolean))].sort();
      nums = rawVals.map(v => (v ? cats.indexOf(v) : NaN));
    }

    const finite = nums.filter(isFinite);
    const mean = finite.length ? finite.reduce((a, b) => a + b, 0) / finite.length : 0;
    const variance = finite.length > 1
      ? finite.reduce((s, v) => s + (v - mean) ** 2, 0) / finite.length : 0;
    const missing = rawVals.filter(v => {
      const lv = v.toLowerCase();
      return v === "" || lv === "null" || lv === "na" || lv === "nan" || lv === "none";
    }).length;

    return {
      name, type: isNumeric ? "numeric" : "categorical",
      nums, rawVals, variance, mean, missing,
      nunique: new Set(rawVals.filter(Boolean)).size,
    };
  });
}

function serializeCSV(keptCols: ColInfo[]): string {
  const n = keptCols[0]?.rawVals.length ?? 0;
  const q = (v: string) =>
    v.includes(",") || v.includes('"') || v.includes("\n")
      ? `"${v.replace(/"/g, '""')}"` : v;
  const lines = [keptCols.map(c => q(c.name)).join(",")];
  for (let i = 0; i < n; i++) lines.push(keptCols.map(c => q(c.rawVals[i] ?? "")).join(","));
  return lines.join("\n");
}

// ── Statistics ────────────────────────────────────────────────────────────────

function pearson(a: number[], b: number[]): number {
  const pairs: [number, number][] = [];
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (isFinite(a[i]) && isFinite(b[i])) pairs.push([a[i], b[i]]);
  }
  if (pairs.length < 3) return 0;
  const n = pairs.length;
  const ma = pairs.reduce((s, p) => s + p[0], 0) / n;
  const mb = pairs.reduce((s, p) => s + p[1], 0) / n;
  let num = 0, da = 0, db = 0;
  for (const [x, y] of pairs) {
    const dx = x - ma, dy = y - mb;
    num += dx * dy; da += dx * dx; db += dy * dy;
  }
  if (da === 0 || db === 0) return 0;
  return num / Math.sqrt(da * db);
}

function miScore(col: ColInfo, target: ColInfo | null): number {
  if (!target) return col.variance;
  const r = pearson(col.nums, target.nums);
  return Math.max(0, -0.5 * Math.log(Math.max(1 - r * r, 1e-10)));
}

// F(1, n-2) statistic for linear association — matches sklearn f_regression
function fRegression(col: ColInfo, target: ColInfo): number {
  const r = pearson(col.nums, target.nums);
  if (r === 0) return 0;
  const pairs: number[] = [];
  for (let i = 0; i < Math.min(col.nums.length, target.nums.length); i++) {
    if (isFinite(col.nums[i]) && isFinite(target.nums[i])) pairs.push(1);
  }
  const n = pairs.length;
  if (n < 3) return 0;
  const r2 = r * r;
  return Math.max(0, (r2 * (n - 2)) / Math.max(1 - r2, 1e-10));
}

// One-way ANOVA F-statistic — matches sklearn f_classif
function fClassif(col: ColInfo, target: ColInfo): number {
  const groups = new Map<number, number[]>();
  let total = 0;
  for (let i = 0; i < Math.min(col.nums.length, target.nums.length); i++) {
    if (!isFinite(col.nums[i]) || !isFinite(target.nums[i])) continue;
    const cat = Math.round(target.nums[i]);
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(col.nums[i]);
    total++;
  }
  if (groups.size < 2 || total < 3) return 0;
  const k = groups.size;
  const allVals = [...groups.values()].flat();
  const grandMean = allVals.reduce((a, b) => a + b, 0) / total;
  let between = 0, within = 0;
  for (const vals of groups.values()) {
    const gm = vals.reduce((a, b) => a + b, 0) / vals.length;
    between += vals.length * (gm - grandMean) ** 2;
    within += vals.reduce((s, v) => s + (v - gm) ** 2, 0);
  }
  if (within === 0 || total === k) return 0;
  return Math.max(0, (between / (k - 1)) / (within / (total - k)));
}

// ── Selection ─────────────────────────────────────────────────────────────────

function runSelection(cols: ColInfo[], opts: SelectionOpts): SelectionResult {
  const targetInfo = opts.targetCol
    ? (cols.find(c => c.name === opts.targetCol) ?? null) : null;

  const candidates = cols.filter(c => c.type === "numeric" && c.name !== opts.targetCol);
  if (candidates.length === 0) {
    return { features: [], keptCount: 0, droppedCount: 0, csvText: "", kBestActive: false, rfeActive: false };
  }

  // Base MI scores (normalized) — used for bar display and correlation/RFE tie-breaking
  const rawMI = Object.fromEntries(candidates.map(c => [c.name, miScore(c, targetInfo)]));
  const maxMI = Math.max(...Object.values(rawMI), 1e-10);
  const miNorm = Object.fromEntries(Object.entries(rawMI).map(([k, v]) => [k, v / maxMI]));

  // Step 1 — Variance threshold
  const varDropped = new Set<string>();
  if (opts.useVariance) {
    for (const c of candidates) if (c.variance < opts.varianceThreshold) varDropped.add(c.name);
  }

  // Step 2 — Correlation filter
  const corrDropped = new Set<string>();
  if (opts.useCorrelation) {
    const eligible = candidates.filter(c => !varDropped.has(c.name));
    for (let i = 0; i < eligible.length; i++) {
      if (corrDropped.has(eligible[i].name)) continue;
      for (let j = i + 1; j < eligible.length; j++) {
        if (corrDropped.has(eligible[j].name)) continue;
        if (Math.abs(pearson(eligible[i].nums, eligible[j].nums)) >= opts.corrThreshold) {
          const drop = (miNorm[eligible[i].name] ?? 0) <= (miNorm[eligible[j].name] ?? 0)
            ? eligible[i].name : eligible[j].name;
          corrDropped.add(drop);
          if (drop === eligible[i].name) break;
        }
      }
    }
  }

  // Step 3 — Top-K by MI
  const topKDropped = new Set<string>();
  if (opts.useTopK) {
    const pool = candidates
      .filter(c => !varDropped.has(c.name) && !corrDropped.has(c.name))
      .sort((a, b) => (miNorm[b.name] ?? 0) - (miNorm[a.name] ?? 0));
    pool.slice(Math.max(1, opts.topK)).forEach(c => topKDropped.add(c.name));
  }

  // Step 4 — RFE: iterative backward elimination with redundancy penalty
  const rfeDropped = new Set<string>();
  const rfeRoundMap: Record<string, number> = {};
  if (opts.useRFE) {
    const pool = candidates.filter(
      c => !varDropped.has(c.name) && !corrDropped.has(c.name) && !topKDropped.has(c.name)
    );
    let remaining = [...pool];
    let round = 1;
    while (remaining.length > Math.max(1, opts.rfeTargetK)) {
      let minScore = Infinity;
      let minName = "";
      for (const col of remaining) {
        const mi = miScore(col, targetInfo);
        const others = remaining.filter(o => o.name !== col.name);
        const avgR = others.length > 0
          ? others.reduce((s, o) => s + Math.abs(pearson(col.nums, o.nums)), 0) / others.length
          : 0;
        // Importance = MI × (1 - redundancy_weight × avg_correlation)
        const score = mi * (1 - 0.35 * avgR);
        if (score < minScore) { minScore = score; minName = col.name; }
      }
      if (!minName) break;
      rfeDropped.add(minName);
      rfeRoundMap[minName] = round++;
      remaining = remaining.filter(c => c.name !== minName);
    }
  }

  // Step 5 — SelectKBest: univariate F-statistic or MI
  const kBestDropped = new Set<string>();
  const kBestScores: Record<string, number> = {};
  const kBestActive = opts.useSelectKBest;
  const rfeActive = opts.useRFE;

  if (opts.useSelectKBest) {
    const pool = candidates.filter(
      c => !varDropped.has(c.name) && !corrDropped.has(c.name) &&
           !topKDropped.has(c.name) && !rfeDropped.has(c.name)
    );

    const raw = pool.map(c => {
      let score = 0;
      if (!targetInfo) {
        score = c.variance;
      } else if (opts.kBestMethod === "f_regression") {
        score = fRegression(c, targetInfo);
      } else if (opts.kBestMethod === "f_classif") {
        score = fClassif(c, targetInfo);
      } else {
        score = miScore(c, targetInfo);
      }
      return { name: c.name, score };
    });

    const maxF = Math.max(...raw.map(s => s.score), 1e-10);
    for (const { name, score } of raw) kBestScores[name] = score / maxF;

    raw.sort((a, b) => b.score - a.score);
    raw.slice(Math.max(1, opts.selectKBestK)).forEach(s => kBestDropped.add(s.name));
  }

  // Build feature list sorted by MI score descending
  const features: FeatureScore[] = candidates
    .sort((a, b) => (miNorm[b.name] ?? 0) - (miNorm[a.name] ?? 0))
    .map(c => {
      const reasons: string[] = [];
      if (varDropped.has(c.name)) reasons.push("low variance");
      if (corrDropped.has(c.name)) reasons.push("high correlation");
      if (topKDropped.has(c.name)) reasons.push("outside top-K");
      if (rfeDropped.has(c.name)) reasons.push(`RFE round ${rfeRoundMap[c.name] ?? "?"}`);
      if (kBestDropped.has(c.name)) reasons.push("below K best");
      return {
        name: c.name,
        score: miNorm[c.name] ?? 0,
        fScore: kBestScores[c.name] ?? 0,
        rfeRound: rfeRoundMap[c.name] ?? 0,
        variance: c.variance,
        reasons,
        kept: reasons.length === 0,
      };
    });

  // Build output CSV: kept numeric + target + all categoricals
  const keptNames = new Set([
    ...features.filter(f => f.kept).map(f => f.name),
    ...(opts.targetCol ? [opts.targetCol] : []),
    ...cols.filter(c => c.type === "categorical" && c.name !== opts.targetCol).map(c => c.name),
  ]);
  const keptCols = cols.filter(c => keptNames.has(c.name));

  return {
    features,
    keptCount: features.filter(f => f.kept).length,
    droppedCount: features.filter(f => !f.kept).length,
    csvText: serializeCSV(keptCols),
    kBestActive,
    rfeActive,
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FeatureSelectionPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [cols, setCols] = useState<ColInfo[]>([]);
  const [fileName, setFileName] = useState("");
  const [rowCount, setRowCount] = useState(0);

  const [opts, setOpts] = useState<SelectionOpts>({
    targetCol: "",
    useVariance: true,
    varianceThreshold: 0.01,
    useCorrelation: true,
    corrThreshold: 0.9,
    useTopK: false,
    topK: 10,
    useRFE: false,
    rfeTargetK: 10,
    useSelectKBest: false,
    selectKBestK: 10,
    kBestMethod: "f_regression",
  });

  const [result, setResult] = useState<SelectionResult | null>(null);
  const [running, setRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("variance");

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      const { headers, rows } = parseCSV(text);
      if (!headers.length) return;
      const analyzed = analyzeColumns(headers, rows);
      setCols(analyzed);
      setFileName(file.name);
      setRowCount(rows.length);
      setResult(null);
      const last = analyzed[analyzed.length - 1];
      if (last && last.nunique <= 20) {
        setOpts(o => ({
          ...o, targetCol: last.name,
          kBestMethod: last.type === "categorical" ? "f_classif" : "f_regression",
        }));
      }
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith(".csv")) handleFile(file);
  }, [handleFile]);

  const handleRun = useCallback(() => {
    if (!cols.length) return;
    setRunning(true);
    setTimeout(() => {
      setResult(runSelection(cols, opts));
      setRunning(false);
    }, 50);
  }, [cols, opts]);

  const handleDownload = useCallback(() => {
    if (!result?.csvText) return;
    const blob = new Blob([result.csvText], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName.replace(/\.csv$/i, "") + "_selected.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [result, fileName]);

  const hasFile = cols.length > 0;
  const numericCols = cols.filter(c => c.type === "numeric");
  const categoricalCols = cols.filter(c => c.type === "categorical");
  const candidateCount = numericCols.filter(c => c.name !== opts.targetCol).length;
  const targetInfo = cols.find(c => c.name === opts.targetCol) ?? null;

  const TABS: { id: TabId; label: string; enabled: boolean }[] = [
    { id: "variance", label: "Variance", enabled: opts.useVariance },
    { id: "correlation", label: "Corr Filter", enabled: opts.useCorrelation },
    { id: "topk", label: "Top-K", enabled: opts.useTopK },
    { id: "rfe", label: "RFE", enabled: opts.useRFE },
    { id: "selectkbest", label: "Select K Best", enabled: opts.useSelectKBest },
  ];

  return (
    <div style={{ minHeight: "100vh", color: "var(--text)" }}>
      <ConstellationBackground />

      {/* ── Header ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(6,13,26,0.92)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}>
        <div style={{
          maxWidth: 960, margin: "0 auto", padding: "0 1.5rem",
          height: 60, display: "flex", alignItems: "center", gap: "1.5rem",
        }}>
          <button
            onClick={() => router.push("/#capabilities")}
            style={{
              display: "flex", alignItems: "center", gap: "0.4rem",
              background: "none", border: "none", cursor: "pointer",
              color: "var(--text3)", fontSize: "0.78rem", fontWeight: 500, padding: 0,
            }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text3)")}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
              stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 12L4 7l5-5" />
            </svg>
            Portfolio
          </button>
          <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.12)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
            <Badge label="Step 3" color={ACCENT} />
            <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)" }}>Feature Selection</span>
          </div>
          <div style={{ marginLeft: "auto" }}>
            <Badge label="runs in browser" color="#22c55e" />
          </div>
        </div>
      </div>

      <div style={{
        maxWidth: 960, margin: "0 auto",
        padding: "2.5rem 1.5rem 5rem",
        display: "flex", flexDirection: "column", gap: "1.5rem",
      }}>

        {/* ── Hero ── */}
        <div style={{ ...CARD, borderColor: `${ACCENT}22` }}>
          <div style={{
            display: "flex", alignItems: "flex-start",
            justifyContent: "space-between", gap: "1rem", flexWrap: "wrap",
          }}>
            <div>
              <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--text)", marginBottom: "0.45rem" }}>
                Keeping Only What Matters
              </div>
              <div style={{ fontSize: "0.84rem", color: "var(--text2)", maxWidth: 560, lineHeight: 1.6 }}>
                Upload a CSV and apply five complementary methods — variance threshold, correlation filter,
                top-K MI scoring, RFE backward elimination, and univariate SelectKBest — to reduce your
                feature set. Download the result. Everything runs in your browser.
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "flex-start" }}>
              {["Variance", "Pearson r", "MI Score", "RFE", "F-stat"].map(l => (
                <TechPill key={l} label={l} />
              ))}
            </div>
          </div>
        </div>

        {/* ── Upload ── */}
        <div
          style={{
            ...CARD, cursor: "pointer", textAlign: "center",
            borderStyle: hasFile ? "solid" : "dashed",
            borderColor: hasFile ? `${ACCENT}33` : "rgba(255,255,255,0.15)",
            transition: "border-color 0.2s",
          }}
          onClick={() => fileRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
        >
          <input
            ref={fileRef} type="file" accept=".csv" style={{ display: "none" }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          {hasFile ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: `${ACCENT}18`, border: `1px solid ${ACCENT}33`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="1.8">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text)" }}>{fileName}</div>
                  <div style={{ fontSize: "0.73rem", color: "var(--text3)" }}>
                    {rowCount.toLocaleString()} rows · {cols.length} columns ({numericCols.length} numeric, {categoricalCols.length} categorical)
                  </div>
                </div>
              </div>
              <span style={{ fontSize: "0.75rem", color: ACCENT, fontWeight: 500 }}>Click to replace</span>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: "2.2rem", marginBottom: "0.5rem", opacity: 0.25, lineHeight: 1 }}>+</div>
              <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text)", marginBottom: "0.25rem" }}>
                Drop a CSV or click to upload
              </div>
              <div style={{ fontSize: "0.76rem", color: "var(--text3)" }}>
                Any tabular dataset — processed entirely in your browser, never leaves this page
              </div>
            </div>
          )}
        </div>

        {hasFile && (
          <>
            {/* ── Target ── */}
            <div style={{ ...CARD }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.5rem" }}>
                Target Column
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                <select
                  value={opts.targetCol}
                  onChange={e => {
                    const col = cols.find(c => c.name === e.target.value);
                    setOpts(o => ({
                      ...o,
                      targetCol: e.target.value,
                      kBestMethod: col?.type === "categorical" ? "f_classif" : "f_regression",
                    }));
                  }}
                  style={{
                    background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 6, color: "var(--text)", fontSize: "0.82rem",
                    padding: "0.35rem 0.65rem", outline: "none", cursor: "pointer",
                  }}
                >
                  <option value="">(none — rank by variance)</option>
                  {cols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
                <div style={{ fontSize: "0.76rem", color: "var(--text3)", lineHeight: 1.55 }}>
                  {opts.targetCol
                    ? `${targetInfo?.type === "categorical" ? "Categorical" : "Numeric"} target — MI and F-scores computed against this column.`
                    : "No target — features ranked by normalized variance."}
                </div>
              </div>
            </div>

            {/* ── Method config ── */}
            <div style={{ ...CARD }}>
              <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text)", marginBottom: "1rem" }}>
                Selection Methods
              </div>

              {/* Tab bar — 2 rows for 5 tabs */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", marginBottom: "1.25rem", background: "rgba(0,0,0,0.25)", borderRadius: 8, padding: "0.25rem" }}>
                {TABS.map(tab => {
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      style={{
                        flex: "1 1 auto",
                        padding: "0.4rem 0.6rem", border: "none", borderRadius: 6, cursor: "pointer",
                        fontSize: "0.74rem", fontWeight: 600, transition: "all 0.15s",
                        background: active ? ACCENT : "transparent",
                        color: active ? "#000" : tab.enabled ? "var(--text)" : "var(--text3)",
                        boxShadow: active ? `0 0 10px ${ACCENT}44` : "none",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {tab.label}
                      {tab.enabled && !active && (
                        <span style={{ marginLeft: "0.35rem", display: "inline-block", width: 5, height: 5, borderRadius: 9999, background: ACCENT, verticalAlign: "middle" }} />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* ── Variance tab ── */}
              {activeTab === "variance" && (
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem", cursor: "pointer" }}>
                    <input type="checkbox" checked={opts.useVariance}
                      onChange={e => setOpts(o => ({ ...o, useVariance: e.target.checked }))} />
                    <span style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--text)" }}>Enable variance threshold</span>
                  </label>
                  <div style={{ opacity: opts.useVariance ? 1 : 0.4, transition: "opacity 0.15s" }}>
                    <div style={{ fontSize: "0.76rem", color: "var(--text3)", marginBottom: "0.75rem", lineHeight: 1.55 }}>
                      Drop numeric features whose variance falls below the threshold. Near-zero variance means a feature is nearly constant and carries almost no predictive information.
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <span style={{ fontSize: "0.76rem", color: "var(--text3)", flexShrink: 0 }}>Threshold</span>
                      <input
                        type="number" min="0" step="0.001"
                        value={opts.varianceThreshold}
                        onChange={e => setOpts(o => ({ ...o, varianceThreshold: Math.max(0, parseFloat(e.target.value) || 0) }))}
                        disabled={!opts.useVariance}
                        style={{
                          width: 110, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: 6, color: ACCENT, fontSize: "0.84rem", fontWeight: 700,
                          padding: "0.3rem 0.6rem", outline: "none",
                        }}
                      />
                    </div>
                    {hasFile && (
                      <div style={{ fontSize: "0.72rem", color: "var(--text3)", marginTop: "0.6rem" }}>
                        Would drop{" "}
                        <strong style={{ color: "var(--text)" }}>
                          {numericCols.filter(c => c.variance < opts.varianceThreshold && c.name !== opts.targetCol).length}
                        </strong>{" "}of{" "}
                        <strong style={{ color: "var(--text)" }}>{candidateCount}</strong>{" "}
                        numeric features · range:{" "}
                        {candidateCount > 0
                          ? `${Math.min(...numericCols.filter(c => c.name !== opts.targetCol).map(c => c.variance)).toExponential(2)} – ${Math.max(...numericCols.filter(c => c.name !== opts.targetCol).map(c => c.variance)).toExponential(2)}`
                          : "—"}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Correlation tab ── */}
              {activeTab === "correlation" && (
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem", cursor: "pointer" }}>
                    <input type="checkbox" checked={opts.useCorrelation}
                      onChange={e => setOpts(o => ({ ...o, useCorrelation: e.target.checked }))} />
                    <span style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--text)" }}>Enable correlation filter</span>
                  </label>
                  <div style={{ opacity: opts.useCorrelation ? 1 : 0.4, transition: "opacity 0.15s" }}>
                    <div style={{ fontSize: "0.76rem", color: "var(--text3)", marginBottom: "0.75rem", lineHeight: 1.55 }}>
                      When two features have |r| above the threshold, the one with the lower MI score is dropped. Removes multicollinearity without discarding predictive signal.
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <span style={{ fontSize: "0.76rem", color: "var(--text3)", flexShrink: 0, width: 52 }}>|r| ≥</span>
                      <input
                        type="range" min="0.5" max="1.0" step="0.01"
                        value={opts.corrThreshold}
                        onChange={e => setOpts(o => ({ ...o, corrThreshold: parseFloat(e.target.value) }))}
                        disabled={!opts.useCorrelation}
                        style={{ flex: 1, accentColor: ACCENT }}
                      />
                      <span style={{ fontSize: "0.84rem", fontWeight: 700, color: ACCENT, width: 40, textAlign: "right" }}>
                        {opts.corrThreshold.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Top-K tab ── */}
              {activeTab === "topk" && (
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem", cursor: "pointer" }}>
                    <input type="checkbox" checked={opts.useTopK}
                      onChange={e => setOpts(o => ({ ...o, useTopK: e.target.checked }))} />
                    <span style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--text)" }}>Enable top-K by MI score</span>
                  </label>
                  <div style={{ opacity: opts.useTopK ? 1 : 0.4, transition: "opacity 0.15s" }}>
                    <div style={{ fontSize: "0.76rem", color: "var(--text3)", marginBottom: "0.75rem", lineHeight: 1.55 }}>
                      After variance and correlation filters, keep only the K features with the highest mutual information score. Applied before RFE and SelectKBest.
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <span style={{ fontSize: "0.76rem", color: "var(--text3)", flexShrink: 0 }}>Keep top</span>
                      <input
                        type="range" min="1" max={Math.max(candidateCount, 1)} step="1"
                        value={Math.min(opts.topK, Math.max(candidateCount, 1))}
                        onChange={e => setOpts(o => ({ ...o, topK: parseInt(e.target.value) }))}
                        disabled={!opts.useTopK}
                        style={{ flex: 1, accentColor: ACCENT }}
                      />
                      <span style={{ fontSize: "0.84rem", fontWeight: 700, color: ACCENT, width: 72, textAlign: "right" }}>
                        {Math.min(opts.topK, Math.max(candidateCount, 1))} features
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* ── RFE tab ── */}
              {activeTab === "rfe" && (
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem", cursor: "pointer" }}>
                    <input type="checkbox" checked={opts.useRFE}
                      onChange={e => setOpts(o => ({ ...o, useRFE: e.target.checked }))} />
                    <span style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--text)" }}>Enable Recursive Feature Elimination</span>
                  </label>
                  <div style={{ opacity: opts.useRFE ? 1 : 0.4, transition: "opacity 0.15s" }}>
                    <div style={{ fontSize: "0.76rem", color: "var(--text3)", marginBottom: "0.75rem", lineHeight: 1.55 }}>
                      Iterative backward elimination. Each round, the feature with the lowest importance score is removed. Importance = MI(feature, target) × (1 − 0.35 × avg_redundancy_with_remaining). This penalizes features that are both weak and redundant, producing a different elimination order than pure MI ranking.
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}>
                      <span style={{ fontSize: "0.76rem", color: "var(--text3)", flexShrink: 0 }}>Keep</span>
                      <input
                        type="range" min="1" max={Math.max(candidateCount, 1)} step="1"
                        value={Math.min(opts.rfeTargetK, Math.max(candidateCount, 1))}
                        onChange={e => setOpts(o => ({ ...o, rfeTargetK: parseInt(e.target.value) }))}
                        disabled={!opts.useRFE}
                        style={{ flex: 1, accentColor: ACCENT }}
                      />
                      <span style={{ fontSize: "0.84rem", fontWeight: 700, color: ACCENT, width: 72, textAlign: "right" }}>
                        {Math.min(opts.rfeTargetK, Math.max(candidateCount, 1))} features
                      </span>
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text3)" }}>
                      Results show the elimination round for each dropped feature in the ranking table.
                    </div>
                  </div>
                </div>
              )}

              {/* ── SelectKBest tab ── */}
              {activeTab === "selectkbest" && (
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem", cursor: "pointer" }}>
                    <input type="checkbox" checked={opts.useSelectKBest}
                      onChange={e => setOpts(o => ({ ...o, useSelectKBest: e.target.checked }))} />
                    <span style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--text)" }}>Enable Select K Best</span>
                  </label>
                  <div style={{ opacity: opts.useSelectKBest ? 1 : 0.4, transition: "opacity 0.15s" }}>
                    <div style={{ fontSize: "0.76rem", color: "var(--text3)", marginBottom: "0.75rem", lineHeight: 1.55 }}>
                      Ranks features by a univariate score and keeps the top K. Three scoring functions available — choose based on your target type.
                    </div>

                    {/* Scoring method */}
                    <div style={{ marginBottom: "1rem" }}>
                      <div style={{ fontSize: "0.72rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.4rem" }}>Scoring function</div>
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        {([
                          { id: "f_regression", label: "f_regression", desc: "F(1,n-2) stat for linear association · numeric target" },
                          { id: "f_classif", label: "f_classif", desc: "One-way ANOVA F-stat · categorical target" },
                          { id: "mi", label: "mutual_info", desc: "MI approximation via Pearson correlation · any target" },
                        ] as { id: KBestMethod; label: string; desc: string }[]).map(m => (
                          <button
                            key={m.id}
                            onClick={() => setOpts(o => ({ ...o, kBestMethod: m.id }))}
                            disabled={!opts.useSelectKBest}
                            title={m.desc}
                            style={{
                              padding: "0.35rem 0.8rem", borderRadius: 6, cursor: "pointer",
                              fontSize: "0.76rem", fontWeight: 600, transition: "all 0.15s",
                              border: `1px solid ${opts.kBestMethod === m.id ? ACCENT : "rgba(255,255,255,0.12)"}`,
                              background: opts.kBestMethod === m.id ? `${ACCENT}18` : "rgba(0,0,0,0.2)",
                              color: opts.kBestMethod === m.id ? ACCENT : "var(--text3)",
                            }}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                      <div style={{ fontSize: "0.71rem", color: "var(--text3)", marginTop: "0.4rem" }}>
                        {opts.kBestMethod === "f_regression" && "F = r² × (n-2) / (1-r²) — measures linear association strength with a numeric target."}
                        {opts.kBestMethod === "f_classif" && "One-way ANOVA: between-class SS / within-class SS — measures how well a feature separates class groups."}
                        {opts.kBestMethod === "mi" && "MI ≈ −0.5 × log(1 − r²) — information-theoretic score, works for any target type."}
                      </div>
                    </div>

                    {/* K slider */}
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <span style={{ fontSize: "0.76rem", color: "var(--text3)", flexShrink: 0 }}>Keep best</span>
                      <input
                        type="range" min="1" max={Math.max(candidateCount, 1)} step="1"
                        value={Math.min(opts.selectKBestK, Math.max(candidateCount, 1))}
                        onChange={e => setOpts(o => ({ ...o, selectKBestK: parseInt(e.target.value) }))}
                        disabled={!opts.useSelectKBest}
                        style={{ flex: 1, accentColor: ACCENT }}
                      />
                      <span style={{ fontSize: "0.84rem", fontWeight: 700, color: ACCENT, width: 72, textAlign: "right" }}>
                        {Math.min(opts.selectKBestK, Math.max(candidateCount, 1))} features
                      </span>
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text3)", marginTop: "0.5rem" }}>
                      Results show normalized F/MI scores as a secondary bar in the ranking table.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Run ── */}
            <button
              onClick={handleRun}
              disabled={running}
              style={{
                padding: "0.75rem 2rem",
                background: ACCENT, border: "none", borderRadius: 8,
                color: "#000", fontWeight: 700, fontSize: "0.9rem",
                cursor: running ? "wait" : "pointer",
                boxShadow: `0 0 20px ${ACCENT}44`,
                alignSelf: "flex-start",
                opacity: running ? 0.6 : 1, transition: "opacity 0.15s",
              }}
            >
              {running ? "Running..." : "Run Feature Selection"}
            </button>

            {result && (
              <>
                {/* ── Stats ── */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
                  {[
                    { label: "Input Features", value: String(result.features.length) },
                    { label: "Features Kept", value: String(result.keptCount), accent: true },
                    { label: "Features Dropped", value: String(result.droppedCount) },
                    {
                      label: "Reduction",
                      value: result.features.length > 0
                        ? `${Math.round((result.droppedCount / result.features.length) * 100)}%`
                        : "0%",
                    },
                  ].map(s => (
                    <div key={s.label} style={{ ...CARD, textAlign: "center" }}>
                      <div style={{ fontSize: "1.6rem", fontWeight: 800, color: s.accent ? ACCENT : "var(--text)" }}>
                        {s.value}
                      </div>
                      <div style={{ fontSize: "0.73rem", color: "var(--text3)", marginTop: "0.2rem" }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* ── Rankings ── */}
                <div style={{ ...CARD }}>
                  <div style={{ marginBottom: "1rem" }}>
                    <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text)" }}>Feature Rankings</span>
                    <span style={{ fontSize: "0.73rem", fontWeight: 400, color: "var(--text3)", marginLeft: "0.75rem" }}>
                      bar = MI score · {result.kBestActive ? "secondary bar = F/MI score · " : ""}high → low
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
                    {result.features.map(f => (
                      <div key={f.name} style={{ opacity: f.kept ? 1 : 0.45 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <div style={{
                            width: 8, height: 8, borderRadius: 9999, flexShrink: 0,
                            background: f.kept ? ACCENT : "#6b7280",
                          }} />
                          <span
                            title={f.name}
                            style={{
                              width: 180, fontSize: "0.78rem", fontWeight: 500, color: "var(--text)",
                              flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}
                          >
                            {f.name}
                          </span>
                          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
                            {/* MI bar */}
                            <div style={{ height: 7, borderRadius: 9999, background: "rgba(255,255,255,0.07)" }}>
                              <div style={{
                                height: "100%", width: `${Math.max(f.score * 100, 2)}%`,
                                borderRadius: 9999,
                                background: f.kept ? ACCENT : "#6b7280",
                                boxShadow: f.kept ? `0 0 6px ${ACCENT}44` : "none",
                                transition: "width 0.4s",
                              }} />
                            </div>
                            {/* F/KBest bar — shown when SelectKBest active and has a score */}
                            {result.kBestActive && f.fScore > 0 && (
                              <div style={{ height: 4, borderRadius: 9999, background: "rgba(255,255,255,0.05)" }}>
                                <div style={{
                                  height: "100%", width: `${Math.max(f.fScore * 100, 2)}%`,
                                  borderRadius: 9999, background: "#a78bfa",
                                  transition: "width 0.4s",
                                }} />
                              </div>
                            )}
                          </div>
                          <span style={{
                            fontSize: "0.7rem", fontWeight: 600,
                            color: f.kept ? ACCENT : "#6b7280",
                            width: 36, textAlign: "right", flexShrink: 0,
                          }}>
                            {f.score.toFixed(2)}
                          </span>
                          {!f.kept && (
                            <span style={{
                              fontSize: "0.64rem", color: "#6b7280",
                              flexShrink: 0, width: 160, textAlign: "right",
                            }}>
                              {f.reasons.join(" · ")}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Download ── */}
                <div style={{
                  ...CARD, background: `${ACCENT}07`, borderColor: `${ACCENT}22`,
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  flexWrap: "wrap", gap: "1rem",
                }}>
                  <div>
                    <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.2rem" }}>
                      Reduced Dataset Ready
                    </div>
                    <div style={{ fontSize: "0.76rem", color: "var(--text3)" }}>
                      {result.keptCount} selected feature{result.keptCount !== 1 ? "s" : ""}
                      {opts.targetCol ? " + target" : ""}
                      {categoricalCols.filter(c => c.name !== opts.targetCol).length > 0
                        ? ` + ${categoricalCols.filter(c => c.name !== opts.targetCol).length} categorical`
                        : ""}
                      {" "}· {rowCount.toLocaleString()} rows · CSV
                    </div>
                  </div>
                  <button
                    onClick={handleDownload}
                    style={{
                      padding: "0.6rem 1.4rem", background: ACCENT, border: "none", borderRadius: 8,
                      color: "#000", fontWeight: 700, fontSize: "0.84rem",
                      cursor: "pointer", boxShadow: `0 0 14px ${ACCENT}44`,
                    }}
                  >
                    Download CSV
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}