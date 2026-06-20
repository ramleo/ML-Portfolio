import type { ColInfo } from "./fsCore";
import { pearson, miScore } from "./fsFilters";

// ── Statistical helpers used by embedded methods ──────────────────────────────

export function statVariance(vals: number[]): number {
  if (vals.length === 0) return 0;
  const m = vals.reduce((a, b) => a + b, 0) / vals.length;
  return vals.reduce((s, v) => s + (v - m) ** 2, 0) / vals.length;
}

export function giniImpurity(vals: number[]): number {
  const n = vals.length;
  if (n === 0) return 0;
  const counts = new Map<number, number>();
  for (const v of vals) counts.set(v, (counts.get(v) ?? 0) + 1);
  let g = 1;
  for (const c of counts.values()) g -= (c / n) ** 2;
  return g;
}

export function bestSplitGain(vals: number[], targets: number[], isClassif: boolean): number {
  const pairs = vals.map((v, i) => [v, targets[i]] as [number, number])
    .filter(p => isFinite(p[0]) && isFinite(p[1]))
    .sort((a, b) => a[0] - b[0]);
  if (pairs.length < 4) return 0;
  const n = pairs.length;
  const parentImp = isClassif ? giniImpurity(pairs.map(p => p[1])) : statVariance(pairs.map(p => p[1]));
  let best = 0;
  const step = Math.max(1, Math.floor(n / 20));
  for (let i = step; i < n - step; i += step) {
    const left = pairs.slice(0, i).map(p => p[1]);
    const right = pairs.slice(i).map(p => p[1]);
    const gain = parentImp
      - (left.length / n) * (isClassif ? giniImpurity(left) : statVariance(left))
      - (right.length / n) * (isClassif ? giniImpurity(right) : statVariance(right));
    if (gain > best) best = gain;
  }
  return best;
}

// ── Embedded methods ──────────────────────────────────────────────────────────

export function lassoImportance(candidates: ColInfo[], target: ColInfo, alpha: number): Record<string, number> {
  const maxN = 500;
  const validIdx: number[] = [];
  const n = Math.min(...candidates.map(c => c.nums.length), target.nums.length);
  for (let i = 0; i < n; i++) {
    if (candidates.every(c => isFinite(c.nums[i])) && isFinite(target.nums[i])) validIdx.push(i);
  }
  const sIdx = validIdx.length > maxN
    ? validIdx.filter((_, i) => i % Math.ceil(validIdx.length / maxN) === 0).slice(0, maxN)
    : validIdx;
  if (sIdx.length < 3) return {};

  const p = candidates.length;
  const X = sIdx.map(i => candidates.map(c => c.nums[i]));
  const y = sIdx.map(i => target.nums[i]);
  const nv = X.length;

  const xm = candidates.map((_, j) => X.reduce((s, r) => s + r[j], 0) / nv);
  const xs = candidates.map((_, j) => {
    const v = X.reduce((s, r) => s + (r[j] - xm[j]) ** 2, 0) / nv;
    return Math.sqrt(v) || 1;
  });
  const Xn = X.map(r => r.map((v, j) => (v - xm[j]) / xs[j]));
  const ym = y.reduce((a, b) => a + b, 0) / nv;
  const yn = y.map(v => v - ym);

  const w = Array(p).fill(0);
  for (let iter = 0; iter < 200; iter++) {
    let maxChange = 0;
    for (let j = 0; j < p; j++) {
      let rho = 0;
      for (let i = 0; i < nv; i++) {
        let pred = 0;
        for (let k = 0; k < p; k++) if (k !== j) pred += w[k] * Xn[i][k];
        rho += Xn[i][j] * (yn[i] - pred);
      }
      rho /= nv;
      const prev = w[j];
      w[j] = rho > alpha ? rho - alpha : rho < -alpha ? rho + alpha : 0;
      maxChange = Math.max(maxChange, Math.abs(w[j] - prev));
    }
    if (maxChange < 1e-6) break;
  }
  return Object.fromEntries(candidates.map((c, j) => [c.name, Math.abs(w[j])]));
}

