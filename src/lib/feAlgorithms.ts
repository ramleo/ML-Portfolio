// ── Types ─────────────────────────────────────────────────────────────────────

export type ColInfo = {
  name: string; isNumeric: boolean; dtype: string;
  nunique: number; missing: number; skew: number;
  values: (number | null)[];
  rawValues: string[];
};

export type Step = "upload" | "configure" | "processing" | "results";

export type FeResult = {
  csv: string[][];
  headers: string[];
  colsBefore: number; colsAfter: number;
  rows: number; newColumns: string[];
};

// ── CSV parser ────────────────────────────────────────────────────────────────

export function parseCSV(text: string): string[][] {
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

export function computeSkew(nums: number[]): number {
  if (nums.length < 3) return 0;
  const n = nums.length;
  const mean = nums.reduce((a, b) => a + b, 0) / n;
  const std = Math.sqrt(nums.reduce((a, b) => a + (b - mean) ** 2, 0) / n);
  if (std === 0) return 0;
  return nums.reduce((a, b) => a + ((b - mean) / std) ** 3, 0) / n;
}

export function analyzeColumns(rows: string[][]): ColInfo[] {
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

// ── Top-value helper (for categorical distribution bars) ──────────────────────

export function getTopValues(col: ColInfo, limit = 6): { value: string; count: number; pct: number }[] {
  const counts: Record<string, number> = {};
  const total = col.rawValues.length;
  for (const v of col.rawValues) {
    const lv = v.trim().toLowerCase();
    if (lv && lv !== "nan" && lv !== "null" && lv !== "na") counts[v] = (counts[v] ?? 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([value, count]) => ({ value, count, pct: count / total }));
}

// ── Constants ─────────────────────────────────────────────────────────────────

export const NUM_TRANSFORMS = [
  { key: "log1p",        label: "log1p",    hint: "log(1+x) — reduces right skew",                      desc: "log(1+x) — tames right skew" },
  { key: "sqrt",         label: "sqrt",     hint: "sqrt(x) — milder skew reduction",                     desc: "sqrt(x) — milder skew fix" },
  { key: "zscore",       label: "z-score",  hint: "(x-mean)/std — standardize to zero mean, unit variance", desc: "(x-mean)/std — zero mean, unit var" },
  { key: "minmax",       label: "min-max",  hint: "Scale to [0,1]: (x-min)/(max-min)",                   desc: "rescale to [0, 1]" },
  { key: "percentile",   label: "pct rank", hint: "Rank scaled to [0,1]",                                desc: "rank as fraction [0, 1]" },
  { key: "outlier_flag", label: "outlier",  hint: "1 if |z-score| > 3, else 0",                         desc: "flag if |z-score| > 3" },
  { key: "missing_flag", label: "missing",  hint: "1 if value is NaN/null, else 0",                      desc: "flag if null / NaN" },
  { key: "winsor",       label: "winsor",   hint: "Cap values at 1st/99th percentile",                   desc: "clip to 1st-99th pct" },
  { key: "above_mean",   label: "> mean",   hint: "1 if value > column mean, else 0",                    desc: "1 if above col mean" },
  { key: "bin_equal",    label: "bin=",     hint: "5 equal-width bins (0-4)",                            desc: "5 equal-width bins (0-4)" },
  { key: "bin_quantile", label: "bin~",     hint: "5 quantile bins (0-4)",                               desc: "5 quantile bins (0-4)" },
];

export const DATE_PARTS = [
  { key: "year", label: "Year" }, { key: "month", label: "Month" },
  { key: "day", label: "Day" }, { key: "dayofweek", label: "Day of week" },
  { key: "hour", label: "Hour" }, { key: "quarter", label: "Quarter" },
];
