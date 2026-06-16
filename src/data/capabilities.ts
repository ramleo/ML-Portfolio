export type Capability = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  accent: string;
  tags: string[];
  icon: "automl" | "optuna" | "featureeng" | "featureselect" | "shap" | "ensemble" | "preprocessing";
  link: string;
  linkLabel: string;
};

const capabilities: Capability[] = [
  {
    id: "preprocessing",
    title: "Data Preprocessing",
    subtitle: "Clean before you train",
    description:
      "Deduplicate, impute missing values (8+ numeric strategies including KNN and MICE, 4 categorical), remove outliers via IQR / Z-score / Winsorize, fix skewness, and apply Yeo-Johnson power transform. Download a clean CSV or pipe directly into AutoML.",
    accent: "#22d3ee",
    tags: ["Imputation", "Outliers", "Encoding", "Power Transform"],
    icon: "preprocessing",
    link: "https://ml-unified.onrender.com/?mode=ml",
    linkLabel: "Try Preprocessing →",
  },
  {
    id: "automl",
    title: "AutoML Pipeline",
    subtitle: "4-model competition",
    description:
      "RF, XGBoost, LightGBM, and CatBoost compete via 5-fold cross-validation. The winner is selected automatically by F1 (classification) or MAE (regression).",
    accent: "#34d399",
    tags: ["scikit-learn", "XGBoost", "LightGBM", "CatBoost"],
    icon: "automl",
    link: "https://ml-unified.onrender.com/?mode=ml",
    linkLabel: "Try AutoML →",
  },
  {
    id: "featureeng",
    title: "Feature Engineering",
    subtitle: "Visual, no-code transforms",
    description:
      "log1p, sqrt, Yeo-Johnson, percentile rank, outlier flag, missing flag per numeric column. Plus binning, polynomial pairs, interaction terms, date extraction, and cyclical encoding — all fit on training data only.",
    accent: "#38bdf8",
    tags: ["Transforms", "Interactions", "Date Features", "Cyclical"],
    icon: "featureeng",
    link: "https://ml-unified.onrender.com/?mode=ml",
    linkLabel: "Try Feature Eng →",
  },
  {
    id: "featureselect",
    title: "Feature Selection",
    subtitle: "Keep only what matters",
    description:
      "Four methods — Variance Threshold, Correlation Filter (drop >0.9 correlated), RFE (Random Forest), and SelectKBest (Mutual Info) — automatically prune irrelevant or redundant features before training.",
    accent: "#fb923c",
    tags: ["RFE", "SelectKBest", "Variance", "Correlation"],
    icon: "featureselect",
    link: "https://ml-unified.onrender.com/?mode=ml",
    linkLabel: "Try Feature Select →",
  },
  {
    id: "optuna",
    title: "Optuna Tuning",
    subtitle: "Post-winner hyperparameter search",
    description:
      "TPE sampler runs 10–30 trials on the AutoML winner to find optimal hyperparameters. Tuning is optional and runs after model selection, not before.",
    accent: "#a78bfa",
    tags: ["Optuna", "TPE Sampler", "5-fold CV"],
    icon: "optuna",
    link: "https://ml-unified.onrender.com/?mode=ml",
    linkLabel: "Try Optuna →",
  },
  {
    id: "shap",
    title: "SHAP Explainability",
    subtitle: "Per-prediction feature impact",
    description:
      "Every prediction comes with a SHAP bar chart showing which features drove the result and by how much. FE-derived columns are grouped back to their originals so you see source-feature impact, not transform noise.",
    accent: "#f59e0b",
    tags: ["SHAP", "Feature Impact", "Classification", "Regression"],
    icon: "shap",
    link: "https://ml-unified.onrender.com/?mode=ml",
    linkLabel: "Try SHAP →",
  },
  {
    id: "ensemble",
    title: "Ensemble Methods",
    subtitle: "Combine top-N models",
    description:
      "Simple voting (VotingClassifier / VotingRegressor) or stacking with a meta-learner on top of the AutoML winners. Reduces variance and improves generalization.",
    accent: "#f472b6",
    tags: ["Voting", "Stacking", "Meta-Learner", "scikit-learn"],
    icon: "ensemble",
    link: "https://ml-unified.onrender.com/?mode=ml",
    linkLabel: "Try Ensemble →",
  },
];

export default capabilities;