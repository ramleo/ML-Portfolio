// ── Types ──────────────────────────────────────────────────────────────────────

export type ColumnInfo = {
  name: string; is_numeric: boolean; nunique: number; missing: number; dtype: string;
  skew?: number; mean?: number; std?: number; min?: number; max?: number;
};

export type AnalyzeResult = {
  columns: ColumnInfo[];
  suggested_target: string;
  rows: number;
  total_missing: number;
};

export type PrepResult = {
  csvText: string;
  preprocessed_filename: string;
  rows_before: number; rows_after: number;
  cols_before: number; cols_after: number;
  features_before: number; features_after: number;
  ohe_cols_added: number; total_missing: number;
  columns: ColumnInfo[];
};

export type Step = "upload" | "configure" | "processing" | "results";
export type PresetKey = "quick-clean" | "ml-ready" | "custom";

// ── Option lists ──────────────────────────────────────────────────────────────

export const MV_NUM_OPTIONS = [
  { value: "mean",     label: "Mean" },
  { value: "median",   label: "Median" },
  { value: "knn",      label: "KNN (k=5)" },
  { value: "mice",     label: "MICE (iterative)" },
  { value: "ffill",    label: "Forward Fill" },
  { value: "bfill",    label: "Backward Fill" },
  { value: "constant", label: "Constant (0)" },
  { value: "drop",     label: "Drop rows" },
];

export const MV_CAT_OPTIONS = [
  { value: "most_frequent", label: "Most Frequent" },
  { value: "ffill",         label: "Forward Fill" },
  { value: "bfill",         label: "Backward Fill" },
  { value: "constant",      label: "Constant (\"Unknown\")" },
  { value: "drop",          label: "Drop rows" },
];

export const ENCODE_OPTIONS = [
  { value: "none",      label: "None (keep as-is)" },
  { value: "onehot",    label: "One-Hot Encoding" },
  { value: "ordinal",   label: "Ordinal (Label) Encoding" },
  { value: "frequency", label: "Frequency Encoding" },
  { value: "target",    label: "Target Encoding (requires target column)" },
];

export const PRESETS: Record<PresetKey, {
  label: string; desc: string;
  config: { mvNum: string; mvCat: string; removeOutliers: boolean; fixSkewness: boolean; encodeMethod: string; standardize: boolean; removeDups: boolean };
}> = {
  "quick-clean": {
    label: "Quick Clean",
    desc: "Dedup + mean impute, no encoding changes",
    config: { removeDups: true, mvNum: "mean", mvCat: "most_frequent", removeOutliers: false, fixSkewness: false, encodeMethod: "none", standardize: false },
  },
  "ml-ready": {
    label: "ML Ready",
    desc: "KNN impute, outlier removal, skew fix, OHE, Z-score",
    config: { removeDups: true, mvNum: "knn", mvCat: "most_frequent", removeOutliers: true, fixSkewness: true, encodeMethod: "onehot", standardize: true },
  },
  "custom": {
    label: "Custom",
    desc: "Start with defaults and configure manually",
    config: { removeDups: true, mvNum: "mean", mvCat: "most_frequent", removeOutliers: false, fixSkewness: false, encodeMethod: "none", standardize: false },
  },
};

export const STEP_KEYS   = ["upload", "configure", "processing", "results"] as Step[];
export const STEP_LABELS = ["Upload", "Configure", "Processing", "Results"];

// ── Helpers ───────────────────────────────────────────────────────────────────

export function fmtNum(v: number): string {
  if (Math.abs(v) >= 10000) return v.toFixed(0);
  if (Math.abs(v) >= 100)   return v.toFixed(1);
  if (Math.abs(v) >= 10)    return v.toFixed(1);
  return v.toFixed(2);
}

export function missingColor(pct: number): string {
  return pct > 30 ? "#f87171" : pct > 10 ? "#fb923c" : "#4ade80";
}

export function skewBadge(s: number): { label: string; color: string; desc: string } {
  const abs = Math.abs(s);
  if (abs >= 1)   return { label: "High skew",  color: "#f87171", desc: "Long tail — log transform recommended" };
  if (abs >= 0.5) return { label: "Moderate",   color: "#fb923c", desc: "Slight asymmetry" };
  return               { label: "Normal",      color: "#4ade80", desc: "Roughly symmetric" };
}

export function scoreColor(s: number): string {
  return s >= 85 ? "#4ade80" : s >= 70 ? "#fbbf24" : s >= 50 ? "#fb923c" : "#f87171";
}

export function computeQualityScore(rows: number, totalMissing: number, columns: ColumnInfo[]): number {
  let score = 100;
  const totalCells = rows * columns.length;
  if (totalCells > 0) {
    const pct = (totalMissing / totalCells) * 100;
    score -= Math.min(45, pct * 2.5);
  }
  const numericCols = columns.filter(c => c.is_numeric);
  const highSkewCount = numericCols.filter(c => Math.abs(c.skew ?? 0) >= 1).length;
  if (numericCols.length > 0) {
    score -= Math.min(35, (highSkewCount / numericCols.length) * 70);
  }
  const missingCols = columns.filter(c => c.missing > 0).length;
  score -= Math.min(20, (missingCols / Math.max(1, columns.length)) * 40);
  return Math.max(0, Math.round(score));
}
