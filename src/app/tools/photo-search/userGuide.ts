// User guide for Photo Library Visual Search — rendered in
// PhotoSearchUserGuideModal (the "User Guide" header button) AND injected
// into the floating AI Assistant as its ONLY tool knowledge. Keep factual
// and in sync with the actual feature set.

export const PHOTO_SEARCH_GUIDE = `
# Photo Library Visual Search — User Guide

## What this tool does
Upload a batch of photos, then describe in plain language what you're
looking for — "the red backpack", "a dog on a beach", "a whiteboard with
diagrams" — and every photo gets ranked by how well it matches your
description. No tagging or captioning step first: this uses CLIP, a model
trained to understand images and text in the same "space," so it can
compare a sentence directly against a photo's visual content.

## How to use it
1. Click **Add photo(s)** and select as many images as you want to search
   through (you can add more photos in multiple batches — they all stay in
   the pool together).
2. Type what you're looking for into the search box and click **Search**
   (or press Enter).
3. Photos re-sort with the best match first, each showing a match
   percentage badge.

## Search by an example photo instead
Instead of typing a description, you can click **Find similar** on any
photo you've already uploaded to search using that photo itself as the
query — useful when you know roughly what you want but it's easier to show
than describe. The reference photo gets outlined and labeled instead of
scored, and won't appear in its own results.

## Excluding a concept
The optional **excluding** field steers results away from a concept —
"beach sunset" excluding "people" pushes photos with people further down,
even if they'd otherwise match well. This works by subtracting the excluded
concept's direction from the search direction in CLIP's embedding space —
it's a steer, not a hard filter, so a photo that strongly matches both the
main description and the excluded concept can still rank low rather than
being removed outright.

## Reading the match percentage
The percentage is **relative to this batch and this search only** — it
shows how much better a photo matches your description compared to the
others in the same search, not an absolute confidence score. A 100% match
means "the best fit among the photos you uploaded," not "certainly this."
Searching the same photos with a different description can reorder and
re-score everything.

## Find duplicates
Click **Find duplicates** to check the whole batch for near-identical
photos (burst shots, accidental re-uploads) — no query needed, it reuses
the same CLIP embeddings. Matched photos get grouped together and outlined
in a shared color. This is a heuristic, not exact-file matching: it can
occasionally group photos that are genuinely just very visually similar
(not literal duplicates), especially for near-blank or low-detail images.

## What this is (and isn't)
CLIP compares overall visual meaning, not exact objects or text in the
image — it's very good at broad scenes, colors, and concepts, but a very
specific or unusual description (an exact brand logo, a precise count of
objects) may not rank as cleanly. Nothing is stored between searches:
photos and results only exist in your browser tab for that session.

## Notes & limits
- No API cost — CLIP runs locally on the backend, no external calls.
- Every search re-embeds the whole photo batch, so a very large batch
  (dozens of photos) will take a little longer per search than a small one.
- This is search over a batch you upload in-session, not a persistent
  photo library — nothing is saved after you leave the page.
`.trim();

export const PHOTO_SEARCH_SUGGESTIONS = [
  "How does the match percentage work?",
  "Can it find an exact object, like a specific logo?",
  "Are my photos stored anywhere?",
  "What kind of descriptions work best?",
  "How does 'Find similar' work?",
  "How does duplicate detection work?",
  "How does excluding a concept work?",
];
