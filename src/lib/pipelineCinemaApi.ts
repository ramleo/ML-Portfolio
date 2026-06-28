import { ML_UNIFIED_API as API } from "@/config/urls";

export type StageKind = "preprocessing" | "feature-eng" | "feature-select" | "automl";

// ── Response types ────────────────────────────────────────────────────────────

export interface PreprocessResponse {
  processed_csv_b64: string;
  rows_before: number;
  cols_before: number;
  rows_after: number;
  cols_after: number;
  imputed_cols: Record<string, number>;
  duplicates_removed: number;
  outlier_clipped_cols: string[];
  skewed_cols: string[];
}

export interface FeatureEngResponse {
  processed_csv_b64: string;
  features_before: number;
  features_added: number;
  new_columns?: string[];
}

export interface FeatureSelectResponse {
  processed_csv_b64: string;
  features_before: number;
  features_after: number;
  dropped_features: string[];
}

export interface AutoMLResponse {
  // New shape
  leaderboard?: Array<{ algo: string; score: number; error?: string }>;
  winner?: unknown; // can be string OR { algo, score, metric }
  // Old shape fallbacks
  scores?: Record<string, number>;
  model_scores?: Record<string, number>;
  models?: Array<{ name?: string; model?: string; score?: number }>;
  best_model?: unknown;
  best_score?: number;
  score?: number;
  rows?: number;
}

// ── Stage callers ─────────────────────────────────────────────────────────────

