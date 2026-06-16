export type Capability = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  accent: string;
  tags: string[];
  icon: "automl" | "optuna" | "featureeng" | "shap" | "ensemble";
  link: string;
  linkLabel: string;
};

const capabilities: Capability[] = [
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
    id: "featureeng",
    title: "Feature Engineering",
    subtitle: "Visual, no-code transforms",
    description:
      "Log, sqrt, binning, polynomial pairs, interaction terms, date extraction, and outlier flags — all configurable per-column before training.",
    accent: "#38bdf8",
    tags: ["Transforms", "Interactions", "Date Features", "Binning"],
    icon: "featureeng",
    link: "https://ml-unified.onrender.com/?mode=ml",
    linkLabel: "Try Feature Eng →",
  },
  {
    id: "shap",
    title: "SHAP Explainability",
    subtitle: "Per-prediction feature impact",
    description:
      "Every prediction comes with a SHAP bar chart showing which features drove the result and by how much. Supports classification and regression.",
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