export const FEATURE_SELECTION_GUIDE = `
# Feature Selection — User Guide

## What this tool does
Cut a dataset down to the columns that **actually carry signal**. Four methods —
**variance threshold**, **correlation filter** (drops anything above 0.9), **recursive
feature elimination (RFE)** with a Random Forest, and **SelectKBest on mutual
information** — prune redundant columns before training, with a configurable **top-K**
cutoff.

## Purpose
Extra columns add noise, slow training, and make models harder to explain and easier to
overfit. Keeping only the informative features usually makes a model **simpler, faster,
and about as accurate** — sometimes better.

## How to use it
1. **Upload a CSV** and pick the **target** column.
2. Choose a method (or compare them) and a **top-K** cutoff.
3. Review which columns were kept vs dropped, then export the reduced CSV or send it on
   to training.

## A worked example
A dataset has 40 columns, several nearly identical. The **correlation filter** drops the
duplicates (>0.9 correlated), then **SelectKBest** keeps the 10 columns with the most
mutual information with the target. You train on 10 instead of 40 — faster, and the model
generalises about the same or better.

## Reading the result
- **Variance threshold** — removes near-constant columns (no information).
- **Correlation filter** — removes one of each highly-correlated pair (redundant).
- **RFE** — repeatedly trains and drops the weakest feature; model-driven.
- **SelectKBest (mutual information)** — ranks each feature's statistical dependence on
  the target and keeps the top-K.

## Notes & limits
- **Methods disagree** — that's expected; a feature one method drops another may keep.
  Compare, and prefer features that survive several.
- **Selection should fit on training data** for a strict benchmark, to avoid peeking at
  the test set.
- **Tabular CSV only.**
`.trim();

export const FEATURE_SELECTION_SUGGESTIONS = [
  "Which selection method should I start with?",
  "Why does the correlation filter drop columns above 0.9?",
  "What does RFE do differently from SelectKBest?",
  "Will fewer features hurt my accuracy?",
];
