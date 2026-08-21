// User guide for Style Cloak — rendered in StyleCloakUserGuideModal (the
// "User Guide" header button) AND injected into the floating AI Assistant
// as its ONLY tool knowledge. Keep factual and in sync with the actual
// feature set — especially the honest limitations (see mm_style_cloak.py's
// module docstring for the real testing behind this framing).

export const STYLE_CLOAK_GUIDE = `
# Style Cloak — User Guide

## What this tool does
Upload an image — artwork, a photo, anything you've made — and this tool
adds an **adversarial perturbation** across the whole image, invisible
to your eye, specifically designed to push that image's representation
in a CLIP vision model's "embedding space" far away from where it
naturally sits. If that cloaked image is later scraped and used to
train or fine-tune an AI style-mimicry model, the model learns a
DISTORTED representation of it instead of the real one. This is the
same real idea behind **Glaze** and **Nightshade** (Shan et al. 2023,
University of Chicago) — built to protect artists' work from
unauthorized AI style-mimicry — and the same technique Face Cloak
applies to face-recognition embeddings instead of style embeddings.

## How to use it
1. Click **Choose image** and upload the image you want to protect.
2. Adjust **strength (epsilon)** — how large the perturbation is allowed
   to be. Higher values disrupt the embedding more but are more likely
   to become visible as texture, especially at the high end.
3. Click **Cloak this image** to see the original and cloaked image side
   by side, plus how much the embedding actually moved.

## Reading the result
- **Cosine similarity**: how similar the cloaked image's embedding is to
  the original, on a -1 to 1 scale. 1.0 = identical (uncloaked). Real
  testing found two totally UNRELATED images typically measure around
  0.65-0.77 in CLIP embedding space (much higher than you might expect —
  CLIP embeddings share generic visual structure even for unrelated
  content), so that range is the honest baseline for "reads as a
  different image" here, not 0.0.
- **Protection level** (Strong / Moderate / Weak): a plain-language read
  on the cosine similarity number, calibrated against that real
  unrelated-image baseline above — not copied from Face Cloak's
  thresholds, since CLIP's embedding space behaves differently from a
  face-recognition model's. "Strong" means the embedding dropped below
  where two unrelated images typically sit; "Weak" means it barely
  moved — try a higher epsilon.
- Real testing on a real image: epsilon=0.06 dropped cosine similarity
  from 1.0 (identical) to -0.36 in about 1-2 seconds — well below the
  unrelated-image baseline, a large, measured disruption.

## What this is (and isn't) — read this honestly
- This is a **simplified, untargeted** version of the real
  Glaze/Nightshade technique. The actual papers push an image toward a
  DIFFERENT, chosen style's feature-space region (Glaze) or specifically
  poison a concept-to-rendering association (Nightshade) — both stronger
  and more durable than pure repulsion. This tool instead pushes the
  embedding AWAY from its own original position, since it doesn't ship a
  bundled style-target dataset to aim at. Still a real, measured
  disruption — just not the papers' full method.
- This protects the SPECIFIC image you cloak, going forward. It does
  nothing for copies of this image that are already online or already
  scraped into an existing training dataset.
- The real Glaze/Nightshade research is an ongoing arms race — style-
  mimicry models can be retrained to be more robust against known
  cloaking methods, so this isn't a permanent, one-time fix.
- No real style-mimicry pipeline is run here (no actual fine-tuning or
  style-transfer training to test against) — the cosine-similarity drop
  is a real, directly measured signal against the CLIP encoder used
  here, but not a guarantee against every possible style-mimicry system,
  which may use a different encoder entirely.
- The embedding model used (CLIP ViT-B/32, OpenAI) is a generic,
  off-the-shelf, MIT-licensed model, not tied to any specific real-world
  mimicry system.

## Notes & limits
- No API cost — the CLIP model and the cloaking optimization both run
  locally on the backend, no external calls.
- The whole image is perturbed, unlike Face Cloak's face-only crop —
  style is a property of the entire image, so there's no sub-region to
  isolate.
- Nothing is stored: your image and the cloaked result only exist for
  this one run.
`.trim();

export const STYLE_CLOAK_SUGGESTIONS = [
  "What is Glaze/Nightshade and how does this relate to them?",
  "What does 'cosine similarity' mean here?",
  "Why is the unrelated-image baseline so high?",
  "Does this protect images already online?",
  "Why is this different from the real Glaze paper?",
  "How is this different from Face Cloak?",
];
