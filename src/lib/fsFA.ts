import type { ColInfo, ScatterPoint } from "./fsCore";

// ── Factor Analysis via iterated principal axis factoring ─────────────────────

export interface FAResult {
  loadings: number[][];    // [nFeatures][nFactors]
  communalities: number[]; // [nFeatures] h² per feature
  variance: number[];      // [nFactors] proportion of variance explained per factor
  featureNames: string[];
  points: ScatterPoint[];  // factor scores per row, coloured by target
}

/** Power-iteration eigenvector of matrix M, deflating out already-found vectors. */
function topEigenvector(M: number[][], deflated: number[][], p: number): number[] {
  let v = Array.from({ length: p }, () => Math.random() - 0.5);
  // Orthogonalize against previously extracted vectors
  for (const prev of deflated) {
    const dot = v.reduce((s, x, i) => s + x * prev[i], 0);
    v = v.map((x, i) => x - dot * prev[i]);
  }
  let norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  if (norm < 1e-10) return v;
  v = v.map(x => x / norm);

  for (let iter = 0; iter < 200; iter++) {
    const Av = M.map(row => row.reduce((s, x, j) => s + x * v[j], 0));
    for (const prev of deflated) {
      const dot = Av.reduce((s, x, i) => s + x * prev[i], 0);
      for (let i = 0; i < p; i++) Av[i] -= dot * prev[i];
    }
    norm = Math.sqrt(Av.reduce((s, x) => s + x * x, 0));
    if (norm < 1e-10) break;
    const nv = Av.map(x => x / norm);
    const diff = nv.reduce((s, x, i) => s + (x - v[i]) ** 2, 0);
    v = nv;
    if (diff < 1e-12) break;
  }
  return v;
}

export function computeFA(
  cols: ColInfo[],
  nFactors: number,
  extra?: { targetCol?: string; allCols?: ColInfo[] },
): FAResult | null {
  // Only numeric columns with finite values
  const numCols = cols.filter(c => c.type === "numeric");
  const p = numCols.length;
  if (p < 2 || nFactors < 1) return null;

  const maxRows = 500;
  const totalRows = Math.min(...numCols.map(c => c.nums.length));
  const validIdx: number[] = [];
  for (let i = 0; i < totalRows; i++) {
    if (numCols.every(c => isFinite(c.nums[i]))) validIdx.push(i);
  }
  if (validIdx.length < 3) return null;

  // Sample down if needed
  const sIdx = validIdx.length > maxRows
    ? validIdx.filter((_, i) => i % Math.ceil(validIdx.length / maxRows) === 0).slice(0, maxRows)
    : validIdx;
  const ns = sIdx.length;

  // Standardise (z-score)
  const means = numCols.map((_, j) => sIdx.reduce((s, i) => s + numCols[j].nums[i], 0) / ns);
  const stds = numCols.map((_, j) => {
    const v = sIdx.reduce((s, i) => s + (numCols[j].nums[i] - means[j]) ** 2, 0) / ns;
    return Math.sqrt(v) || 1;
  });
  const Z = sIdx.map(i => numCols.map((c, j) => (c.nums[i] - means[j]) / stds[j]));

  // Pearson correlation matrix R (p x p)
  const R: number[][] = Array.from({ length: p }, () => Array(p).fill(0));
  for (let j = 0; j < p; j++) {
    for (let k = j; k < p; k++) {
      let s = 0;
      for (let i = 0; i < ns; i++) s += Z[i][j] * Z[i][k];
      R[j][k] = R[k][j] = s / (ns - 1);
    }
  }

  const nk = Math.min(nFactors, p);

  // Init communalities h² = 1 (use full diagonal first)
  let h2 = Array(p).fill(1.0);

  // Iterated principal axis factoring
  const loadings: number[][] = [];
  for (let iter = 0; iter < 25; iter++) {
    // Build reduced matrix R* with diagonal replaced by h²
    const Rstar: number[][] = R.map((row, j) => row.map((v, k) => j === k ? h2[j] : v));

    // Extract top-nk eigenvectors via power iteration + deflation
    const eigVecs: number[][] = [];
    const deflated: number[][] = [];
    for (let c = 0; c < nk; c++) {
      const v = topEigenvector(Rstar, deflated, p);
      // Eigenvalue = v^T R* v
      const lam = v.reduce((s, x, j) => s + x * Rstar[j].reduce((a, r, k) => a + r * v[k], 0), 0);
      const eigVal = Math.max(0, lam);
      eigVecs.push(v.map(x => x * Math.sqrt(eigVal)));
      deflated.push(v);
    }

    // Update communalities
    const newH2 = Array(p).fill(0);
    for (let j = 0; j < p; j++) {
      for (let c = 0; c < nk; c++) newH2[j] += eigVecs[c][j] ** 2;
      newH2[j] = Math.min(newH2[j], 1.0);
    }

    const maxChange = Math.max(...newH2.map((v, i) => Math.abs(v - h2[i])));
    h2 = newH2;

    if (iter === 24 || maxChange < 0.001) {
      // Store final loadings as [nFeatures][nFactors]
      loadings.length = 0;
      for (let j = 0; j < p; j++) {
        loadings.push(Array.from({ length: nk }, (_, c) => eigVecs[c][j]));
      }
      break;
    }
  }

  if (loadings.length === 0) return null;

  // Variance per factor = sum of squared loadings / nFeatures
  const variance = Array.from({ length: nk }, (_, c) => {
    let s = 0;
    for (let j = 0; j < p; j++) s += loadings[j][c] ** 2;
    return s / p;
  });

  // Factor scores: each row projected onto each factor
  const targetCol = extra?.allCols?.find(c => c.name === extra?.targetCol);
  const points: ScatterPoint[] = Z.map((row, ri) => ({
    x: row.reduce((s, z, j) => s + z * (loadings[j]?.[0] ?? 0), 0),
    y: row.reduce((s, z, j) => s + z * (loadings[j]?.[1] ?? 0), 0),
    z: nk >= 3 ? row.reduce((s, z, j) => s + z * (loadings[j]?.[2] ?? 0), 0) : undefined,
    label: targetCol ? (targetCol.rawVals[sIdx[ri]] ?? "?") : String(ri),
  }));

  return {
    loadings,
    communalities: h2,
    variance,
    featureNames: numCols.map(c => c.name),
    points,
  };
}