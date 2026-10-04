export const AUTOML_GUIDE = `
# AutoML Pipeline — User Guide

## What this tool does
Upload a CSV and get a **trained model without writing any code**. Four algorithms —
**Random Forest, XGBoost, LightGBM and CatBoost** — compete on 5-fold cross-validation,
and the winner is chosen automatically (on **F1** for classification, **MAE** for
regression). Optional **Optuna** tuning and a **SHAP** explanation then run on whichever
model won.

## Purpose
Picking an algorithm and tuning it is the slow part of a first model. This runs the
bake-off for you and shows the scoreboard, so you see which model actually fits your
data — and why — instead of guessing.

## How to use it
1. **Upload a CSV** (a header row + the column you want to predict).
2. Choose the **target column**; the tool detects **classification vs regression** from
   it.
3. Run — the four models train and are scored by cross-validation.
4. Review the **leaderboard**, then optionally enable **Optuna tuning** and view the
   **SHAP** explanation of the winner.

## A worked example
Upload a customer-churn CSV with a \`churned\` (yes/no) target. The tool detects
classification, trains all four models, and ranks them by F1 — say LightGBM wins. Turn
on Optuna to squeeze out a better score, then open SHAP to see that "contract length"
and "monthly charges" drove most predictions.

## Reading the result
- **Leaderboard** — each model's cross-validated score; the winner is highlighted.
- **F1 (classification) / MAE (regression)** — the single metric used to pick, so the
  comparison is apples to apples.
- **SHAP** — which features pushed the winner's predictions, and by how much.

## Notes & limits
- **Tabular CSV only** — not images, text or time series.
- **Cross-validation picks the winner**, so the ranking reflects generalisation, not a
  single lucky split.
- **Optuna tuning takes longer** — it's optional; the untuned bake-off is quick.
`.trim();

export const AUTOML_SUGGESTIONS = [
  "How does it choose the winning model?",
  "What's the difference between classification and regression here?",
  "What does the Optuna tuning step do?",
  "How do I read the SHAP explanation of the winner?",
];
