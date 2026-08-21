// User guide for Adversarial Robustness Lab (attack + defense) — rendered in
// AdversarialUserGuideModal (the "User Guide" header button) AND injected
// into the floating AI Assistant as its ONLY tool knowledge. Keep factual
// and in sync with the actual feature set — especially the honest framing
// of the defense's real, limited effectiveness (see mm_adversarial.py's
// module docstring for the actual test findings behind this framing).

export const ADVERSARIAL_GUIDE = `
# Adversarial Robustness Lab — User Guide

## What this tool does
Upload a photo and this tool crafts an **adversarial perturbation** — a
tiny, mostly-invisible change to the pixels — specifically designed to
fool a pretrained image classifier (MobileNetV2, trained on ImageNet) into
predicting the wrong thing, often with HIGH confidence in that wrong
answer. The attack can be **untargeted** (any wrong label counts) or
**targeted** (forces one exact chosen label). Then it tries two candidate
**defenses** (JPEG recompression, randomized smoothing) and shows honestly
whether either one actually recovered the correct prediction, plus an
optional **transferability check** against a second, different model.

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
5. Optionally type a **target label** (autocompletes over the 1000
   ImageNet classes) to try a **targeted** attack — forcing that EXACT
   wrong label, not just any wrong one. This is strictly harder than an
   untargeted attack; leave it blank for untargeted.
6. Optionally check **Check transferability (ResNet18)** to also classify
   the SAME adversarial image with a second, different model architecture
   — see whether the attack fools a model it was never crafted against.
7. Click **Run attack + defense** to see the results side by side:
   Original, Adversarial, After JPEG defense, and After randomized
   smoothing — each with its own predicted label and confidence — plus a
   transferability panel (if checked) and Grad-CAM heatmaps below.

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
- **Target achieved / Target not reached** (only shown for a targeted
  attack): whether the adversarial prediction landed on your EXACT chosen
  label, not just any wrong one. Not reaching it usually means the epsilon
  budget was too small for that specific target — try increasing it.

## Randomized smoothing (the second defense)
This defense classifies many independently noised copies of the
adversarial image and takes a majority vote, instead of trusting one
deterministic prediction. The **vote agreement %** shown is the real
signal to watch: a HIGH vote agreement (whatever the label) means the
model was consistently confident across the noise; a LOW one (near 30-40%)
means the vote barely won — an honest sign of instability, not a reliable
recovery, even in cases where the winning label happens to be correct.
Real testing found this defense behaves similarly to JPEG recompression:
sometimes disrupts the attack, rarely reliably recovers the exact original
label. See mm_adversarial.py's module docstring for the actual sigma
sweep behind this framing.

## Transferability (does it fool a DIFFERENT model too?)
This attack is crafted using gradients from MobileNetV2 only — it has zero
access to ResNet18's weights or gradients. If you check "Check
transferability", the SAME adversarial image is also classified by
ResNet18, and "Transferred" means ResNet18's own prediction changed too —
a real security implication: an attacker who can only query a DIFFERENT
model than the one deployed may still succeed. Real testing found this
varies a lot: FGSM's single-step perturbation didn't transfer at all in
one real-photo test (ResNet18 stayed correct across every tested epsilon),
while PGD's multi-step perturbation transferred at every epsilon tested on
the same photo — a single-image finding, not a general rule, reported as
observed. See mm_adversarial.py's module docstring for the actual sweep.

## Where was the model looking? (Grad-CAM)
Below the three images, a second row shows a **Grad-CAM heatmap** for the
original and adversarial predictions — warmer colors mark the regions that
most drove that specific prediction. This is the actual "why" behind the
label change: the photo barely changed to your eye, but the model's
attention can shift to a completely different region to justify its new,
wrong answer. Comparing the two heatmaps side by side is often more
convincing than the label change alone.

## Why the defenses don't reliably work — this is the point of the demo
Both JPEG recompression and randomized smoothing are real, published
mitigation techniques against this attack family, but the real
adversarial-ML literature has always shown they're inconsistent, not a
guaranteed fix — and testing this exact demo against a real photo
confirmed that directly for both: across a sweep of epsilon/quality/sigma
combinations, the correct label was almost never fully and reliably
recovered. Simple input-side defenses are cheap and sometimes helpful, but
they are not a substitute for a genuinely robust, adversarially-trained
model — showing that honestly is more useful than pretending either toy
defense always works.

## What this is (and isn't)
This is an educational demo of a real ML robustness property, using a
generic off-the-shelf classifier (not any model used elsewhere on this
site) — it says nothing about the reliability of this site's other tools.
Nothing is stored: your photo and the results only exist for this one run.

## Notes & limits
- No API cost — the classifier, both attacks, and both defenses run
  locally on the backend, no external calls.
- A targeted attack is strictly harder than an untargeted one — it may not
  reach your chosen label within the epsilon range this demo allows.
- PGD takes a few seconds longer than FGSM since it runs several gradient
  steps instead of one.
- Randomized smoothing runs 25 extra forward passes per request (one per
  noised copy), so results take slightly longer than the attack alone.
- The transferability check is OFF by default since it triggers a one-time
  ~45MB ResNet18 weight download on first use, adding to the wait.
`.trim();

export const ADVERSARIAL_SUGGESTIONS = [
  "What's the difference between FGSM and PGD?",
  "Why doesn't either defense always work?",
  "What does 'epsilon' actually control?",
  "What's a targeted vs. untargeted attack?",
  "Does this attack transfer to a different model?",
  "Is this attacking the other tools on this site?",
  "What is Grad-CAM showing me?",
];
