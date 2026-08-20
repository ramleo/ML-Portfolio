// User guide for Adversarial Examples (attack + defense) — rendered in
// AdversarialUserGuideModal (the "User Guide" header button) AND injected
// into the floating AI Assistant as its ONLY tool knowledge. Keep factual
// and in sync with the actual feature set — especially the honest framing
// of the defense's real, limited effectiveness (see mm_adversarial.py's
// module docstring for the actual test findings behind this framing).

export const ADVERSARIAL_GUIDE = `
# Adversarial Examples — User Guide

## What this tool does
Upload a photo and this tool crafts an **adversarial perturbation** — a
tiny, mostly-invisible change to the pixels — specifically designed to
fool a pretrained image classifier (MobileNetV2, trained on ImageNet) into
predicting the wrong thing, often with HIGH confidence in that wrong
answer. Then it tries a candidate **defense** (JPEG recompression) and
shows honestly whether that defense actually recovered the correct
prediction.

## How to use it
1. Click **Choose photo** and upload any image.
2. Pick an attack method:
   - **FGSM** (single-step) — fast, one gradient step.
   - **PGD** (iterative, stronger) — several smaller steps, generally more
     effective at fooling the classifier, especially at low strength.
3. Adjust **strength (epsilon)** — how large the perturbation is allowed
   to be. Higher values fool the model more reliably but are more likely
   to become visible as vague texture at the far end of the range.
4. Adjust the **defense's JPEG quality** — lower quality is a more
   aggressive (but more visually lossy) defense attempt.
5. Click **Run attack + defense** to see all three images side by side:
   Original, Adversarial, and After JPEG defense — each with its own
   predicted label and confidence.

## Reading the result — read this honestly, not optimistically
- **Fooled / Not fooled** on the adversarial image: whether the attack
  changed the top prediction at all. In testing during development, this
  was true almost every time, even at fairly small epsilon.
- **Recovered** on the defended image: the STRICT outcome — the defended
  prediction exactly matches the original correct label. This is the
  ideal case, but real testing found it does NOT happen reliably —
  sometimes not at all across a whole sweep of settings for a given photo.
- **Disrupted, not recovered**: the defense changed the SPECIFIC wrong
  answer the attack converged to, landing on a different wrong label
  instead of the correct one. This shows the defense had some real effect
  without actually fixing anything — a genuine, common outcome.
- **No effect**: the defended image's prediction is identical to the raw
  adversarial one — the JPEG pass didn't disrupt the perturbation at all
  for that combination of attack/strength/quality.

## Where was the model looking? (Grad-CAM)
Below the three images, a second row shows a **Grad-CAM heatmap** for the
original and adversarial predictions — warmer colors mark the regions that
most drove that specific prediction. This is the actual "why" behind the
label change: the photo barely changed to your eye, but the model's
attention can shift to a completely different region to justify its new,
wrong answer. Comparing the two heatmaps side by side is often more
convincing than the label change alone.

## Why the defense doesn't reliably work — this is the point of the demo
JPEG-recompression defense is a real, published mitigation technique
against this attack family, but the real adversarial-ML literature has
always shown it's inconsistent, not a guaranteed fix — and testing this
exact demo against a real photo confirmed that directly: across a sweep of
epsilon/quality combinations, the correct label was almost never fully
recovered, even at aggressive JPEG quality settings. Simple preprocessing
defenses are cheap and sometimes helpful, but they are not a substitute
for a genuinely robust, adversarially-trained model — showing that
honestly is more useful than pretending this toy defense always works.

## What this is (and isn't)
This is an educational demo of a real ML robustness property, using a
generic off-the-shelf classifier (not any model used elsewhere on this
site) — it says nothing about the reliability of this site's other tools.
Nothing is stored: your photo and the results only exist for this one run.

## Notes & limits
- No API cost — the classifier and both attacks run locally on the
  backend, no external calls.
- Untargeted attack only: it pushes the prediction away from whatever the
  model currently predicts, not toward a specific chosen wrong label.
- PGD takes a few seconds longer than FGSM since it runs several gradient
  steps instead of one.
`.trim();

export const ADVERSARIAL_SUGGESTIONS = [
  "What's the difference between FGSM and PGD?",
  "Why doesn't the defense always work?",
  "What does 'epsilon' actually control?",
  "Is this attacking the other tools on this site?",
  "What is Grad-CAM showing me?",
];
