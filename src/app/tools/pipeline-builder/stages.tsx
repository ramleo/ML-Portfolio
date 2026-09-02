import type { ReactElement } from "react";
export type StageId =
  | "preprocessing" | "feature-eng" | "feature-select"
  | "automl" | "optuna" | "shap" | "ensemble";

/**
 * The seven stages of the pipeline: their icons, names, colours and order.
 *
 * A static catalogue rather than page logic, and the largest block in a file
 * that had grown past the length limit. `getStageCsv` lives with it because
 * the answer it gives — which upstream stage's output to feed a stage — is a
 * property of that order, not of the page.
 */
export const S = { width: 22, height: 22, fill: "none" as const, stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, viewBox: "0 0 24 24" };

export const ICONS: Record<string, ReactElement> = {
  preprocessing: <svg {...S}><path d="M22 3H2l8 9.46V19l4 2V12.46z" /></svg>,
  "feature-eng": <svg {...S}><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>,
  "feature-select": <svg {...S}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" /><path d="M12 3v3m0 12v3M3 12h3m12 0h3" /></svg>,
  automl: <svg {...S}><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h12" /></svg>,
  optuna: <svg {...S}><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18" /></svg>,
  shap: <svg {...S}><rect x="3" y="14" width="4" height="7" rx="1" /><rect x="9.5" y="9" width="4" height="12" rx="1" /><rect x="16" y="4" width="4" height="17" rx="1" /></svg>,
  ensemble: <svg {...S}><path d="M12 2 L15.09 8.26 L22 9.27 L17 14.14 L18.18 21.02 L12 17.77 L5.82 21.02 L7 14.14 L2 9.27 L8.91 8.26 Z" /></svg>,
};

export const STAGES: { id: StageId; title: string; accent: string; description: string }[] = [
  { id: "preprocessing", title: "Preprocessing", accent: "#3e7c98", description: "Clean data, handle missing values and outliers" },
  { id: "feature-eng", title: "Feature Engineering", accent: "#966f2b", description: "Create polynomial, date, and transform features" },
  { id: "feature-select", title: "Feature Selection", accent: "#4c806d", description: "Remove noise, select top K features" },
  { id: "automl", title: "AutoML", accent: "#3f8358", description: "Train and benchmark multiple algorithms" },
  { id: "optuna", title: "Optuna Tuning", accent: "#7e68c0", description: "Hyperparameter optimization with Bayesian search" },
  { id: "shap", title: "SHAP", accent: "#f87171", description: "Explain model predictions with SHAP values" },
  { id: "ensemble", title: "Ensemble", accent: "#818cf8", description: "Combine models for higher accuracy" },
];


export function fmtM(m: string) {
  const map: Record<string, string> = { neg_mean_absolute_error: "MAE", neg_root_mean_squared_error: "RMSE", r2: "R²", accuracy: "Accuracy", f1: "F1", roc_auc: "AUC-ROC" };
  return map[m] ?? m.replace(/^neg_/i, "").replace(/_/g, " ");
}

export function getStageCsv(id: StageId, raw: string, csvs: Record<string, string>): string {
  const order: StageId[] = ["preprocessing", "feature-eng", "feature-select", "automl", "optuna", "shap", "ensemble"];
  const idx = order.indexOf(id);
  for (let i = idx - 1; i >= 0; i--) {
    if (csvs[order[i]]) return csvs[order[i]];
  }
  return raw;
}
