// Shared type + card/label style helpers for OptunaResults.tsx and
// OptunaAIExplain.tsx (split apart 2026-08-15 to stay under the 400-line cap).
export const ACCENT = "#7e68c0";

export interface FIEntry { feature: string; importance: number }
export interface CVEntry { name: string; score: number; fold_scores?: number[] }
export interface TrialEntry { trial: number; value: number }

export interface TrainResult {
  winner: string;
  task?: string;
  cv_results: CVEntry[];
  winner_metrics: Record<string, number | string>;
  feature_importance: FIEntry[];
  optuna_params?: Record<string, number | string>;
  optuna_best_score?: number;
  optuna_n_trials?: number;
  optuna_trials?: TrialEntry[];
  optuna_param_importance?: Record<string, number>;
  optuna_error?: string;
  optuna_sampler?: string;
  optuna_primary_metric?: string;
  optuna_secondary_metric?: string;
  optuna_secondary_trials?: TrialEntry[];
  learning_curve?: {
    train_sizes: number[];
    train_scores: number[];
    val_scores: number[];
    metric_label: string;
    cv_folds: number;
  };
}

export const card = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: "var(--bg-glass)",
  backdropFilter: "blur(14px)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: "0.9rem 1rem",
  ...extra,
});

export const label = (extra?: React.CSSProperties): React.CSSProperties => ({
  fontSize: "0.68rem",
  fontWeight: 700,
  color: ACCENT,
  textTransform: "uppercase" as const,
  letterSpacing: "0.07em",
  marginBottom: "0.6rem",
  ...extra,
});

export const badge = (extra?: React.CSSProperties): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  padding: "0.25rem 0.6rem",
  borderRadius: 999,
  fontSize: "0.72rem",
  fontWeight: 700,
  background: `${ACCENT}18`,
  border: `1px solid ${ACCENT}35`,
  color: ACCENT,
  ...extra,
});