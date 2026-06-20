// ── Types ─────────────────────────────────────────────────────────────────────

export interface ColInfo {
  name: string;
  type: "numeric" | "categorical";
  nums: number[];
  rawVals: string[];
  variance: number;
  mean: number;
  missing: number;
  nunique: number;
}

export type KBestMethod = "mi" | "f_regression" | "f_classif";

export interface SelectionOpts {
  targetCol: string;
  // Filter
  useVariance: boolean;
  varianceThreshold: number;
  useCorrelation: boolean;
  corrThreshold: number;
  // Score / top-K
  useTopK: boolean;
  topK: number;
  useSelectKBest: boolean;
  selectKBestK: number;
  kBestMethod: KBestMethod;
  useKendall: boolean;
  kendallTopK: number;
  useChiSq: boolean;
  chiSqTopK: number;
  // Embedded
  useRFE: boolean;
  rfeTargetK: number;
  useLasso: boolean;
  lassoAlpha: number;
  lassoTopK: number;
  useRidge: boolean;
  ridgeAlpha: number;
  ridgeTopK: number;
  useTree: boolean;
  treeTopK: number;
  treeNTrees: number;
  // Wrapper
  useForward: boolean;
  forwardK: number;
  useExhaustive: boolean;
  exhaustiveK: number;
  // Reduction
  usePCA: boolean;
  pcaComponents: number;
  useUMAP: boolean;
  umapComponents: number;
  umapNeighbors: number;
}

export interface FeatureScore {
  name: string;
  score: number;
  fScore: number;
  lassoScore: number;
  ridgeScore: number;
  treeScore: number;
  kendallScore: number;
  chiSqScore: number;
  rfeRound: number;
  variance: number;
  reasons: string[];
  kept: boolean;
}

export interface PCAComponent {
  index: number;
  varianceExplained: number;
  cumulativeVariance: number;
  topLoadings: { name: string; loading: number }[];
}

export interface SelectionResult {
  features: FeatureScore[];
  keptCount: number;
  droppedCount: number;
  csvText: string;
  kBestActive: boolean;
  rfeActive: boolean;
  lassoActive: boolean;
  ridgeActive: boolean;
  treeActive: boolean;
  kendallActive: boolean;
  chiSqActive: boolean;
  forwardActive: boolean;
  exhaustiveActive: boolean;
  pcaResult: { components: PCAComponent[]; csvText: string } | null;
  umapResult: { nComponents: number; csvText: string } | null;
}

// ── CSV ───────────────────────────────────────────────────────────────────────

export function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines: string[] = [];
  let cur = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') { inQ = !inQ; cur += ch; }
    else if (!inQ && (ch === "\n" || ch === "\r")) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      lines.push(cur); cur = "";
    } else cur += ch;
  }
  if (cur.trim()) lines.push(cur);

  function splitLine(line: string): string[] {
    const cells: string[] = [];
    let cell = "", inQq = false;
    for (let i = 0; i <= line.length; i++) {
      const ch = line[i];
      if (i === line.length || (!inQq && ch === ",")) {
        const t = cell.trim();
        cells.push(t.startsWith('"') && t.endsWith('"')
          ? t.slice(1, -1).replace(/""/g, '"') : t);
        cell = "";
      } else { cell += ch; if (ch === '"') inQq = !inQq; }
    }
    return cells;
  }

  const nonEmpty = lines.filter(l => l.trim());
  if (nonEmpty.length < 2) return { headers: [], rows: [] };
  return {
    headers: splitLine(nonEmpty[0]).map(h => h.trim()),
    rows: nonEmpty.slice(1).map(splitLine),
  };
}