export async function callPreprocess(
  csvB64: string,
  target: string
): Promise<{ csv: string; lines: string[] } | null> {
  const res = await fetch(`${API}/pipeline-builder/preprocess`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      csv_b64: csvB64,
      target,
      config: {
        mv_num: "mean",
        mv_cat: "most_frequent",
        remove_duplicates: true,
        remove_outliers: true,
        outlier_method: "iqr",
        outlier_thresh: 1.5,
        fix_skewness: true,
        drop_cols: [],
      },
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as PreprocessResponse;
  const imputedList = Object.entries(data.imputed_cols ?? {})
    .map(([c, n]) => `${c} (${n})`)
    .join(", ");
  return {
    csv: data.processed_csv_b64,
    lines: [
      `Loading your dataset — ${data.rows_before} rows, ${data.cols_before} columns detected.`,
      imputedList
        ? `Imputing missing values: ${imputedList}.`
        : "No missing values found — great data quality!",
      data.duplicates_removed > 0
        ? `Removed ${data.duplicates_removed} duplicate row${data.duplicates_removed > 1 ? "s" : ""}.`
        : "No duplicate rows found.",
      data.outlier_clipped_cols?.length > 0
        ? `Clipped outliers in: ${data.outlier_clipped_cols.join(", ")}.`
        : "No extreme outliers detected.",
      data.skewed_cols?.length > 0
        ? `Fixed skewness in: ${data.skewed_cols.join(", ")} using log1p.`
        : "Distributions look normal — no skew correction needed.",
      `Done! ${data.rows_after} rows × ${data.cols_after} columns — clean and ready.`,
    ],
  };
}

export async function callFeatureEng(
  csvB64: string,
  target: string
): Promise<{ csv: string; lines: string[]; engineeredCols: string[] } | null> {
  const res = await fetch(`${API}/pipeline-builder/feature-eng`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      csv_b64: csvB64,
      target,
      config: { transforms: {}, poly_cols: [], interactions: [] },
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as FeatureEngResponse;
  const engineeredCols: string[] = Array.isArray(data.new_columns) ? data.new_columns : [];
  return {
    csv: data.processed_csv_b64,
    lines: [
      `Starting with ${data.features_before - 1} feature columns after preprocessing.`,
      "Feature engineering creates new signals from existing columns.",
      "Techniques: polynomial expansion, column interactions, log transforms.",
      "Example: Age × Fare interaction captures combined wealth-age effect.",
      data.features_added > 0
        ? `${data.features_added} new features created!`
        : "Use Pipeline Builder's FE stage to add custom transforms to your data.",
    ],
    engineeredCols,
  };
}

export async function callFeatureSelect(
  csvB64: string,
  target: string
): Promise<{ csv: string; lines: string[] } | null> {
  const res = await fetch(`${API}/pipeline-builder/feature-select`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      csv_b64: csvB64,
      target,
      config: { method: "variance", top_k: 10 },
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as FeatureSelectResponse;
  const dropped = data.dropped_features?.length ?? 0;
  return {
    csv: data.processed_csv_b64,
    lines: [
      `Evaluating ${data.features_before} features using variance thresholding.`,
      "Low-variance features carry little predictive signal — they'll be removed.",
      dropped > 0
        ? `Dropping ${dropped} low-variance feature${dropped > 1 ? "s" : ""}: ${data.dropped_features?.slice(0, 3).join(", ")}${dropped > 3 ? "..." : ""}.`
        : "All features pass the variance threshold!",
      `Keeping ${data.features_after} features for model training. Leaner = faster + less overfitting.`,
    ],
  };
}

function fuzzyScore(scores: Record<string, number>, name: string): number | undefined {
  if (typeof scores[name] === "number") return scores[name];
  const norm = (s: string) => s.toLowerCase().replace(/[\s_\-]/g, "");
  const entry = Object.entries(scores).find(([k]) => norm(k) === norm(name));
  return entry ? entry[1] : undefined;
}

export async function callAutoML(
  csvB64: string,
  target: string,
  taskType: "classification" | "regression"
): Promise<{ lines: string[]; models: Array<{ name: string; score: number }>; winner: string; taskType: "classification" | "regression"; metric: string } | null> {
  const res = await fetch(`${API}/pipeline-builder/automl`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      csv_b64: csvB64,
      target,
      task_type: taskType,
      config: { models: ["RandomForest", "LogisticRegression"], n_folds: 3 },
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as AutoMLResponse;

  // Build scores — handle leaderboard shape AND old shapes
  let scores: Record<string, number> = {};

  // New shape: leaderboard array with algo/score
  if (Array.isArray(data.leaderboard)) {
    data.leaderboard.forEach((entry) => {
      if (entry.algo && typeof entry.score === "number" && entry.score > -900 && !entry.error) {
        scores[entry.algo] = entry.score;
      }
    });
  }
  // Old shapes (backwards compat)
  if (data.scores && typeof data.scores === "object") scores = { ...scores, ...data.scores };
  if (data.model_scores && typeof data.model_scores === "object") scores = { ...scores, ...data.model_scores };
  if (Array.isArray(data.models)) {
    data.models.forEach((m) => {
      const name = m.name ?? m.model ?? "";
      if (name && typeof m.score === "number") scores[name] = m.score;
    });
  }

  // Extract winner — handle object shape { algo, score, metric } OR old string shape
  let winner: string;
  let winnerScore: number;
  let metric: string;

  type WinnerObj = { algo?: string; score?: number; metric?: string };

  if (data.winner && typeof data.winner === "object" && !Array.isArray(data.winner)) {
    const w = data.winner as WinnerObj;
    winner = w.algo ?? Object.keys(scores)[0] ?? "RandomForest";
    winnerScore = typeof w.score === "number" ? w.score : (fuzzyScore(scores, winner) ?? 0);
    metric = w.metric ?? (taskType === "regression" ? "r2" : "accuracy");
  } else {
    // Old string shape
    const rawWinner = typeof data.winner === "string" ? data.winner : (data.best_model as string | undefined);
    winner = typeof rawWinner === "string" && rawWinner
      ? rawWinner
      : Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "RandomForest";
    winnerScore = fuzzyScore(scores, winner) ?? (typeof data.best_score === "number" ? data.best_score : typeof data.score === "number" ? data.score : 0);
    metric = taskType === "regression" ? "r2" : "accuracy";
  }

  const modelList = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, score]) => ({ name, score }));

  const scoreLines = Object.entries(scores)
    .map(([m, s]) => `${m}: ${(Number(s) * 100).toFixed(1)}%`)
    .join(", ");

  // Map metric name to human-readable label
  const metricLabel = metric === "r2" || metric === "r2_score" ? "R² score"
    : metric === "rmse" ? "RMSE"
    : metric === "mae" ? "MAE"
    : metric === "f1_weighted" || metric === "f1" ? "F1 score"
    : metric === "accuracy" ? "accuracy"
    : metric;

  return {
    lines: [
      `Training ${Object.keys(scores).length || 2} models on your ${data.rows ?? "processed"} rows with 3-fold cross-validation.`,
      "Random Forest: building 100 decision trees in parallel...",
      scoreLines ? `Results in! ${scoreLines}.` : "Models trained! Comparing cross-validation scores.",
      `Winner: ${winner} with ${(winnerScore * 100).toFixed(1)}% ${metricLabel}!`,
      "Tip: Add more models or use Optuna stage in Pipeline Builder for hyperparameter tuning.",
    ],
    models: modelList,
    winner,
    taskType,
    metric,
  };
}