## What problem it solves

Somebody photographs a plant on the windowsill every week for three months. At
the end they have forty pictures and the same question they started with: **is
it actually growing, and how fast?**

Eyeballing consecutive photos does not answer it. Week-to-week change is below
the threshold of memory, and the first and last photos differ in light, angle
and camera. What is needed is a number per photo that can be compared across the
series.

This tool produces one. It measures how much of each frame is foliage, tracks
that across the series, and reports growth as a percentage change from the first
frame — plus two secondary measures that catch things area alone misses.

It runs entirely on the project's own server with OpenCV. No model call, no API
cost.

## How it works, step by step

1. **Upload a series** — up to 30 frames.
2. **Find the plants,** if auto-detect is on. The 601-class object detector
   already in the app locates `Plant`, `Houseplant` and `Flowerpot` boxes, and
   each is cropped with 15% padding before measuring.
3. **If detection under-performs, fall back** to finding plants directly in the
   tool's own green mask.
4. **Build a leaf mask** for each frame or crop with an HSV threshold.
5. **Measure three things** on that mask: area fraction, greenness, leaf count.
6. **Compare across frames** and report growth relative to the first.
7. **Return a magenta overlay** of the mask so you can see what was counted.

## The model or algorithm

### The leaf mask — HSV, not a segmentation model

Convert to HSV and keep pixels inside:

| Channel | Range | Why |
|---|---|---|
| **Hue** | 30 – 95 | the green band, yellow-green through to blue-green |
| **Saturation** | ≥ 40 | rejects grey and washed-out pixels |
| **Value** | ≥ 40 | rejects near-black shadow |

**Why HSV rather than RGB** is the point worth being able to explain. In RGB,
"green" is a relationship between three numbers that changes completely with
brightness — a leaf in sun and the same leaf in shade have very different RGB
values. HSV separates *what colour* (hue) from *how vivid* (saturation) and *how
bright* (value). A leaf's hue is roughly constant across lighting; only its
value moves. So a hue window plus loose floors on the other two channels is
stable across the lighting variation a windowsill timelapse actually contains.

**Why not a segmentation model.** The docstring is direct: green foliage
occupies a narrow, predictable hue band, and this has to run on up to 30 frames
per request cheaply. A U-Net would be more accurate on hard frames and would
cost a model, a download and inference time per frame — for a measurement whose
precision is limited by framing consistency anyway.

### Why the number is relative, and never an area

`area_fraction` is leaf pixels divided by total pixels of whatever region was
measured. It is **only meaningful against other frames of the same series**,
shot with consistent framing and distance.

The reason is simple and worth saying out loud: a photo has no scale. Move the
camera 20 cm closer and the plant occupies more pixels without having grown.
This is the same limitation as the depth chapter's "relative, not metric", from
the same cause — one image with no reference gives you proportion, not size.

So growth is reported as **percentage change from the first frame**, never as
square centimetres.

### The two secondary metrics — and why area alone is not enough

**Greenness index (NGRDI).** The mean of `(G − R) / (G + R)` over the masked
pixels, roughly −1 to 1, higher meaning more vividly green.

This exists because **a plant can stay exactly the same size while its foliage
yellows.** Chlorosis, nitrogen deficiency, overwatering — all of them move
colour before they move area, and an area-only measurement reports a healthy
flat line through the whole decline. NGRDI is the RGB-only cousin of NDVI, the
standard vegetation index in remote sensing; NDVI uses near-infrared, which a
phone camera does not capture, so the red-green difference is the available
proxy.

**Leaf count.** Connected components on the mask.

The interesting detail is what is *not* done: **no morphological closing.** The
blob fallback (below) closes gaps deliberately, to merge one plant's leaves into
a single box. Here the goal is the exact opposite — counting leaves *separately*
— so only a light **opening** is applied, which removes single-pixel noise
without merging adjacent leaves. The same mask, two operations, opposite intent.
Getting that backwards would silently turn a leaf count into a plant count.

### Detect, crop, then measure

Without detection, two plants in one photo blend into one meaningless combined
area fraction, and if one grows while the other dies the total says nothing.

So the object detector runs first and each plant is cropped and measured
separately. This is the same **crop-then-remeasure** pattern the app already
uses for person → face and vehicle → number plate: a general detector finds the
region, and a specialised measurement runs inside it.

**The fallback matters more than it looks.** A general 601-class detector
under-detects things it was not trained to see well — small seedlings, stylised
illustrations — and sometimes returns one box where a person clearly sees three,
or merges several plants into one. When that happens, the tool falls back to
connected-component analysis on **its own green mask**, which only needs foliage
to be green and spatially separate, not recognisable to a general-purpose
detector. That fallback has *lower* requirements than the primary path, which is
what makes it a real fallback rather than a second thing that fails the same way.

### The collage problem

One photo with two plants in it is genuinely ambiguous. It could be two plants
coexisting now — in which case you want to compare their current sizes — or it
could be a **before/after collage** of one plant, two photos stitched into one
file, which is how plant-progress posts are usually shared.

**Object detection cannot resolve this.** A bounding box tells you what is in
it, never whether two boxes are the same subject at different times.