export function ridgeImportance(candidates: ColInfo[], target: ColInfo, alpha: number): Record<string, number> {
  const maxN = 500;
  const validIdx: number[] = [];
  const n = Math.min(...candidates.map(c => c.nums.length), target.nums.length);
  for (let i = 0; i < n; i++) {
    if (candidates.every(c => isFinite(c.nums[i])) && isFinite(target.nums[i])) validIdx.push(i);
  }
  const sIdx = validIdx.length > maxN
    ? validIdx.filter((_, i) => i % Math.ceil(validIdx.length / maxN) === 0).slice(0, maxN)
    : validIdx;
  if (sIdx.length < 3) return {};

  const p = candidates.length;
  const X = sIdx.map(i => candidates.map(c => c.nums[i]));
  const y = sIdx.map(i => target.nums[i]);
  const nv = X.length;

  const xm = candidates.map((_, j) => X.reduce((s, r) => s + r[j], 0) / nv);
  const xs = candidates.map((_, j) => {
    const v = X.reduce((s, r) => s + (r[j] - xm[j]) ** 2, 0) / nv;
    return Math.sqrt(v) || 1;
  });
  const Xn = X.map(r => r.map((v, j) => (v - xm[j]) / xs[j]));
  const ym = y.reduce((a, b) => a + b, 0) / nv;
  const yn = y.map(v => v - ym);

  // gradient descent: w <- w - lr*(X^T(Xw-y)/n + alpha*w)
  const w = Array(p).fill(0);
  const lr = 1 / (1 + alpha * nv);
  for (let iter = 0; iter < 500; iter++) {
    const grad = Array(p).fill(0);
    for (let i = 0; i < nv; i++) {
      const pred = w.reduce((s, wj, j) => s + wj * Xn[i][j], 0);
      const err = pred - yn[i];
      for (let j = 0; j < p; j++) grad[j] += err * Xn[i][j];
    }
    let change = 0;
    for (let j = 0; j < p; j++) {
      const dw = lr * (grad[j] / nv + alpha * w[j]);
      w[j] -= dw;
      change += dw * dw;
    }
    if (change < 1e-10) break;
  }
  return Object.fromEntries(candidates.map((c, j) => [c.name, Math.abs(w[j])]));
}

export function randomForestImportance(candidates: ColInfo[], target: ColInfo, nTrees: number): Record<string, number> {
  const maxN = 1000;
  const validIdx: number[] = [];
  const n = Math.min(...candidates.map(c => c.nums.length), target.nums.length);
  for (let i = 0; i < n; i++) {
    if (candidates.every(c => isFinite(c.nums[i])) && isFinite(target.nums[i])) validIdx.push(i);
  }
  const sIdx = validIdx.length > maxN
    ? validIdx.filter((_, i) => i % Math.ceil(validIdx.length / maxN) === 0).slice(0, maxN)
    : validIdx;
  if (sIdx.length < 10) return {};

  const imp = Object.fromEntries(candidates.map(c => [c.name, 0]));
  const isClassif = target.nunique <= 15;
  const featSubSize = Math.max(1, Math.round(Math.sqrt(candidates.length)));

  for (let t = 0; t < nTrees; t++) {
    const boot = Array(sIdx.length).fill(0).map(() => sIdx[Math.floor(Math.random() * sIdx.length)]);
    const subset = [...candidates].sort(() => Math.random() - 0.5).slice(0, featSubSize);
    let bestGain = 0, bestFeat = "";
    for (const col of subset) {
      const vals = boot.map(i => col.nums[i]);
      const tgts = boot.map(i => target.nums[i]);
      const gain = bestSplitGain(vals, tgts, isClassif);
      if (gain > bestGain) { bestGain = gain; bestFeat = col.name; }
    }
    if (bestFeat && bestGain > 0) imp[bestFeat] += bestGain;
  }
  return imp;
}

export function forwardSelect(candidates: ColInfo[], target: ColInfo | null, k: number): Set<string> {
  const selected = new Set<string>();
  const remaining = new Set(candidates.map(c => c.name));
  while (selected.size < Math.min(k, candidates.length)) {
    let bestScore = -Infinity, bestName = "";
    for (const name of remaining) {
      const col = candidates.find(c => c.name === name)!;
      const mi = target ? miScore(col, target) : col.variance;
      const selCols = candidates.filter(c => selected.has(c.name));
      const avgCorr = selCols.length > 0
        ? selCols.reduce((s, sc) => s + Math.abs(pearson(col.nums, sc.nums)), 0) / selCols.length : 0;
      const score = mi * (1 - 0.2 * avgCorr);
      if (score > bestScore) { bestScore = score; bestName = name; }
    }
    if (!bestName) break;
    selected.add(bestName);
    remaining.delete(bestName);
  }
  return selected;
}

export function exhaustiveSelect(candidates: ColInfo[], target: ColInfo | null, k: number): Set<string> {
  const n = candidates.length;
  const kk = Math.min(k, n);
  if (n > 15) return forwardSelect(candidates, target, k);

  function subsetScore(idxs: number[]): number {
    const cs = idxs.map(i => candidates[i]);
    const miSum = cs.reduce((s, c) => s + (target ? miScore(c, target) : c.variance), 0);
    let corrSum = 0, pairs = 0;
    for (let i = 0; i < cs.length - 1; i++) {
      for (let j = i + 1; j < cs.length; j++) {
        corrSum += Math.abs(pearson(cs[i].nums, cs[j].nums)); pairs++;
      }
    }
    return cs.length > 0 ? miSum / cs.length - (pairs > 0 ? 0.3 * corrSum / pairs : 0) : 0;
  }

  let bestScore = -Infinity, bestSubset: string[] = [];
  function enumerate(start: number, chosen: number[]) {
    if (chosen.length === kk) {
      const score = subsetScore(chosen);
      if (score > bestScore) { bestScore = score; bestSubset = chosen.map(i => candidates[i].name); }
      return;
    }
    for (let i = start; i <= n - (kk - chosen.length); i++) enumerate(i + 1, [...chosen, i]);
  }
  enumerate(0, []);
  return new Set(bestSubset);
}