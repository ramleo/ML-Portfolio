export const POSE_VJ_VISUALS_GUIDE = `
# Pose VJ Visuals — User Guide

## What this tool does
Turn on your camera and **drive a live generative particle visual with your hand
movements**. Hand landmarks are tracked **in your browser** by MediaPipe, so **no video
frame leaves your device**. Switch the microphone on as well and particle **size and
density react to live volume** — raw loudness, not beat or genre detection.

## Purpose
It's a playful, privacy-first demo of real-time, on-device vision: your hand becomes the
controller for a visual, with nothing streamed to a server. A "VJ" (video-jockey) toy that
shows how capable in-browser ML has become.

## How to use it
1. Allow **camera** access; raise a hand into frame.
2. Move your hand — the particles follow your hand's position and gestures.
3. Optionally allow the **microphone** — louder sound makes particles bigger/denser.

## A worked example
Hold your hand up and sweep it across the frame — the particle cloud trails your palm.
Open and close your hand to change the effect. Turn on the mic and talk or play music:
the particles swell with volume and settle in quiet — a hand-and-sound-driven light show,
all computed locally.

## Reading the result
- The visual responds to **where your hand is** and its landmarks (MediaPipe
  HandLandmarker).
- With the mic on, **loudness** (not rhythm) maps to particle size/density.

## Notes & limits
- **Fully client-side** — hand tracking runs as WebAssembly in your browser; **no camera
  or mic data is uploaded** or stored.
- **Needs a camera** and decent light for reliable hand tracking.
- **Volume only** — it reacts to raw loudness, not beat, pitch or genre.
`.trim();

export const POSE_VJ_VISUALS_SUGGESTIONS = [
  "Does my camera or mic data leave my device?",
  "What controls the particles — position or gestures?",
  "How does the microphone change the visual?",
  "Why isn't it reacting to the beat of my music?",
];
