export const TEXT_TO_IMAGE_GUIDE = `
# Text-to-Image Generator — User Guide

## What this tool does
Type a description and get an image back — no input photo needed, just a prompt.
It generates on Gemini's paid image model, so a small **daily generation budget**
applies to keep the API cost predictable. You can refine a result with a follow-up
edit instruction, compare versions side by side, and browse what you've made.

## Purpose
Most of this site's vision tools transform a photo you upload; this one is the
pure-generation counterpart — it makes an image from words alone. It shows what a
modern text-to-image model produces, with honest guardrails: a visible budget so a
public tool can't run up an open-ended bill.

## How to use it
1. Type a **prompt** describing the image you want (be specific — subject, style,
   lighting, composition).
2. Pick any **options** offered (e.g. aspect ratio) and click **Generate**.
3. To refine, give a short **edit instruction** (e.g. "make it night-time") — it
   generates a new version from your current one rather than starting over.
4. Use the **comparison grid** to see versions together, and the **history panel**
   to revisit earlier generations.

## A worked example
Prompt: *"a cozy reading nook by a rain-streaked window, warm lamp light, watercolor
style."* Generate, then edit with *"add a sleeping cat on the chair"* — the follow-up
keeps the scene and adds the cat. Open the comparison grid to put the two side by side.

## Reading the result
- The returned image is a **JPEG** (the model returns JPEG for pure generation, not
  PNG) — expected, not a bug.
- Each generation and edit is a separate entry in **history**, so you can step back to
  any earlier version.

## Notes & limits
- **Paid model, daily budget.** Generation uses a paid Gemini image model, so there
  is a per-day cap shared across visitors; when it's reached, try again the next day.
- **Prompt quality drives output.** Vague prompts give generic results; specific
  subject + style + lighting cues help a lot.
- **Generative, not factual.** It invents pixels — it is for creative imagery, not for
  producing accurate diagrams, text, or real people.
`.trim();

export const TEXT_TO_IMAGE_SUGGESTIONS = [
  "How do I write a good prompt for this?",
  "How does the edit instruction change an existing image?",
  "Why is there a daily generation budget?",
  "Why does it return a JPEG instead of a PNG?",
];
