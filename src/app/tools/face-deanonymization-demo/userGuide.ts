export const FACE_REID_GUIDE = `
# Face Deanonymization Risk Demo — User Guide

## What this tool does
Upload a target photo (the kind of photo someone might post publicly) and a
small gallery (2–10) of other real photos of people. The tool runs a real
face-embedding similarity search — the same mechanism Clearview-style
facial-recognition re-identification systems use — to rank which gallery
photo is most likely the same person as the target, and shows the actual
measured cosine-similarity score for every photo in the gallery.

## Purpose
Face Cloak (a sibling tool in this project) demonstrates a *defense*
against facial-recognition scraping — but it only ever measured a cloaked
photo's similarity to its own original embedding, never showed an actual
re-identification happening. This tool exists to close that gap honestly:
it shows the real attack the defense is meant to counter, using the exact
same face-embedding model, so you can see both the risk and the
countermeasure work against each other on real, measured numbers.

## How to use it
1. Click **Choose target photo** and upload a photo containing one face.
2. Click **Add gallery photos** and upload 1–10 other real photos of
   people (a mix of the same person from a different photo and other
   people works best to see the ranking in action).
3. Click **Run search** — every gallery photo gets a real cosine-similarity
   score against the target's face embedding, and the best match is
   called out.
4. Click **Protect target & re-test** to cloak the target photo (the same
   adversarial-perturbation technique Face Cloak uses) and re-run the exact
   same search, to see whether the match breaks.

## A worked example
This was verified live with two distinct real people's photos: the true
same-person match scored **99% similarity ("Likely same person")**, while
a different person's photo scored **46% ("Uncertain")**. After clicking
"Protect target & re-test," the same-person similarity dropped from 99% to
**-77%**, flipping the verdict all the way to "Likely different person" —
a genuine, measured demonstration that the cloaking countermeasure defeats
the exact re-identification it just showed working.

## Reading the result
Each gallery photo gets a verdict badge:
- **Likely same person** (red, ≥ the same-person threshold)
- **Uncertain** (amber, in between)
- **Likely different person** (green, below the different-person threshold)

The "Best match" banner calls out the single highest-scoring gallery photo
and its similarity percentage. After protection, a second banner shows the
new best match (if any) and how the *original* best-match photo's own
similarity score moved.

## Notes & limits
- **Does not search the internet or any real database.** It only compares
  the photos you upload within this one request — nothing is stored, and
  no external face database is queried. It demonstrates the mechanism, not
  a real-world lookup against any actual person's data.
- Gallery is capped at 10 photos.
- If no face is detected in the target photo (or a gallery photo), that
  photo is reported as having no detectable face rather than a forced
  guess.
- Cloaking (the "Protect" step) only affects the *specific uploaded copy*
  of the target photo in this session — it cannot retroactively protect
  copies of the same photo already posted or scraped elsewhere.
`.trim();

export const FACE_REID_SUGGESTIONS = [
  "How is this different from the Face Cloak tool?",
  "Does this check against any real face database?",
  "Why did the similarity go negative after protection?",
  "What happens if no face is detected?",
];
