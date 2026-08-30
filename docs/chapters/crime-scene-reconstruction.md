## What problem it solves

Two photographs of the same scene from different positions contain, between
them, the third dimension. Not because either records depth — neither does — but
because the *difference* between them does. A point that shifts a lot between
the two shots is near; one that barely moves is far. Given enough matched points
you can solve for where both cameras were and where every point is in space.

That is **Structure-from-Motion**, and it is the technique behind photogrammetry,
Google Earth's 3D buildings, and forensic scene reconstruction. This tool
implements it — genuinely, not as a wrapper around a service. Upload two to six
photographs of one static scene from different angles and get back an
interactive 3D point cloud built from your images.

It is also unusually clear about what it will not do, and the honesty is part of
the design rather than a disclaimer bolted on. There is no bundle adjustment, no
camera calibration and no dense mesh, so the output is approximately shaped and
up to scale. It demonstrates the real technique; it is not a forensic
instrument.

## How it works, step by step

1. **Find features in every photo.** SIFT keypoints and descriptors.
2. **Match the first pair** with a brute-force matcher and Lowe's ratio test.
3. **Estimate the relative pose** of camera 2 from camera 1, using the essential
   matrix with RANSAC.
4. **Triangulate** the matched points into 3D.
5. **Filter by cheirality** — drop anything that came out behind either camera.
6. **For each additional photo:** match it against what is already reconstructed,
   solve for its position with PnP + RANSAC, then triangulate the new points it
   brings.
7. **Colour every point** by sampling the pixel it came from.
8. **Optionally scale to real units** by naming two points and the real distance
   between them.

## The model or algorithm

### SIFT — finding the same corner in two photographs

Everything depends on matching a point in one image to the same physical point
in another, taken from a different angle, distance and possibly light.

**SIFT** — the Scale-Invariant Feature Transform — does this by finding points
that are stable under exactly those changes. It searches for extrema across a
scale pyramid, so a corner is found at whatever size it appears; it assigns each
keypoint a dominant orientation and describes it *relative* to that, so rotation
does not change the descriptor; and it describes the local patch as a set of
gradient-orientation histograms, which are robust to brightness changes because
gradients are.

The result is a 128-number descriptor per keypoint that is roughly the same
whether the photo was taken from two metres or four, upright or tilted, in
sunlight or shade.

**A licensing note that matters practically:** SIFT was patented until 2020 and
lived in `opencv-contrib`. Since OpenCV 4.4 it is patent-free and in the main
`cv2` module, which is why this runs on plain `opencv-python-headless` with no
extra dependency.

### Lowe's ratio test

Matching descriptors by nearest neighbour alone produces a great many wrong
matches, because repeated texture — brickwork, foliage, carpet — looks the same
everywhere.

The ratio test asks for each keypoint's **two** nearest neighbours and keeps the
match only if:

```
best.distance < 0.75 × second_best.distance
```

The reasoning is that a genuinely distinctive match is much closer to its true
partner than to anything else. If the two best candidates are similarly close,
the descriptor is ambiguous — it matches lots of things — and the match is thrown
away regardless of how good it looks in isolation.

**This is the single most important filter in the pipeline.** Everything
downstream assumes correspondences are mostly correct, and a scene with
repetitive texture will fail here before it fails anywhere else. 0.75 is Lowe's
own recommended value.

### The essential matrix, and the first pair

For a calibrated pair of cameras, every true correspondence satisfies

```
x₂ᵀ E x₁ = 0
```

`E` encodes the rotation and translation between the two views. It has five
degrees of freedom, so five point correspondences determine it — which is why
`findEssentialMat` runs inside **RANSAC**: repeatedly sample a minimal set,
compute a candidate `E`, count how many correspondences it explains, and keep
the best. Outliers surviving the ratio test are rejected here, with a threshold
of 1.0 pixel and 0.999 confidence.

`recoverPose` then decomposes `E` into a rotation and a translation. The
translation comes out as a **unit vector** — direction only, no length. That is
not a limitation of the implementation; it is a mathematical fact. Two images
alone cannot tell you whether you photographed a real room from three metres or
a dolls' house from thirty centimetres. **This is why the reconstruction is "up
to scale" and why measurement needs an external reference.**

### Triangulation and the cheirality check

With both camera matrices known, each matched pair of rays is intersected to
give a 3D point.

Then a filter that is easy to skip and important: **cheirality** — keep only
points with positive depth in *both* cameras. Decomposing an essential matrix
yields four mathematically valid solutions, and only one puts the scene in front
of both cameras rather than behind one of them. Points that land behind a camera
are triangulation artefacts, not geometry, and they are removed.

### Incremental registration with PnP

Photos three onwards are added one at a time. For each, the tool matches its 2D
keypoints against 3D points already reconstructed, which gives a set of
**2D-to-3D correspondences** — and solving for a camera pose from those is the
**Perspective-n-Point** problem. `solvePnPRansac` handles it, with RANSAC again
rejecting bad correspondences.

Once the new camera is placed, its matches against the previous view are
triangulated, and the cloud grows.

### Intrinsics, estimated rather than measured

The camera matrix needs a focal length in pixels. There is no calibration step,
so it is approximated:

