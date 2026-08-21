// User guide for Face Cloak — rendered in FaceCloakUserGuideModal (the
// "User Guide" header button) AND injected into the floating AI Assistant
// as its ONLY tool knowledge. Keep factual and in sync with the actual
// feature set — especially the honest limitations (see mm_face_cloak.py's
// module docstring for the real testing behind this framing).

export const FACE_CLOAK_GUIDE = `
# Face Cloak — User Guide

## What this tool does
Upload a personal photo and this tool adds an **adversarial perturbation**
to the face region — invisible to your eye — specifically designed to push
that face's representation in a face-recognition model's "embedding space"
far away from where it naturally sits. If that cloaked photo is later
scraped and used to train or match against a facial-recognition system
(the kind companies like Clearview AI build from public photos without
consent), the system learns or matches a DISTORTED representation of your
face instead of the real one. This is the same real technique behind
**Fawkes** (Shan et al. 2020, University of Chicago) and the same idea
Glaze/Nightshade use to protect artists' work from AI style-mimicry.

## How to use it
1. Click **Choose photo** and upload a personal photo with a visible face.
2. Adjust **strength (epsilon)** — how large the perturbation is allowed
   to be. Higher values disrupt the face embedding more but are more
   likely to become visible as texture, especially at the high end.
3. Click **Cloak this photo** to see the original and cloaked photo side
   by side, plus how much the face's embedding actually moved.

## Reading the result
- **Cosine similarity**: how similar the cloaked face's embedding is to
  the original, on a -1 to 1 scale. 1.0 = identical (uncloaked). Real
  face-verification systems generally treat similarity above ~0.5-0.7 as
  "same person" and below ~0.3 as "different person" for this class of
  model — a common heuristic range, not a certified per-system threshold.
- **Protection level** (Strong / Moderate / Weak): a plain-language read
  on the cosine similarity number above, using those same heuristic
  cutoffs. "Strong" means the embedding moved into different-person
  territory; "Weak" means it barely moved at all — try a higher epsilon.
- Real testing on a real photo: epsilon=0.05 dropped cosine similarity
  from 1.0 (identical) to -0.58 (near-opposite direction) in under 2
  seconds — a large, measured disruption, not a marginal one.

## What this is (and isn't) — read this honestly
- This is a **simplified, untargeted** version of the real Fawkes
  technique. The actual paper pushes the face toward a REAL, chosen decoy
  identity's embedding (a stronger, more durable form of protection); this
  tool instead pushes the embedding AWAY from its own original position,
  since it doesn't ship a bundled dataset of decoy faces to target. Still
  a real, measured disruption — just not the paper's full method.
- This protects the SPECIFIC photo you cloak, going forward. It does
  nothing for copies of this photo that are already online or already
  scraped into an existing dataset.
- Published follow-up research on the real Fawkes technique found its
  protection can weaken against face-recognition models that get
  RETRAINED after a cloaking method becomes publicly known — this is an
  ongoing arms race between cloaking techniques and recognition systems,
  not a permanent, one-time fix.
- No real re-identification benchmark is run here (no bundled dataset of
  real same-person/different-person photo pairs) — the cosine-similarity
  drop is a real, directly measured signal, but not a guarantee against
  every possible face-recognition system that might exist.
- The embedding model used (InceptionResnetV1, trained on VGGFace2) is a
  generic, off-the-shelf, MIT-licensed model — not tied to any specific
  real-world recognition system, and not any model used elsewhere on this
  site.

## Notes & limits
- No API cost — face detection, the embedding model, and the cloaking
  optimization all run locally on the backend, no external calls.
- Only works on a photo with a face the detector can find; a very small,
  angled, or obscured face may not be detected at all.
- Only the face region (with a margin) is perturbed — the rest of the
  photo is left completely untouched.
- Nothing is stored: your photo and the cloaked result only exist for
  this one run.
`.trim();

export const FACE_CLOAK_SUGGESTIONS = [
  "What is Fawkes and how does this relate to it?",
  "What does 'cosine similarity' mean here?",
  "Does this protect photos already online?",
  "Why is this different from the real Fawkes paper?",
  "Will this still work against future face-recognition models?",
  "Is this attacking the other tools on this site?",
];