So a second, independent check looks for a **seam**: a straight line where a
sharp edge coincides with a colour and exposure jump. Two halves that came from
different shots have different lighting and white balance, and a single
continuous photograph does not have that discontinuity. When a confident seam is
found, the image is split there and run through the ordinary two-frame growth
path instead.

The assumption is stated rather than hidden: **panel order is taken as
left-to-right, top-to-bottom** — natural reading order — because there is no
caption OCR to confirm which panel came first. It is a real assumption, not a
guarantee.

**The general principle here is worth keeping:** when one signal cannot
distinguish two cases, find a second signal that is independent of the first.
Detection answers "what"; the seam check answers "is this one photograph".

### The magenta overlay

The mask preview is drawn in magenta at 55% opacity, and the choice is
deliberate: **no natural foliage, soil or pot colour is that hue.** Overlaying
green-on-green would make it impossible to see what was counted, which defeats
the purpose of showing the mask.

## Why these choices

**Why HSV thresholds over a learned model.** Cheap enough for 30 frames, no
download, no inference cost, and the failure modes are predictable and
explainable — you can look at the mask and see exactly why a pixel was included.

**Why report percentage change.** It is the only claim the measurement supports.
An absolute area would be a number the method cannot justify.

**Why three metrics.** Area answers "bigger?", greenness answers "healthier?",
leaf count answers "more leaves?" — and a plant can move in each independently.
A stressed plant that keeps its size but yellows is invisible to area alone.

**Why cap at 30 frames.** Detection plus three measurements per frame, on CPU,
within one request.

## How to read the output

- **Check the magenta overlay first.** If it is covering the pot, the wall or a
  green cushion, every number for that frame is wrong. This is the most useful
  thing on the screen.
- **Growth is percentage change from frame one**, not an area.
- **Consistent framing is the whole basis of comparison.** Same distance, same
  angle, same background. A series shot from varying distances measures your
  camera position, not the plant.
- **Falling greenness with flat area is the useful early warning** — yellowing
  before any size change.
- **Leaf count is noisy.** Overlapping leaves merge into one component and
  separated highlights split one leaf into two. Read the trend, not the value.
- **A collage split is an inference.** Check the panels were in the order you
  meant.

## Limits

- **No real-world units, ever.** Proportion of frame only.
- **Framing consistency is assumed** and not verified — the tool cannot tell
  growth from a closer camera.
- **Anything green is foliage.** A green pot, a green wall, moss on the soil,
  a green mug in shot.
- **Yellow, red, purple and variegated foliage falls outside the hue band** and
  is largely invisible to the measurement.
- **Flowers are not foliage** and are mostly excluded.
- **Leaf count is a connected-component count**, not leaf detection.
- **NGRDI is affected by lighting colour**, so a warm bulb and daylight are not
  comparable.
- **Collage panel order is assumed**, not read.
- **30 frames per request.**
- **This measures pixels, not biology.** There is no plant model — no species,
  no growth stage, no nutrient inference.

## Likely interview questions

**"Why HSV instead of RGB for colour thresholding?"**
Because RGB entangles colour with brightness — the same leaf in sun and shade has
very different RGB values, so any threshold either misses shaded leaves or
catches everything. HSV separates hue from saturation and value, and a leaf's
hue stays roughly constant while its brightness varies. A hue window with loose
floors on the other two channels is stable across the lighting variation a
real timelapse has.

**"Why not train a segmentation model?"**
It would be more accurate on hard frames — variegated leaves, green backgrounds —
and it would cost a model to train or download, inference per frame, and a
harder failure mode to debug. The measurement's precision is capped by framing
consistency anyway, which no model fixes. A hue threshold runs on 30 frames for
free and you can look at the mask and see exactly why each pixel was included.
For this precision requirement it is the right tool.

**"You report growth as a percentage. Why not an actual area?"**
Because a single photograph has no scale. Move the camera closer and the plant
covers more pixels without growing. Reporting square centimetres would be a
number the method cannot support. A percentage change between frames of the same
series is exactly what the measurement justifies, with the assumption of
consistent framing stated rather than buried.

**"Why measure greenness as well as area?"**
Because a plant can hold its size while it declines. Chlorosis and nitrogen
deficiency change colour well before they change area, so an area-only
measurement shows a healthy flat line through the whole thing. NGRDI —
`(G−R)/(G+R)` over the leaf mask — is the RGB-only stand-in for NDVI, which needs
near-infrared a phone camera does not capture.

**"How do you tell two plants from a before/after collage?"**
Detection cannot — a bounding box says what is inside it, never whether two boxes
are the same subject at different times. So a second, independent check looks for
a seam: a straight line where a sharp edge coincides with a colour and exposure
jump, which is what you get when two different shots are stitched together and
what a continuous photo does not have. That is the general move — when one signal
cannot separate two cases, find a signal that is independent of the first.

**"Your primary detector fails on seedlings. What then?"**
It falls back to connected components on the tool's own green mask. The point is
that the fallback has *lower* requirements than the primary path — it only needs
foliage to be green and spatially separate, not recognisable to a 601-class
detector. A fallback that fails in the same way as the thing it is backing up is
not a fallback.
