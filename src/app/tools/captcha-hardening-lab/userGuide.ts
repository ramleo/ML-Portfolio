export const CAPTCHA_HARDENING_GUIDE = `
# CAPTCHA Hardening Lab — User Guide

## What this tool does
Upload a CAPTCHA-style image you already have, and a vision-language model
(VLM) attempts to read it. Then a hardening slider stacks three classic,
model-agnostic perturbations — pixel noise, an occlusion wave, and reduced
contrast/color — onto that same image, and the VLM tries to read the
hardened version too. This never contacts or solves a live CAPTCHA on a
real website — it only reads an image you upload.

## Purpose
CAPTCHAs exist to tell humans and bots apart. As VLMs get better at reading
distorted text, it's worth knowing empirically how much visual degradation
it actually takes to defeat a model-based solver, since that number
directly informs how CAPTCHAs should be designed. The real research
question this tool demonstrates is **"how much hardening does it take
before the model's answer breaks?"** — not "can we defeat this one model
outright." Because the VLM is a black-box hosted API with no gradient
access, this deliberately uses classic non-gradient perturbations rather
than adversarial-example techniques like FGSM/PGD (those are used instead
in the separate Adversarial Robustness Lab tool, against a local
white-box model).

## How to use it
1. Click **Choose CAPTCHA image** and upload a distorted-text CAPTCHA image.
2. (Optional) Type what the CAPTCHA actually says into **"What it actually
   says"** — this lets the tool mark each attempt Correct/Wrong instead of
   just showing the raw text the model returned.
3. Drag the **Hardening intensity** slider (0–100) to choose how strongly
   the three perturbations are applied.
4. Click **Test hardening** — the model reads both the original and the
   hardened image, and both results appear side by side.

## A worked example
Upload a 5-character CAPTCHA reading "X7K9P" and type that into the ground-
truth field. At intensity 0–20, the model typically still reads it
correctly (marked **Correct**, green). Raise intensity toward 60–100 and
re-run — mistakes appear (marked **Wrong**, red), or the model's answer
becomes visibly garbled. Note: this project's own live testing found a
large-clear-font synthetic CAPTCHA that the VLM still read correctly even
at maximum (100) intensity — a genuine finding, not tuned away, and exactly
the kind of result this tool is built to surface honestly.

## Reading the result
Each side (Original / Hardened) shows the model's answer text and, if you
supplied ground truth, a **Correct** or **Wrong** badge. There's no single
"defeated" verdict — you're meant to slide the intensity and watch where
(if anywhere) the answer breaks for the specific CAPTCHA and model in front
of you.

## Notes & limits
- Only tests one specific hosted VLM, not every possible CAPTCHA-solving
  model or technique — a different model may have a different breaking
  point on the same image.
- Perturbation strength is capped and deliberately non-adversarial (no
  gradient access to the model) — this is closer to real-world image
  degradation (compression, printing, screen glare) than a crafted
  adversarial attack.
- Never submits to, or interacts with, a live CAPTCHA challenge on any
  real website — upload-only, one image per request.
`.trim();

export const CAPTCHA_HARDENING_SUGGESTIONS = [
  "Why doesn't this use FGSM/PGD like the Adversarial Robustness Lab?",
  "What are the three hardening perturbations exactly?",
  "Does this ever solve a real CAPTCHA on a website?",
  "What does it mean if the model still reads it at 100% intensity?",
];
