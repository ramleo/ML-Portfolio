// User guide for Adversarial Robustness Lab (attack + defense) — rendered in
// AdversarialUserGuideModal (the "User Guide" header button) AND injected
// into the floating AI Assistant as its ONLY tool knowledge. Keep factual
// and in sync with the actual feature set — especially the honest framing
// of the defense's real, limited effectiveness (see mm_adversarial.py's
// module docstring for the actual test findings behind this framing).

export const ADVERSARIAL_GUIDE = `
# Adversarial Robustness Lab — User Guide

## What this tool does
Upload a photo and this tool crafts an **adversarial attack** — a tiny,
mostly-invisible change to the pixels (FGSM/PGD), a visible "sticker"
patch region (Adversarial patch), or a query-only attack that never sees
the model's gradients at all (Black-box) — specifically designed to fool a
pretrained image classifier (MobileNetV2, trained on ImageNet) into
predicting the wrong thing, often with HIGH confidence in that wrong
answer. The attack can be **untargeted** (any wrong label counts) or
**targeted** (forces one exact chosen label). Then it tries two
inference-time **defenses** (JPEG recompression, randomized smoothing)
and shows honestly whether either one actually recovered the correct
prediction, plus an optional **transferability check** against a second,
different model. A separate third section further down demonstrates
**adversarial training** — a fundamentally different kind of defense —
on a small digit classifier.

## How to use it
1. Click **Choose photo** and upload any image.
2. Pick an attack method:
   - **FGSM** (single-step) — fast, one gradient step, tiny perturbation
     over the whole image.
   - **PGD** (iterative, stronger) — several smaller steps, generally more
     effective at fooling the classifier, especially at low strength.
   - **Adversarial patch** — optimizes one square region (unconstrained,
     no epsilon limit) into a directly VISIBLE sticker-style attack,
     instead of a subtle whole-image perturbation.
   - **Black-box** — the ONLY attack here with zero access to the model's
     gradients, only its predictions — the realistic threat model against
     someone else's deployed API. Genuinely much slower and, for a
     targeted goal, often doesn't converge at all (see its own section
     below).
3. For FGSM/PGD/black-box, adjust **strength (epsilon)** (labeled
   "per-query step" for black-box) — how large the perturbation is allowed
   to be. For the patch attack, adjust **patch size** instead — what
   fraction of the image the square patch covers. For black-box, also
   adjust **query budget** — how many model queries it's allowed before
   giving up.
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

## Adversarial patch (the third attack)
Unlike FGSM/PGD, this attack doesn't stay imperceptible — it optimizes one
square, unconstrained patch region into whatever pixel values best fool
the model, then places it in the center of the photo. This is the single-
image, single-placement version: the patch is optimized for THIS exact
photo, not a universal sticker proven to work on any photo from any angle
(that would need training across many images/positions/rotations, far more
compute than a live demo can do per-request). Real testing found a sharp
asymmetry between goals: **untargeted** patches fool the classifier almost
instantly — often in 1-2 optimization steps, since a patch that large is
already a big, blunt perturbation even before real optimization. **Targeted**
patches (forcing one exact label) are genuinely much harder: a small (10%)
patch failed to reach the target at all within the step budget in real
testing, while a larger (25%) patch reached it in under 40 steps — bigger
patch, easier and faster attack. The optimization step count shown after
a run is a real measure of how much work THIS run actually needed (it
stops the moment the goal is met, not always the full budget).

## Black-box attack (the fourth attack — the realistic threat model)
FGSM, PGD, and the patch attack all need REAL gradient access — this tool
has the actual model loaded locally, so it can compute "which direction
would most fool this classifier" directly via backpropagation. A real
attacker targeting someone else's deployed model usually can't do that —
they can only send an input and see the prediction come back, like
querying a live API. This attack simulates exactly that: no gradients, only
repeated queries that each return a confidence score, using a simplified
version of a published technique (SimBA). Each query nudges ONE pixel
value up or down and keeps the change only if it helped, so — unlike
FGSM/PGD's single-shot epsilon-bounded perturbation — this attack can take
hundreds to thousands of queries to get anywhere. Real testing found this
tradeoff is real, not theoretical: an **untargeted** attack converged in
~350 queries (a few seconds), but a **targeted** attack did NOT converge
at all even at the maximum 3000-query budget in real testing — a genuine,
expected limitation of query-only attacks within a request-sized budget,
not a bug. If you see "did not reach the target" for a targeted black-box
run, that IS the point of this attack — it's demonstrating a real
security/cost tradeoff, not failing to work.

## Adversarial training (the third defense — a different kind entirely)
JPEG recompression and randomized smoothing are both **inference-time**
defenses — tricks applied to an image AFTER a model was already trained
normally. Adversarial training is fundamentally different: it changes HOW
the model is trained in the first place, by training directly on
adversarially-attacked examples instead of only clean ones (Madry et al.
2018). Because real adversarial training needs many epochs over a real
dataset — infeasible to redo live against the 1000-class ImageNet
classifier used above — this section demonstrates it on a much smaller,
separate pair of digit classifiers (MNIST), trained ONCE offline and
shipped as static checkpoints, not retrained per request.
Pick a sample digit (or switch to **Upload your own** and photograph a
digit you've written on plain paper — it's preprocessed server-side:
grayscale, auto-invert, cropped to the ink, centered, resized to 28x28,
and you'll see exactly what the models received), choose an attack
strength, and click **Attack both models** — the SAME white-box PGD
attack (each model attacked with its own gradients) runs against a
standard-trained model and an adversarially-trained model side by side.
A real photo is out-of-distribution input for a model trained only on
clean MNIST, so even the CLEAN (unattacked) prediction may occasionally
be wrong — that's shown honestly, not hidden, since it's a real limit of
the preprocessing, not a bug. Real, measured numbers across
the full MNIST test set: the standard model goes from 98.6% clean
accuracy to just 1.1% robust accuracy under this attack — essentially
always fooled; the adversarially-trained model goes from 97.0% clean
accuracy to 84.3% robust accuracy under the identical attack — a real,
large, measured robustness gain, at the honest cost of a small drop in
clean accuracy. This is the real trade-off adversarial training makes,
demonstrated with actual numbers, not asserted.

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
- No API cost — the classifier, all four attacks, and all three defenses
  (including the two small digit-classifier checkpoints) run locally on
  the backend, no external calls.
- A targeted attack is strictly harder than an untargeted one — it may not
  reach your chosen label within the epsilon range this demo allows.
- PGD takes a few seconds longer than FGSM since it runs several gradient
  steps instead of one.
- Randomized smoothing runs 25 extra forward passes per request (one per
  noised copy), so results take slightly longer than the attack alone.
- The transferability check is OFF by default since it triggers a one-time
  ~45MB ResNet18 weight download on first use, adding to the wait.
- A targeted adversarial patch can take up to 150 optimization steps and
  may still fail to reach the target (a real, honest outcome, not a bug)
  — a smaller patch is more likely to fail; try a larger one first.
- The black-box attack's query budget caps at 3000 — a targeted run at the
  max budget can take up to roughly a minute or more; a real, expected
  cost of not having gradient access, not a slow implementation.
- An uploaded digit photo is capped at 8MB and preprocessed automatically
  (see the Adversarial training section above) — no manual cropping or
  thresholding needed on your end.
`.trim();

export const ADVERSARIAL_SUGGESTIONS = [
  "What's the difference between FGSM and PGD?",
  "Why doesn't either defense always work?",
  "What does 'epsilon' actually control?",
  "What's a targeted vs. untargeted attack?",
  "How is the adversarial patch different from FGSM/PGD?",
  "What makes the black-box attack different from the others?",
  "Why do targeted black-box attacks often fail?",
  "Does this attack transfer to a different model?",
  "Is this attacking the other tools on this site?",
  "What is Grad-CAM showing me?",
  "How is adversarial training different from the other two defenses?",
  "Why does adversarial training use a different model than the rest of the tool?",
];
