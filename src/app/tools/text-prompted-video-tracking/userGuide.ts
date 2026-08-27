export const ROTOSCOPE_GUIDE = `
# Text-Prompted Video Object Tracking — User Guide

## What this tool does
Upload a short video and type a description of an object in it (e.g. "the
red backpack"). The tool finds that object in the first frame and tracks +
masks it through the rest of the clip, returning a colored-overlay preview
— the real technique behind AI-assisted rotoscoping tools, without a green
screen or manual frame-by-frame masking.

## Purpose
This was originally scoped around Meta's SAM3 ("Segment Anything 3"),
which does exactly this natively from a text prompt. Researched before
building anything: SAM3's checkpoints are currently gated behind a Meta
access request under a custom license, with no reliable pip package — not
usable for this project today. Instead, this uses **Grounded-SAM**, a
well-established real combined technique: **Grounding DINO** (an
open-vocabulary object detector) finds your described object once on the
first frame, then **SAM2** (Meta's Segment Anything Model 2) tracks and
masks it through every following frame using its video memory mechanism.
Both are freely available (Apache 2.0, ungated) and deliver the same
end-user outcome — type what you want, watch it get tracked — via two
models instead of one.

## How to use it
1. Upload a short video (it will be trimmed to 6 seconds).
2. Type a short, specific description of an object visible in the very
   first moment of the clip (Grounding DINO only looks at frame one).
3. Click **Track & mask**. This runs on CPU on a free hosted Space, so it's
   genuinely slow — expect roughly 15-40 seconds.
4. Play, pause, or scrub through the returned frame sequence.

## A worked example
Upload a clip with a clearly visible object (a bicycle, a backpack, a
mug) and type its name. Grounding DINO returns a bounding box around the
best match — in testing, "the flower" on a real close-up photo returned a
box at 80% confidence tightly around the actual flower, and SAM2 correctly
segmented just that flower (not the leaves or the second bud) through
every frame of a zoom.

## Reading the result
- **The player** — a sampled sequence of frames with the tracked object
  highlighted in a colored overlay, played back at the processing frame
  rate. This is a preview, not a downloadable video file.
- **Warnings** — shown if your clip was longer than the 6-second cap and
  got trimmed.
- An explicit "couldn't find" error only fires when Grounding DINO's best
  guess scores below its confidence floor — it does **not** reliably catch
  every wrong prompt. Tested with "the elephant" on a photo that had no
  elephant in it: the model still returned its best-guess region (a
  flower) at 73% confidence, close enough to a real match's confidence to
  be indistinguishable by score alone. This is a known, published
  limitation of open-vocabulary grounding models in general, not a bug in
  this pipeline — always sanity-check the tracked region visually rather
  than trusting a lack of an error message.

## Notes & limits
- **This is not SAM3.** Disclosed prominently because the underlying
  models matter: Grounded-SAM is a real, published, widely-used technique,
  but a different pipeline with different failure modes than SAM3's native
  concept segmentation.
- **Sampled-frame preview, not a full video export.** Output is downscaled
  and reduced to about 4 frames per second, capped at 6 seconds — a
  deliberate scope reduction for CPU-only hosted inference, not a bug.
- **Grounding only happens once, on frame 0.** If the object isn't visible
  yet when the clip starts, tracking can't be initialized.
- **A wrong description isn't always caught.** Grounding DINO has no
  reliable "nothing here matches" signal — it always returns its
  highest-scoring guess. A description of something not actually in the
  frame can score close enough to a real match to skip the error path
  entirely and mask the wrong region instead. Always check the tracked
  overlay visually rather than assuming success means a correct match.
- **No camera-angle or occlusion robustness guarantees.** SAM2's tracking
  can drift or lose an object through heavy occlusion or fast motion —
  a real, published limitation of video segmentation models, not unique
  to this tool.
`.trim();

export const ROTOSCOPE_SUGGESTIONS = [
  "Why isn't this actually using Meta's SAM3?",
  "What's the difference between Grounding DINO and SAM2 in this pipeline?",
  "Why does the tool only look at the first frame for the text prompt?",
  "Why is the output a frame sequence instead of a video file?",
];
