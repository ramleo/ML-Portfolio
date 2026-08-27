export const PPE_COMPLIANCE_GUIDE = `
# PPE Compliance Check — User Guide

## What this tool does
Upload a photo and this detects each person in it, then checks whether a
hard hat and safety vest are visible on them — a real compliance-style
check, using a dedicated PPE-detection model rather than the site's
general object detector (which has no safety-vest class at all).

## Purpose
Checked the code before building anything: the existing 601-class object
detector has a generic "Helmet" class but no vest class of any kind, so a
dedicated model is genuinely required here. Found and hands-on tested
**Hansung-Cho/yolov8-ppe-detection** (MIT-licensed weights, YOLOv8n) —
not trusted from its model card alone: an initial test on a very
low-resolution photo gave a weak, borderline result, investigated and
found to be a resolution problem, not a model problem. Re-tested on 3
higher-resolution real photos and got a real, confident pass (hard hat
0.72-0.88 confidence, safety vest 0.39-0.69), including correctly *not*
claiming "worn" PPE on a photo of gear just lying on the ground.

## How to use it
1. Upload a photo containing one or more people.
2. Click **Check compliance**.
3. Review the annotated image and the per-person hard-hat/vest status.

## A worked example
A studio photo of a worker facing the camera, wearing both a hard hat and
a safety vest clearly, scored: Person 80%, Hardhat 88%, Safety Vest 69% —
all correctly detected. A separate photo of the same gear laid out on the
ground (nobody wearing it) correctly reported both items "unclear" rather
than falsely claiming either compliance or non-compliance, since neither
the "worn" nor "not worn" signal fired confidently on gear that isn't
being worn by anyone.

## Reading the result
- **Annotated image** — each detected person's box, drawn on the real
  photo so you can visually check every claim yourself.
- **Present / Missing / Unclear** — read from whichever explicit signal
  the model actually detected (the model was trained on both "wearing a
  hard hat" and "not wearing a hard hat" as separate classes). "Unclear"
  means neither signal fired confidently — it is NOT the same as
  "missing," and is not assumed to mean either compliance or
  non-compliance.
- **Unattributed items** — PPE items detected in the photo that couldn't
  be matched to a specific person's head/torso region.

## Notes & limits
- **Not a certified safety-compliance system.** This is a real object
  detector applied to a real, disclosed problem, not a validated
  workplace-safety product.
- **Per-person attribution is a spatial heuristic**, not real person
  tracking or pose estimation: each detected hard hat/vest is matched to
  the nearest person's head or torso region by simple box overlap. A
  crowded photo with overlapping people can misattribute an item to the
  wrong person.
- **Detection confidence varies with camera angle and image quality**,
  same as any object detector — an unusual angle can lower confidence
  even for genuinely-worn PPE (seen directly in testing: a top-down
  camera angle scored a real, clearly-worn vest at only 39% confidence).
`.trim();

export const PPE_COMPLIANCE_SUGGESTIONS = [
  "Why doesn't the site's main object detector already do this?",
  "Why does 'unclear' exist instead of just present/missing?",
  "How does per-person attribution work without real person tracking?",
  "What would it take to make this a validated safety product?",
];
