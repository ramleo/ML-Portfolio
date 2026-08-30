# Adversarial Robustness Lab

## What problem it solves

A neural network that classifies photographs with 90% accuracy can be made to
misclassify almost any one of them by changing the pixels in a way a person
cannot see. This is not a rare corner case or a bug in one model. It is a
property of high-dimensional decision boundaries that has survived a decade of
attempts to fix it.

That matters directly for the rest of this book. Several tools here — the
liveness check, the tampering detector, the object detectors — rest on a
classifier's output. If a classifier can be steered by an engineered
perturbation, then any decision built on top of it inherits that weakness. This
lab exists to make the failure visible, and then to show, honestly, how far the
available defences actually get you.

It runs four attacks and three defences against a real pretrained model, and
reports what happens rather than what should happen. Several of the results
recorded here are negative.

## How it works, step by step

1. **Upload a photo.** It is resized to 224×224 and classified by MobileNetV2,
   pretrained on ImageNet's 1,000 categories.
2. **Choose an attack** — FGSM, PGD, an adversarial patch, or the query-only
   black-box attack — and a strength, ε.
3. **Choose untargeted or targeted.** Untargeted means "make it wrong".
   Targeted means "make it say *this specific label*".
4. **The attack runs** and produces a modified image.
5. **Both images are classified**, and **Grad-CAM heatmaps** show where the
   model was looking before and after.
6. **Optionally check transferability** — does the same modified image also
   fool ResNet18, a model the attack never touched?
7. **Run a defence** — JPEG recompression or randomised smoothing — on the
   attacked image and see whether the correct label comes back.
8. **Separately, the adversarial-training panel** compares two small digit
   classifiers, one trained normally and one trained on attacks.

## The model or algorithm

### Why the model is off-the-shelf

The target is torchvision's **MobileNetV2**, ImageNet-pretrained, roughly 14 MB.
It is deliberately not any model used elsewhere in this project — the point is a
general property of neural classifiers, not an attack on this application. It
also has to be a real PyTorch model rather than the ONNX exports used by the
other vision tools here, because three of the four attacks need **gradients**,
and ONNX runtime only does forward passes.

### Attack 1 — FGSM, the one-step attack

The **Fast Gradient Sign Method** (Goodfellow et al., 2014) is the foundational
attack and is one line of mathematics:

```
x_adv = x + ε · sign( ∇ₓ  L(model(x), y_true) )
```

Training computes the gradient of the loss with respect to the *weights* and
steps them downhill. FGSM computes the gradient with respect to the **pixels**
and steps them uphill — the same machinery, aimed the other way. Taking only
the `sign` means every pixel moves by exactly ε, which spends the entire budget
in the L∞ sense while keeping any single pixel's change imperceptible.

Targeted FGSM is the same expression with the sign flipped and the target label
substituted: descend the loss towards the label you want instead of ascending
away from the one that is correct.

### Attack 2 — PGD, the iterative attack

**Projected Gradient Descent** (Madry et al., 2018) is FGSM done properly:
several small steps instead of one large one, with a projection back inside the
allowed region after each step.

```
for each of 10 steps:
    x_adv ← x_adv + α · sign(∇ₓ L)          with α = ε/4
    x_adv ← clip(x_adv, x − ε, x + ε)       project onto the ε-ball
    x_adv ← clamp(x_adv, 0, 1)              stay a valid image
```

The projection is what makes it correct rather than merely iterative. Without
it the perturbation grows without bound and stops being imperceptible; with it,
the attack explores the ε-ball's interior instead of only its corner. PGD is
generally regarded as the strongest first-order attack and is the standard
against which defences are measured.

Two clamps, not one: the ε-ball keeps the perturbation small, and the [0,1]
clamp keeps the result a displayable image. An adversarial example with a pixel
value of 1.3 is not an image.

### Attack 3 — the adversarial patch

A different family entirely. Instead of a tiny change everywhere, this
optimises a **single visible square** — a sticker — with no ε constraint at all
inside that square. The rest of the image is untouched. This is the attack
family that can, in principle, be printed and stuck on a physical object.