export function analyzeColumns(headers: string[], rows: string[][]): ColInfo[] {
  return headers.map((name, ci) => {
    const rawVals = rows.map(r => (r[ci] ?? "").trim());
    const parsed = rawVals.map(v => parseFloat(v.replace(/,/g, "")));
    const finiteCount = parsed.filter(isFinite).length;
    const isNumeric = rawVals.length > 0 && finiteCount / rawVals.length > 0.7;

    let nums: number[];
    if (isNumeric) {
      nums = parsed.map(n => (isFinite(n) ? n : NaN));
    } else {
      const cats = [...new Set(rawVals.filter(Boolean))].sort();
      nums = rawVals.map(v => (v ? cats.indexOf(v) : NaN));
    }

    const finite = nums.filter(isFinite);
    const mean = finite.length ? finite.reduce((a, b) => a + b, 0) / finite.length : 0;
    const variance = finite.length > 1
      ? finite.reduce((s, v) => s + (v - mean) ** 2, 0) / finite.length : 0;
    const missing = rawVals.filter(v => {
      const lv = v.toLowerCase();
      return v === "" || lv === "null" || lv === "na" || lv === "nan" || lv === "none";
    }).length;

    return {
      name, type: isNumeric ? "numeric" : "categorical",
      nums, rawVals, variance, mean, missing,
      nunique: new Set(rawVals.filter(Boolean)).size,
    };
  });
}

export function serializeCSV(keptCols: ColInfo[]): string {
  const n = keptCols[0]?.rawVals.length ?? 0;
  const q = (v: string) =>
    v.includes(",") || v.includes('"') || v.includes("\n")
      ? `"${v.replace(/"/g, '""')}"` : v;
  const lines = [keptCols.map(c => q(c.name)).join(",")];
  for (let i = 0; i < n; i++) lines.push(keptCols.map(c => q(c.rawVals[i] ?? "")).join(","));
  return lines.join("\n");
}

// ── Statistics ────────────────────────────────────────────────────────────────

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

// ── New statistical functions ─────────────────────────────────────────────────

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

export function computePCA(candidates: ColInfo[], allCols: ColInfo[], opts: SelectionOpts, nComp: number)
  : { components: PCAComponent[]; csvText: string } | null {
  const p = candidates.length;
  if (p < 2) return null;
  const totalRows = Math.min(...candidates.map(c => c.nums.length));
  const validIdx: number[] = [];
  for (let i = 0; i < totalRows; i++) {
    if (candidates.every(c => isFinite(c.nums[i]))) validIdx.push(i);
  }
  if (validIdx.length < 3) return null;
  const nv = validIdx.length;

  const xm = candidates.map((_, j) => validIdx.reduce((s, i) => s + candidates[j].nums[i], 0) / nv);
  const xs = candidates.map((_, j) => {
    const v = validIdx.reduce((s, i) => s + (candidates[j].nums[i] - xm[j]) ** 2, 0) / nv;
    return Math.sqrt(v) || 1;
  });
  const X = validIdx.map(i => candidates.map((c, j) => (c.nums[i] - xm[j]) / xs[j]));

  // Covariance matrix (p x p)
  const cov: number[][] = Array(p).fill(0).map(() => Array(p).fill(0));
  for (let j = 0; j < p; j++) for (let k = 0; k < p; k++) {
    let s = 0;
    for (let i = 0; i < nv; i++) s += X[i][j] * X[i][k];
    cov[j][k] = s / (nv - 1);
  }

  const nk = Math.min(nComp, p);
  const eigVecs: number[][] = [];
  const eigVals: number[] = [];
  const deflated = cov.map(r => [...r]);

  for (let c = 0; c < nk; c++) {
    let v = Array(p).fill(0).map(() => Math.random() - 0.5);
    // Orthogonalize
    for (const prev of eigVecs) {
      const dot = v.reduce((s, x, i) => s + x * prev[i], 0);
      v = v.map((x, i) => x - dot * prev[i]);
    }
    let norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    if (norm < 1e-10) continue;
    v = v.map(x => x / norm);

    for (let iter = 0; iter < 100; iter++) {
      const Av = deflated.map(row => row.reduce((s, x, j) => s + x * v[j], 0));
      for (const prev of eigVecs) {
        const dot = Av.reduce((s, x, i) => s + x * prev[i], 0);
        for (let i = 0; i < p; i++) Av[i] -= dot * prev[i];
      }
      norm = Math.sqrt(Av.reduce((s, x) => s + x * x, 0));
      if (norm < 1e-10) break;
      const nv2 = Av.map(x => x / norm);
      const diff = nv2.reduce((s, x, i) => s + (x - v[i]) ** 2, 0);
      v = nv2;
      if (diff < 1e-12) break;
    }
    const lambda = v.reduce((s, x, j) => s + x * deflated.map(r => r[j]).reduce((a, b, i) => a + b * v[i], 0), 0);
    for (let j = 0; j < p; j++) for (let k = 0; k < p; k++) deflated[j][k] -= lambda * v[j] * v[k];
    eigVecs.push(v);
    eigVals.push(Math.max(0, lambda));
  }

  const totalVar = p; // standardized data: trace of cov = p
  let cumVar = 0;
  const components: PCAComponent[] = eigVecs.map((v, ci) => {
    const varExp = eigVals[ci] / totalVar;
    cumVar += varExp;
    const loadings = candidates.map((col, j) => ({ name: col.name, loading: v[j] }))
      .sort((a, b) => Math.abs(b.loading) - Math.abs(a.loading));
    return { index: ci + 1, varianceExplained: varExp, cumulativeVariance: Math.min(cumVar, 1), topLoadings: loadings.slice(0, 4) };
  });

  // Build projected coordinates for each valid row
  const allRows = allCols[0]?.rawVals.length ?? 0;
  const pcCols: ColInfo[] = eigVecs.map((v, ci) => {
    const rawVals = Array(allRows).fill("");
    const nums = Array(allRows).fill(NaN);
    for (let ri = 0; ri < validIdx.length; ri++) {
      const origI = validIdx[ri];
      const val = v.reduce((s, vj, j) => s + vj * X[ri][j], 0);
      nums[origI] = val;
      rawVals[origI] = val.toFixed(6);
    }
    return { name: `PC${ci + 1}`, type: "numeric" as const, nums, rawVals, variance: 0, mean: 0, missing: 0, nunique: 0 };
  });

  const keptForCSV = [
    ...pcCols,
    ...(opts.targetCol ? allCols.filter(c => c.name === opts.targetCol) : []),
    ...allCols.filter(c => c.type === "categorical" && c.name !== opts.targetCol),
  ];
  return { components, csvText: serializeCSV(keptForCSV) };
}

