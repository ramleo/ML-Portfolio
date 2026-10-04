export const FEATURE_ENGINEERING_GUIDE = `
# Feature Engineering — User Guide

## What this tool does
Build new features out of your columns **without writing code**. It offers per-column
transforms (log1p, sqrt, z-score, min-max, percentile rank, winsorising, outlier and
missing-value flags) plus **binning, polynomial and interaction terms, ratios, lags and
rolling windows, date extraction, and cyclical sin/cos encoding**. It all runs in your
browser; download the new CSV or send it straight to AutoML.

## Purpose
Models learn from features, not raw columns. Good features — a ratio, a log of a skewed
amount, the day-of-week pulled from a date — often matter more than the algorithm. This
lets you create them point-and-click instead of hand-writing pandas.

## How to use it
1. **Upload a CSV.**
2. Pick a column and apply a **transform** (e.g. log1p a skewed amount), or create a
   **derived** feature (a ratio of two columns, a rolling average, sin/cos of a cyclical
   field like month).
3. Preview the new columns, then **download** the engineered CSV or **send to AutoML**.

## A worked example
A sales table has a right-skewed \`revenue\` column and an \`order_date\`. Apply **log1p**
to \`revenue\` to tame the skew, then **date extraction** on \`order_date\` to get
\`month\`, and **cyclical sin/cos** on \`month\` so the model knows December is next to
January. Those three new features often lift a model more than swapping algorithms.

## Reading the result
- Each transform adds a **new column** (your originals are kept) so you can compare.
- **Cyclical encoding** turns a wrap-around value (hour, month) into two smooth
  coordinates, so "23:00 → 00:00" isn't a giant jump.

## Notes & limits
- **Leakage note:** the CSV it writes uses **whole-file statistics**. That's fine for
  exploration, but inside a trained pipeline the transformer should fit on **training
  data only** — don't treat this export as leak-free for a strict benchmark.
- **Tabular CSV only**, runs in your browser.
- **More features isn't always better** — pair this with Feature Selection to prune.
`.trim();

export const FEATURE_ENGINEERING_SUGGESTIONS = [
  "Which transform should I use for a skewed column?",
  "What is cyclical sin/cos encoding for?",
  "What's the leakage caveat about whole-file statistics?",
  "How do lags and rolling windows work here?",
];