A mask selects a centred square covering a chosen fraction of the image; the
patch pixels are then optimised by the same sign-of-gradient step used by PGD,
free to take any value in [0,1]. The loop **early-stops the moment the goal is
met**, so the reported step count is a real measure of how much optimisation
that particular run needed rather than a fixed budget.

Testing found a sharp asymmetry worth stating plainly:

| Goal | Result |
|---|---|
| Untargeted | fools the classifier almost immediately — often within 1–2 steps, sometimes because a patch of this size is already a large blunt perturbation before optimisation contributes anything |
| Targeted, 10% patch | failed to reach the chosen label at all within the step budget |
| Targeted, 25% patch | reached it in under 40 steps |

This is the single-image, single-position version. Brown et al.'s original
**universal** patch is trained across many images, positions, scales and
rotations using expectation-over-transformation so that it works anywhere on
any photo — a substantially larger job, and the tool does not claim to do it.

### Attack 4 — the black-box attack, with no gradients at all

The first three attacks assume you can differentiate through the model, which
means having the weights. The realistic threat model usually does not: you have
an HTTP endpoint that returns scores.

This implements a simplified **SimBA** (Guo et al., 2019). Visit random,
never-repeated `(channel, row, column)` coordinates. At each one, try nudging
that single value by +ε, then by −ε, and keep whichever direction moves the
target class's softmax score the right way. If neither helps, leave it and move
on.

Because each coordinate is touched at most once, the maximum per-pixel change
is bounded by ε automatically — the algorithm gets its ε-ball for free, with no
projection step.

The measured results are the reason this attack is in the tool:

| Goal | Queries | Wall time | Outcome |
|---|---|---|---|
| Untargeted | 348 | ~5.5 s | succeeded |
| Targeted | 3,000 | ~46 s | **failed** |
| Targeted, larger step | 6,000 | ~94 s | **still failed** |

Query-only attacks are dramatically more expensive than white-box ones, and a
request-sized query budget is often simply not enough for a targeted goal. That
is a genuine property of the threat model, reported as observed rather than
tuned away.

One caveat is stated in the code: this assumes **score-based** access, meaning
the API returns a probability. Many hosted classifiers do. A true label-only
black box, where you see nothing but the top-1 string, is harder still and
needs far more queries.

### Grad-CAM — showing *why*, not just *what*

A changed label alone is unconvincing; it looks like a number moved. Grad-CAM
takes the last convolutional block's activations, weights each channel by its
gradient towards the predicted class's logit, and produces a heatmap of the
regions that actually drove *that specific prediction*.

Computed for both the original and the attacked image and shown side by side,
it makes the attack legible: the model's attention shifts off the object and
onto background texture that now carries the engineered signal.

### Defence 1 — JPEG recompression

Encode the attacked image as lossy JPEG and decode it back. JPEG's quantisation
discards high-frequency detail, and an adversarial perturbation is largely
high-frequency, so some of the attack is destroyed while the image content
survives.

Two outcomes are reported separately, and the distinction is the honest part:

- **`recovered`** — the defended prediction exactly matches the original
  correct label. The strict, ideal outcome.
- **`disrupted`** — the defended prediction merely differs from the
  attacker's chosen wrong label. Weaker, but evidence the defence did
  something.

Testing across several ε and quality combinations found it more often achieves
*disruption* than *recovery*, works better against PGD than against
single-step FGSM, and struggles when the model's original confidence was
unremarkable to begin with. That matches the mixed findings in the
adversarial-ML literature on input-preprocessing defences, and it is reported
rather than filtered down to the favourable settings.

### Defence 2 — randomised smoothing

Instead of one prediction, classify 25 independently Gaussian-noised copies of
the image and take a majority vote. The intuition: the perturbation is a small,
precisely-aimed direction in pixel space, and large random noise knocks most
samples off that direction, so the vote drifts back towards the image's true
neighbourhood.

The sigma sweep run during development is the most useful thing in this
section:

| σ | Effect on a strong PGD attack (ε = 0.08) |
|---|---|
| 0.15 | barely disrupted anything — 96% of votes stayed on the attacker's label |
| **0.25** | *sometimes* recovered the correct label, but with vote confidence around 0.3–0.4 — a bare plurality that changed between runs on identical input |
| 0.35+ | started destroying real image content, landing on labels unrelated to either the original or the attack |

