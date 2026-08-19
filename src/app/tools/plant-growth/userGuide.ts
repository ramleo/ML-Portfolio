// User guide for Plant Growth Quantification — rendered in
// PlantGrowthUserGuideModal (the "User Guide" header button) AND injected
// into the floating AI Assistant as its ONLY tool knowledge. Keep factual
// and in sync with the actual feature set.

export const PLANT_GROWTH_GUIDE = `
# Plant Growth Quantification — User Guide

## What this tool does
Upload a series of plant photos and a local HSV green-hue threshold measures
leaf/foliage area in each one — no ML model, no API cost. Depending on how
many photos and which mode you use, it either charts growth over time, ranks
several plants in one photo against each other, or figures out which photos
belong to which plant and in what order for you. Every measurement comes with
a magenta mask overlay showing exactly which pixels were counted as "plant",
so you can visually verify it instead of trusting a number blindly.

## The two top-level modes
- **"I know the plants/order"** — you already know how many plants are in
  play and (for growth mode) the correct chronological order. This is the
  main, most-featured mode.
- **"Unordered batch — figure it out"** — you have a pile of separate photo
  *files*, possibly of more than one plant, with no labels and no known
  order. The tool clusters them by visual similarity and orders each cluster
  chronologically, then asks you to confirm the grouping before measuring.
  This does NOT split apart multiple plants shown together in a single
  photo — that's what auto-detect in the other mode does. It needs at least
  2 separate photo files; the "Group" button stays disabled below that.

## How to use "I know the plants/order"
1. Click **Choose photos** (multi-select) or **Take photo** (opens the live
   camera). Add 1–30 photos.
2. With exactly 1 photo, the tool runs **compare mode**: plants found in that
   photo are ranked against each other, largest = 100%. With 2+ photos it
   runs **growth mode**: one growth curve per detected plant, relative to
   its first photo.
3. Leave **Auto-detect multiple plants** checked to let the tool find and
   separate multiple plants in a photo automatically (see below); uncheck it
   to measure the whole photo as one region.
4. Click **Measure growth (N)** / **Compare plants (1)**.

## Multi-plant auto-detection
Reuses the app's general-purpose object detector (Plant/Houseplant/Flowerpot
classes) to crop and measure each plant independently instead of blending
several plants into one meaningless number. If the detector misses a plant
(common in illustrations or stock photos), a fallback pass looks for
disconnected green blobs in the tool's own leaf mask and picks up anything
the detector missed. A plant missing from a later frame in growth mode is
flagged **low confidence**, never silently fabricated.

## Growth mode vs. compare mode vs. "growth stages"
- **Growth mode** (2+ photos): a real time-series measurement — % leaf-area
  change vs. the first photo, per plant if there are several.
- **Compare mode** (exactly 1 photo, 2+ plants found): compares plants'
  CURRENT size to each other right now, no time axis — the largest is 100%.
- **"View as growth stages"** toggle (inside compare-mode results): lets you
  manually reinterpret the ranked plants, left to right, as one plant at
  different growth stages instead of several distinct plants. This is
  **your assumption, not something detected** — nothing in a single photo
  can confirm several regions are really the same subject over time.

## Before/after collage photos
If you upload a single photo that turns out to be a two-panel before/after
collage (a sharp seam, a color jump, and a centered plant on each side), the
tool auto-detects it and splits it into a two-frame growth measurement
instead of comparing the panels as if they were simultaneous. Panel order is
assumed left-to-right (or top-to-bottom); if that's reversed for your photo,
the growth % shown will be inverted. This only handles the simple 2-panel
case — a photo with more than two regions, or a genuinely unordered batch,
needs "Unordered batch" mode instead.

## Live camera capture
**Take photo** opens your device camera. Once you have a first photo, a
translucent ghost overlay of it is shown live so you can align the next shot
to the same framing before capturing. Camera-captured photos carry no EXIF
timestamp, which matters for the unordered-batch mode's ordering (see below).

## "Check framing" preview
For any photo after the first, click **Check framing** to see a blended
overlay of it against the first photo — a quick visual sanity check that
the plant is framed consistently before you commit to measuring, since
growth % only holds up if every photo is framed the same way.

## Reading the results
- **Magenta overlay** on each thumbnail: exactly the pixels counted as leaf.
- **Growth %** under each thumbnail (growth mode) or **relative %** (compare
  mode), colored amber and outlined if that frame is **low confidence**
  (very little green content found — check framing/lighting on it).
- Hover a thumbnail for its **greenness index** (an RGB vegetation index —
  higher means more vividly green/healthy foliage, independent of area) and
  **leaf count** (connected-component blobs in the mask — this can
  legitimately DROP as a plant matures, since touching leaves merge into one
  blob; it's not a bug).
- Click any thumbnail to open it full-size.
- With 2+ plants tracked in growth mode, tabs above the chart switch between
  them.

## Real-world size calibration
Click **Calibrate real-world size**, then click two points on an object of
known real-world size in the first photo (a coin, ruler, credit card) and
enter the real distance between them in cm. Once calibrated, every result
view additionally shows an estimated **cm²** figure alongside the pixel-based
percentages (\`cm² = leaf_pixel_count × cmPerPixel²\`). This only changes the
display — the underlying pixel measurement and growth % are unaffected.

## AI species & health identification
The **"Identify species & health"** button (below the first uploaded photo)
sends that one photo to a Gemini vision model and returns a best-guess plant
species plus any visible disease/pest signs. This is **one AI opinion from a
single photo, not a verified diagnosis** — treat it as a starting point, not
a lab result. It shares a small daily call budget with other AI features on
this site; if the daily cap is hit, a clear message says so rather than
failing silently.

## Growth-rate projection
On any growth-mode chart, the **"Project N more photos ahead"** control
extrapolates the existing curve: it takes the average per-photo growth rate
so far and projects it forward N more steps, shown as a dashed point on the
chart. This assumes growth stays linear and every future photo is framed the
same way as the ones already measured — real growth is rarely linear (it
slows as a plant matures, or accelerates then plateaus), so treat this as a
rough "if nothing changes" projection, not a forecast.

## Export
- **Export CSV** (appears under any result view — growth mode, compare mode,
  growth-stages view, and per-group in unordered-batch mode) downloads a
  spreadsheet-ready file with label, area fraction, growth/relative %, leaf
  pixel count, greenness index, leaf count, low-confidence flag, and the
  calibrated cm² figure if you've calibrated.
- **Export time-lapse GIF** (next to your uploaded photos, works even before
  you run a measurement) builds an animated GIF from your photo sequence,
  entirely in your browser — no upload, no server involved. Photos of
  different sizes/aspect ratios are letterboxed onto a fixed square canvas
  so nothing gets stretched or cropped.

## Unordered-batch mode in detail
1. Upload 2+ photos (any mix of plants/times, no labels), click **Group N
   photos**.
2. The tool embeds each photo's detected plant and clusters photos by visual
   similarity, then orders each cluster chronologically — by photo timestamp
   (EXIF) when available, otherwise by estimated leaf size (smallest first,
   flagged as a lower-confidence assumption). Camera-captured photos always
   fall back to the size-based ordering since they carry no timestamp.
3. **Review the proposed grouping before anything is measured.** A group
   flagged "possibly the same as Group N" means two groups look visually
   close enough that they might actually be one plant split in two — a
   one-click **Merge into Group N** button is offered. You can also move any
   individual photo into a different group via its dropdown, or leave photos
   the tool couldn't confidently place in the "Not included" tray.
4. **Export time-lapse GIF** is available per group at this review stage,
   using the group's proposed order.
5. Click **Run measurement** once the grouping looks right — each confirmed
   group is then measured exactly like growth mode, including the growth
   chart, projection control, thumbnails, and CSV export.
- **Known limitation:** the visual-similarity clustering has been verified
  correct in isolation (it reliably separates deliberately different test
  embeddings), but how well it discriminates between two genuinely similar
  real plants hasn't been validated against a large, diverse real-photo set —
  always check the review screen rather than trusting a proposed grouping
  blindly.

## Notes & limits
- This measures **relative pixel area, not real-world size**, unless you've
  calibrated it (see above).
- Growth only means what it says if every photo in a series is framed the
  same way — the "Check framing" preview and the live-camera ghost overlay
  both exist to help with that.
- All the core measurement (mask, growth %, greenness, leaf count) runs
  locally with no API cost; only species/health ID uses a paid AI call.
`.trim();

export const PLANT_GROWTH_SUGGESTIONS = [
  "What's the difference between growth mode and compare mode?",
  "Why is a photo marked low confidence?",
  "How does the growth-rate projection work?",
  "Does this measure real-world leaf size?",
  "How does unordered-batch grouping decide which photos go together?",
];
