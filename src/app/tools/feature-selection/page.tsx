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
  nums: number[];      // finite-or-NaN array; categoricals label-encoded
  rawVals: string[];
  variance: number;
  mean: number;
  missing: number;
  nunique: number;
}

interface SelectionOpts {
  targetCol: string;
  useVariance: boolean;
  varianceThreshold: number;
  useCorrelation: boolean;
  corrThreshold: number;
  useTopK: boolean;
  topK: number;
}

interface FeatureScore {
  name: string;
  score: number;       // normalized 0..1
  variance: number;
  reasons: string[];
  kept: boolean;
}

interface SelectionResult {
  features: FeatureScore[];
  keptCount: number;
  droppedCount: number;
  csvText: string;
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
  const quote = (v: string) =>
    v.includes(",") || v.includes('"') || v.includes("\n")
      ? `"${v.replace(/"/g, '""')}"` : v;
  const lines = [keptCols.map(c => quote(c.name)).join(",")];
  for (let i = 0; i < n; i++) {
    lines.push(keptCols.map(c => quote(c.rawVals[i] ?? "")).join(","));
  }
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

// ── Selection ─────────────────────────────────────────────────────────────────

function runSelection(cols: ColInfo[], opts: SelectionOpts): SelectionResult {
  const targetInfo = opts.targetCol
    ? (cols.find(c => c.name === opts.targetCol) ?? null)
    : null;

  const candidates = cols.filter(
    c => c.type === "numeric" && c.name !== opts.targetCol
  );

  if (candidates.length === 0) {
    return { features: [], keptCount: 0, droppedCount: 0, csvText: "" };
  }

  // Raw MI scores
  const rawMap = Object.fromEntries(
    candidates.map(c => [c.name, miScore(c, targetInfo)])
  );
  const maxRaw = Math.max(...Object.values(rawMap), 1e-10);
  const scores = Object.fromEntries(
    Object.entries(rawMap).map(([k, v]) => [k, v / maxRaw])
  );

  // Step 1 — variance threshold
  const varDropped = new Set<string>();
  if (opts.useVariance) {
    for (const c of candidates) {
      if (c.variance < opts.varianceThreshold) varDropped.add(c.name);
    }
  }

  // Step 2 — correlation filter
  const corrDropped = new Set<string>();
  if (opts.useCorrelation) {
    const eligible = candidates.filter(c => !varDropped.has(c.name));
    for (let i = 0; i < eligible.length; i++) {
      if (corrDropped.has(eligible[i].name)) continue;
      for (let j = i + 1; j < eligible.length; j++) {
        if (corrDropped.has(eligible[j].name)) continue;
        if (Math.abs(pearson(eligible[i].nums, eligible[j].nums)) >= opts.corrThreshold) {
          const si = scores[eligible[i].name] ?? 0;
          const sj = scores[eligible[j].name] ?? 0;
          const drop = si <= sj ? eligible[i].name : eligible[j].name;
          corrDropped.add(drop);
          if (drop === eligible[i].name) break;
        }
      }
    }
  }

  // Step 3 — top-K
  const topKDropped = new Set<string>();
  if (opts.useTopK) {
    const remaining = candidates
      .filter(c => !varDropped.has(c.name) && !corrDropped.has(c.name))
      .sort((a, b) => (scores[b.name] ?? 0) - (scores[a.name] ?? 0));
    remaining.slice(Math.max(1, opts.topK)).forEach(c => topKDropped.add(c.name));
  }

  const features: FeatureScore[] = candidates
    .sort((a, b) => (scores[b.name] ?? 0) - (scores[a.name] ?? 0))
    .map(c => {
      const reasons: string[] = [];
      if (varDropped.has(c.name)) reasons.push("low variance");
      if (corrDropped.has(c.name)) reasons.push("high correlation");
      if (topKDropped.has(c.name)) reasons.push("outside top-K");
      return {
        name: c.name,
        score: scores[c.name] ?? 0,
        variance: c.variance,
        reasons,
        kept: reasons.length === 0,
      };
    });

  // Build output — kept numeric + target + all categorical columns
  const keptNumericNames = new Set(features.filter(f => f.kept).map(f => f.name));
  const keptCols = cols.filter(c =>
    keptNumericNames.has(c.name) ||
    c.name === opts.targetCol ||
    (c.type === "categorical" && c.name !== opts.targetCol)
  );

  return {
    features,
    keptCount: features.filter(f => f.kept).length,
    droppedCount: features.filter(f => !f.kept).length,
    csvText: serializeCSV(keptCols),
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
  });