The shipped default is 0.25, and its instability is surfaced directly as
`vote_confidence` rather than hidden behind a single point prediction. Too
little noise and the attack survives; too much and you have destroyed the
image. The usable window is narrow and depends on the attack strength you did
not know in advance.

This is the **empirical** vote only. Cohen et al.'s certified-radius guarantee
needs thousands of samples plus a concentration bound, and the tool explicitly
does not claim it.

### Defence 3 — adversarial training

The other two defences are tricks bolted onto a finished model. Adversarial
training (Madry et al., 2018) changes how the model is built: generate attacks
during training and train on them, so the decision boundary is pushed away from
the directions attacks actually use.

This cannot be demonstrated on MobileNetV2 — real adversarial training needs
many epochs over a labelled dataset, which is not happening per-request on a
CPU-only host. So the panel uses two small CNNs (about 110K parameters each)
trained once offline on MNIST and shipped as static checkpoints of roughly
427 KB. Same architecture, same data, same three epochs; the only difference is
the training procedure.

| | Clean accuracy | Accuracy under PGD |
|---|---|---|
| Standard training | **98.62%** | **1.09%** |
| Adversarial training | 96.98% | **84.30%** |

That table is the whole argument. The standard model is essentially destroyed
by an attack it never saw. The adversarially-trained model gives up about 1.6
points of clean accuracy and keeps 84% under the same attack.

Both models are attacked **independently and white-box**, each using its own
gradients, because the optimal perturbation differs per model and sharing one
would be an unfair, weaker test of the defended model.

## Why these choices

**Why show FGSM when PGD is strictly better?** Because the comparison is the
lesson. FGSM is one step and PGD is ten, and the difference shows up everywhere
— in success rate, in how much of the ε budget is actually used, and most
strikingly in transferability.

**The transferability finding.** With `check_transfer` enabled, the same
attacked image is handed to ResNet18, a different architecture that the attack
never had gradient access to. Across ε from 0.02 to 0.08 on a real photo:
FGSM's perturbation **did not transfer at any tested ε** — ResNet18 kept its
correct prediction every time, even though FGSM fooled MobileNetV2 every time.
PGD's perturbation **transferred at every tested ε**. It moved ResNet18's
prediction, though never to the same wrong label MobileNetV2 landed on.

This is a single-image, single-model-pair observation, and it is reported that
way rather than as a general law. But the direction is intuitive: a one-step
attack finds a perturbation specific to one model's local gradient, while an
iterative attack pushes further into a region where several models are wrong
together.

**Why is targeted always the harder mode?** Untargeted needs the prediction to
land anywhere in 999 wrong classes. Targeted needs it in one specific class.
Same ε budget, vastly smaller target — which is why targeted mode fails within
budget for the patch at 10% and for the black-box attack entirely.

**Why present three defences that all partially fail?** Because that is the
state of the field, and a lab that showed only a defence that works would be
teaching the wrong thing. The two input-preprocessing defences are cheap and
unreliable. Adversarial training genuinely works and costs clean accuracy,
training time, and generality. There is no free option, and the honest ordering
is: adversarial training if you can afford it, input preprocessing as
defence-in-depth, and never a claim of robustness without measuring it under
attack.

## How to read the output

Compare the two labels first, then the two Grad-CAM heatmaps. If the label
changed but the attention map is unchanged, the model was near a boundary
already; if the attention moved off the object, the attack redirected it.

For the patch attack, read the step count — it is a real measure of difficulty
for that image, since the loop early-stops on success.

For the black-box attack, read the query count. That number is the attack's
real-world cost against a rate-limited API, and it is the reason gradient
access matters so much.

For randomised smoothing, read `vote_confidence`, not the label. A correct
label at 0.35 vote confidence is a coin flip that happened to land well, and
re-running on the identical input can give a different answer.

For the defences generally, `disrupted` without `recovered` means the defence
broke the attack without restoring the truth. That is a real outcome and
usually the common one.

## Limits

- **One model, one dataset per demo.** The main lab is MobileNetV2 on ImageNet
  photos; the adversarial-training panel is a tiny CNN on MNIST digits. MNIST
  robustness results notoriously do not generalise upward.
