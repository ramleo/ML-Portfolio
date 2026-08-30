## What problem it solves

**Rotoscoping** is the film-industry term for cutting an object out of every
frame of a shot — tracing the outline of a person, a car, a ball, frame by frame,
so it can be recoloured, removed, or composited onto something else. Done by
hand it is one of the most tedious jobs in post-production: a few seconds of
footage is hundreds of individual outlines.

Automating it has always run into two separate problems. You have to find the
right object — and "the right object" is defined by a person, in words, not by a
class from a fixed list. And then you have to follow it through occlusion,
motion blur, rotation and lighting change without losing it.

This tool does both. Type *"the red backpack"*, upload a clip, and get every
frame back with that object masked — an object nobody trained a detector for.

## How it works, step by step

1. **Upload a short clip** and type what to track.
2. **Sample frames** — the first 6 seconds at 4 fps, at most 20 frames, resized
   to a 480-pixel long edge.
3. **Find the object once**, on the first frame, from your text.
4. **Convert that box into a precise mask** and hand it to a video tracker as a
   starting prompt.
5. **Propagate through the remaining frames** using the tracker's own memory of
   what the object looks like.
6. **Return the frames** with the mask drawn on, as a preview strip.

## The model or algorithm

### Grounded-SAM — two models, each doing the thing it is good at

Neither half can do this alone, and the split is the design.

**Grounding DINO** (IDEA Research, Apache-2.0) is an **open-vocabulary
detector**. A conventional detector is trained on a fixed class list — 80 for
COCO, 601 for the detector used elsewhere in this app — and can only find those.
Grounding DINO instead takes a *text phrase* and finds the region matching it, by
fusing text features with image features inside the detector so language
conditions the detection rather than merely labelling it afterwards. That is what
lets "the red backpack" work when no class called *red backpack* exists.

**SAM 2** (Meta, Apache-2.0) is a **promptable segmentation and tracking model**.
Given a prompt on one frame — a box, a point, a mask — it produces a precise mask,
and its video mode carries a **memory of the object across frames**, so the mask
follows it without being re-detected.

So the division of labour is: **detect once with language, then track with
memory.** Grounding DINO runs on frame one only. SAM 2 does everything after.

**Why not detect on every frame.** Per-frame detection has no notion of identity
— two people in shot means the box can jump between them, and a frame where the
detector misses gives you a hole. Tracking with memory keeps the same object
because the model knows what it has been following.

### SAM 2's memory, in one paragraph

SAM 2 keeps a memory bank of features from frames it has already processed. Each
new frame attends to that memory, so the mask is conditioned not only on the
current pixels but on how the object has looked so far. That is what carries it
through partial occlusion and motion blur: when the current frame is ambiguous,
the memory is not.

### The two thresholds

```
_BOX_THRESHOLD  = 0.35   # confidence that a box is an object at all
_TEXT_THRESHOLD = 0.25   # confidence that the box matches the phrase
```

Two separate gates because Grounding DINO makes two separate judgements — *is
there an object here* and *does it match these words*. The text threshold is
lower, because text-image matching scores are naturally less confident than
objectness scores; holding both to the same bar would reject correct matches.

### Everything else is a CPU-latency decision

| Constant | Value | Why |
|---|---|---|
| `_MAX_DURATION_S` | 6.0 | anything longer will not finish in a request |
| `_TARGET_FPS` | 4.0 | enough to see motion, a fraction of the frames |
| `_MAX_FRAMES` | 20 | hard ceiling regardless of the two above |
| `_MAX_DIM` | 480 | segmentation cost scales with pixels |

The model chosen is `sam2.1-hiera-tiny`, the smallest of the family, on
`device="cpu"`. All of it is disclosed in the module docstring as latency, not
hidden as a design preference.

## Why these choices

### The model that was rejected, and why that is the interesting part

This was originally scoped around **SAM 3**. The research was done before any
code was written, and it found a real blocker: SAM 3's checkpoints are **gated
behind a Meta access request under a non-standard custom licence, with no clean
pip package.**

So Grounded-SAM was used instead — Grounding DINO plus SAM 2, both Apache-2.0 and
both ungated. The chapter should say plainly that this is the better engineering
outcome and not a compromise: an ungated permissive licence means the tool can
actually be deployed and its dependencies can be reproduced by anyone.

**Checking the licence and the availability before writing the code** is the
habit that also caught the Ultralytics weights problem and the Depth-Anything
checkpoint split elsewhere in this project.

### The one that was rejected for hardware

3D Gaussian Splatting was considered for a related feature and rejected because
it needs a CUDA rasteriser driven through thousands of optimisation steps.
Grounding DINO and SAM 2 are **inference-only forward passes** with no
per-scene optimisation, so they genuinely run on this Space's CPU — slowly, but
they run. That distinction — *forward pass* versus *optimisation loop* — is the
one that decides what is possible without a GPU.

### The dependency conflict, and how it was resolved