export function computeUMAP(candidates: ColInfo[], allCols: ColInfo[], opts: SelectionOpts, nComp: number, nNeighbors: number)
  : { nComponents: number; csvText: string } | null {
  const p = candidates.length;
  if (p < 2) return null;
  const maxRows = 400;
  const totalRows = Math.min(...candidates.map(c => c.nums.length));
  const validIdx: number[] = [];
  for (let i = 0; i < totalRows; i++) {
    if (candidates.every(c => isFinite(c.nums[i]))) validIdx.push(i);
  }
  if (validIdx.length < nComp + 3) return null;

  const sIdx = validIdx.length > maxRows
    ? validIdx.filter((_, i) => i % Math.ceil(validIdx.length / maxRows) === 0).slice(0, maxRows)
    : validIdx;
  const ns = sIdx.length;

  const xm = candidates.map((_, j) => sIdx.reduce((s, i) => s + candidates[j].nums[i], 0) / ns);
  const xstd = candidates.map((_, j) => {
    const v = sIdx.reduce((s, i) => s + (candidates[j].nums[i] - xm[j]) ** 2, 0) / ns;
    return Math.sqrt(v) || 1;
  });
  const X = sIdx.map(i => candidates.map((c, j) => (c.nums[i] - xm[j]) / xstd[j]));

  // Pairwise distances
  const D2: number[][] = Array(ns).fill(0).map(() => Array(ns).fill(0));
  for (let i = 0; i < ns; i++) for (let j = i + 1; j < ns; j++) {
    let d2 = 0;
    for (let k = 0; k < p; k++) d2 += (X[i][k] - X[j][k]) ** 2;
    D2[i][j] = D2[j][i] = d2;
  }

  // Gaussian affinity (k-NN based sigma)
  const k = Math.min(nNeighbors, ns - 1);
  const W: number[][] = Array(ns).fill(0).map(() => Array(ns).fill(0));
  for (let i = 0; i < ns; i++) {
    const sorted = D2[i].map((d, j) => ({ j, d })).filter(x => x.j !== i).sort((a, b) => a.d - b.d);
    const sigma2 = sorted[k - 1]?.d || 1;
    for (let ni = 0; ni < k; ni++) {
      const { j, d } = sorted[ni];
      const w = Math.exp(-d / sigma2);
      W[i][j] = Math.max(W[i][j], w);
      W[j][i] = Math.max(W[j][i], w);
    }
  }

  const deg = W.map(row => row.reduce((a, b) => a + b, 0));
  const invSqrtD = deg.map(d => d > 0 ? 1 / Math.sqrt(d) : 0);

  // Normalized Laplacian L_sym = I - D^{-1/2} W D^{-1/2}; find smallest eigenvectors
  // via power iteration on (2I - L_sym) = D^{-1/2} W D^{-1/2} + I
  const comps: number[][] = [];
  for (let c = 0; c < nComp + 1; c++) {
    let v = Array(ns).fill(0).map(() => Math.random() - 0.5);
    for (const prev of comps) {
      const dot = v.reduce((s, x, i) => s + x * prev[i], 0);
      v = v.map((x, i) => x - dot * prev[i]);
    }
    let norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    if (norm < 1e-10) continue;
    v = v.map(x => x / norm);

    for (let iter = 0; iter < 50; iter++) {
      // Av = (D^{-1/2} W D^{-1/2} + I) v
      const Wv = Array(ns).fill(0);
      for (let i = 0; i < ns; i++) for (let j = 0; j < ns; j++) Wv[i] += W[i][j] * invSqrtD[j] * v[j];
      const Av = Wv.map((x, i) => invSqrtD[i] * x + v[i]);
      for (const prev of comps) {
        const dot = Av.reduce((s, x, i) => s + x * prev[i], 0);
        for (let i = 0; i < ns; i++) Av[i] -= dot * prev[i];
      }
      norm = Math.sqrt(Av.reduce((s, x) => s + x * x, 0));
      if (norm < 1e-10) break;
      const nv2 = Av.map(x => x / norm);
      const diff = nv2.reduce((s, x, i) => s + (x - v[i]) ** 2, 0);
      v = nv2;
      if (diff < 1e-12) break;
    }
    comps.push(v);
  }

  // Skip first (constant) component
  const embedding = comps.slice(1, nComp + 1);
  if (embedding.length < nComp) return null;

  // Scale embedding to [-1, 1]
  const scaled = embedding.map(comp => {
    const mn = Math.min(...comp), mx = Math.max(...comp);
    const rng = mx - mn || 1;
    return comp.map(v => (v - mn) / rng * 2 - 1);
  });

  // Build CSV with UMAP columns for all rows
  const allRows = allCols[0]?.rawVals.length ?? 0;
  const umapCols: ColInfo[] = scaled.map((comp, ci) => {
    const rawVals = Array(allRows).fill("");
    const nums = Array(allRows).fill(NaN);
    sIdx.forEach((origI, si) => {
      nums[origI] = comp[si];
      rawVals[origI] = comp[si].toFixed(6);
    });
    // kNN out-of-sample extension for unsampled rows
    const sampleSet = new Set(sIdx);
    for (const origI of validIdx) {
      if (sampleSet.has(origI)) continue;
      let minD = Infinity, nearSi = 0;
      for (let si = 0; si < sIdx.length; si++) {
        let d2 = 0;
        for (const col of candidates) d2 += (col.nums[origI] - col.nums[sIdx[si]]) ** 2;
        if (d2 < minD) { minD = d2; nearSi = si; }
      }
      nums[origI] = comp[nearSi];
      rawVals[origI] = comp[nearSi].toFixed(6);
    }
    return { name: `UMAP${ci + 1}`, type: "numeric" as const, nums, rawVals, variance: 0, mean: 0, missing: 0, nunique: 0 };
  });

  const keptForCSV = [
    ...umapCols,
    ...(opts.targetCol ? allCols.filter(c => c.name === opts.targetCol) : []),
    ...allCols.filter(c => c.type === "categorical" && c.name !== opts.targetCol),
  ];
  return { nComponents: nComp, csvText: serializeCSV(keptForCSV) };
}