- **The adversarially-trained model was only tested against PGD** at the ε
  range offered here. Robustness against attacks it was not trained on — a
  different ε, a transferred attack, a black-box attack — can be much weaker.
- **The patch is not universal.** It is optimised for one image at one
  position, and physical printing, angle and lighting are not modelled.
- **The black-box attack assumes score access.** Label-only is harder.
- **Randomised smoothing here is empirical**, with no certified radius.
- **Uploaded photos of handwritten digits are out-of-distribution** for the
  MNIST models. Preprocessing mirrors MNIST conventions — greyscale, auto-invert,
  crop to ink, centre, resize to 28×28 — but a photographed digit can be
  misclassified before any attack, which is why the preprocessed image and the
  clean prediction are both shown.
- **Every number quoted in this chapter came from a specific run** on a
  specific image. They demonstrate behaviour; they are not benchmarks.

## Likely interview questions

**"Explain FGSM in one sentence."**
Take the gradient of the loss with respect to the input pixels rather than the
weights, step every pixel by ε in the direction of that gradient's sign, and
you have moved the image across the decision boundary while changing each pixel
by an amount too small to see.

**"Why does PGD beat FGSM?"**
FGSM takes one linear step, which assumes the loss surface is locally linear
over the whole ε-ball — it usually is not. PGD takes several smaller steps and
projects back onto the ball after each, so it follows the curvature and finds a
better point inside the same budget. Empirically it also produces perturbations
that transfer to other models, which the single step does not.

**"What is the difference between a targeted and an untargeted attack, and why
does it matter operationally?"**
Untargeted only requires the model to be wrong; targeted requires a specific
wrong answer. Targeted is much harder for the same budget, which is why some
attacks in this lab succeed untargeted and fail targeted outright. It matters
operationally because most real harms are targeted — making a stop sign read as
a speed limit, or making malware classify as benign — so untargeted success
rates overstate the attacker's real capability.

**"Your defence recovered the correct label. Is the model safe now?"**
No, for two reasons. First, the defence was measured against the attack it was
shown; an attacker who knows the defence is present can attack the composed
system — differentiate through the JPEG approximation, or optimise against the
noise distribution. That is **adaptive attack** evaluation, and the field's
history is a long list of defences that looked strong until someone ran one.
Second, in this lab the recovery is unstable: the smoothing vote sits near 0.35
and flips between runs on identical input.

**"What does adversarial training cost?"**
Clean accuracy, training compute, and generality. Here, 1.6 points of clean
accuracy for 83 points of robust accuracy against the trained-for attack — a
good trade at this scale. Training cost is the real bill: each batch needs a
full PGD attack generated against the current weights, so an epoch costs
roughly the number of attack steps times a normal epoch. And the robustness is
specific to the attack type and ε range it was trained on.

**"How would you attack a model you have no access to?"**
Either transfer or query. Transfer: train or obtain a substitute model on
similar data, attack it with something iterative like PGD, and hope the
perturbation carries — this lab's transfer result shows PGD carrying where FGSM
did not. Query: a score-based method like SimBA, which needed 348 queries for
an untargeted success here and failed targeted at 6,000. That query count is
also the defence — rate limiting, returning coarse or top-1-only scores, and
detecting the near-duplicate query patterns these attacks produce all raise the
cost sharply.

**"Why do adversarial examples exist at all?"**
The framing I find most useful is Ilyas et al.'s: they are not bugs but
**non-robust features**. Models learn genuinely predictive patterns that happen
to be imperceptible to humans and brittle under small perturbation. The model
is not malfunctioning — it is using signal that is real in the training
distribution and trivially manipulable. That also explains transferability:
different models trained on the same data learn overlapping non-robust
features, so a perturbation that exploits one often exploits another.

**"Where does this matter in a product?"**
Anywhere a classifier's output triggers a consequence without a human in the
loop — content moderation, fraud scoring, biometric liveness, automated
inspection. The engineering response is not to expect a robust model. It is to
assume the classifier can be steered and to design the surrounding system
accordingly: rate limits and query-pattern monitoring to make black-box attacks
expensive, multiple independent signals so no single model is decisive,
human review for consequential outcomes, and measuring accuracy under attack
rather than only on the clean test set.
