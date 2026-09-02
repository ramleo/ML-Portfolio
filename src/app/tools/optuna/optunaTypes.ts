/**
 * Shapes the Optuna tool exchanges with the backend, plus the shared card
 * style and the model list.
 *
 * Split out of OptunaRunner to keep it clear of the length limit — the file
 * sat at exactly 350 once the demo anchors went in, which is one edit away
 * from breaching it.
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

export interface FIEntry { feature: string; importance: number }
export interface CVEntry { name: string; score: number }
export interface TrainResult {
  winner: string;
  cv_results: CVEntry[];
  winner_metrics: Record<string, number | string>;
  feature_importance: FIEntry[];
  best_params?: Record<string, number | string>;
}

export const MODELS = ["Random Forest", "XGBoost", "LightGBM", "CatBoost", "Extra Trees"];
