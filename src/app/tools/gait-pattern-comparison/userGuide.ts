export const GAIT_COMPARISON_GUIDE = `
# Gait Pattern Comparison — User Guide

## What this tool does
Upload two side-view videos of someone walking. This tracks body pose
frame-by-frame with MediaPipe (the same technique behind this site's
[Movement Form Comparison](/tools/movement-form-comparison) tool), detects
each video's repeating stride cycles from knee-angle peaks, averages the
joint-angle curve across all detected cycles into one "gait signature" per
video, then compares the two signatures.

## Purpose
Real gait-recognition research exists (e.g. the CASIA-B benchmark line of
work) and typically uses silhouette-based Gait Energy Images or deep
embeddings under controlled camera conditions — and even then has real,
non-trivial error rates. This tool demonstrates the underlying *mechanism*
— pose tracking, cyclic stride segmentation, phase-aligned curve comparison
— using the much coarser, honestly-scoped technique of monocular 2D/3D pose
joint angles from an ordinary phone video, not a validated biometric system.

## How to use it
1. Record or find two videos of someone walking from the side, ideally
   showing at least 3-4 full strides, ≤30 seconds each.
2. Upload one to **Video A** and one to **Video B**.
3. Click **Compare gait patterns**.
4. Review each video's detected stride count and cadence, then the overall
   similarity label and per-joint curve comparison.

## A worked example
Upload the same person walking in two different clips (e.g. two takes of
the same walk) as Video A and B — the tool should detect a similar cadence
and stride count in both, and the per-joint curves should track closely,
producing a **"Similar gait pattern"** label. Now try Video B as a clearly
different walking style (much faster or slower pace, or a different
person) — the cadence and curves diverge, and the label shifts to **"Some
differences"** or **"Substantially different"**. If a clip isn't actually
continuous walking (e.g. someone standing still), the tool correctly
reports "not enough consistent strides detected" instead of guessing.

## Reading the result
- **Strides detected / cadence** — shown per video as soon as pose tracking
  finishes, even before comparing; a real measured stride count and
  steps-per-minute estimate.
- **Overall label** — "Similar gait pattern," "Some differences," or
  "Substantially different," based on the average RMS angle difference
  across joints. These thresholds are a reasonable-looking heuristic
  against typical gait knee/ankle angle ranges, **not calibrated against
  any labeled human gait dataset**.
- **Per-joint charts** — each joint's averaged stride-cycle curve for both
  videos overlaid on a shared 0-100% stride-phase axis, plus the RMS
  difference between them.

## Notes & limits
- **Not a validated biometric identification technique.** Camera angle,
  clothing, walking speed, carried objects, and fatigue all measurably
  affect gait appearance — this tool cannot control for any of them.
  Treat a result as "do these two clips show a similar walking pattern,"
  never as proof of identity.
- **No camera calibration.** Distances and speeds are not measured in
  real-world units — only joint *angles*, which are camera-distance-
  invariant when using MediaPipe's 3D world landmarks.
- **Needs a clear side-view of continuous walking.** A frontal view, a
  partially-visible body, or fewer than 2 full strides will correctly fail
  to produce a signature rather than guessing from insufficient data.
- **Assumes one person per video.** Multiple people in frame will confuse
  pose tracking.
`.trim();

export const GAIT_COMPARISON_SUGGESTIONS = [
  "Why is this not considered real gait-based person identification?",
  "How does the tool detect a stride cycle from just knee angle?",
  "What would make the similarity thresholds more reliable?",
  "How does this relate to Movement Form Comparison?",
];
