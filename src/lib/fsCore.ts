// ── Types ─────────────────────────────────────────────────────────────────────

export interface ColInfo {
  name: string;
  type: "numeric" | "categorical";
  nums: number[];
  rawVals: string[];
  variance: number;
  mean: number;
  missing: number;
  nunique: number;
}

export type KBestMethod = "mi" | "f_regression" | "f_classif";

export interface SelectionOpts {
  targetCol: string;
  // Filter
  useVariance: boolean;
  varianceThreshold: number;
  useCorrelation: boolean;
  corrThreshold: number;
  // Score / top-K
  useTopK: boolean;
  topK: number;
  useSelectKBest: boolean;
  selectKBestK: number;
  kBestMethod: KBestMethod;
  useKendall: boolean;
  kendallTopK: number;
  useChiSq: boolean;
  chiSqTopK: number;
  // Embedded
  useRFE: boolean;
  rfeTargetK: number;
  useLasso: boolean;
  lassoAlpha: number;
  lassoTopK: number;
  useRidge: boolean;
  ridgeAlpha: number;
  ridgeTopK: number;
  useTree: boolean;
  treeTopK: number;
  treeNTrees: number;
  // Wrapper
  useForward: boolean;
  forwardK: number;
  useExhaustive: boolean;
  exhaustiveK: number;
  // Reduction
  usePCA: boolean;
  pcaComponents: number;
  useUMAP: boolean;
  umapComponents: number;
  umapNeighbors: number;
}

export interface FeatureScore {
  name: string;
  score: number;
  fScore: number;
  lassoScore: number;
  ridgeScore: number;
  treeScore: number;
  kendallScore: number;
  chiSqScore: number;
  rfeRound: number;
  variance: number;
  reasons: string[];
  kept: boolean;
}

export interface PCAComponent {
  index: number;
  varianceExplained: number;
  cumulativeVariance: number;
  topLoadings: { name: string; loading: number }[];
}

export interface SelectionResult {
  features: FeatureScore[];
  keptCount: number;
  droppedCount: number;
  csvText: string;
  kBestActive: boolean;
  rfeActive: boolean;
  lassoActive: boolean;
  ridgeActive: boolean;
  treeActive: boolean;
  kendallActive: boolean;
  chiSqActive: boolean;
  forwardActive: boolean;
  exhaustiveActive: boolean;
  pcaResult: { components: PCAComponent[]; csvText: string } | null;
  umapResult: { nComponents: number; csvText: string; points: number[][] } | null;
}

// ── CSV ───────────────────────────────────────────────────────────────────────

export function parseCSV(text: string): { headers: string[]; rows: string[][] } {
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

export function analyzeColumns(headers: string[], rows: string[][]): ColInfo[] {
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

export function serializeCSV(keptCols: ColInfo[]): string {
  const n = keptCols[0]?.rawVals.length ?? 0;
  const q = (v: string) =>
    v.includes(",") || v.includes('"') || v.includes("\n")
      ? `"${v.replace(/"/g, '""')}"` : v;
  const lines = [keptCols.map(c => q(c.name)).join(",")];
  for (let i = 0; i < n; i++) lines.push(keptCols.map(c => q(c.rawVals[i] ?? "")).join(","));
  return lines.join("\n");
}