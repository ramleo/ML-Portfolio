export type Point3 = { x: number; y: number; z: number };
export type PoseFrame = { t: number; landmarks: Point3[] }; // 33-point MediaPipe Pose world landmarks

export type JointKey = "leftElbow" | "rightElbow" | "leftKnee" | "rightKnee" | "leftHip" | "rightHip";
export const JOINT_LABELS: Record<JointKey, string> = {
  leftElbow: "Left elbow", rightElbow: "Right elbow",
  leftKnee: "Left knee", rightKnee: "Right knee",
  leftHip: "Left hip", rightHip: "Right hip",
};

// MediaPipe Pose's 33-point landmark indices for the joints tracked here.
const JOINT_TRIPLES: Record<JointKey, [number, number, number]> = {
  leftElbow: [11, 13, 15], rightElbow: [12, 14, 16],   // shoulder-elbow-wrist
  leftKnee: [23, 25, 27], rightKnee: [24, 26, 28],      // hip-knee-ankle
  leftHip: [11, 23, 25], rightHip: [12, 24, 26],        // shoulder-hip-knee
};

/** Angle at point b, formed by rays b->a and b->c, in degrees. Uses 3D
 * world-landmark coordinates (metric, camera-distance-invariant) rather
 * than normalized 2D image landmarks — the geometrically correct choice
 * for joint-angle math, matching published MediaPipe joint-angle
 * validation studies. */
export function angleAtJoint(a: Point3, b: Point3, c: Point3): number {
  const v1 = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  const v2 = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z };
  const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  const mag1 = Math.hypot(v1.x, v1.y, v1.z);
  const mag2 = Math.hypot(v2.x, v2.y, v2.z);
  if (mag1 === 0 || mag2 === 0) return NaN;
  const cos = Math.min(1, Math.max(-1, dot / (mag1 * mag2)));
  return (Math.acos(cos) * 180) / Math.PI;
}

export type AngleSample = { t: number; angle: number };
export type AngleSeries = Record<JointKey, AngleSample[]>;

export function extractAngleSeries(frames: PoseFrame[]): AngleSeries {
  const series = {} as AngleSeries;
  (Object.keys(JOINT_TRIPLES) as JointKey[]).forEach(key => { series[key] = []; });

  for (const frame of frames) {
    for (const key of Object.keys(JOINT_TRIPLES) as JointKey[]) {
      const [ia, ib, ic] = JOINT_TRIPLES[key];
      const a = frame.landmarks[ia], b = frame.landmarks[ib], c = frame.landmarks[ic];
      if (!a || !b || !c) continue;
      const angle = angleAtJoint(a, b, c);
      if (!Number.isNaN(angle)) series[key].push({ t: frame.t, angle });
    }
  }
  return series;
}

/** Resamples a (possibly sparse/irregular) angle series onto N fixed
 * points spanning 0-100% of ITS OWN duration — this is what makes a
 * 4-second clip comparable to a 6-second one of the same movement: both
 * get expressed on a shared movement-phase axis instead of raw seconds. */
export function resampleToPhase(samples: AngleSample[], n = 50): number[] {
  if (samples.length === 0) return new Array(n).fill(NaN);
  if (samples.length === 1) return new Array(n).fill(samples[0].angle);

  const t0 = samples[0].t;
  const t1 = samples[samples.length - 1].t;
  const duration = t1 - t0;
  if (duration <= 0) return new Array(n).fill(samples[0].angle);

  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const targetT = t0 + (i / (n - 1)) * duration;
    let lo = 0;
    while (lo < samples.length - 1 && samples[lo + 1].t < targetT) lo++;
    const hi = Math.min(lo + 1, samples.length - 1);
    const sLo = samples[lo], sHi = samples[hi];
    if (sHi.t === sLo.t) { out.push(sLo.angle); continue; }
    const frac = (targetT - sLo.t) / (sHi.t - sLo.t);
    out.push(sLo.angle + frac * (sHi.angle - sLo.angle));
  }
  return out;
}

export type JointDeviation = {
  joint: JointKey;
  userPhase: number[];
  refPhase: number[];
  rms: number;
  worstPhaseIndex: number;
  worstDiff: number;
};

/** RMS deviation between two already phase-resampled curves, plus the
 * single phase point with the largest gap — surfaces the most useful
 * "where did your form differ most" moment, not just an aggregate score. */
export function computeDeviation(userPhase: number[], refPhase: number[]): { rms: number; worstPhaseIndex: number; worstDiff: number } {
  let sumSq = 0, count = 0, worstDiff = 0, worstIdx = 0;
  for (let i = 0; i < userPhase.length; i++) {
    const u = userPhase[i], r = refPhase[i];
    if (Number.isNaN(u) || Number.isNaN(r)) continue;
    const diff = u - r;
    sumSq += diff * diff;
    count++;
    if (Math.abs(diff) > Math.abs(worstDiff)) { worstDiff = diff; worstIdx = i; }
  }
  return { rms: count > 0 ? Math.sqrt(sumSq / count) : NaN, worstPhaseIndex: worstIdx, worstDiff };
}

export function compareMovements(userSeries: AngleSeries, refSeries: AngleSeries, n = 50): JointDeviation[] {
  return (Object.keys(userSeries) as JointKey[]).map(joint => {
    const userPhase = resampleToPhase(userSeries[joint], n);
    const refPhase = resampleToPhase(refSeries[joint], n);
    const { rms, worstPhaseIndex, worstDiff } = computeDeviation(userPhase, refPhase);
    return { joint, userPhase, refPhase, rms, worstPhaseIndex, worstDiff };
  }).sort((a, b) => (Number.isNaN(b.rms) ? -1 : b.rms) - (Number.isNaN(a.rms) ? -1 : a.rms));
}
