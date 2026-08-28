export const KEYSTROKE_AUTH_GUIDE = `
# Keystroke Biometric Auth-Risk Demo — User Guide

## What this tool does
Type a short fixed phrase 3 times to enroll a personal typing-rhythm
profile, built from real key-press timing captured by your browser — no
video, no audio, no server round-trip. Then retype the phrase once more:
the tool measures how closely that attempt matches your enrolled rhythm
and reports a risk band, using the same real, published technique
behind commercial keystroke-dynamics authentication systems.

## The real technique
Two timing features are captured per keystroke:
- **Dwell time** — how long each key is held down (keydown → keyup).
- **Flight time** — the gap between releasing one key and pressing the
  next (keyup → next keydown). This is the classic "digraph timing"
  signal keystroke-dynamics research keys off.

Your 3 enrollment reps build a mean + standard deviation for every
character position's dwell and flight time. A later attempt is compared
against that profile using **scaled Manhattan distance** — summing each
feature's absolute deviation from your enrolled mean, divided by that
feature's own standard deviation, then averaged. This specific classifier
is a real, published top performer for keystroke-dynamics anomaly
detection (CMU's Killourhy & Maxion benchmark and follow-on academic
work report it among the best-performing detectors for this exact
problem), not a heuristic invented for this demo.

## How to use it
1. Type the shown phrase exactly, 3 times in a row, to enroll your
   profile. A mismatched retype (typo, or using Backspace) discards that
   attempt — just try again.
2. Once enrolled, type the phrase once more. Try it normally first (should
   score **Low**), then try deliberately typing much faster, slower, or
   hunt-and-peck style, and watch the score rise.
3. The result shows the risk band, the raw scaled-distance number, and a
   bar chart of that attempt's actual dwell/flight timing.

## Reading the result
- **Low deviation** — this attempt's timing matches your enrolled rhythm
  closely.
- **Medium / High deviation** — this attempt's timing diverges
  meaningfully from what you enrolled — the same signal a real system
  would use to flag a possible impostor typing a stolen password.

## Notes & limits — read before trusting this as "real security"
- **This is a concept demo, not a calibrated authenticator.** Real
  keystroke-dynamics systems are validated against large populations of
  real users and impostors to set false-accept/false-reject thresholds.
  Here, the thresholds were set from a handful of synthetic and manual
  test typings in one browser session — they demonstrate the mechanism
  honestly, not a production-grade false-accept rate.
- Only ONE enrolled profile exists at a time, in this browser tab's
  memory — nothing is saved, sent anywhere, or persisted across a reload.
- A determined impostor who studies your exact rhythm (or a scripted
  bot replaying captured timing) could still pass — this demo shows the
  base signal, not a hardened production system with liveness/replay
  defenses.
- Backspace during a timed attempt discards it rather than trying to
  patch the timing — corrected typos have a different rhythm than a
  clean run and would distort the profile.
`.trim();

export const KEYSTROKE_AUTH_SUGGESTIONS = [
  "What's the difference between dwell time and flight time?",
  "Why is this called a 'scaled' Manhattan distance?",
  "Is this a real authentication technique companies use?",
  "How could a bot get past this?",
];
