// ── Shared vocabulary ─────────────────────────────────────────────────────────

export type TaskType = "classification" | "regression";

export type Metric = "f1" | "accuracy" | "roc_auc" | "mae" | "rmse" | "r2";

// One trained model — produced by AutoML, consumed by Optuna / SHAP / Ensemble
export type ModelResult = {
  algo:   "RandomForest" | "XGBoost" | "LightGBM" | "CatBoost";
  params: Record<string, unknown>;
  score:  number;
  metric: Metric;
};

// One column transform — produced by Feature Engineering
export type FeatureTransform = {
  column:    string;
  transform: "log1p" | "sqrt" | "yeo_johnson" | "rank" | "bin" | "poly" | "interaction" | "date" | "outlier_flag" | "missing_flag" | "cyclical";
  params?:   Record<string, unknown>;
};

// ── Preprocessing config ──────────────────────────────────────────────────────
// Mirrors the two ML Unified preprocessing systems:
//   standalone  → /eda/clean   (Clean & Export)
//   pipeline    → /automl/preprocess

export type NumericImputeMethod =
  | "mean" | "median" | "mode" | "knn" | "mice"
  | "ffill" | "bfill" | "constant" | "drop";

export type CatImputeMethod =
  | "most_frequent" | "constant" | "ffill" | "bfill" | "drop";

export type OutlierMethod = "iqr" | "zscore" | "winsorize";

export type EncodingMethod = "none" | "onehot" | "ordinal" | "frequency" | "target";

export type PreprocessingConfig = {
  // Structural
  dedup:           boolean;
  dropCols:        string[];

  // Missing values
  imputeNumeric:   NumericImputeMethod | null;
  imputeCat:       CatImputeMethod | null;
  knnK:            number;               // used when imputeNumeric === "knn"
  constantNum:     number;               // used when imputeNumeric === "constant"
  constantCat:     string;              // used when imputeCat === "constant"

  // Outliers
  outlierMethod:   OutlierMethod | null;
  outlierThresh:   number;              // 1.5 for IQR, 3 for zscore, 5 for winsorize%
  outlierCols:     string[];            // empty = all numeric

  // Distribution
  fixSkewness:     boolean;            // log1p on positive cols with |skew| > 0.75
  powerTransform:  boolean;            // Yeo-Johnson (Clean & Export path)
  powerCols:       string[];           // empty = all skewed cols

  // Encoding (pipeline mode only — irrelevant for standalone clean)
  encoding:        EncodingMethod;
  ordinalCols:     string[];           // columns to treat as ordinal when encoding === "ordinal"

  // Scaling (pipeline mode only)
  standardize:     boolean;
};

// ── Feature Selection config ──────────────────────────────────────────────────
// Mirrors /automl/preprocess step 8 (feature_selection)

export type FeatureSelectionMethod =
  | "none" | "variance" | "correlation" | "rfe" | "kbest";

export type FeatureSelectionConfig = {
  method: FeatureSelectionMethod;
  topK:   number;
};

// ── Pipeline state contract ───────────────────────────────────────────────────
//
// Card → produces → consumed by:
//   preprocessing   → preprocessingConfig, cleanedCsv       → AutoML
//   featureeng      → transforms                             → AutoML
//   featureselect   → featureSelectionConfig, selectedFeatures → AutoML
//   automl          → automlWinner, automlRanking            → Optuna, SHAP, Ensemble
//   optuna          → tunedModel                             → Ensemble
//   shap            → shapValues                             → display
//   ensemble        → ensembleType, ensembleScore            → display

export type MLPipelineState = {
  // User input (shared by all cards)
  csv:      File | null;
  fileName: string | null;
  columns:  string[];
  target:   string | null;
  taskType: TaskType | null;

  // Preprocessing outputs
  preprocessingConfig:    PreprocessingConfig | null;
  cleanedCsv:             File | null;         // standalone output (downloadable)

  // Feature Engineering outputs
  transforms: FeatureTransform[];

  // Feature Selection outputs
  featureSelectionConfig: FeatureSelectionConfig | null;
  selectedFeatures:       string[];            // columns kept after selection

  // AutoML outputs
  automlWinner:  ModelResult | null;
  automlRanking: ModelResult[];

  // Optuna outputs
  tunedModel: ModelResult | null;

  // SHAP outputs  (feature name → mean |SHAP value|)
  shapValues: Record<string, number> | null;

  // Ensemble outputs
  ensembleType:  "voting" | "stacking" | null;
  ensembleScore: number | null;
};

export const emptyPipelineState: MLPipelineState = {
  csv:                    null,
  fileName:               null,
  columns:                [],
  target:                 null,
  taskType:               null,
  preprocessingConfig:    null,
  cleanedCsv:             null,
  transforms:             [],
  featureSelectionConfig: null,
  selectedFeatures:       [],
  automlWinner:           null,
  automlRanking:          [],
  tunedModel:             null,
  shapValues:             null,
  ensembleType:           null,
  ensembleScore:          null,
};

// ── Card dependency map ───────────────────────────────────────────────────────
// standalone: true  → card can run with just a CSV (no prior card output needed)
// requires         → state fields that must be non-null for pipeline mode

export const cardDeps = {
  preprocessing:   { standalone: true,  requires: [] },
  featureeng:      { standalone: true,  requires: [] },
  featureselect:   { standalone: true,  requires: [] },
  automl:          { standalone: true,  requires: [] },
  optuna:          { standalone: false, requires: ["automlWinner"] as (keyof MLPipelineState)[] },
  shap:            { standalone: false, requires: ["automlWinner"] as (keyof MLPipelineState)[] },
  ensemble:        { standalone: false, requires: ["automlWinner"] as (keyof MLPipelineState)[] },
} satisfies Record<string, { standalone: boolean; requires: (keyof MLPipelineState)[] }>;