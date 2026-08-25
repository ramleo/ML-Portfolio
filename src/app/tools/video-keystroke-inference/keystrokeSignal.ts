export type Sample = { t: number; x: number; y: number }; // t in seconds, x/y normalized 0-1 (video-relative)
export type FingerSeries = { hand: "left" | "right"; finger: number; samples: Sample[] };
export type KeystrokeEvent = { t: number; hand: "left" | "right"; finger: number; x: number };

const MERGE_WINDOW_S = 0.06; // events across fingers within this window = one keypress
const MIN_DIP_AMPLITUDE = 0.012; // normalized-y; below this is tracking noise, not a real press
const REFRACTORY_S = 0.08; // minimum gap between two taps of the SAME finger

/** 3-sample moving average — enough to knock down per-frame landmark jitter
 * without smearing out a genuine single-frame press dip. */
export function smooth(samples: Sample[]): Sample[] {
  if (samples.length < 3) return samples;
  return samples.map((s, i) => {
    if (i === 0 || i === samples.length - 1) return s;
    const y = (samples[i - 1].y + s.y + samples[i + 1].y) / 3;
    return { t: s.t, x: s.x, y };
  });
}

const LOCAL_MAX_RADIUS = 2; // samples on each side — tolerates a flat-topped plateau peak

/** Walks away from a peak index in one direction while y is non-increasing,
 * returning the lowest value reached before motion reverses upward again —
 * the true flanking valley, robust to a multi-sample flat peak top (unlike
 * comparing only the single immediate neighbor). */
function findValley(s: Sample[], peakIndex: number, step: 1 | -1): number {
  let i = peakIndex;
  let minY = s[i].y;
  while (true) {
    const j = i + step;
    if (j < 0 || j >= s.length) break;
    if (s[j].y > s[i].y + 1e-9) break; // started rising again — valley found
    i = j;
    minY = Math.min(minY, s[i].y);
  }
  return minY;
}

/** Tap detection: a real key-press shows as a local MAXIMUM in y (finger
 * drops toward the keyboard — larger y in normalized image coords, origin
 * top-left) bracketed by clear upward motion (a genuine valley) on both
 * sides — the same press-then-release shape the published hand-tracking
 * attacks key off. A monotonic drift (hand moving toward camera) or slow
 * settle has no such bracketing valley and is correctly ignored. */
function detectFingerTaps(series: FingerSeries): KeystrokeEvent[] {
  const s = smooth(series.samples);
  const events: KeystrokeEvent[] = [];
  let lastTapT = -Infinity;

  for (let i = LOCAL_MAX_RADIUS; i < s.length - LOCAL_MAX_RADIUS; i++) {
    const cur = s[i];
    let isLocalMax = true;
    for (let k = i - LOCAL_MAX_RADIUS; k <= i + LOCAL_MAX_RADIUS; k++) {
      if (k !== i && s[k].y > cur.y) { isLocalMax = false; break; }
    }
    if (!isLocalMax) continue;
    if (cur.t - lastTapT < REFRACTORY_S) continue; // dedupes ties across a flat peak top

    const leftValley = findValley(s, i, -1);
    const rightValley = findValley(s, i, 1);
    const amplitude = Math.min(cur.y - leftValley, cur.y - rightValley);
    if (amplitude < MIN_DIP_AMPLITUDE) continue;

    events.push({ t: cur.t, hand: series.hand, finger: series.finger, x: cur.x });
    lastTapT = cur.t;
  }
  return events;
}

export function detectTapEvents(allFingers: FingerSeries[]): KeystrokeEvent[] {
  return allFingers.flatMap(detectFingerTaps).sort((a, b) => a.t - b.t);
}

/** Collapses near-simultaneous taps across different fingers into one
 * keystroke — a hand only presses one key at a time, so multiple fingers
 * "detecting" a press within MERGE_WINDOW_S is the same physical event. */
export function mergeNearbyEvents(events: KeystrokeEvent[]): KeystrokeEvent[] {
  const sorted = [...events].sort((a, b) => a.t - b.t);
  const merged: KeystrokeEvent[] = [];
  for (const ev of sorted) {
    const last = merged[merged.length - 1];
    if (last && ev.t - last.t < MERGE_WINDOW_S) continue; // keep the earliest of the cluster
    merged.push(ev);
  }
  return merged;
}

export type WordSegment = { startIndex: number; endIndex: number };

/** A gap meaningfully longer than the typist's own median inter-keystroke
 * interval plausibly marks a space/pause between words — a real, if
 * approximate, timing-only signal (no character identity involved). */
export function segmentWordBoundaries(events: KeystrokeEvent[]): WordSegment[] {
  if (events.length < 2) return events.length ? [{ startIndex: 0, endIndex: 0 }] : [];

  const gaps = events.slice(1).map((e, i) => e.t - events[i].t).sort((a, b) => a - b);
  const median = gaps[Math.floor(gaps.length / 2)];
  const boundaryThreshold = median * 2.2;

  const segments: WordSegment[] = [];
  let start = 0;
  for (let i = 1; i < events.length; i++) {
    if (events[i].t - events[i - 1].t > boundaryThreshold) {
      segments.push({ startIndex: start, endIndex: i - 1 });
      start = i;
    }
  }
  segments.push({ startIndex: start, endIndex: events.length - 1 });
  return segments;
}

export function estimateWpm(events: KeystrokeEvent[], durationSeconds: number): number {
  if (events.length === 0 || durationSeconds <= 0) return 0;
  const standardWords = events.length / 5; // standard WPM convention: 5 keystrokes = 1 "word"
  return Math.round((standardWords / durationSeconds) * 60);
}

export function rhythmConsistency(events: KeystrokeEvent[]): number | null {
  if (events.length < 3) return null;
  const intervals = events.slice(1).map((e, i) => e.t - events[i].t);
  const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  if (mean === 0) return null;
  const variance = intervals.reduce((a, b) => a + (b - mean) ** 2, 0) / intervals.length;
  const stddev = Math.sqrt(variance);
  return Math.max(0, Math.min(1, 1 - stddev / mean)); // 1 = perfectly even rhythm, 0 = erratic
}