  const [result, setResult] = useState<SelectionResult | null>(null);
  const [running, setRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<"variance" | "correlation" | "topk">("variance");

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
      // Auto-select last column as target if it looks categorical/binary
      const last = analyzed[analyzed.length - 1];
      if (last && last.nunique <= 20) {
        setOpts(o => ({ ...o, targetCol: last.name }));
      }
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file?.name.endsWith(".csv")) handleFile(file);
    },
    [handleFile]
  );

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
                Upload a CSV, configure thresholds, and eliminate redundant or low-signal features using
                three complementary methods — variance threshold, correlation filter, and mutual information
                ranking. Download the reduced dataset. Everything runs in your browser.
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "flex-start" }}>
              <TechPill label="Variance" />
              <TechPill label="Pearson r" />
              <TechPill label="MI Score" />
              <TechPill label="Top-K" />
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
            ref={fileRef} type="file" accept=".csv"
            style={{ display: "none" }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          {hasFile ? (
            <div style={{
              display: "flex", alignItems: "center",
              justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: `${ACCENT}18`, border: `1px solid ${ACCENT}33`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                    stroke={ACCENT} strokeWidth="1.8">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text)" }}>{fileName}</div>
                  <div style={{ fontSize: "0.73rem", color: "var(--text3)" }}>
                    {rowCount.toLocaleString()} rows · {cols.length} columns
                    ({numericCols.length} numeric, {categoricalCols.length} categorical)
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
            {/* ── Target column ── */}
            <div style={{ ...CARD }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.5rem" }}>
                Target Column
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                <select
                  value={opts.targetCol}
                  onChange={e => setOpts(o => ({ ...o, targetCol: e.target.value }))}
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
                    ? "Features are scored by mutual information with this column using Pearson correlation."
                    : "No target set — features are ranked by normalized variance."}
                </div>
              </div>
            </div>

            {/* ── Method config ── */}
            <div style={{ ...CARD }}>
              <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text)", marginBottom: "1rem" }}>
                Selection Methods
              </div>

              {/* Tabs */}
              <div style={{
                display: "flex", gap: "0.25rem", marginBottom: "1.25rem",
                background: "rgba(0,0,0,0.25)", borderRadius: 8, padding: "0.25rem",
              }}>
                {(["variance", "correlation", "topk"] as const).map(tab => {
                  const labels: Record<string, string> = {
                    variance: "Variance Threshold",
                    correlation: "Correlation Filter",
                    topk: "Top-K Score",
                  };
                  const active = activeTab === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      style={{
                        flex: 1, padding: "0.45rem 0.5rem", border: "none",
                        borderRadius: 6, cursor: "pointer",
                        fontSize: "0.78rem", fontWeight: 600, transition: "all 0.15s",
                        background: active ? ACCENT : "transparent",
                        color: active ? "#000" : "var(--text3)",
                        boxShadow: active ? `0 0 12px ${ACCENT}44` : "none",
                      }}
                    >
                      {labels[tab]}
                    </button>
                  );
                })}
              </div>

              {/* Variance tab */}
              {activeTab === "variance" && (
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={opts.useVariance}
                      onChange={e => setOpts(o => ({ ...o, useVariance: e.target.checked }))}
                    />
                    <span style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--text)" }}>
                      Enable variance threshold
                    </span>
                  </label>
                  <div style={{ opacity: opts.useVariance ? 1 : 0.4, transition: "opacity 0.15s" }}>
                    <div style={{ fontSize: "0.76rem", color: "var(--text3)", marginBottom: "0.75rem", lineHeight: 1.55 }}>
                      Drop numeric features whose variance falls below the threshold. Near-zero variance
                      means a feature is nearly constant and carries almost no predictive information.
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <span style={{ fontSize: "0.76rem", color: "var(--text3)", flexShrink: 0 }}>Threshold</span>
                      <input
                        type="number"
                        min="0" step="0.001"
                        value={opts.varianceThreshold}
                        onChange={e => setOpts(o => ({ ...o, varianceThreshold: Math.max(0, parseFloat(e.target.value) || 0) }))}
                        disabled={!opts.useVariance}
                        style={{
                          width: 100,
                          background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.12)",
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
                        </strong>
                        {" "}of{" "}
                        <strong style={{ color: "var(--text)" }}>{candidateCount}</strong>
                        {" "}numeric features · variance range:{" "}
                        {numericCols.filter(c => c.name !== opts.targetCol).length > 0
                          ? `${Math.min(...numericCols.filter(c => c.name !== opts.targetCol).map(c => c.variance)).toExponential(2)} – ${Math.max(...numericCols.filter(c => c.name !== opts.targetCol).map(c => c.variance)).toExponential(2)}`
                          : "—"}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Correlation tab */}
              {activeTab === "correlation" && (
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={opts.useCorrelation}
                      onChange={e => setOpts(o => ({ ...o, useCorrelation: e.target.checked }))}
                    />
                    <span style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--text)" }}>
                      Enable correlation filter
                    </span>
                  </label>
                  <div style={{ opacity: opts.useCorrelation ? 1 : 0.4, transition: "opacity 0.15s" }}>
                    <div style={{ fontSize: "0.76rem", color: "var(--text3)", marginBottom: "0.75rem", lineHeight: 1.55 }}>
                      When two features have |r| above the threshold, the one with the lower MI score
                      is dropped. Removes multicollinearity without discarding information.
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <span style={{ fontSize: "0.76rem", color: "var(--text3)", flexShrink: 0, width: 52 }}>|r| ≥</span>
                      <input
                        type="range"
                        min="0.5" max="1.0" step="0.01"
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

              {/* Top-K tab */}
              {activeTab === "topk" && (
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={opts.useTopK}
                      onChange={e => setOpts(o => ({ ...o, useTopK: e.target.checked }))}
                    />
                    <span style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--text)" }}>
                      Enable top-K selection
                    </span>
                  </label>
                  <div style={{ opacity: opts.useTopK ? 1 : 0.4, transition: "opacity 0.15s" }}>
                    <div style={{ fontSize: "0.76rem", color: "var(--text3)", marginBottom: "0.75rem", lineHeight: 1.55 }}>
                      Applied after variance and correlation filters. Keeps only the top-K features
                      ranked by MI score. K counts features remaining after earlier filters.
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <span style={{ fontSize: "0.76rem", color: "var(--text3)", flexShrink: 0 }}>Keep top</span>
                      <input
                        type="range"
                        min="1"
                        max={Math.max(candidateCount, 1)}
                        step="1"
                        value={Math.min(opts.topK, Math.max(candidateCount, 1))}
                        onChange={e => setOpts(o => ({ ...o, topK: parseInt(e.target.value) }))}
                        disabled={!opts.useTopK}
                        style={{ flex: 1, accentColor: ACCENT }}
                      />
                      <span style={{ fontSize: "0.84rem", fontWeight: 700, color: ACCENT, width: 60, textAlign: "right" }}>
                        {Math.min(opts.topK, Math.max(candidateCount, 1))} features
                      </span>
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
                {/* ── Summary stats ── */}
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

                {/* ── Feature rankings ── */}
                <div style={{ ...CARD }}>
                  <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text)", marginBottom: "1rem" }}>
                    Feature Rankings
                    <span style={{ fontSize: "0.73rem", fontWeight: 400, color: "var(--text3)", marginLeft: "0.75rem" }}>
                      sorted by MI score high → low
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                    {result.features.map(f => (
                      <div key={f.name} style={{ display: "flex", alignItems: "center", gap: "0.75rem", opacity: f.kept ? 1 : 0.45 }}>
                        <div style={{
                          width: 8, height: 8, borderRadius: 9999, flexShrink: 0,
                          background: f.kept ? ACCENT : "#6b7280",
                        }} />
                        <span
                          title={f.name}
                          style={{
                            width: 190, fontSize: "0.78rem", fontWeight: 500,
                            color: "var(--text)", flexShrink: 0,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}
                        >
                          {f.name}
                        </span>
                        <div style={{
                          flex: 1, height: 7, borderRadius: 9999,
                          background: "rgba(255,255,255,0.07)", minWidth: 0,
                        }}>
                          <div style={{
                            height: "100%",
                            width: `${Math.max(f.score * 100, 2)}%`,
                            borderRadius: 9999,
                            background: f.kept ? ACCENT : "#6b7280",
                            boxShadow: f.kept ? `0 0 6px ${ACCENT}55` : "none",
                            transition: "width 0.4s",
                          }} />
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
                            fontSize: "0.65rem", color: "#6b7280",
                            flexShrink: 0, width: 140, textAlign: "right",
                          }}>
                            {f.reasons.join(", ")}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Download ── */}
                <div style={{
                  ...CARD,
                  background: `${ACCENT}07`, borderColor: `${ACCENT}22`,
                  display: "flex", alignItems: "center",
                  justifyContent: "space-between", flexWrap: "wrap", gap: "1rem",
                }}>
                  <div>
                    <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.2rem" }}>
                      Reduced Dataset Ready
                    </div>
                    <div style={{ fontSize: "0.76rem", color: "var(--text3)" }}>
                      {result.keptCount} selected feature{result.keptCount !== 1 ? "s" : ""}
                      {opts.targetCol ? " + target column" : ""}
                      {categoricalCols.filter(c => c.name !== opts.targetCol).length > 0
                        ? ` + ${categoricalCols.filter(c => c.name !== opts.targetCol).length} categorical column${categoricalCols.filter(c => c.name !== opts.targetCol).length !== 1 ? "s" : ""}`
                        : ""}
                      {" "}· {rowCount.toLocaleString()} rows · CSV
                    </div>
                  </div>
                  <button
                    onClick={handleDownload}
                    style={{
                      padding: "0.6rem 1.4rem",
                      background: ACCENT, border: "none", borderRadius: 8,
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