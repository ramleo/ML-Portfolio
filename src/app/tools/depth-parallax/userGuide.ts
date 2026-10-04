export const DEPTH_PARALLAX_GUIDE = `
# Depth Parallax — User Guide

## What this tool does
Upload one photo and get a **per-pixel depth map** — how near or far each pixel is —
then watch it become a **parallax diorama**: near objects shift more than far ones as
you move your pointer. The depth model runs on this project's own server (not a
third-party AI provider); your photo is sent there to build the depth map, processed in
memory, and **not stored**. The visual effects then render in your browser with WebGL.

## Purpose
Monocular depth estimation — guessing 3D structure from a single flat photo — is one of
the more striking things a vision model can do. This tool makes it tangible: it turns
the raw depth map into several effects you can actually see and move.

## How to use it
1. **Upload a photo** (one with clear near and far elements — a person in front of a
   background — shows the effect best).
2. Wait for the **depth map** to be built on the server.
3. Pick a **mode** and move your pointer over the image:
   - **Parallax** — near things shift more than far things as you move.
   - **Depth map** — the raw near→far map itself.
   - **Bokeh** — far regions blurred, near kept sharp (depth-of-field).
   - **AR occlusion** — a placed object sits correctly in front of/behind scene depth.
   - **3D relief** — the image pushed into a depth-shaded surface.

## A worked example
Upload a portrait with a background a few metres back. In **Parallax**, moving the
pointer makes the subject glide against the background like a diorama. Switch to
**Bokeh** and the background softens while the face stays sharp — the classic
portrait-mode look, produced from the single photo's depth.

## Reading the result
- Brighter/closer vs darker/farther in the **depth map** shows what the model inferred.
- Clean subject/background separation = a good depth estimate; fuzzy edges or haloing
  around the subject = the model was unsure there.

## Notes & limits
- **Single-image depth is an estimate, not a measurement.** Thin objects, reflections,
  glass and flat textureless walls are the usual trouble spots.
- **Effects run in your browser (WebGL).** Only the depth map is computed on the
  server; the parallax/bokeh/relief rendering is client-side.
- **Privacy.** Your photo is used only to build the depth map, processed in memory, and
  not retained.
`.trim();

export const DEPTH_PARALLAX_SUGGESTIONS = [
  "Which photos work best for the parallax effect?",
  "What do the five modes do?",
  "How can one flat photo become 3D?",
  "Why are the edges around my subject fuzzy?",
];
