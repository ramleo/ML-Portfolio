export type Capability = {
  id: string;
  title: string;
  subtitle: string;       // badge pill top-left  (e.g. "4-Model Competition")
  description: string;
  accent: string;
  stat: string;           // big value top-right  (e.g. "4", "10+", "∞")
  statLabel: string;      // label under stat     (e.g. "Models", "Transforms")
  model: string;          // MODEL meta row
  input: string;          // dataset / input row  (shown with DB icon)
  tags: string[];
  link: string;
  github: string;
  modalEnabled?: boolean;   // true = "Run Here" button opens inline modal
  internalLink?: string;    // internal Next.js route — shows "Try it", navigates client-side
};

const GITHUB = "https://github.com/ramleo/ML-Unified";

const capabilities: Capability[] = [
  {
    id: "preprocessing",
    title: "Data Preprocessing",
    subtitle: "Clean Before You Train",
    description:
      "Deduplicate rows, impute missing values with 8+ numeric strategies (Mean, Median, KNN, MICE) and 4 categorical strategies, remove outliers via IQR / Z-score / Winsorize, fix skewness, and apply Yeo-Johnson power transform. Download a clean CSV or hand off directly to AutoML.",
    accent: "#22d3ee",
    stat: "5",
    statLabel: "Steps",
    model: "SimpleImputer · KNN · MICE",
    input: "Any CSV",
    tags: ["Imputation", "Outliers", "Encoding", "Power Transform"],
    link: "/?mode=ml",
    github: GITHUB,
    modalEnabled: true,
  },
  {
    id: "automl",
    title: "AutoML Pipeline",
    subtitle: "4-Model Competition",
    description:
      "RF, XGBoost, LightGBM, and CatBoost compete via 5-fold cross-validation. The winner is selected automatically by F1 (classification) or MAE (regression). Optional Optuna tuning and SHAP explanation run on the winner.",
    accent: "#34d399",
    stat: "4",
    statLabel: "Models",
    model: "RF · XGB · LGB · CatBoost",
    input: "Any CSV",
    tags: ["scikit-learn", "XGBoost", "LightGBM", "CatBoost"],
    link: "/?mode=ml",
    github: GITHUB,
    modalEnabled: true,
  },
  {
    id: "featureeng",
    title: "Feature Engineering",
    subtitle: "No-Code Transforms",
    description:
      "log1p, sqrt, Yeo-Johnson, percentile rank, outlier flag, and missing flag per numeric column. Plus binning, polynomial pairs, interaction terms, date extraction, and cyclical encoding (sin / cos). All transforms are fit on training data only — no leakage.",
    accent: "#38bdf8",
    stat: "10+",
    statLabel: "Transforms",
    model: "scikit-learn · pandas",
    input: "Any CSV",
    tags: ["Transforms", "Interactions", "Date Features", "Cyclical"],
    link: "/?mode=ml",
    github: GITHUB,
    internalLink: "/tools/feature-engineering",
  },
  {
    id: "featureselect",
    title: "Feature Selection",
    subtitle: "Keep Only What Matters",
    description:
      "Four methods — Variance Threshold, Correlation Filter (drop >0.9 correlated), RFE (Random Forest), and SelectKBest (Mutual Info) — automatically prune irrelevant or redundant columns before training. Configurable top-K cutoff.",
    accent: "#fb923c",
    stat: "4",
    statLabel: "Methods",
    model: "RFE · SelectKBest · Variance",
    input: "Any CSV",
    tags: ["RFE", "SelectKBest", "Variance", "Correlation"],
    link: "/?mode=ml",
    github: GITHUB,
    internalLink: "/tools/feature-selection",
  },
  {
    id: "optuna",
    title: "Optuna Tuning",
    subtitle: "Post-Winner Hyperparameter Search",
    description:
      "TPE sampler runs up to 30 trials on the AutoML winner to find optimal hyperparameters. Tuning is optional and runs after model selection — not before — so it never inflates the competition score.",
    accent: "#a78bfa",
    stat: "30",
    statLabel: "Max Trials",
    model: "TPE Sampler · 5-fold CV",
    input: "AutoML winner",
    tags: ["Optuna", "TPE Sampler", "5-fold CV"],
    link: "/?mode=ml",
    github: GITHUB,
    internalLink: "/tools/optuna",
  },
  {
    id: "shap",
    title: "SHAP Explainability",
    subtitle: "Per-Prediction Feature Impact",
    description:
      "Every prediction comes with a SHAP bar chart showing which features drove the result and by how much. FE-derived columns are grouped back to their originals so you see source-feature influence, not transform noise.",
    accent: "#f59e0b",
    stat: "100%",
    statLabel: "Explainable",
    model: "SHAP · TreeExplainer",
    input: "AutoML winner",
    tags: ["SHAP", "Feature Impact", "Classification", "Regression"],
    link: "/?mode=ml",
    github: GITHUB,
    internalLink: "/tools/shap",
  },
  {
    id: "ensemble",
    title: "Ensemble Methods",
    subtitle: "Combine Top-N Models",
    description:
      "Simple voting (VotingClassifier / VotingRegressor) or stacking with a meta-learner on top of the AutoML winners. Reduces variance and improves generalization over any single model.",
    accent: "#f472b6",
    stat: "2",
    statLabel: "Strategies",
    model: "Voting · Stacking",
    input: "AutoML winners",
    tags: ["Voting", "Stacking", "Meta-Learner", "scikit-learn"],
    link: "/?mode=ml",
    github: GITHUB,
    internalLink: "/tools/ensemble",
  },
  {
    id: "pipeline-builder",
    title: "Pipeline Builder",
    subtitle: "End-to-End ML Canvas",
    description:
      "Visual card canvas that orchestrates all 7 ML stages — Preprocessing, Feature Engineering, Feature Selection, AutoML, Optuna, SHAP, and Ensemble — into one sequential pipeline.",
    accent: "#a78bfa",
    stat: "7",
    statLabel: "Stages",
    model: "Full Pipeline",
    input: "Any labeled CSV",
    tags: ["Pipeline", "AutoML", "Optuna", "SHAP", "Ensemble", "End-to-End"],
    link: "/?mode=ml",
    github: GITHUB,
    internalLink: "/tools/pipeline-builder",
  },
];

export default capabilities;