export const MM_RAG_OBJECT_REMOVAL = `
## Removing and replacing things in an image (Object Remover)
Any standalone image or video-frame citation can have a region removed —
painted over so it blends with the surroundings — and then optionally have
something new put back in its place. This only works on a standalone
image/video upload, not a PDF's embedded photo.

- **You have to open "Choose an action…" and pick a detection first before
  you can remove anything by clicking a box.** The dropdown above the image
  (same one used for "Detect objects," "Detect faces," etc) is what actually
  draws the boxes on the image — until you pick one of those options, there
  are no boxes on screen, and therefore no ✕ button to click. Pick any
  detection option from that dropdown first — "Detect objects," "Detect
  faces," "Detect signatures," or "Check for tampering" all work — THEN
  click the small ✕ in a box's corner to remove that specific region. If
  you don't want to
  hunt for the right detection, skip the dropdown entirely and use "Draw
  region" instead (below) — it doesn't need a prior detection at all.
- **"Draw region" removes any shape you draw, detected or not.** Click "Draw
  region" (next to the dropdown), then click-and-drag directly on the image
  to trace a freehand shape — release to remove exactly that area. Useful
  for anything the detector didn't recognize, or a shape a box can't
  express (an odd outline instead of a rectangle). Click "Stop drawing" when
  done; the dropdown's boxes become clickable again immediately.
- **Removals chain.** Remove one region, then remove another (via either
  method) — each new removal builds on the already-edited image, so you can
  clear several things one after another without starting over.
- **A "+" appears over every removed region — click it to put something
  back.** Three ways to fill it, as tabs in the small panel that opens:
  - **Text** — type a short label or caption; it's drawn directly onto the
    image, centered in the region.
  - **Image** — pick a file from your device; it's scaled to fit inside the
    region (keeping its own proportions, not stretched) and centered.
  - **AI fill** — describe what should go there (or leave it blank to just
    ask for a natural-looking fill) and an AI image-editing model generates
    it, blended to match the surrounding photo's lighting and style.
- **AI fill takes a few seconds — text and image fill are instant.** Text
  and image fill never leave your browser; AI fill makes a real model call,
  usually done in under 10 seconds, occasionally longer. A "temporarily
  unavailable" message means that one call failed — safe to just try again.
- **AI fill's quality varies call to call.** It's a whole-image editor, not
  a pixel-exact patch — most results blend seamlessly, but it can
  occasionally leave a visible trace of the blank area around whatever it
  added, or make a small unintended change elsewhere (a label re-rendered
  slightly differently). If a result looks off, "Reset" and try again — a
  repeat of the same request often comes out cleaner. Works best when
  what's removed is a smaller region against a photo that's still mostly
  intact, rather than most of the frame.
- **Once a region has something added back, its "+" goes away** — a region
  is filled once (text, image, or AI), not stacked with multiple fills. Hit
  "Reset" (see below) and redo the removal if you want to try a different
  fill for the same spot.
- **"Reset" clears every edit on that image/frame back to the original.**
  Removals and anything added back, all undone at once — appears next to
  "Draw region" only once at least one region has been removed.
- **Edits are kept in memory for the session, not saved permanently.** Switch
  to a different citation and back and your removals/fills are still there;
  reload the page and they're gone, same as the rest of this tool's
  session-only data.
`.trim();