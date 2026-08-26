import type { Point3, PoseFrame, AngleSample } from "../movement-form-comparison/jointAngles";
import { angleAtJoint, resampleToPhase, computeDeviation } from "../movement-form-comparison/jointAngles";

export type GaitJointKey = "leftKnee" | "rightKnee" | "leftAnkle" | "rightAnkle";
export const GAIT_JOINT_LABELS: Record<GaitJointKey, string> = {
  leftKnee: "Left knee", rightKnee: "Right knee",
  leftAnkle: "Left ankle", rightAnkle: "Right ankle",
};

// MediaPipe Pose's 33-point landmark indices for the joints tracked here.
const GAIT_JOINT_TRIPLES: Record<GaitJointKey, [number, number, number]> = {
  leftKnee: [23, 25, 27], rightKnee: [24, 26, 28],         // hip-knee-ankle
  leftAnkle: [25, 27, 31], rightAnkle: [26, 28, 32],       // knee-ankle-foot_index
};

export type GaitAngleSeries = Record<GaitJointKey, AngleSample[]>;

export function extractGaitAngleSeries(frames: PoseFrame[]): GaitAngleSeries {
  const series = {} as GaitAngleSeries;
  (Object.keys(GAIT_JOINT_TRIPLES) as GaitJointKey[]).forEach(key => { series[key] = []; });

  for (const frame of frames) {
    for (const key of Object.keys(GAIT_JOINT_TRIPLES) as GaitJointKey[]) {
      const [ia, ib, ic] = GAIT_JOINT_TRIPLES[key];
      const a: Point3 | undefined = frame.landmarks[ia];
      const b: Point3 | undefined = frame.landmarks[ib];
      const c: Point3 | undefined = frame.landmarks[ic];
      if (!a || !b || !c) continue;
      const angle = angleAtJoint(a, b, c);
      if (!Number.isNaN(angle)) series[key].push({ t: frame.t, angle });
    }
  }
  return series;
}

const MIN_PROMINENCE_DEG = 8;
const MIN_CYCLE_SECONDS = 0.4; // faster than any real walking stride — guards against jitter double-counts

/** 3-sample moving average, same jitter-reduction role as
 * keystrokeSignal.ts's smooth(), adapted for {t, angle} samples. */
function smoothAngles(samples: AngleSample[]): AngleSample[] {
  if (samples.length < 3) return samples;
  return samples.map((s, i) => {
    if (i === 0 || i === samples.length - 1) return s;
    const angle = (samples[i - 1].angle + s.angle + samples[i + 1].angle) / 3;
    return { t: s.t, angle };
  });
}

/** Walks away from a peak index while the signal is non-increasing,
 * returning the lowest value reached before it rises again — the true
 * flanking valley/"col", robust to a flat-topped peak (same directional
 * valley-walk technique as keystrokeSignal.ts's findValley, adapted for a
 * degrees-valued angle signal). */
function findAngleValley(s: AngleSample[], peakIndex: number, step: 1 | -1): number {
  let i = peakIndex;
  let minAngle = s[i].angle;
  while (true) {
    const j = i + step;
    if (j < 0 || j >= s.length) break;
    if (s[j].angle > s[i].angle + 1e-9) break;
    i = j;
    minAngle = Math.min(minAngle, s[i].angle);
  }
  return minAngle;
}

export type CyclePeak = { t: number; index: number };

/** Finds prominent local maxima in a joint-angle series — during walking,
 * knee angle peaks near full extension once per stride, so consecutive
 * peaks bracket one gait cycle each. */
export function findAnglePeaks(samples: AngleSample[]): CyclePeak[] {
  const s = smoothAngles(samples);
  const peaks: CyclePeak[] = [];
  let lastPeakT = -Infinity;

  for (let i = 1; i < s.length - 1; i++) {
    const cur = s[i];
    if (!(cur.angle >= s[i - 1].angle && cur.angle >= s[i + 1].angle)) continue;
    if (cur.t - lastPeakT < MIN_CYCLE_SECONDS) continue;

    const leftValley = findAngleValley(s, i, -1);
    const rightValley = findAngleValley(s, i, 1);
    const prominence = Math.min(cur.angle - leftValley, cur.angle - rightValley);
    if (prominence < MIN_PROMINENCE_DEG) continue;

    peaks.push({ t: cur.t, index: i });
    lastPeakT = cur.t;
  }
  return peaks;
}

