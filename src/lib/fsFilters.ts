import type { ColInfo } from "./fsCore";

// ── Statistics helpers ────────────────────────────────────────────────────────

export function pearson(a: number[], b: number[]): number {
  const pairs: [number, number][] = [];
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (isFinite(a[i]) && isFinite(b[i])) pairs.push([a[i], b[i]]);
  }
  if (pairs.length < 3) return 0;
  const n = pairs.length;
  const ma = pairs.reduce((s, p) => s + p[0], 0) / n;
  const mb = pairs.reduce((s, p) => s + p[1], 0) / n;
  let num = 0, da = 0, db = 0;
  for (const [x, y] of pairs) {
    const dx = x - ma, dy = y - mb;
    num += dx * dy; da += dx * dx; db += dy * dy;
  }
  if (da === 0 || db === 0) return 0;
  return num / Math.sqrt(da * db);
}

export function miScore(col: ColInfo, target: ColInfo | null): number {
  if (!target) return col.variance;
  const r = pearson(col.nums, target.nums);
  return Math.max(0, -0.5 * Math.log(Math.max(1 - r * r, 1e-10)));
}

// F(1, n-2) statistic for linear association — matches sklearn f_regression
export function fRegression(col: ColInfo, target: ColInfo): number {
  const r = pearson(col.nums, target.nums);
  if (r === 0) return 0;
  const pairs: number[] = [];
  for (let i = 0; i < Math.min(col.nums.length, target.nums.length); i++) {
    if (isFinite(col.nums[i]) && isFinite(target.nums[i])) pairs.push(1);
  }
  const n = pairs.length;
  if (n < 3) return 0;
  const r2 = r * r;
  return Math.max(0, (r2 * (n - 2)) / Math.max(1 - r2, 1e-10));
}

// One-way ANOVA F-statistic — matches sklearn f_classif
export function fClassif(col: ColInfo, target: ColInfo): number {
  const groups = new Map<number, number[]>();
  let total = 0;
  for (let i = 0; i < Math.min(col.nums.length, target.nums.length); i++) {
    if (!isFinite(col.nums[i]) || !isFinite(target.nums[i])) continue;
    const cat = Math.round(target.nums[i]);
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(col.nums[i]);
    total++;
  }
  if (groups.size < 2 || total < 3) return 0;
  const k = groups.size;
  const allVals = [...groups.values()].flat();
  const grandMean = allVals.reduce((a, b) => a + b, 0) / total;
  let between = 0, within = 0;
  for (const vals of groups.values()) {
    const gm = vals.reduce((a, b) => a + b, 0) / vals.length;
    between += vals.length * (gm - grandMean) ** 2;
    within += vals.reduce((s, v) => s + (v - gm) ** 2, 0);
  }
  if (within === 0 || total === k) return 0;
  return Math.max(0, (between / (k - 1)) / (within / (total - k)));
}

export function kendallTau(a: number[], b: number[]): number {
  const pairs: [number, number][] = [];
  const limit = Math.min(a.length, b.length, 500);
  for (let i = 0; i < limit; i++) {
    if (isFinite(a[i]) && isFinite(b[i])) pairs.push([a[i], b[i]]);
  }
  const n = pairs.length;
  if (n < 3) return 0;
  let concordant = 0, discordant = 0;
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = pairs[i][0] - pairs[j][0];
      const dy = pairs[i][1] - pairs[j][1];
      if (dx * dy > 0) concordant++;
      else if (dx * dy < 0) discordant++;
    }
  }
  return (concordant - discordant) / (n * (n - 1) / 2);
}

export function chiSquaredScore(col: ColInfo, target: ColInfo): number {
  const n = Math.min(col.nums.length, target.nums.length);
  const pairs: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    if (isFinite(col.nums[i]) && isFinite(target.nums[i])) pairs.push([col.nums[i], target.nums[i]]);
  }
  if (pairs.length < 10) return 0;

  const fv = pairs.map(p => p[0]).sort((a, b) => a - b);
  const q1 = fv[Math.floor(fv.length * 0.25)];
  const q2 = fv[Math.floor(fv.length * 0.5)];
  const q3 = fv[Math.floor(fv.length * 0.75)];
  const binFeat = (v: number) => v <= q1 ? 0 : v <= q2 ? 1 : v <= q3 ? 2 : 3;

  const cats = [...new Set(pairs.map(p => Math.round(p[1])))].sort((a, b) => a - b);
  const catIdx = new Map(cats.map((c, i) => [c, i]));
  const nBins = 4, nCats = cats.length;
  const obs = Array(nBins).fill(0).map(() => Array(nCats).fill(0));
  for (const [fval, tv] of pairs) obs[binFeat(fval)][catIdx.get(Math.round(tv)) ?? 0]++;

  const total = pairs.length;
  const rowS = obs.map(r => r.reduce((a, b) => a + b, 0));
  const colS = Array(nCats).fill(0).map((_, j) => obs.reduce((s, r) => s + r[j], 0));
  let chi2 = 0;
  for (let i = 0; i < nBins; i++) {
    for (let j = 0; j < nCats; j++) {
      const exp = (rowS[i] * colS[j]) / total;
      if (exp > 0) chi2 += (obs[i][j] - exp) ** 2 / exp;
    }
  }
  return chi2;
}