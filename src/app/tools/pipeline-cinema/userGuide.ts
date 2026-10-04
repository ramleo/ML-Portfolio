export const PIPELINE_CINEMA_GUIDE = `
# Pipeline Cinema — User Guide

## What this tool does
Watch the **seven ML stages play out as an animation** rather than reading about them.
Illustrated characters carry data through each step of the pipeline in turn —
preprocessing, feature engineering, feature selection, AutoML, Optuna tuning, SHAP
explanation and ensembling. **Nothing to upload** — it's a visual walkthrough of how the
stages fit together.

## Purpose
The pipeline is easier to *get* when you can see data move through it. This is the
explain-it-visually companion to Pipeline Builder: same seven stages, but as a narrated
animation for understanding the flow, not for processing your own data.

## How to use it
1. Open the tool — it starts the animation; there's nothing to configure.
2. Watch each stage hand its data to the next, in order.
3. When you want to run the real thing on your own CSV, go to **Pipeline Builder** (or the
   individual stage tools).

## A worked example
Press play: a character brings in a messy dataset, another scrubs it clean
(preprocessing), the next crafts new columns (feature engineering), the pile is trimmed
(selection), models race (AutoML), the winner is fine-tuned (Optuna), its reasons are
shown (SHAP), and finally several models team up (ensembling) — the whole journey in one
animated pass.

## Reading the result
- Each scene = **one stage**; the order is the real pipeline order.
- It's **conceptual** — the point is the sequence and hand-offs, not real numbers.

## Notes & limits
- **No data in, no model out** — it's a demonstration, not a processing tool.
- For real work on your data, use **Pipeline Builder** (end-to-end) or the per-stage
  tools.
`.trim();

export const PIPELINE_CINEMA_SUGGESTIONS = [
  "What are the seven stages it animates?",
  "Can I run this on my own data?",
  "How is this different from Pipeline Builder?",
  "Why watch the animation instead of just reading?",
];
