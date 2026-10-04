export const PREPROCESSING_GUIDE = `
# Data Preprocessing — User Guide

## What this tool does
Clean a messy CSV before you train on it. **Deduplicate** rows, **fill missing values**
with 8 numeric strategies (mean, median, KNN, MICE, forward or backward fill, a constant,
or drop the row) or 5 categorical ones, **strip outliers** with the 1.5 × IQR rule, and
**correct skew** with a log transform. It all runs in your browser — download the cleaned
file, or send it straight through to AutoML.

## Purpose
Real data arrives dirty: duplicates, blanks, extreme values, lopsided distributions.
Models trained on that learn the mess. Cleaning first is the unglamorous step that most
decides whether a model is any good — this makes it a few clicks.

## How to use it
1. **Upload a CSV.**
2. Apply fixes in order: **deduplicate** → **impute** missing values (pick a strategy per
   column type) → **outliers** (1.5 × IQR) → **skew** (log) as needed.
3. Preview the cleaned data, then **download** it or **send to AutoML**.

## A worked example
A CSV has duplicate rows, blank \`income\` cells, and a few extreme \`age\` values. Dedup
removes the repeats; impute \`income\` with **KNN** (uses similar rows) instead of a flat
mean; the **1.5 × IQR** rule flags the impossible ages; a **log** transform tames the
skewed \`income\`. The cleaned file is ready to train on.

## Reading the result
- **Imputation strategy matters:** mean/median are quick; **KNN/MICE** estimate a missing
  value from related columns and are usually more faithful.
- **1.5 × IQR** marks points far outside the middle 50% of a column as outliers.
- **Log transform** pulls in a long right tail so a skewed column behaves better.

## Notes & limits
- **Clean, then split** for a strict benchmark — imputing on the whole file before
  splitting can leak test information into training.
- **Dropping rows loses data** — prefer imputing unless a row is mostly empty.
- **Tabular CSV only**, runs in your browser.
`.trim();

export const PREPROCESSING_SUGGESTIONS = [
  "Which missing-value strategy should I pick?",
  "What does the 1.5 × IQR outlier rule do?",
  "When should I log-transform a column?",
  "Why clean before splitting into train/test?",
];
