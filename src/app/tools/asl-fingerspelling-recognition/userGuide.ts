export const ASL_FINGERSPELLING_GUIDE = `
# ASL Fingerspelling Recognition — User Guide

## What this tool does
Hold up one hand fingerspelling a letter of the American Sign Language
alphabet, and this recognizes it live from your webcam — MediaPipe hand
landmarks feed a k-nearest-neighbor classifier trained on real photos,
entirely in your browser.

## Purpose
This was originally brainstormed as a general "sign language translator."
Real ASL translation is a fundamentally different, much harder problem —
ASL is its own language with its own grammar and word order, recognized
from whole-word or sentence video sequences (the real research datasets
for this, WLASL and 2M-Flores-ASL, are built around exactly that). A
single-frame hand-pose classifier can't honestly do that. This tool is
rescoped to the real, well-defined sub-problem it can actually do:
recognizing individual finger-spelled letters — how ASL signers spell out
names, places, or words that don't have a dedicated sign.

## How to use it
1. Click **Start camera** and allow camera access.
2. Hold up one hand, facing the camera, forming one of the ${24}
   supported letters (see the reference chart below the camera view).
3. Hold the shape steady for a moment — a letter only appears once the
   same prediction holds for several consecutive frames, to avoid
   flickering between guesses.

## A worked example — real, measured accuracy, not assumed
Trained and evaluated on real photos from a public dataset, not
synthetic data: extracted MediaPipe hand landmarks from a real
photo dataset, held out ~15% of the successfully-detected photos as a
genuine test set never included in the shipped classifier, and measured
**79% accuracy** (248/314 held-out photos) across 24 letter classes
(random chance would be about 4%). Rotation-normalizing the hand's
orientation was tried and found to make accuracy WORSE (67.8% vs. 75.5%
at the time), so it was dropped — a real result, not a guess, and a good
example of why every technique choice here was tested, not assumed.

## Reading the result
- **A letter appears** once the same prediction has held steady for
  several consecutive frames.
- **"Hold the shape steady…"** means a hand is detected but the
  prediction hasn't stabilized yet.
- **"Show one hand to the camera"** means no hand is currently detected.

## Notes & limits
- **Fingerspelling only, not sign-language translation.** This
  recognizes individual letters, never whole signed words, phrases, or
  ASL grammar.
- **J and Z are excluded.** Both require a traced motion in real ASL
  (a hooked path for J, a traced Z shape) that a single static frame
  cannot capture — datasets built for static-letter recognition (e.g.
  Sign Language MNIST) exclude them for the same reason.
- **Known mix-ups, from the real confusion data measured during
  evaluation**: U/V/R (similar raised-finger configurations), M/S/N/A
  (similar closed-fist variants), K/X/P. These are genuine, disclosed
  limitations of the underlying hand shapes being visually close, not
  bugs to "fix."
- **Trained on plain-background studio photos.** Live webcam accuracy in
  a cluttered or dim environment has not been verified end-to-end in
  this environment (this project's test browser doesn't deliver real
  webcam frame data) — an open follow-up, not something claimed as
  tested. Landmark-based classification (not raw-pixel) is inherently
  more robust to background changes than a pixel-based model would be,
  but this hasn't been confirmed on a real camera yet.
- **Runs entirely in your browser.** No video frame is ever sent to a
  server.
`.trim();

export const ASL_FINGERSPELLING_SUGGESTIONS = [
  "Why doesn't this support J and Z?",
  "Why is this fingerspelling recognition and not full sign-language translation?",
  "Why does rotation-normalizing the hand actually hurt accuracy here?",
  "What causes the U/V/R and M/S/N/A mix-ups?",
];
