export const ASTRO_ANOMALY_GUIDE = `
# Astrophotography Anomaly Detector — User Guide

## What this tool does
Upload 5-30 photos from one fixed-tripod night-sky session, in order, and
this detects meteor and satellite streaks using the real technique
operational meteor/satellite-trail detectors use: differencing
time-adjacent frames, then running a Hough transform on the difference to
find candidate line segments. It also returns a median-stacked "clean"
image of the whole session.

## Purpose
Frame differencing + Hough-transform line detection is the standard
approach in published meteor/satellite-detection systems and real
hobbyist tools (not invented for this project). The key insight that
makes it work: a star drifting slightly between two frames (sky rotation,
no tracking mount) leaves a **dipole** in the difference image — a bright
streak where it moved to, paired with a dark streak where it moved from.
A meteor or satellite trail, present in only one of the two frames,
leaves a **monopole** — one-sided, with no matching opposite-sign
counterpart. This tool filters out dipoles and keeps monopoles as
candidate anomalies.

## How to use it
1. Upload 5-30 photos taken in sequence from a fixed tripod (same
   framing). No image-stacking software needed — just your own JPEGs/PNGs
   in the order they were taken.
2. Click **Detect anomalies**. This is pure classical OpenCV (no neural
   network), so it runs in well under a second even on CPU-only hosting.
3. Review each detected anomaly's cropped preview, drawn on the real
   photo (not the difference image) so you can sanity-check it yourself.
4. Download the median-stacked image for a cleaner view of just the stars.

## A worked example
Verified first against synthetic ground truth (no real astrophotography
session was available to test with — disclosed here rather than glossed
over): a synthetic sequence of 50 drifting "stars" alone produced zero
false-positive detections once the dipole filter was applied. Injecting a
single-frame bright line (simulating a meteor) was correctly detected as
one anomaly; injecting a line that shifted position across three
consecutive frames (simulating a satellite crossing several exposures)
was also correctly detected as a separate anomaly. The median stack of
the star-only sequence fully suppressed both injected transients (down to
the background level) while preserving every star.

## Reading the result
- **Anomaly cards** — each shows the frame range it was found in, its
  length and angle, and a cropped preview with the detected line drawn on
  the original photo.
- **"No anomalies found"** means nothing crossed the detection threshold
  in this session — not a guarantee nothing happened. A faint meteor can
  fall below it.
- **Median stack** — a pixel-wise median across all uploaded frames.
  Meteors and satellites are single-frame outliers at their pixels and
  get rejected by the median; stars, present in every frame, survive.

## Notes & limits
- **No star-based registration.** Real stacking software (DeepSkyStacker,
  Siril) aligns frames by matching star patterns before stacking. This
  tool deliberately skips that and compares/stacks frames exactly as
  uploaded — it works best when the camera didn't move between shots.
- **No meteor-vs-satellite verdict.** This was attempted and rejected
  after testing against synthetic ground truth: a satellite's
  frame-to-frame position shift is almost entirely *along* its own line
  direction (real motion projected onto the sky), which looks
  geometrically near-identical to "the same flash, stationary" using
  position drift alone. Real classification needs proper multi-frame
  trajectory/velocity modeling that this tool doesn't attempt. Every
  detection is labeled "possible meteor or satellite trail," never a
  confident category.
- **A persisting object crossing many consecutive frames may only be
  flagged once** (at its first appearance), not once per frame, since its
  later legs can look dipole-like against its own immediately preceding
  position.
- **Not validated on a real photo session** — only against synthetic
  ground-truth data with known injected anomalies, disclosed above.
`.trim();

export const ASTRO_ANOMALY_SUGGESTIONS = [
  "Why can't this tell a meteor apart from a satellite?",
  "Why is a Hough transform used here instead of a neural network?",
  "What's a dipole vs. a monopole in this context?",
  "Why does median stacking (not averaging) suppress meteors and satellites?",
];
