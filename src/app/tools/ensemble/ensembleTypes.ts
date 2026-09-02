/**
 * Shapes the ensemble tool exchanges with the backend, and the card style
 * every panel shares.
 *
 * Split out of EnsembleRunner, which had grown past the length limit. These
 * are declarations, not behaviour — nothing here renders or fetches.
 */
export const CARD: React.CSSProperties = {
  background: "var(--bg-glass)",
  backdropFilter: "blur(14px)",
  border: "1px solid var(--border)",
  borderRadius: 16,
  padding: "1.25rem 1.4rem",
};

export type Step = 1 | 2 | 3;

export interface Column {
  name: string;
  is_numeric: boolean;
  nunique: number;
  missing: number;
}

export interface AnalyzeResult {
  columns: Column[];
  suggested_target: string;
  suggested_task: "classification" | "regression";
  rows: number;
}

export interface CVEntry { name: string; score: number }
export interface FailedModel { algorithm: string; reason: string }
export interface TrainResult {
  winner: string;
  cv_results: CVEntry[];
  /** Models that were requested but could not be scored. Absent on older
   *  backends; an empty list and an omitted list mean the same thing. */
  failed_models?: FailedModel[];
  winner_metrics: Record<string, number | string>;
  feature_importance: { feature: string; importance: number }[];
}

export const ALL_MODELS = ["Random Forest", "XGBoost", "LightGBM", "CatBoost", "Extra Trees"];
