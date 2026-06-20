// Types and utilities specific to PreprocessingModal (API-based flow using csv_b64).
// Pure helpers shared by PreprocessingModalParts components.

export const ACCENT   = "#22d3ee";
export const CARD_BG  = "rgba(17,24,39,0.65)";

// ── Types ─────────────────────────────────────────────────────────────────────

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
  csv_b64: string;
  preprocessed_filename: string;
  rows_before: number; rows_after: number;
  cols_before: number; cols_after: number;
  features_before: number; features_after: number;
  ohe_cols_added: number; total_missing: number;
  columns: ColumnInfo[];
};

export type Step = "upload" | "configure" | "processing" | "results";

// ── Option lists ───────────────────────────────────────────────────────────────

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

// ── Pure helpers ───────────────────────────────────────────────────────────────

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

export const SELECT_STYLE = {
  background: "#111827", border: "1px solid var(--border2)", borderRadius: 8,
  color: "var(--text)", fontSize: "0.8rem", padding: "0.4rem 0.6rem", width: "100%",
} as const;