// ── Selection ─────────────────────────────────────────────────────────────────

export function runSelection(cols: ColInfo[], opts: SelectionOpts): SelectionResult {
  const targetInfo = opts.targetCol ? (cols.find(c => c.name === opts.targetCol) ?? null) : null;
  const candidates = cols.filter(c => c.type === "numeric" && c.name !== opts.targetCol);

  const EMPTY: SelectionResult = {
    features: [], keptCount: 0, droppedCount: 0, csvText: "",
    kBestActive: false, rfeActive: false, lassoActive: false, ridgeActive: false,
    treeActive: false, kendallActive: false, chiSqActive: false,
    forwardActive: false, exhaustiveActive: false,
    pcaResult: null, umapResult: null,
  };
  if (candidates.length === 0) return EMPTY;

  const rawMI = Object.fromEntries(candidates.map(c => [c.name, miScore(c, targetInfo)]));
  const maxMI = Math.max(...Object.values(rawMI), 1e-10);
  const miNorm = Object.fromEntries(Object.entries(rawMI).map(([k, v]) => [k, v / maxMI]));

  // Step 1 — Variance
  const varDropped = new Set<string>();
  if (opts.useVariance) for (const c of candidates) if (c.variance < opts.varianceThreshold) varDropped.add(c.name);

  // Step 2 — Correlation
  const corrDropped = new Set<string>();
  if (opts.useCorrelation) {
    const eligible = candidates.filter(c => !varDropped.has(c.name));
    for (let i = 0; i < eligible.length; i++) {
      if (corrDropped.has(eligible[i].name)) continue;
      for (let j = i + 1; j < eligible.length; j++) {
        if (corrDropped.has(eligible[j].name)) continue;
        if (Math.abs(pearson(eligible[i].nums, eligible[j].nums)) >= opts.corrThreshold) {
          const drop = (miNorm[eligible[i].name] ?? 0) <= (miNorm[eligible[j].name] ?? 0)
            ? eligible[i].name : eligible[j].name;
          corrDropped.add(drop);
          if (drop === eligible[i].name) break;
        }
      }
    }
  }

  const survived1 = (c: ColInfo) => !varDropped.has(c.name) && !corrDropped.has(c.name);

  // Step 3 — Top-K MI
  const topKDropped = new Set<string>();
  if (opts.useTopK) {
    const pool = candidates.filter(survived1).sort((a, b) => (miNorm[b.name] ?? 0) - (miNorm[a.name] ?? 0));
    pool.slice(Math.max(1, opts.topK)).forEach(c => topKDropped.add(c.name));
  }

  const survived2 = (c: ColInfo) => survived1(c) && !topKDropped.has(c.name);

  // Step 4 — SelectKBest
  const kBestDropped = new Set<string>();
  const kBestScores: Record<string, number> = {};
  if (opts.useSelectKBest) {
    const pool = candidates.filter(survived2);
    const raw = pool.map(c => {
      let score = 0;
      if (!targetInfo) score = c.variance;
      else if (opts.kBestMethod === "f_regression") score = fRegression(c, targetInfo);
      else if (opts.kBestMethod === "f_classif") score = fClassif(c, targetInfo);
      else score = miScore(c, targetInfo);
      return { name: c.name, score };
    });
    const maxF = Math.max(...raw.map(s => s.score), 1e-10);
    for (const { name, score } of raw) kBestScores[name] = score / maxF;
    raw.sort((a, b) => b.score - a.score);
    raw.slice(Math.max(1, opts.selectKBestK)).forEach(s => kBestDropped.add(s.name));
  }

  const survived3 = (c: ColInfo) => survived2(c) && !kBestDropped.has(c.name);

  // Step 5 — Kendall's tau
  const kendallDropped = new Set<string>();
  const kendallScoreMap: Record<string, number> = {};
  if (opts.useKendall && targetInfo) {
    const pool = candidates.filter(survived3);
    const raw = pool.map(c => ({ name: c.name, score: Math.abs(kendallTau(c.nums, targetInfo.nums)) }));
    const maxK = Math.max(...raw.map(s => s.score), 1e-10);
    for (const { name, score } of raw) kendallScoreMap[name] = score / maxK;
    raw.sort((a, b) => b.score - a.score);
    raw.slice(Math.max(1, opts.kendallTopK)).forEach(s => kendallDropped.add(s.name));
  }

  const survived4 = (c: ColInfo) => survived3(c) && !kendallDropped.has(c.name);

  // Step 6 — Chi-squared
  const chiSqDropped = new Set<string>();
  const chiSqScoreMap: Record<string, number> = {};
  if (opts.useChiSq && targetInfo) {
    const pool = candidates.filter(survived4);
    const raw = pool.map(c => ({ name: c.name, score: chiSquaredScore(c, targetInfo) }));
    const maxC = Math.max(...raw.map(s => s.score), 1e-10);
    for (const { name, score } of raw) chiSqScoreMap[name] = score / maxC;
    raw.sort((a, b) => b.score - a.score);
    raw.slice(Math.max(1, opts.chiSqTopK)).forEach(s => chiSqDropped.add(s.name));
  }

  const survived5 = (c: ColInfo) => survived4(c) && !chiSqDropped.has(c.name);

  // Step 7 — RFE
  const rfeDropped = new Set<string>();
  const rfeRoundMap: Record<string, number> = {};
  if (opts.useRFE) {
    const pool = candidates.filter(survived5);
    let remaining = [...pool];
    let round = 1;
    while (remaining.length > Math.max(1, opts.rfeTargetK)) {
      let minScore = Infinity, minName = "";
      for (const col of remaining) {
        const mi = miScore(col, targetInfo);
        const others = remaining.filter(o => o.name !== col.name);
        const avgR = others.length > 0 ? others.reduce((s, o) => s + Math.abs(pearson(col.nums, o.nums)), 0) / others.length : 0;
        const score = mi * (1 - 0.35 * avgR);
        if (score < minScore) { minScore = score; minName = col.name; }
      }
      if (!minName) break;
      rfeDropped.add(minName);
      rfeRoundMap[minName] = round++;
      remaining = remaining.filter(c => c.name !== minName);
    }
  }

  const survived6 = (c: ColInfo) => survived5(c) && !rfeDropped.has(c.name);

  // Step 8 — Lasso
  const lassoDropped = new Set<string>();
  const lassoScoreMap: Record<string, number> = {};
  if (opts.useLasso && targetInfo) {
    const pool = candidates.filter(survived6);
    const raw = lassoImportance(pool, targetInfo, opts.lassoAlpha);
    const maxL = Math.max(...Object.values(raw), 1e-10);
    for (const [name, score] of Object.entries(raw)) lassoScoreMap[name] = score / maxL;
    const sorted = Object.entries(raw).sort((a, b) => b[1] - a[1]);
    sorted.slice(Math.max(1, opts.lassoTopK)).forEach(([name]) => lassoDropped.add(name));
  }

  const survived7 = (c: ColInfo) => survived6(c) && !lassoDropped.has(c.name);

  // Step 9 — Ridge
  const ridgeDropped = new Set<string>();
  const ridgeScoreMap: Record<string, number> = {};
  if (opts.useRidge && targetInfo) {
    const pool = candidates.filter(survived7);
    const raw = ridgeImportance(pool, targetInfo, opts.ridgeAlpha);
    const maxR = Math.max(...Object.values(raw), 1e-10);
    for (const [name, score] of Object.entries(raw)) ridgeScoreMap[name] = score / maxR;
    const sorted = Object.entries(raw).sort((a, b) => b[1] - a[1]);
    sorted.slice(Math.max(1, opts.ridgeTopK)).forEach(([name]) => ridgeDropped.add(name));
  }

  const survived8 = (c: ColInfo) => survived7(c) && !ridgeDropped.has(c.name);

  // Step 10 — Tree importance
  const treeDropped = new Set<string>();
  const treeScoreMap: Record<string, number> = {};
  if (opts.useTree && targetInfo) {
    const pool = candidates.filter(survived8);
    const raw = randomForestImportance(pool, targetInfo, opts.treeNTrees);
    const maxT = Math.max(...Object.values(raw), 1e-10);
    for (const [name, score] of Object.entries(raw)) treeScoreMap[name] = score / maxT;
    const sorted = Object.entries(raw).sort((a, b) => b[1] - a[1]);
    sorted.slice(Math.max(1, opts.treeTopK)).forEach(([name]) => treeDropped.add(name));
  }

  const survived9 = (c: ColInfo) => survived8(c) && !treeDropped.has(c.name);

  // Step 11 — Forward selection
  const forwardDropped = new Set<string>();
  if (opts.useForward) {
    const pool = candidates.filter(survived9);
    const kept = forwardSelect(pool, targetInfo, opts.forwardK);
    pool.forEach(c => { if (!kept.has(c.name)) forwardDropped.add(c.name); });
  }

  const survived10 = (c: ColInfo) => survived9(c) && !forwardDropped.has(c.name);

  // Step 12 — Exhaustive search
  const exhaustiveDropped = new Set<string>();
  if (opts.useExhaustive) {
    const pool = candidates.filter(survived10);
    const kept = exhaustiveSelect(pool, targetInfo, opts.exhaustiveK);
    pool.forEach(c => { if (!kept.has(c.name)) exhaustiveDropped.add(c.name); });
  }

  // Build feature list
  const features: FeatureScore[] = candidates
    .sort((a, b) => (miNorm[b.name] ?? 0) - (miNorm[a.name] ?? 0))
    .map(c => {
      const reasons: string[] = [];
      if (varDropped.has(c.name)) reasons.push("low variance");
      if (corrDropped.has(c.name)) reasons.push("high corr");
      if (topKDropped.has(c.name)) reasons.push("outside top-K");
      if (kBestDropped.has(c.name)) reasons.push("below K best");
      if (kendallDropped.has(c.name)) reasons.push("low Kendall τ");
      if (chiSqDropped.has(c.name)) reasons.push("low χ²");
      if (rfeDropped.has(c.name)) reasons.push(`RFE r${rfeRoundMap[c.name] ?? "?"}`);
      if (lassoDropped.has(c.name)) reasons.push("Lasso=0");
      if (ridgeDropped.has(c.name)) reasons.push("low Ridge w");
      if (treeDropped.has(c.name)) reasons.push("low tree imp");
      if (forwardDropped.has(c.name)) reasons.push("fwd skip");
      if (exhaustiveDropped.has(c.name)) reasons.push("exh skip");
      return {
        name: c.name,
        score: miNorm[c.name] ?? 0,
        fScore: kBestScores[c.name] ?? 0,
        lassoScore: lassoScoreMap[c.name] ?? 0,
        ridgeScore: ridgeScoreMap[c.name] ?? 0,
        treeScore: treeScoreMap[c.name] ?? 0,
        kendallScore: kendallScoreMap[c.name] ?? 0,
        chiSqScore: chiSqScoreMap[c.name] ?? 0,
        rfeRound: rfeRoundMap[c.name] ?? 0,
        variance: c.variance,
        reasons,
        kept: reasons.length === 0,
      };
    });

  // PCA / UMAP
  const pcaResult = opts.usePCA ? computePCA(candidates, cols, opts, opts.pcaComponents) : null;
  const umapResult = opts.useUMAP ? computeUMAP(candidates, cols, opts, opts.umapComponents, opts.umapNeighbors) : null;

  const keptNames = new Set([
    ...features.filter(f => f.kept).map(f => f.name),
    ...(opts.targetCol ? [opts.targetCol] : []),
    ...cols.filter(c => c.type === "categorical" && c.name !== opts.targetCol).map(c => c.name),
  ]);

  return {
    features,
    keptCount: features.filter(f => f.kept).length,
    droppedCount: features.filter(f => !f.kept).length,
    csvText: serializeCSV(cols.filter(c => keptNames.has(c.name))),
    kBestActive: opts.useSelectKBest,
    rfeActive: opts.useRFE,
    lassoActive: opts.useLasso && !!targetInfo,
    ridgeActive: opts.useRidge && !!targetInfo,
    treeActive: opts.useTree && !!targetInfo,
    kendallActive: opts.useKendall && !!targetInfo,
    chiSqActive: opts.useChiSq && !!targetInfo,
    forwardActive: opts.useForward,
    exhaustiveActive: opts.useExhaustive,
    pcaResult,
    umapResult,
  };
}