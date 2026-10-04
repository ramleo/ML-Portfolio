export const DRIFT_GUIDE = `
# Data Drift Detection — User Guide

## What this tool does
Check whether **live data has drifted** away from what your model was trained on. Upload
a new production batch and compare it against the training baseline: **PSI**, the **KS
test** and distribution histograms for numeric columns, and **category-frequency shifts**
for categoricals. A **trend sparkline** tracks the drift score across successive batches.

## Purpose
A model silently gets worse when the world it sees stops matching the world it was
trained on — more than a bad metric, that is the single most common cause of production
decay. This tool catches that shift early, before it shows up as bad predictions.

## How to use it
1. Provide the **training baseline** data and a **new production batch** (CSV).
2. Run the comparison.
3. Review per-column drift (PSI / KS, histograms, category shifts) and the overall
   **drift score**; upload later batches to extend the **trend sparkline**.

## A worked example
Your model trained on last year's signups. Upload this month's batch: the **age**
histogram has shifted younger (high PSI) and a new **referral source** category appeared
that wasn't in training. The drift score rises — a signal to retrain before accuracy
slips, even though no accuracy metric has dropped yet.

## Reading the result
- **PSI** — Population Stability Index; higher = more shifted (rule of thumb: >0.2 is
  notable, >0.25 significant).
- **KS test** — whether two numeric distributions differ significantly.
- **Category shifts** — new/disappeared categories and changed frequencies.
- **Trend sparkline** — drift over successive batches, so you see it building.

## Notes & limits
- **Drift ≠ worse accuracy by itself** — it's an early warning that inputs changed; pair
  it with real outcome metrics when you have labels.
- **Compare like with like** — the production batch should have the same columns as the
  baseline.
- **Statistical tests only** — no model is trained here; it's a distribution comparison.
`.trim();

export const DRIFT_SUGGESTIONS = [
  "What is PSI and what counts as high?",
  "What does the KS test tell me?",
  "Does drift mean my model is already wrong?",
  "How does the trend sparkline work across batches?",
];
