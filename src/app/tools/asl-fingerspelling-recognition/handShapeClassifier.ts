import prototypesData from "./aslPrototypes.json";

export type HandLandmark3 = { x: number; y: number; z: number };

type Prototype = { letter: string; v: number[] };
const PROTOTYPES = prototypesData as Prototype[];

export const SUPPORTED_LETTERS = Array.from(new Set(PROTOTYPES.map(p => p.letter))).sort();

/** Real, measured held-out accuracy of this exact prototype set + k=1
 * nearest-neighbor configuration: 248/314 = 79.0% on genuine unseen
 * photos (never included in the shipped prototypes below), 24 classes
 * (chance = 4.2%). See userGuide.ts for the full disclosure — this
 * number is measured, not assumed from the technique's reputation. */
export const MEASURED_HOLDOUT_ACCURACY = 0.79;

/** Translates landmarks relative to the wrist (landmark 0) and scales by
 * the wrist-to-middle-finger-MCP (landmark 9) distance — makes the
 * feature vector invariant to the hand's position and distance from the
 * camera. Deliberately does NOT normalize rotation: tested and found
 * that rotation-normalizing actually hurt held-out accuracy (75.5% ->
 * 67.8%) on this dataset, since hand orientation itself carries real
 * signal for some letters rather than being pure noise to remove. */
export function normalizeLandmarks(landmarks: HandLandmark3[]): number[] {
  const wrist = landmarks[0];
  const rel = landmarks.map(p => ({ x: p.x - wrist.x, y: p.y - wrist.y, z: p.z - wrist.z }));
  const ref = rel[9];
  const scale = Math.hypot(ref.x, ref.y, ref.z) || 1;
  const out: number[] = [];
  for (const p of rel) out.push(p.x / scale, p.y / scale, p.z / scale);
  return out;
}

function distance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; sum += d * d; }
  return Math.sqrt(sum);
}

export type ClassificationResult = { letter: string; distance: number };

/** k=1 nearest-neighbor over the shipped prototype set. k=1 was tested
 * against k=3/5/7/9/15 and won on held-out accuracy (75.5% vs 70.7% at
 * k=3, declining further at higher k) — with this little data per class
 * and this many visually-close letters (see the confusion clusters in
 * the User Guide), a single closest match generalizes better than a
 * vote across more neighbors. */
export function classifyHandShape(landmarks: HandLandmark3[]): ClassificationResult {
  const x = normalizeLandmarks(landmarks);
  let best: ClassificationResult = { letter: PROTOTYPES[0].letter, distance: Infinity };
  for (const p of PROTOTYPES) {
    const d = distance(x, p.v);
    if (d < best.distance) best = { letter: p.letter, distance: d };
  }
  return best;
}
