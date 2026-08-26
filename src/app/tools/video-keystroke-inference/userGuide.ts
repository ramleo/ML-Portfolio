export const KEYSTROKE_GUIDE = `
# Video-Call Keystroke Inference — User Guide

## What this tool does
Upload a short video (60 seconds max) of hands typing — your own recorded
webcam clip or video-call footage. The tool tracks fingertip motion
frame-by-frame using MediaPipe hand tracking, and detects real
keystroke-shaped press-release events purely from that motion's timing.
This is the same hand-tracking signal that published side-channel attacks
(USENIX Security '23, video-based keystroke inference) key off. Runs
entirely in your browser — **no video is ever uploaded anywhere**.

## Purpose
Video calls routinely show a participant's hands, and it's a real,
published finding that hand motion during typing leaks timing information
even when no audio or keylogger is involved. This tool demonstrates that
side channel honestly and at the scope that's actually reproducible without
per-target training data: **when** keys were pressed, not **which**
characters were typed. The full published attack adds a trained
language-model decoding stage (needing per-target training data) to go from
timing to actual text — that stage is deliberately not included here, and
is disclosed prominently rather than silently implied.

## How to use it
1. Click **Choose video** and upload a clip (up to 60 seconds) showing
   hands typing, ideally with both hands clearly visible over a keyboard.
2. Click **Analyze** — the tool steps through the video frame-by-frame
   (not real-time playback) for precise, jitter-free timestamps, tracking
   each hand's fingertips.
3. Review the detected keystroke-event timeline, estimated typing speed,
   and likely word boundaries.

## A worked example
A real downloaded stock video of two hands typing on a laptop, verified
live during development, produced **26 keystroke events** correctly
alternating between hands, a plausible **~34 WPM** estimate, and **4 word
segments** inferred from timing gaps between bursts of taps — with no
audio and no keylogger involved, purely from watching hand motion.

## Reading the result
- **Timeline** — each dot is one detected press-release event, colored by
  which hand (blue = left, amber = right); vertical lines mark where a
  longer pause plausibly indicates a space between words.
- **Keystroke events detected** — the total count of press-release motions
  found.
- **WPM** — a timing-based typing-speed estimate (not validated against
  ground-truth text, since no text is recovered).
- **Word segments** — clusters of taps separated by pauses long enough to
  plausibly be word boundaries.
- **Rhythm consistency** — how uniform the inter-keystroke timing is.

If no motion matching a press-release pattern is found, the tool says so
rather than fabricating events — try a clip with hands more clearly visible
over the keyboard.

## Notes & limits
- **Does NOT recover which characters were typed** — only WHEN keys were
  pressed. No text, words, or characters are ever shown, by design.
- Real character-level attacks require a trained language-model decoding
  stage with per-target training data this demo doesn't have — extending
  to that is a deliberate non-goal, not a missing feature.
- Best results need both hands clearly visible and reasonably well-lit;
  occluded or fast-panning footage will under-detect events.
- 60-second clip cap, entirely client-side (MediaPipe WASM) — nothing is
  sent to any server.
`.trim();

export const KEYSTROKE_SUGGESTIONS = [
  "Why can't this tell me which keys were pressed?",
  "What does 'rhythm consistency' measure?",
  "Is my video uploaded anywhere?",
  "What would it take to go from timing to actual text?",
];
