export const CRIME_SCENE_GUIDE = `
# Crime Scene Reconstruction — User Guide

## What this tool does
Upload 2-6 photos of the same static scene, taken from slightly different
positions while walking around it, and this tool runs a real
**Structure-from-Motion (SfM)** pipeline — the same class of technique
behind photogrammetry and 3D-scanning tools like COLMAP — to reconstruct a
sparse 3D point cloud plus the estimated position of each camera.

## Purpose
Photogrammetry-style scene reconstruction from ordinary photos is a real,
widely-used technique (crime scene documentation, archaeology, real estate,
game asset creation). This demonstrates the actual underlying math —
feature matching, epipolar geometry, triangulation, incremental camera
registration — rather than faking a 3D effect. It is deliberately scoped
down from a production pipeline (see Notes & limits) and framed as an
educational demonstration, not a forensic tool.

## How to use it
1. Take 2-6 photos of a textured, static scene (a desk, a room corner, an
   object on a table) from slightly different positions, keeping enough
   overlap between consecutive shots that the same details are visible in
   each. Upload them in that order.
2. *(Optional)* Click **Pick two points on photo 1**, click two points
   whose real-world distance you know, and enter that distance in cm — this
   converts the output to approximate real-world units instead of
   arbitrary relative ones.
3. Click **Reconstruct scene**.
4. Drag the 3D viewer to rotate, scroll to zoom. Colored cones mark each
   recovered camera position.

## A worked example
Photograph a cluttered desk from 3 positions a step apart, keeping the same
objects visible in each. The tool detects matching features (SIFT keypoints)
between consecutive photos, estimates the essential matrix and relative
camera pose between photos 1 and 2, triangulates a sparse colored point
cloud, then registers photo 3's camera pose against that existing cloud via
PnP and extends it further. If two photos don't share enough visual detail
(e.g. one is a blank wall), the tool stops there with a clear warning
instead of guessing — try it with two texture-less photos to see this
failure path directly.

## Reading the result
- **Point cloud** — matched keypoints, each triangulated into 3D and
  colored from the source photo. This is sparse (from feature matches
  only), not a dense scan or mesh.
- **Camera positions (cones)** — the recovered position of each photo's
  camera, relative to the first photo (fixed at the origin).
- **Warnings** — shown whenever the reconstruction had to stop early
  (not enough matches between two consecutive photos) rather than silently
  producing garbage.
- **Scale note** — "arbitrary relative units" unless you completed the
  optional calibration step, in which case it's labeled "approximate
  real-world scale applied."

## Notes & limits
- **No bundle adjustment or loop closure.** A production SfM pipeline
  jointly refines every camera pose and 3D point together; this tool
  estimates poses sequentially, so error accumulates with each additional
  photo — the same class of limitation as visual SLAM without loop closure.
- **No camera calibration.** Focal length is estimated from the image
  dimensions alone (a standard heuristic), not measured — so shape and
  scale are approximate even with the optional distance calibration.
- **Sparse, not dense.** Output is a point cloud from matched keypoints,
  not a solid 3D model or mesh.
- **Needs real texture and overlap.** Flat, texture-less, or poorly-lit
  surfaces produce few or no matchable features — this is a real limitation
  of feature-based SfM, not a bug.
- **Not a forensic-grade tool.** This is an educational demonstration of
  the real technique, not something that should inform any actual
  investigation, measurement, or legal determination.
`.trim();

export const CRIME_SCENE_SUGGESTIONS = [
  "What is Structure-from-Motion and how does it differ from a depth camera?",
  "Why does this need photos with real texture and overlap?",
  "What is bundle adjustment, and why doesn't this tool do it?",
  "How accurate is the optional real-world scale calibration?",
];