export type GaitCycle = { start: number; end: number };

export function detectCycles(samples: AngleSample[]): GaitCycle[] {
  const peaks = findAnglePeaks(samples);
  const cycles: GaitCycle[] = [];
  for (let i = 0; i < peaks.length - 1; i++) {
    cycles.push({ start: peaks[i].t, end: peaks[i + 1].t });
  }
  return cycles;
}

const PHASE_POINTS = 50;
const MIN_CYCLES_FOR_SIGNATURE = 2;

export type GaitSignature = {
  available: boolean;
  perJointAvgCurve: Record<GaitJointKey, number[]>;
  cadenceStepsPerMinute: number;
  numCycles: number;
  warnings: string[];
};

function averageAcrossCycles(samples: AngleSample[], cycles: GaitCycle[]): number[] {
  const phaseCurves = cycles.map(cycle => {
    const sub = samples.filter(s => s.t >= cycle.start && s.t <= cycle.end);
    return resampleToPhase(sub, PHASE_POINTS);
  });
  const avg: number[] = [];
  for (let i = 0; i < PHASE_POINTS; i++) {
    const vals = phaseCurves.map(c => c[i]).filter(v => !Number.isNaN(v));
    avg.push(vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : NaN);
  }
  return avg;
}

/** Picks whichever knee produced more detected cycles as the reference
 * channel for cycle boundaries — one leg's tracking is often cleaner than
 * the other depending on which side faces the camera. */
export function computeGaitSignature(frames: PoseFrame[]): GaitSignature {
  const series = extractGaitAngleSeries(frames);
  const leftCycles = detectCycles(series.leftKnee);
  const rightCycles = detectCycles(series.rightKnee);
  const cycles = rightCycles.length >= leftCycles.length ? rightCycles : leftCycles;

  if (cycles.length < MIN_CYCLES_FOR_SIGNATURE) {
    return {
      available: false,
      perJointAvgCurve: { leftKnee: [], rightKnee: [], leftAnkle: [], rightAnkle: [] },
      cadenceStepsPerMinute: 0, numCycles: cycles.length,
      warnings: ["Not enough consistent strides detected — try a longer, clearer side-view clip "
        + "of continuous walking (at least 2-3 full strides)."],
    };
  }

  const perJointAvgCurve = {} as Record<GaitJointKey, number[]>;
  (Object.keys(series) as GaitJointKey[]).forEach(joint => {
    perJointAvgCurve[joint] = averageAcrossCycles(series[joint], cycles);
  });

  const meanCycleDuration = cycles.reduce((a, c) => a + (c.end - c.start), 0) / cycles.length;
  const cadenceStepsPerMinute = meanCycleDuration > 0 ? Math.round(60 / meanCycleDuration) : 0;

  return { available: true, perJointAvgCurve, cadenceStepsPerMinute, numCycles: cycles.length, warnings: [] };
}

export type GaitJointComparison = { joint: GaitJointKey; rms: number };
export type GaitComparisonResult = {
  perJoint: GaitJointComparison[];
  overallRms: number;
  overallLabel: "similar" | "some_differences" | "substantially_different";
};

const SIMILAR_THRESHOLD_DEG = 10;
const DIFFERENT_THRESHOLD_DEG = 20;

/** Thresholds are a reasonable-looking heuristic against typical gait
 * knee/ankle angle ranges (~0-70deg through a stride), NOT calibrated
 * against any labeled human gait dataset — disclosed in the UI. */
export function compareGaitSignatures(a: GaitSignature, b: GaitSignature): GaitComparisonResult {
  const perJoint = (Object.keys(a.perJointAvgCurve) as GaitJointKey[]).map(joint => {
    const { rms } = computeDeviation(a.perJointAvgCurve[joint], b.perJointAvgCurve[joint]);
    return { joint, rms };
  });
  const validRms = perJoint.map(j => j.rms).filter(v => !Number.isNaN(v));
  const overallRms = validRms.length > 0 ? validRms.reduce((x, y) => x + y, 0) / validRms.length : NaN;
  const overallLabel: GaitComparisonResult["overallLabel"] =
    overallRms < SIMILAR_THRESHOLD_DEG ? "similar"
      : overallRms < DIFFERENT_THRESHOLD_DEG ? "some_differences"
        : "substantially_different";
  return { perJoint, overallRms, overallLabel };
}
