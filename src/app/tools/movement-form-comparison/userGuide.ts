export const MOVEMENT_COMPARISON_GUIDE = `
# Movement Form Comparison — User Guide

## What this tool does
Upload your video of an exercise and a reference video of the same
exercise, and this tracks body pose in both with MediaPipe, computes 6
real joint angles (left/right elbow, knee, hip), and compares them on a
shared 0-100% movement-phase axis so a 4-second clip is directly
comparable to an 8-second one.

## Purpose
MediaPipe joint-angle extraction is a validated technique — published
studies report under 10% error versus marker-based motion capture for
hip/knee angles, and joint-angle classifiers reach over 97% accuracy
distinguishing correct from incorrect form. This is a real measurement
pipeline, not a heuristic gamble: 3D world-landmark coordinates (metric,
camera-distance-invariant) feed a standard 3-point vector-angle formula
at each joint, and each video's own angle-vs-time curve is resampled onto
its own 0-100% phase axis before comparison — the key piece of real
engineering that makes clips of different length and speed comparable.

## How to use it
1. Trim both videos to one full rep, start to finish (≤30s each).
2. Upload **Your movement** and a **Reference movement** of the same
   exercise — ideally a correct-form example.
3. Click **Compare movements**. Pose tracking and angle extraction run
   entirely in your browser; no video is uploaded anywhere.
4. Review the joint charts, ranked worst-deviation-first.

## A worked example
Verified against two real downloaded stock squat videos — different
people, different camera angles, different clip durations — before this
was considered working: the pipeline produced 6 distinct, non-garbage
joint-angle charts correctly ranked by deviation, with no manual
alignment needed despite the clips' different lengths.

## Reading the result
- **Each joint chart** — your angle curve (solid) versus the reference
  (dashed), both plotted on the shared 0-100% movement-phase axis, plus
  the RMS (root-mean-square) angle deviation across the whole rep.
- **"Biggest gap at N% through the movement"** — the single phase point
  where your angle differed most from the reference, in degrees, so you
  know exactly where in the rep to focus rather than just an aggregate
  score.
- **Joints are ranked worst-first** so the most useful comparison is
  always at the top.

## Notes & limits
- **One person, one full rep.** No rep counting or auto-segmentation is
  attempted — upload a clip that's already trimmed to exactly one
  repetition of the movement.
- **A training-form aid, not a clinical or professional-coaching
  assessment.** This surfaces where your joint angles differ from a
  reference, not a diagnosis of injury risk or technique correctness.
- **Reference quality matters.** The comparison is only as good as the
  reference video's own form — this doesn't independently verify the
  reference is "correct."
- **Pose-tracking accuracy depends on video quality.** Poor lighting,
  baggy clothing, or an unusual camera angle can degrade MediaPipe's
  landmark detection, which propagates into the angle measurements.
`.trim();

export const MOVEMENT_COMPARISON_SUGGESTIONS = [
  "How accurate is MediaPipe's joint-angle extraction really?",
  "Why does this resample onto a 0-100% phase axis instead of comparing raw seconds?",
  "Why 3D world landmarks instead of 2D image coordinates for the angle math?",
  "What would it take to add automatic rep counting or segmentation?",
];
