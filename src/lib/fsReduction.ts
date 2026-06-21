import type { ColInfo, PCAComponent, ScatterPoint, SelectionOpts } from "./fsCore";
import { serializeCSV } from "./fsCore";

export function computePCA(candidates: ColInfo[], allCols: ColInfo[], opts: SelectionOpts, nComp: number, kaiser = false)
  : { components: PCAComponent[]; csvText: string; points: ScatterPoint[] } | null {
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

  // If Kaiser: keep only components with eigenvalue > 1 (min 1)
  let activeCount = eigVecs.length;
  if (kaiser) {
    activeCount = Math.max(1, eigVals.filter(v => v > 1).length);
  }
  const activeEigVecs = eigVecs.slice(0, activeCount);
  const activeEigVals = eigVals.slice(0, activeCount);

  const totalVar = p; // standardized data: trace of cov = p
  let cumVar = 0;
  const components: PCAComponent[] = activeEigVecs.map((v, ci) => {
    const varExp = activeEigVals[ci] / totalVar;
    cumVar += varExp;
    const loadings = candidates.map((col, j) => ({ name: col.name, loading: v[j] }))
      .sort((a, b) => Math.abs(b.loading) - Math.abs(a.loading));
    return { index: ci + 1, varianceExplained: varExp, cumulativeVariance: Math.min(cumVar, 1), topLoadings: loadings.slice(0, 4) };
  });

  // Build projected coordinates for each valid row
  const allRows = allCols[0]?.rawVals.length ?? 0;
  const pcCols: ColInfo[] = activeEigVecs.map((v, ci) => {
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

  const target = opts.targetCol ? allCols.find(c => c.name === opts.targetCol) : null;
  const points: ScatterPoint[] = validIdx.map((origI, ri) => ({
    x: pcCols[0]?.nums[origI] ?? 0,
    y: pcCols[1]?.nums[origI] ?? 0,
    z: pcCols[2] ? pcCols[2].nums[origI] : undefined,
    label: target ? (target.rawVals[origI] ?? "?") : String(ri),
  }));

  return { components, csvText: serializeCSV(keptForCSV), points };
}

export function computeUMAP(candidates: ColInfo[], allCols: ColInfo[], opts: SelectionOpts, nComp: number, nNeighbors: number)
  : { nComponents: number; csvText: string; points: number[][] } | null {
  const p = candidates.length;
  if (p < 2) return null;
  const maxRows = 600;
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

  // Build row-major points array for visualization
  const points: number[][] = Array(allRows).fill(null).map(() => Array(nComp).fill(0));
  sIdx.forEach((origI, si) => { points[origI] = scaled.map(comp => comp[si]); });
  const sampleSet2 = new Set(sIdx);
  for (const origI of validIdx) {
    if (sampleSet2.has(origI)) continue;
    let minD = Infinity, nearSi = 0;
    for (let si = 0; si < sIdx.length; si++) {
      let d2 = 0;
      for (const col of candidates) d2 += (col.nums[origI] - col.nums[sIdx[si]]) ** 2;
      if (d2 < minD) { minD = d2; nearSi = si; }
    }
    points[origI] = scaled.map(comp => comp[nearSi]);
  }

  return { nComponents: nComp, csvText: serializeCSV(keptForCSV), points };
}