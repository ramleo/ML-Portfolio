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
best match — in local testing, "bicycle" on a real photo of a bike
returned a box at 94.6% confidence, and SAM2 correctly segmented the whole
bike (frame, wheels, saddle) from that box. Now try a description of
something NOT in the clip (e.g. "elephant") — the tool correctly reports
it couldn't find that description in the first frame, rather than tracking
a wrong or empty region.

## Reading the result
- **The player** — a sampled sequence of frames with the tracked object
  highlighted in a colored overlay, played back at the processing frame
  rate. This is a preview, not a downloadable video file.
- **Warnings** — shown if your clip was longer than the 6-second cap and
  got trimmed.
- A failure to find your description means exactly that — try a clearer,
  shorter description, or trim your clip so the object is visible from
  the very first frame.

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
