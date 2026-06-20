// ── AutoML shared types, constants, and pure helpers ─────────────────────────

export const ACCENT   = "#22c55e";
export const CARD_BG  = "rgba(17,24,39,0.65)";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ColumnInfo = { name: string; is_numeric: boolean; nunique: number; missing: number };

export type AnalyzeResult = {
  columns: ColumnInfo[];
  suggested_target: string;
  suggested_task: "classification" | "regression";
  rows: number;
  total_missing: number;
};

export type CVResult = { algorithm: string; score: number; fold_scores: number[] };

export type WinnerMetrics = {
  mae?: number; rmse?: number; mape?: number; max_error?: number; median_ae?: number; r2?: number;
  accuracy?: number; f1_weighted?: number; precision?: number; recall?: number; roc_auc?: number;
};

export type FeatureImportanceItem = { feature: string; importance: number };

export type ModelComparisonItem = { algorithm: string; fitness_score: number; reason: string };
export type ActionableInsight   = { title: string; detail: string };

export type Explanation = {
  why_won: string;
  score_analysis: string;
  key_drivers: string;
  recommendations: string[];
  model_comparison?: ModelComparisonItem[];
  actionable_insights?: ActionableInsight[];
};

export type AutoMLResult = {
  winner: string;
  selection_metric: string;
  cv_results: CVResult[];
  task: "classification" | "regression";
  winner_metrics?: WinnerMetrics;
  feature_importance?: FeatureImportanceItem[];
  explanation?: Explanation;
  explanation_source?: string;
  is_imbalanced?: boolean;
  n_rows?: number;
};

export type TrainResult = {
  id: string;
  title: string;
  fileName?: string;
  metric: string;
  metricLabel: string;
  automl: AutoMLResult;
};

export type HistoryEntry = { ts: string; result: TrainResult };

export type SavedRun = {
  id: string;
  datasetName: string;
  runNumber: number;
  winner: string;
  score: string;
  task: "classification" | "regression";
  date: string;
  result: TrainResult;
};

export type LLMProvider = "gemini-2.5" | "anthropic" | "openai" | "groq" | "groq-mixtral" | "custom";

export type Step = "upload" | "config" | "training" | "results";

// ── Constants ─────────────────────────────────────────────────────────────────

export const LLM_PROVIDERS: { value: LLMProvider; label: string }[] = [
  { value: "gemini-2.5",   label: "Gemini 2.5 Flash" },
  { value: "anthropic",    label: "Claude Haiku" },
  { value: "openai",       label: "GPT-4o Mini" },
  { value: "groq",         label: "Groq Llama 3.3" },
  { value: "groq-mixtral", label: "Mixtral 8x7B (Groq)" },
  { value: "custom",       label: "Custom (OpenAI-compatible)" },
];

export const LLM_KEY_HINTS: Record<LLMProvider, string> = {
  "gemini-2.5":   "Get a free key at aistudio.google.com",
  "anthropic":    "Get a key at console.anthropic.com",
  "openai":       "Get a key at platform.openai.com",
  "groq":         "Get a free key at console.groq.com",
  "groq-mixtral": "Get a free key at console.groq.com",
  "custom":       "Leave blank if your endpoint does not require authentication",
};

export const DEFAULT_ML_MODELS = ["Random Forest", "XGBoost", "LightGBM", "CatBoost", "Extra Trees"] as const;
export const SHARED_ML_MODELS  = [...DEFAULT_ML_MODELS, "Decision Tree", "KNN"] as const;
export const TASK_ML_MODELS: Record<"classification" | "regression", string[]> = {
  classification: ["Logistic Regression", "SVM", "Naive Bayes", "Gradient Boosting", "AdaBoost"],
  regression:     ["Ridge", "Lasso", "ElasticNet", "SVR", "Gradient Boosting"],
};

export const STEP_LABELS = ["Upload", "Configure", "Training", "Results"];
export const STEP_KEYS   = ["upload", "config", "training", "results"] as Step[];

export const MAX_SAVED_PER_DATASET = 5;

// ── Helpers ───────────────────────────────────────────────────────────────────

import { type ModelResult } from "@/types/pipeline";

export function algoToKey(algo: string): ModelResult["algo"] {
  if (algo.includes("XGBoost"))  return "XGBoost";
  if (algo.includes("LightGBM")) return "LightGBM";
  if (algo.includes("CatBoost")) return "CatBoost";
  return "RandomForest";
}

export function trainingEstimate(
  rows: number | undefined,
  selectedModels: Set<string>,
): string {
  const r    = rows ?? 1000;
  const base = r < 500 ? 5 : r < 2000 ? 12 : r < 10000 ? 25 : 50;
  const SLOW = new Set(["XGBoost", "LightGBM", "CatBoost", "Gradient Boosting", "SVM", "SVR", "Extra Trees"]);
  const FAST = new Set(["Naive Bayes", "Decision Tree", "Ridge", "Lasso", "ElasticNet"]);
  let total = 0;
  for (const m of selectedModels) {
    total += SLOW.has(m) ? base * 1.8 : FAST.has(m) ? base * 0.6 : base;
  }
  total = Math.round(total * 1.2);
  const lo  = Math.round(total * 0.8);
  const hi  = Math.round(total * 1.4);
  const fmt = (s: number) => s < 60 ? `${s}s` : `${Math.round(s / 60 * 2) / 2} min`;
  return lo === hi ? `~${fmt(lo)}` : `${fmt(lo)}–${fmt(hi)}`;
}

export function formatWinnerScore(
  task: "classification" | "regression",
  score: number,
): string {
  return task === "regression"
    ? score.toFixed(2)
    : `${(score * 100).toFixed(2)}%`;
}
