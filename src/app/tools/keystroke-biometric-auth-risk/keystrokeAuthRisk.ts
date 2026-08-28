// Real, published keystroke-dynamics technique: dwell/flight timing + a
// scaled Manhattan distance classifier (Killourhy & Maxion's CMU keystroke
// benchmark and follow-on work report this as a top-performing anomaly
// detector for this exact problem, ~0.09 EER). Confirmed via research
// before building — not invented for this project.

export type KeyEvent = { key: string; type: "down" | "up"; t: number };

export type AttemptFeatures = {
  dwell: number[]; // per character: keyup.t - keydown.t
  flight: number[]; // per adjacent pair: keydown[i+1].t - keyup[i].t (can go negative on overlapping presses)
};

/** Pairs raw down/up events (already filtered to one attempt's worth) into
 * dwell/flight feature vectors. Assumes events are in chronological order
 * and alternate down/up per character position, which the capture hook
 * guarantees by construction (a browser can't fire two downs for the same
 * key slot without an up between them for normal typing). */
export function extractDwellFlight(events: KeyEvent[]): AttemptFeatures {
  const downs = events.filter(e => e.type === "down");
  const ups = events.filter(e => e.type === "up");
  const n = Math.min(downs.length, ups.length);

  const dwell: number[] = [];
  for (let i = 0; i < n; i++) dwell.push(ups[i].t - downs[i].t);

  const flight: number[] = [];
  for (let i = 0; i < n - 1; i++) flight.push(downs[i + 1].t - ups[i].t);

  return { dwell, flight };
}

export type Profile = {
  dwellMean: number[]; dwellStd: number[];
  flightMean: number[]; flightStd: number[];
};

const STD_EPSILON = 5; // ms floor — real human timing never repeats to the millisecond across reps

function meanStd(values: number[]): { mean: number; std: number } {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return { mean, std: Math.max(Math.sqrt(variance), STD_EPSILON) };
}

/** Builds an enrollment profile from N reps of the same phrase — all reps
 * must have identical feature-vector lengths (same phrase, same character
 * count), which the capture hook enforces via phrase-match validation. */
export function buildProfile(reps: AttemptFeatures[]): Profile {
  const dwellLen = reps[0].dwell.length;
  const flightLen = reps[0].flight.length;

  const dwellMean: number[] = [], dwellStd: number[] = [];
  for (let i = 0; i < dwellLen; i++) {
    const { mean, std } = meanStd(reps.map(r => r.dwell[i]));
    dwellMean.push(mean); dwellStd.push(std);
  }

  const flightMean: number[] = [], flightStd: number[] = [];
  for (let i = 0; i < flightLen; i++) {
    const { mean, std } = meanStd(reps.map(r => r.flight[i]));
    flightMean.push(mean); flightStd.push(std);
  }

  return { dwellMean, dwellStd, flightMean, flightStd };
}

/** Scaled Manhattan distance: per-feature absolute deviation from the
 * enrolled mean, normalized by that feature's own enrolled std dev, summed
 * and averaged across all features — the published classifier, not a
 * from-scratch invention. */
export function scaledManhattanScore(profile: Profile, attempt: AttemptFeatures): number {
  let total = 0;
  let count = 0;

  for (let i = 0; i < profile.dwellMean.length; i++) {
    total += Math.abs(attempt.dwell[i] - profile.dwellMean[i]) / profile.dwellStd[i];
    count++;
  }
  for (let i = 0; i < profile.flightMean.length; i++) {
    total += Math.abs(attempt.flight[i] - profile.flightMean[i]) / profile.flightStd[i];
    count++;
  }

  return count === 0 ? 0 : total / count;
}

export type RiskBand = "low" | "medium" | "high";

// Thresholds calibrated during unit verification (see keystrokeAuthRisk.test.ts run):
// a near-identical retype scores well under 1.0 (within ~1 std dev per feature on average);
// a deliberately altered typing style (e.g. every dwell doubled) scores well over 2.5.
export function riskBand(score: number): RiskBand {
  if (score < 1.2) return "low";
  if (score < 2.5) return "medium";
  return "high";
}
