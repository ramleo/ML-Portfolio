export const FACE_LIVENESS_GUIDE = `
# Face Liveness Detector — User Guide

## What this tool does
Show your face to the camera, or upload a photo, and see whether it reads as a
**genuinely present face** or a **spoof** — a printed photo or a screen replay. This
is the same category of check that gates face-unlock and identity verification. The
model runs on this project's own server (not a third-party AI provider); your image is
sent there for the check, processed in memory, and **not stored**.

## Purpose
"Is there a real, live person in front of the camera?" is the first question any
biometric system must answer, because a face match alone can be fooled by a photo of
the person. This tool demonstrates that liveness check — and is honest about how hard
it is in a browser under uncontrolled lighting.

## How to use it
1. Allow **camera** access and position your face in frame, or **upload a photo**.
2. Capture — the tool checks the image and, for the webcam, averages several frames
   for a steadier read.
3. Read the verdict: **Real**, **Spoof**, or **Uncertain**.

## A worked example
Point the webcam at your own face in good, even light → it reads **Real**. Now hold up
a photo of a face on your phone screen to the camera → it should read **Spoof** (screen
replay). In poor or uneven lighting, a genuine face can come back **Uncertain** — that
is the tool refusing to guess, not a failure.

## Reading the result
- **Real** — the signals are consistent with a live, present face.
- **Spoof** — patterns consistent with a printed photo or a screen (moiré, flatness,
  reflections).
- **Uncertain** — not enough confidence either way; try better, even lighting and a
  face that fills the frame.

## Notes & limits
- **Lighting-sensitive by design.** Anti-spoofing is genuinely finicky under bad
  lighting; the honest **Uncertain** state exists so the tool doesn't over-claim.
- **Small, fast model.** It runs a compact on-server model (MiniFASNetV2-SE, ONNX,
  ~600KB) — a demonstration, not a production identity gate.
- **Privacy.** Your image is sent to this project's server only for the check,
  processed in memory, and not retained.
`.trim();

export const FACE_LIVENESS_SUGGESTIONS = [
  "Why did a real face come back as Uncertain?",
  "How does it tell a live face from a photo or screen?",
  "Is my photo stored anywhere?",
  "Why is this harder in bad lighting?",
];
