export const OPTUNA_GUIDE = `
# Optuna Tuning — User Guide

## What this tool does
Squeeze more out of the model AutoML picked. A **TPE sampler** runs up to **30 trials**
searching for better hyperparameters, scored by **5-fold cross-validation**. It runs
**after** model selection, not before — so tuning can never inflate the score that won
the competition in the first place.

## Purpose
Every model has dials (tree depth, learning rate, regularisation) that change its
accuracy. Trying combinations by hand is slow and biased; Optuna searches them
intelligently — each trial informed by the last — to find a stronger setting than the
defaults.

## How to use it
1. Start from the **AutoML winner** (tuning runs on whichever model won).
2. Launch **Optuna tuning** — it runs up to 30 cross-validated trials.
3. Compare the **tuned score** to the untuned winner and keep it if it's better.

## A worked example
AutoML picks LightGBM at F1 0.82. Optuna runs 30 trials varying \`num_leaves\`,
\`learning_rate\` and \`min_child_samples\`, each scored by 5-fold CV, and lands on a
setting at F1 0.85. Because it ran after selection, that 0.85 is an honest improvement,
not a number that was tuned *to* win.

## Reading the result
- **Best trial** — the hyperparameters that scored highest on cross-validation.
- **Tuned vs untuned** — the gain over the default winner; small or zero gains are
  normal and still honest.
- **TPE sampler** — focuses trials on promising regions instead of random guessing.

## Notes & limits
- **Runs after model selection on purpose** — tuning before choosing would let a model
  "win" just because it was tuned, which this avoids.
- **Up to 30 trials** — more would cost more time for diminishing returns on a demo.
- **Cross-validated** — the reported gain reflects generalisation, not one lucky split.
`.trim();

export const OPTUNA_SUGGESTIONS = [
  "Why does tuning run after model selection, not before?",
  "What is the TPE sampler doing across trials?",
  "What if tuning barely improves the score?",
  "Why only 30 trials?",
];
