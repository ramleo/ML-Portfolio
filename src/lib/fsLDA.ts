import type { ColInfo } from "./fsCore";

// ── Linear Discriminant Analysis ───────────────────────────────────────────────

export interface LDAResult {
  points: number[][];         // [nRows][nComponents] projected data
  variance: number[];         // [nComponents] discriminant eigenvalues (proportion)
  featureWeights: number[][]; // [nComponents][nFeatures] LD directions
  featureNames: string[];
  targetValues: string[];     // class label per row (for colouring scatter)
}

/** Solve A x = b via Gaussian elimination with partial pivoting. */
function gaussianSolve(A: number[][], b: number[]): number[] | null {
  const n = A.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    // Partial pivot
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > Math.abs(M[maxRow][col])) maxRow = row;
    }
    [M[col], M[maxRow]] = [M[maxRow], M[col]];
    if (Math.abs(M[col][col]) < 1e-14) return null;
    const pivot = M[col][col];
    for (let j = col; j <= n; j++) M[col][j] /= pivot;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = M[row][col];
      for (let j = col; j <= n; j++) M[row][j] -= factor * M[col][j];
    }
  }
  return M.map(row => row[n]);
}

/** Matrix-vector product. */
function matVec(A: number[][], v: number[]): number[] {
  return A.map(row => row.reduce((s, x, j) => s + x * v[j], 0));
}

export function computeLDA(cols: ColInfo[], targetCol: string, nComponents: number): LDAResult | null {
  if (!targetCol) return null;

  const target = cols.find(c => c.name === targetCol);
  if (!target) return null;
  // LDA requires categorical target — if numeric, return null
  if (target.type === "numeric") return null;

  const numCols = cols.filter(c => c.type === "numeric" && c.name !== targetCol);
  const p = numCols.length;
  if (p < 1) return null;

  const totalRows = Math.min(...numCols.map(c => c.nums.length), target.rawVals.length);
  // Build valid indices (all numeric features finite AND target not empty)
  const validIdx: number[] = [];
  for (let i = 0; i < totalRows; i++) {
    if (numCols.every(c => isFinite(c.nums[i])) && target.rawVals[i]) validIdx.push(i);
  }
  if (validIdx.length < 3) return null;

  // Unique classes
  const classLabels = [...new Set(validIdx.map(i => target.rawVals[i]))].sort();
  const nClasses = classLabels.length;
  if (nClasses < 2) return null;
  const nComp = Math.min(nComponents, nClasses - 1, p);

  // Class membership
  const classMembership = validIdx.map(i => classLabels.indexOf(target.rawVals[i]));

  // Class means and global mean
  const classCounts = Array(nClasses).fill(0);
  const classMeans: number[][] = Array.from({ length: nClasses }, () => Array(p).fill(0));
  for (let vi = 0; vi < validIdx.length; vi++) {
    const origI = validIdx[vi];
    const cls = classMembership[vi];
    classCounts[cls]++;
    for (let j = 0; j < p; j++) classMeans[cls][j] += numCols[j].nums[origI];
  }
  for (let c = 0; c < nClasses; c++) {
    if (classCounts[c] > 0) classMeans[c] = classMeans[c].map(v => v / classCounts[c]);
  }
  const globalMean = Array(p).fill(0);
  for (let c = 0; c < nClasses; c++) {
    for (let j = 0; j < p; j++) globalMean[j] += classCounts[c] * classMeans[c][j];
  }
  const nTotal = validIdx.length;
  for (let j = 0; j < p; j++) globalMean[j] /= nTotal;

  // Between-class scatter S_B (p x p)
  const SB: number[][] = Array.from({ length: p }, () => Array(p).fill(0));
  for (let c = 0; c < nClasses; c++) {
    const diff = classMeans[c].map((v, j) => v - globalMean[j]);
    for (let j = 0; j < p; j++) {
      for (let k = 0; k < p; k++) SB[j][k] += classCounts[c] * diff[j] * diff[k];
    }
  }

  // Within-class scatter S_W (p x p) + regularisation
  const SW: number[][] = Array.from({ length: p }, () => Array(p).fill(0));
  for (let vi = 0; vi < validIdx.length; vi++) {
    const origI = validIdx[vi];
    const cls = classMembership[vi];
    const diff = numCols.map((c, j) => c.nums[origI] - classMeans[cls][j]);
    for (let j = 0; j < p; j++) {
      for (let k = 0; k < p; k++) SW[j][k] += diff[j] * diff[k];
    }
  }
  // Regularisation: SW += 0.0001 * I
  for (let j = 0; j < p; j++) SW[j][j] += 0.0001;

  // Compute SW^{-1} * SB column by column via Gaussian elimination
  const SWinvSB: number[][] = Array.from({ length: p }, () => Array(p).fill(0));
  for (let k = 0; k < p; k++) {
    const col = gaussianSolve(SW.map(row => [...row]), SB.map(row => row[k]));
    if (!col) return null;
    for (let j = 0; j < p; j++) SWinvSB[j][k] = col[j];
  }

  // Power iteration to get top-nComp eigenvectors of SWinvSB
  const eigVecs: number[][] = [];
  const eigVals: number[] = [];
  const deflated: number[][] = [];
  for (let c = 0; c < nComp; c++) {
    let v = Array.from({ length: p }, () => Math.random() - 0.5);
    for (const prev of deflated) {
      const dot = v.reduce((s, x, i) => s + x * prev[i], 0);
      v = v.map((x, i) => x - dot * prev[i]);
    }
    let norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    if (norm < 1e-10) continue;
    v = v.map(x => x / norm);

    for (let iter = 0; iter < 200; iter++) {
      const Av = matVec(SWinvSB, v);
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

    const lam = v.reduce((s, x, j) => s + x * matVec(SWinvSB, v)[j], 0);
    eigVecs.push(v);
    eigVals.push(Math.max(0, lam));
    deflated.push(v);
  }

  if (eigVecs.length === 0) return null;

  const totalEig = eigVals.reduce((a, b) => a + b, 0) || 1;
  const variance = eigVals.map(e => e / totalEig);

  // Project all rows: points[i] = eigenvectors dotted with row i
  const allRows = numCols[0]?.rawVals.length ?? 0;
  const points: number[][] = Array.from({ length: allRows }, () => Array(eigVecs.length).fill(0));
  const targetValues: string[] = Array(allRows).fill("");
  for (let vi = 0; vi < validIdx.length; vi++) {
    const origI = validIdx[vi];
    targetValues[origI] = target.rawVals[origI];
    points[origI] = eigVecs.map(ev => numCols.reduce((s, c, j) => s + ev[j] * c.nums[origI], 0));
  }

  return {
    points,
    variance,
    featureWeights: eigVecs,
    featureNames: numCols.map(c => c.name),
    targetValues,
  };
}