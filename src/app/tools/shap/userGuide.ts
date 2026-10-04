export const SHAP_GUIDE = `
# SHAP Explainability — User Guide

## What this tool does
See **why** a model made a particular prediction, not just what it predicted. Every
result comes with a **SHAP bar chart** showing which features pushed the prediction and
by how much. Engineered columns are **grouped back to the original feature** they came
from, so you read source influence rather than transform noise.

## Purpose
A score with no reason is hard to trust or act on. SHAP assigns each feature a signed
contribution to a specific prediction — the standard, math-grounded way to answer "what
drove this result?" — turning a black-box output into something you can explain.

## How to use it
1. Have a trained model + a row to explain (this pairs with the AutoML/prediction flow).
2. Open the **SHAP** view for a prediction.
3. Read the bar chart: bars to one side **pushed the prediction up**, to the other
   **pulled it down**; longer bar = bigger impact.

## A worked example
For a loan-approval prediction, SHAP might show **income (+)** and **clean credit
history (+)** pushing toward approval, while **high existing debt (−)** pulls against
it. If you one-hot-encoded "region," the pieces are grouped back so you see "region"
as one influence, not five noisy fragments.

## Reading the result
- **Direction** — which side of zero a feature's bar sits on (toward / against the
  predicted outcome).
- **Magnitude** — bar length = how much that feature moved this prediction.
- **Grouped features** — engineered/encoded columns are rolled up to their source
  feature so the story is readable.

## Notes & limits
- **Per-prediction, not global.** It explains one result; the same feature can matter
  differently for a different row.
- **Explains the model, not the world.** SHAP shows what the model used — if the model
  learned a spurious pattern, SHAP will faithfully show that too.
- **Tree models** use the exact, fast TreeExplainer.
`.trim();

export const SHAP_SUGGESTIONS = [
  "How do I read a SHAP bar chart?",
  "Why are my one-hot columns grouped together?",
  "Does SHAP explain one prediction or the whole model?",
  "Can SHAP show if my model learned something wrong?",
];
