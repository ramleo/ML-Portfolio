export const PIPELINE_BUILDER_GUIDE = `
# Pipeline Builder — User Guide

## What this tool does
Run the whole ML pipeline as **one sequence** instead of tool by tool. A visual canvas
chains all seven stages together — **preprocessing → feature engineering → feature
selection → AutoML → Optuna tuning → SHAP explanation → ensembling** — so a labelled CSV
goes in one end and a **trained, explained model** comes out the other.

## Purpose
Each stage exists as its own tool, but real modelling runs them in order and hands one
stage's output to the next. This stitches them into a single flow so you see the end-to-end
path — and get the final model — without manually carrying a CSV between seven tools.

## How to use it
1. **Upload a labelled CSV** and pick the **target** column.
2. The canvas shows the **seven stages** in order; run the pipeline.
3. Each stage hands its output to the next: clean → engineer → select → train → tune →
   explain → ensemble.
4. Read the final model's score and its **SHAP** explanation at the end.

## A worked example
Feed a churn CSV in: preprocessing fills blanks and drops duplicates, feature engineering
adds a tenure×charges interaction, selection prunes to the top features, AutoML picks
LightGBM, Optuna tunes it, SHAP explains it, and ensembling combines the top models — one
run, from raw file to an explained, tuned ensemble.

## Reading the result
- Follow the **canvas** left to right — each node is a stage, and its output feeds the
  next.
- The end carries the **winning/ensembled model**, its score, and the **SHAP** feature
  story.

## Notes & limits
- **Tabular CSV only** (classification or regression), the same scope as the individual
  stage tools.
- **It's the stages combined**, so the same caveats apply (e.g. fit transforms on
  training data for a strict benchmark).
- **Longer than one tool** — it runs seven steps, including optional Optuna trials.
`.trim();

export const PIPELINE_BUILDER_SUGGESTIONS = [
  "What are the seven stages, in order?",
  "How does one stage's output feed the next?",
  "Is this the same as running each tool by hand?",
  "What do I get at the end of the pipeline?",
];