Worth telling because it is the kind of thing that quietly breaks a deployment.

Grounding DINO's PyPI package `groundingdino-py` declares an unpinned,
**non-headless** `opencv-python` dependency. This project uses
`opencv-python-headless`, and the two collide — worse, in a slim Docker image
non-headless OpenCV typically fails to import at all, because `libGL.so.1` is not
installed.

The resolution was verification rather than assumption: Grounding DINO's actual
inference path (`load_model`, `predict`) only makes `cv2.imread` and
`cv2.cvtColor`-level calls, all of which headless OpenCV provides. So the package
is installed with `--no-deps` and its real transitive dependencies are pinned
explicitly, deliberately excluding `opencv-python`.

The general lesson: a declared dependency is a claim about what a package needs.
Checking what it *actually calls* can turn an impossible install into a working
one.

### Why a frame strip rather than a video file

Re-encoding video server-side means a codec, a temporary file and a lot of CPU.
The response is a bounded number of JPEG frames with the mask drawn on — enough
to see whether the tracking worked, which is what the tool is for. Disclosed as
a deliberate omission rather than a limitation discovered later.

## How to read the output

- **Check frame one first.** If Grounding DINO found the wrong object there,
  every subsequent frame tracks the wrong thing perfectly. Failures here are
  almost always detection failures, not tracking failures.
- **Watch for the mask drifting** onto the background across the strip — that is
  the tracker losing the object, usually after an occlusion.
- **Be specific in the prompt.** "The red backpack" beats "backpack" when there
  is more than one; "the person on the left" is the kind of phrasing
  open-vocabulary detection handles well.
- **4 fps means motion looks stepped.** That is the sampling rate, not the
  tracking.
- **Warnings tell you what was trimmed** — a clip longer than 6 seconds says so
  explicitly.
- **480 px means fine detail is gone** before anything ran. Thin structures —
  hair, fingers, wires — will not be captured cleanly.

## Limits

- **6 seconds, 4 fps, 20 frames, 480 px.** All CPU-latency ceilings.
- **No exported video.** A preview strip only.
- **One object.** The first frame's best match is tracked; no multi-object
  support.
- **Detection happens once.** An object that is not visible in frame one cannot
  be found later.
- **Full occlusion usually loses it.** SAM 2's memory tolerates partial
  occlusion; a complete disappearance and reappearance often does not recover.
- **Slow.** A two-minute timeout on the client side is there for a reason.
- **`hiera-tiny` is the smallest SAM 2**, so masks are less precise than the
  larger checkpoints would give.
- **Open-vocabulary is not unlimited vocabulary.** Grounding DINO handles common
  objects and attributes well and gets steadily worse with abstraction.

## Likely interview questions

**"Why two models instead of one?"**
Because they solve different problems. Grounding DINO is open-vocabulary
detection — it takes a text phrase and finds the matching region, which is what
makes an arbitrary description work when no class for it exists. SAM 2 is
promptable segmentation with video memory — given a prompt on one frame it
produces a precise mask and follows the object through the rest. Detect once with
language, then track with memory.

**"Why not run the detector on every frame?"**
Because detection has no notion of identity. With two similar objects in shot the
box can jump between them, and any frame the detector misses leaves a hole. A
tracker with memory keeps following the same object because it knows what it has
been looking at — which is exactly what carries it through motion blur and
partial occlusion.

**"What is open-vocabulary detection?"**
A detector that takes a text query instead of choosing from a fixed class list.
Conventional detectors are trained on a closed set — 80 COCO classes, say — and
cannot find anything else. Grounding DINO fuses text features into the detection
process, so language conditions where it looks rather than just labelling what it
found. That is the whole reason "the red backpack" is a valid query here.

**"You wanted SAM 3 and used SAM 2. What happened?"**
The checkpoints are gated behind a Meta access request under a non-standard
custom licence with no clean pip package, and I found that out before writing
code rather than after. Grounded-SAM — Grounding DINO plus SAM 2 — is both
Apache-2.0 and ungated, so it can actually be deployed and its dependencies can
be reproduced. I would call that the better outcome, not a fallback.

**"How did you get a package with a conflicting dependency to install?"**
`groundingdino-py` declares non-headless `opencv-python`, which collides with
this project's headless build and typically fails to import in a slim image at
all, because `libGL.so.1` is missing. Rather than assume it needed the full
build, I checked what its inference path actually calls — `cv2.imread`,
`cv2.cvtColor`, nothing more — all of which headless provides. So it installs with
`--no-deps` and its real transitive dependencies are pinned explicitly. A
declared dependency is a claim; what the code calls is the fact.

**"How would you make this production-ready?"**
A GPU first — every one of the caps here is a CPU-latency decision, and on a GPU
the 6-second, 4 fps, 480-pixel limits mostly disappear. Then re-detect
periodically rather than only on frame one, so a lost object can be recovered;
support multiple objects; and encode a real video file rather than returning a
frame strip.
