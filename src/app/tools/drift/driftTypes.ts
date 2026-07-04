export type ModelMeta = { id: string; title: string; task: string; accent: string };

export type FeatureDrift = {
  name: string;
  label: string;
  type: "numeric" | "categorical";
  drift_score: number;
  drift_level: "low" | "medium" | "high";
  psi: number;
  psi_level: string;
  null_rate: number;
  n_recent: number;
  // numeric
  ref_mean?: number;
  ref_std?: number;
  recent_mean?: number;
  recent_std?: number;
  ks_stat?: number;
  ks_pvalue?: number;
  histogram?: { lo: number; hi: number; ref_h: number; actual_h: number }[];
  // categorical
  options?: string[];
  ref_dist?: Record<string, number>;
  recent_dist?: Record<string, number>;
  cat_baseline?: string;
  high_cardinality?: boolean;
};

export type TrendPoint = {
  ts: number;
  overall_score: number;
  overall_level: string;
  label?: string;
};

export type DriftResult = {
  n_recent: number;
  overall_score: number;
  overall_level: string;
  baseline: string;
  source: string;
  filename?: string;
  label?: string;
  features: FeatureDrift[];
  trend: TrendPoint[];
};

export function levelColor(lv: string) {
  if (lv === "high")   return "#f87171";
  if (lv === "medium") return "#fbbf24";
  return "#34d399";
}

export const ACCENT = "#fb923c";