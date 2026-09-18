/**
 * Simulated HTTP-request traffic for the anomaly dashboard.
 *
 * The honesty line for this whole tool: a Hobby-tier serverless site cannot
 * stream its OWN real request logs into a public page, so pretending these are
 * real hits would be a lie. Instead this generates a labelled, plausible
 * stream — a normal baseline plus a few PLANTED attacks whose ground truth we
 * keep — and the real IsolationForest on the backend scores it without ever
 * seeing the labels. That lets the dashboard report honest precision/recall:
 * a demo that can be caught missing an attack or crying wolf, not a highlight
 * reel. The UI says "simulated traffic" plainly.
 *
 * Features sent to the model (must match anomaly_detection.py FEATURE_NAMES):
 *   [req_per_min, payload_bytes, hour, path_entropy, error_rate]
 */

export type AttackType =
  | "normal"
  | "brute-force"
  | "scraping"
  | "payload-spike"
  | "off-hours";

export interface TrafficEvent {
  id: number;
  ip: string;
  method: string;
  path: string;
  status: number;
  payloadBytes: number;
  hour: number;
  reqPerMin: number;
  pathEntropy: number;
  errorRate: number;
  /** Ground truth, kept from the model. "normal" or the planted attack kind. */
  label: AttackType;
}

/** Feature vector in the exact order the backend expects. */
export function featureRow(e: TrafficEvent): number[] {
  return [e.reqPerMin, e.payloadBytes, e.hour, e.pathEntropy, e.errorRate];
}

export const ATTACK_LABELS: Record<AttackType, string> = {
  "normal": "Normal",
  "brute-force": "Brute force",
  "scraping": "Scraping / fuzzing",
  "payload-spike": "Payload spike",
  "off-hours": "Off-hours burst",
};

/** Deterministic PRNG (mulberry32) so a given seed always yields the same
 *  scenario — a dashboard that reshuffles every refresh reads as noise, and
 *  the model's random_state is fixed too, so the whole demo is reproducible. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Shannon entropy (bits) of a string's characters — a real fuzzer hitting
 *  random-looking paths scores high, an app's own routes score low. */
function shannonEntropy(s: string): number {
  const counts: Record<string, number> = {};
  for (const ch of s) counts[ch] = (counts[ch] ?? 0) + 1;
  const n = s.length || 1;
  let h = 0;
  for (const k in counts) {
    const p = counts[k] / n;
    h -= p * Math.log2(p);
  }
  return h;
}

const NORMAL_PATHS = [
  "/", "/tools", "/api/stats", "/api/track", "/blog", "/about",
  "/tools/text-to-sql", "/tools/automl", "/api/news", "/contact",
];
const METHODS = ["GET", "GET", "GET", "GET", "POST"];

function randChoice<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function randInt(rng: () => number, lo: number, hi: number): number {
  return Math.floor(lo + rng() * (hi - lo + 1));
}

function randIp(rng: () => number): string {
  return `${randInt(rng, 11, 223)}.${randInt(rng, 0, 255)}.${randInt(rng, 0, 255)}.${randInt(rng, 1, 254)}`;
}

/** A normal request: modest rate, small payload, business hours, low entropy,
 *  few errors. Gaussian-ish jitter via averaging two uniforms. */
function normalEvent(rng: () => number, id: number): TrafficEvent {
  const path = randChoice(rng, NORMAL_PATHS);
  const method = randChoice(rng, METHODS);
  const status = rng() < 0.04 ? randChoice(rng, [404, 500]) : 200;
  const jitter = (rng() + rng()) / 2; // ~triangular, centred
  return {
    id,
    ip: randIp(rng),
    method,
    path,
    status,
    payloadBytes: Math.round(400 + jitter * 900),
    hour: randInt(rng, 9, 18),
    reqPerMin: Math.round(2 + jitter * 8),
    pathEntropy: +(shannonEntropy(path)).toFixed(2),
    errorRate: +(rng() * 0.05).toFixed(3),
    label: "normal",
  };
}

/** One planted attack of the given kind, with realistic-looking metadata and
 *  the feature signature that kind actually leaves in logs. */
function attackEvent(rng: () => number, id: number, kind: AttackType): TrafficEvent {
  const ip = randIp(rng);
  if (kind === "brute-force") {
    const path = randChoice(rng, ["/login", "/admin", "/wp-login.php", "/api/auth"]);
    return { id, ip, method: "POST", path, status: 401,
      payloadBytes: randInt(rng, 200, 500), hour: randInt(rng, 0, 23),
      reqPerMin: randInt(rng, 90, 180), pathEntropy: +shannonEntropy(path).toFixed(2),
      errorRate: +(0.7 + rng() * 0.25).toFixed(3), label: kind };
  }
  if (kind === "scraping") {
    // Random-looking fuzzed path -> high entropy; high rate; 404 heavy.
    const rand = Array.from({ length: 14 }, () => "abcdef0123456789"[randInt(rng, 0, 15)]).join("");
    const path = `/${rand}`;
    return { id, ip, method: "GET", path, status: 404,
      payloadBytes: randInt(rng, 300, 600), hour: randInt(rng, 0, 23),
      reqPerMin: randInt(rng, 50, 110), pathEntropy: +shannonEntropy(path).toFixed(2),
      errorRate: +(0.5 + rng() * 0.4).toFixed(3), label: kind };
  }
  if (kind === "payload-spike") {
    const path = randChoice(rng, ["/api/upload", "/api/import", "/api/ingest"]);
    return { id, ip, method: "POST", path, status: 200,
      payloadBytes: randInt(rng, 40000, 500000), hour: randInt(rng, 9, 18),
      reqPerMin: randInt(rng, 3, 9), pathEntropy: +shannonEntropy(path).toFixed(2),
      errorRate: +(rng() * 0.05).toFixed(3), label: kind };
  }
  // off-hours burst: dead-of-night, elevated rate, error-heavy
  const path = randChoice(rng, ["/api/export", "/api/events", "/admin/data"]);
  return { id, ip, method: "GET", path, status: randChoice(rng, [403, 500]),
    payloadBytes: randInt(rng, 300, 900), hour: randInt(rng, 1, 4),
    reqPerMin: randInt(rng, 25, 60), pathEntropy: +shannonEntropy(path).toFixed(2),
    errorRate: +(0.6 + rng() * 0.35).toFixed(3), label: "off-hours" };
}

export interface Scenario {
  baseline: TrafficEvent[];
  stream: TrafficEvent[];
}

/** Build a full scenario: a normal baseline to train on, and a live stream of
 *  mostly-normal traffic with a handful of planted attacks mixed in at fixed
 *  positions (so every attack kind shows up once and the demo is stable). */
export function generateScenario(seed = 42): Scenario {
  const rng = mulberry32(seed);
  const baseline: TrafficEvent[] = [];
  for (let i = 0; i < 400; i++) baseline.push(normalEvent(rng, i));

  // Stream: 34 events, with 6 attacks slotted at spread-out positions.
  const planted: Record<number, AttackType> = {
    5: "brute-force", 11: "payload-spike", 17: "scraping",
    22: "off-hours", 27: "brute-force", 31: "scraping",
  };
  const stream: TrafficEvent[] = [];
  for (let i = 0; i < 34; i++) {
    stream.push(planted[i] ? attackEvent(rng, 1000 + i, planted[i]) : normalEvent(rng, 1000 + i));
  }
  return { baseline, stream };
}