```python
f = 1.2 * max(width, height)
```

with the principal point assumed to be the image centre. This is a standard
heuristic for a roughly normal smartphone lens, and it is explicitly labelled in
the code as an approximation rather than a measurement. A wrong focal length
does not make the reconstruction fail — it makes it *systematically distorted*,
which is the more insidious failure because it still looks like a result. Proper
calibration means photographing a checkerboard and solving for the intrinsics
and lens distortion.

### Scale calibration

Optionally, you name two points in the cloud and the real distance between them,
and everything is scaled by that ratio. The code and the card both refuse to
call the result a measurement — the shape is only approximately right, so a
correct scale factor applied to an approximately-shaped cloud gives approximate
distances everywhere.

## Why these choices

**Why sparse rather than dense.** A sparse cloud comes from matched keypoints —
hundreds or thousands of points, computable in seconds on a CPU. Dense
reconstruction estimates depth for *every* pixel via multi-view stereo, which is
orders of magnitude more work and normally wants a GPU. Sparse SfM shows the
technique honestly within the compute available.

**Why no bundle adjustment, and what it costs.** Bundle adjustment is the global
refinement step: jointly optimise every camera pose and every 3D point to
minimise total reprojection error across all images. Without it, each
incremental registration inherits the error of the ones before it and **drift
accumulates** — the same failure mode as visual SLAM without loop closure. It is
disclosed rather than hidden, and it is the main reason the tool is capped at
six photos.

**Why 2–6 photos.** Two is the minimum for any 3D information at all. Six is
where accumulated drift makes further additions unhelpful without the global
refinement that is not implemented.

**Why zero API calls.** OpenCV and NumPy, on the project's own server. This is a
classical computer-vision algorithm from the 1990s and 2000s — no learned model
is involved anywhere.

## How to read the output

- **Point count is the health check.** A few hundred points means matching
  mostly failed; several thousand means it worked.
- **Colour comes from the source pixels**, so a recognisable cloud means the
  geometry is roughly right.
- **Drift shows as a curve** — a straight wall that bends across the later
  photos is accumulated pose error, not a wall.
- **Scattered points floating away from the structure** are surviving mismatches.
- **The scale is arbitrary** unless you calibrate, and approximate even then.
- **Best case is a textured, static, well-lit scene** photographed by walking
  around it, with plenty of overlap between consecutive shots.

## Limits

- **No bundle adjustment and no loop closure** — pose error accumulates.
- **No camera calibration.** Focal length is a heuristic, lens distortion is
  ignored entirely.
- **Sparse only.** Points, not surfaces; no mesh, no texture.
- **2 to 6 photos.**
- **The scene must be static.** Anything that moves between shots breaks the
  correspondence assumption outright.
- **Texture is required.** Blank walls, glass, water and repetitive patterns
  give SIFT nothing stable to match.
- **Photos need to overlap substantially** and differ enough in viewpoint —
  too similar gives a degenerate baseline, too different fails matching.
- **Not forensic-grade**, stated by the tool itself. Do not present a distance
  from it as a measurement.

## Likely interview questions

**"How do you get 3D from 2D photographs?"**
From parallax. The same physical point projects to different image positions in
two views, and how much it shifts depends on how far away it is. Match enough
points and you can solve for the relative pose of the two cameras — via the
essential matrix — and then intersect the rays to get 3D positions. The
constraint you cannot escape is scale: two images alone cannot distinguish a
large scene far away from a small one close up, so the reconstruction is always
up to scale unless something external gives you a real distance.

**"What does Lowe's ratio test do, and why does it matter here?"**
For each descriptor, find the two nearest neighbours and keep the match only if
the best is less than 0.75 times the distance of the second. It rejects
ambiguous matches — the ones that look similar to many things, which is exactly
what repetitive texture produces. It matters because everything downstream
assumes the correspondences are mostly correct; a scene of brickwork or foliage
fails here first, and no amount of RANSAC downstream recovers from bad matches
in bulk.

**"Why RANSAC?"**
Because even after the ratio test some matches are wrong, and least-squares
fitting is not robust — one bad correspondence can distort the whole estimate.
RANSAC samples a minimal set, fits a model, counts inliers, and repeats, keeping
the model most correspondences agree with. It is used twice here: for the
essential matrix on the first pair, and for PnP on every camera added after.

**"What is bundle adjustment and what does not having it cost you?"**
It is the global refinement: jointly optimise all camera poses and all 3D points
to minimise total reprojection error. Without it, each camera is placed relative
to what came before, so errors compound and the reconstruction drifts — a
straight wall bends. It is the same problem as SLAM without loop closure. It is
also why this tool caps at six photos, and I would rather state that than let
someone assume it scales.

**"Your reconstruction is 'up to scale'. Explain."**
The translation recovered from an essential matrix is a unit vector — direction
without magnitude. That is mathematics, not a bug: a room photographed from three
metres and a dolls' house photographed from thirty centimetres produce identical
images. To get real units you need something external — a known object in frame,
a calibrated stereo rig, or the two-point distance calibration this tool offers.
And even then the *shape* is only approximate, because the intrinsics were
estimated from image dimensions rather than measured, so I would not call the
result a measurement.
