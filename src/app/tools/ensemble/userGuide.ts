export const ENSEMBLE_GUIDE = `
# Ensemble Methods — User Guide

## What this tool does
Combine the strongest models instead of betting on one. It builds a **Voting**
(VotingClassifier / VotingRegressor) or **Stacking** ensemble with a meta-learner on top
of the AutoML winners — which typically **reduces variance** and generalises better than
any single model on its own.

## Purpose
Different models make different mistakes. Averaging or stacking them cancels out some of
those independent errors, so the ensemble is usually steadier than its best single
member — the standard way competitions and production systems squeeze out the last bit of
reliable performance.

## How to use it
1. Start from the trained models (the AutoML bake-off winners).
2. Pick **Voting** (combine predictions directly) or **Stacking** (train a meta-learner
   on their outputs).
3. Build the ensemble and compare its score against the best single model.

## A worked example
AutoML leaves you with LightGBM, XGBoost and Random Forest at similar scores. A **Voting**
ensemble of all three often edges past the best one, because where XGBoost slips on a row,
the other two outvote it. **Stacking** can do better still by learning *how much* to trust
each model per case.

## Reading the result
- **Voting** — equal (or weighted) say per model; simple and robust.
- **Stacking** — a meta-learner decides how to weight each base model's output; more
  powerful, slightly more prone to overfitting.
- **Compare to the best single model** — the ensemble is worth it only if it actually
  beats that baseline.

## Notes & limits
- **Not always better.** If one model dominates or the models are highly correlated, an
  ensemble adds cost for little gain — check it against the single-model score.
- **Slower to train and predict** than one model (it runs several).
- **Builds on the AutoML winners** — it combines existing strong models rather than
  training from scratch.
`.trim();

export const ENSEMBLE_SUGGESTIONS = [
  "What's the difference between voting and stacking?",
  "Why would combining models beat the single best one?",
  "When is an ensemble not worth it?",
  "Does the ensemble train from scratch or reuse the AutoML models?",
];
