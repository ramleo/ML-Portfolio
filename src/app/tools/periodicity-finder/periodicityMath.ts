// Core math for the Periodicity Finder — pure, dependency-free, and verified
// against synthetic ground truth (a known sine period, a known weekly cluster)
// before any UI was wired to it. Kept apart from the component so it can be
// unit-checked with a plain `tsx` script.
//
// Two input shapes, one engine:
//  - a numeric series (one value per line), treated as evenly sampled; periods
//    come back in "samples".
//  - a list of timestamps (event times), binned into a regular count-per-bin
//    series first; periods come back in real time units.
// Either way we detrend (remove the mean), apply a Hann window to cut spectral
// leakage, run a radix-2 FFT, and read the dominant peaks off the magnitude
// spectrum.

export type Peak = {
  periodSamples: number; // cycle length in samples (series) or bins (timestamps)
  periodLabel: string; // human-readable ("12.0 samples" / "~7.0 days")
  strength: number; // magnitude relative to the spectrum median (prominence)
};

export type PeriodicityResult =
  | { ok: false; error: string }
  | {
      ok: true;
      mode: "series" | "timestamps";
      n: number; // samples actually analysed (after binning / padding-aware)
      binSeconds: number | null; // width of one bin in seconds (timestamps only)
      spectrum: number[]; // magnitude spectrum, bins 0..N/2 (for the chart)
      peaks: Peak[]; // strongest first, at most 3
    };

const MIN_SAMPLES = 8;
const EPOCH_S = 1e9; // a plain number this large is almost certainly a unix time
const EPOCH_MS = 1e12;

/** Split raw text into non-empty trimmed lines. */
function lines(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** A line reads as a timestamp if it looks like a date, or is a big epoch int. */
function asTimestamp(line: string): number | null {
  if (/^\d{4}-\d{1,2}-\d{1,2}/.test(line) || /^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(line)) {
    const t = Date.parse(line);
    return Number.isNaN(t) ? null : t / 1000;
  }
  if (/^\d+(\.\d+)?$/.test(line)) {
    const v = Number(line);
    if (v >= EPOCH_MS) return v / 1000; // milliseconds
    if (v >= EPOCH_S) return v; // seconds
  }
  return null;
}

/** Next power of two >= n. */
function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/**
 * In-place iterative radix-2 Cooley–Tukey FFT. `re`/`im` must be the same
 * length and a power of two. Standard bit-reversal permutation followed by
 * log2(N) butterfly stages.
 */
function fft(re: number[], im: number[]): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k;
        const b = i + k + len / 2;
        const tr = re[b] * cr - im[b] * ci;
        const ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
}

function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Turn a bin-count period into a readable time string. */
function formatSeconds(sec: number): string {
  if (sec < 90) return `~${sec.toFixed(1)} sec`;
  if (sec < 5400) return `~${(sec / 60).toFixed(1)} min`;
  if (sec < 129600) return `~${(sec / 3600).toFixed(1)} hours`;
  if (sec < 5443200) return `~${(sec / 86400).toFixed(1)} days`;
  return `~${(sec / 604800).toFixed(1)} weeks`;
}

/**
 * Run the whole pipeline on one evenly-sampled real series, returning the
 * magnitude spectrum and the strongest periodic peaks. `binSeconds` (when set)
 * converts a period-in-bins into a real time label.
 */
function analyseSeries(
  values: number[],
  mode: "series" | "timestamps",
  binSeconds: number | null,
): PeriodicityResult {
  const realN = values.length;
  if (realN < MIN_SAMPLES) {
    return { ok: false, error: `Need at least ${MIN_SAMPLES} data points; got ${realN}.` };
  }

  const mean = values.reduce((a, b) => a + b, 0) / realN;
  // Hann window over the real samples, detrended by the mean.
  const n = nextPow2(realN);
  const re = new Array(n).fill(0);
  const im = new Array(n).fill(0);
  for (let i = 0; i < realN; i++) {
    const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (realN - 1));
    re[i] = (values[i] - mean) * w;
  }

  fft(re, im);

  const half = n >> 1;
  const spectrum: number[] = [];
  for (let k = 0; k <= half; k++) spectrum.push(Math.hypot(re[k], im[k]));

  // Ignore bin 0 (DC, removed anyway) and bin 1 (a single cycle over the whole
  // window is a trend, not a repeating period). Peak = local max above both
  // neighbours; prominence = magnitude over the median of the searched band.
  const start = 2;
  const band = spectrum.slice(start, half);
  const med = median(band) || 1e-9;
  const peaks: Peak[] = [];
  for (let k = start; k < half; k++) {
    if (spectrum[k] > spectrum[k - 1] && spectrum[k] >= spectrum[k + 1]) {
      const periodSamples = n / k;
      peaks.push({
        periodSamples,
        periodLabel:
          binSeconds != null
            ? formatSeconds(periodSamples * binSeconds)
            : `${periodSamples.toFixed(1)} samples`,
        strength: spectrum[k] / med,
      });
    }
  }
  peaks.sort((a, b) => b.strength - a.strength);

  return {
    ok: true,
    mode,
    n: realN,
    binSeconds,
    spectrum,
    peaks: peaks.slice(0, 3),
  };
}

/** Bin sorted timestamps (seconds) into `nbins` even count buckets. */
function binTimestamps(ts: number[]): { counts: number[]; binSeconds: number } | null {
  const sorted = [...ts].sort((a, b) => a - b);
  const span = sorted[sorted.length - 1] - sorted[0];
  if (span <= 0) return null;
  const nbins = Math.min(512, Math.max(64, nextPow2(sorted.length)));
  const binSeconds = span / nbins;
  const counts = new Array(nbins).fill(0);
  for (const t of sorted) {
    let idx = Math.floor((t - sorted[0]) / binSeconds);
    if (idx >= nbins) idx = nbins - 1;
    counts[idx]++;
  }
  return { counts, binSeconds };
}

/** Parse raw text and run the analysis, picking the mode from the content. */
export function findPeriodicity(raw: string): PeriodicityResult {
  const ls = lines(raw);
  if (ls.length < MIN_SAMPLES) {
    return { ok: false, error: `Need at least ${MIN_SAMPLES} lines of data; got ${ls.length}.` };
  }

  const stamps = ls.map(asTimestamp);
  const tsCount = stamps.filter((t) => t != null).length;

  if (tsCount >= ls.length * 0.6) {
    const ts = stamps.filter((t): t is number => t != null);
    const binned = binTimestamps(ts);
    if (!binned) return { ok: false, error: "All timestamps are identical — no span to analyse." };
    return analyseSeries(binned.counts, "timestamps", binned.binSeconds);
  }

  const nums = ls.map(Number).filter((v) => Number.isFinite(v));
  if (nums.length < MIN_SAMPLES) {
    return {
      ok: false,
      error: "Could not read the input as numbers or timestamps (need one value per line).",
    };
  }
  return analyseSeries(nums, "series", null);
}
