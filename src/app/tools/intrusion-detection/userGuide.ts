export const INTRUSION_GUIDE = `
# Network Intrusion Classifier — User Guide

## What this tool does
It trains a real machine-learning model to tell **normal network traffic** from
**attacks**, then shows you honestly how well it did. A scikit-learn
**RandomForest** is trained in the backend on a labelled sample of network
connections, then classifies a **held-out test set** it has never seen into
five classes:

- **normal** — legitimate traffic
- **DoS** — denial-of-service floods (neptune, smurf, teardrop…)
- **Probe** — scanning / reconnaissance (satan, nmap, portsweep…)
- **R2L** — remote-to-local: gaining local access from the network (password
  guessing, ftp-write…)
- **U2R** — user-to-root: privilege escalation (buffer overflow, rootkit…)

## The data
It uses **NSL-KDD**, the standard intrusion-detection research benchmark from
the Canadian Institute for Cybersecurity (UNB) — a cleaned version of the
classic KDD Cup 1999 dataset. Each connection is described by 41 features
(bytes transferred, connection counts, error rates, protocol, service, and so
on). A bundled, pre-encoded subset ships with the tool.

## How to read the results
- **Accuracy** — overall share of test connections classified correctly.
- **Confusion matrix** — rows are the true class, columns the prediction; the
  green diagonal is correct, off-diagonal red are confusions.
- **Per-class precision / recall / F1** — how well each attack type is caught.
  Watch **recall**: it's the fraction of that attack type the model actually
  found.
- **Feature importances** — which of the 41 features the RandomForest leaned on.

## Honest limits
This is a **real** classifier scored honestly — not a rigged highlight reel:
- The model **never sees the test labels**, so the scorecard can catch it being
  wrong.
- **NSL-KDD is dated** (late-1990s attack families). Strong numbers here do
  **not** mean strong performance on modern live traffic.
- **R2L and U2R are rare and famously hard** — they look a lot like normal
  sessions. The per-class recall shows this plainly (R2L recall is low) instead
  of hiding it inside the overall average. That gap is the real, well-known
  research problem, not a bug in the demo.

## Why it matters
Intrusion detection is a textbook supervised-ML security problem, and NSL-KDD
is where almost everyone learns it. Seeing where a strong model succeeds (DoS,
Probe) and where it still struggles (R2L, U2R) is the honest lesson the
benchmark exists to teach.
`;

export const INTRUSION_SUGGESTIONS = [
  "What is the difference between R2L and U2R attacks?",
  "Why is R2L so much harder to detect than DoS?",
  "What are precision and recall, and why does recall matter here?",
  "Why is NSL-KDD considered a dated benchmark?",
];
