// All preprocessing runs client-side — no API calls, no external dependencies.

export type ColumnInfo = {
  name: string; is_numeric: boolean; dtype: string;
  nunique: number; missing: number;
  skew?: number; mean?: number; std?: number; min?: number; max?: number;
};

export type AnalyzeResult = {
  columns: ColumnInfo[];
  suggested_target: string;
  rows: number;
  total_missing: number;
};

export type PrepOptions = {
  remove_duplicates: boolean;
  drop_columns: string[];
  target_column: string;
  mv_num: string;
  mv_cat: string;
  remove_outliers: boolean;
  fix_skewness: boolean;
  encode_method: string;
  standardize: boolean;
};

export type PrepResult = {
  csvText: string;
  preprocessed_filename: string;
  rows_before: number; rows_after: number;
  cols_before: number; cols_after: number;
  features_before: number; features_after: number;
  ohe_cols_added: number; total_missing: number;
  columns: ColumnInfo[];
};

// ── CSV parser ─────────────────────────────────────────────────────────────────

export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let cur = "", inQ = false;
  const row: string[] = [];
  const t = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (inQ) {
      if (ch === '"' && t[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') { inQ = false; }
      else { cur += ch; }
    } else {
      if (ch === '"') { inQ = true; }
      else if (ch === ',') { row.push(cur); cur = ""; }
      else if (ch === '\n') {
        row.push(cur); cur = "";
        if (row.some(c => c !== "")) rows.push([...row]);
        row.length = 0;
      } else { cur += ch; }
    }
  }
  row.push(cur);
  if (row.some(c => c !== "")) rows.push(row);
  return rows;
}

function serializeCSV(rows: string[][]): string {
  return rows.map(row =>
    row.map(cell =>
      (cell.includes(",") || cell.includes('"') || cell.includes("\n"))
        ? `"${cell.replace(/"/g, '""')}"` : cell
    ).join(",")
  ).join("\n");
}

// ── Missing value detection ────────────────────────────────────────────────────

function isMissing(v: string): boolean {
  const lv = v.trim().toLowerCase();
  return lv === "" || lv === "nan" || lv === "null" || lv === "na" || lv === "n/a" || lv === "none";
}

// ── Stats helpers ──────────────────────────────────────────────────────────────

function mean(vals: number[]): number {
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}

function stdDev(vals: number[], m: number): number {
  if (vals.length < 2) return 0;
  return Math.sqrt(vals.reduce((a, b) => a + (b - m) ** 2, 0) / vals.length);
}

function skewness(vals: number[], m: number, s: number): number {
  if (vals.length < 3 || s === 0) return 0;
  return vals.reduce((a, b) => a + ((b - m) / s) ** 3, 0) / vals.length;
}

function mode(vals: string[]): string {
  const freq: Record<string, number> = {};
  for (const v of vals) freq[v] = (freq[v] ?? 0) + 1;
  return Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
}

function median(vals: number[]): number {
  if (!vals.length) return 0;
  const s = [...vals].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// ── Column analysis ────────────────────────────────────────────────────────────

function analyzeColumn(name: string, rawVals: string[]): ColumnInfo {
  const missing = rawVals.filter(isMissing).length;
  const nonMissing = rawVals.filter(v => !isMissing(v));
  const nunique = new Set(nonMissing).size;
  const numParsed = nonMissing.map(v => parseFloat(v));
  const validNums = numParsed.filter(v => !isNaN(v));
  const isNumeric = nonMissing.length > 0 && validNums.length / nonMissing.length >= 0.95;

  if (isNumeric && validNums.length > 0) {
    const m = mean(validNums);
    const s = stdDev(validNums, m);
    return {
      name, is_numeric: true, dtype: "float64", nunique, missing,
      mean: m, std: s, min: Math.min(...validNums), max: Math.max(...validNums),
      skew: skewness(validNums, m, s),
    };
  }
  return { name, is_numeric: false, dtype: "object", nunique, missing };
}

export function analyzeCSV(rows: string[][]): AnalyzeResult {
  if (rows.length < 2) throw new Error("CSV must have at least 2 rows.");
  const headers = rows[0];
  const data = rows.slice(1);
  const columns = headers.map((name, ci) =>
    analyzeColumn(name, data.map(r => r[ci] ?? ""))
  );
  return {
    columns,
    suggested_target: headers[headers.length - 1],
    rows: data.length,
    total_missing: columns.reduce((s, c) => s + c.missing, 0),
  };
}

// ── Linear algebra (for MICE) ──────────────────────────────────────────────────

function matMulVec(A: number[][], b: number[]): number[] {
  return A.map(row => row.reduce((s, v, j) => s + v * b[j], 0));
}

function gaussianElim(A: number[][], b: number[]): number[] {
  const n = A.length;
  const aug = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
    }
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    if (Math.abs(aug[col][col]) < 1e-12) continue;
    for (let row = col + 1; row < n; row++) {
      const f = aug[row][col] / aug[col][col];
      for (let j = col; j <= n; j++) aug[row][j] -= f * aug[col][j];
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = aug[i][n];
    for (let j = i + 1; j < n; j++) x[i] -= aug[i][j] * x[j];
    x[i] /= aug[i][i] || 1;
  }
  return x;
}

function olsPredict(Xtr: number[][], ytr: number[], Xpr: number[][]): number[] {
  const p = Xtr[0].length + 1;
  const X = Xtr.map(r => [1, ...r]);
  const Xp = Xpr.map(r => [1, ...r]);
  const XtX = Array.from({ length: p }, (_, i) =>
    Array.from({ length: p }, (_, j) => X.reduce((s, row) => s + row[i] * row[j], 0))
  );
  const Xty = Array.from({ length: p }, (_, i) =>
    X.reduce((s, row, k) => s + row[i] * ytr[k], 0)
  );
  const beta = gaussianElim(XtX, Xty);
  return matMulVec(Xp, beta);
}

// ── KNN Imputation ─────────────────────────────────────────────────────────────

function knnImputeCol(matrix: (number | null)[][], colIdx: number, k = 5): void {
  const nRows = matrix.length;
  const nCols = matrix[0].length;
  const missingRows = Array.from({ length: nRows }, (_, i) => i).filter(i => matrix[i][colIdx] === null);
  const trainRows = Array.from({ length: nRows }, (_, i) => i).filter(i => matrix[i][colIdx] !== null);
  if (trainRows.length === 0) return;

  for (const mi of missingRows) {
    const dists = trainRows.map(ti => {
      let dist = 0, cnt = 0;
      for (let j = 0; j < nCols; j++) {
        if (j === colIdx) continue;
        const va = matrix[mi][j], vb = matrix[ti][j];
        if (va !== null && vb !== null) { dist += (va - vb) ** 2; cnt++; }
      }
      return { ti, dist: cnt > 0 ? dist / cnt : Infinity };
    });
    dists.sort((a, b) => a.dist - b.dist);
    const neighbors = dists.slice(0, k);
    const vals = neighbors.map(n => matrix[n.ti][colIdx] as number);
    matrix[mi][colIdx] = mean(vals);
  }
}

// ── MICE Imputation ────────────────────────────────────────────────────────────

function miceImpute(matrix: (number | null)[][], iters = 5): number[][] {
  const nRows = matrix.length;
  const nCols = matrix[0].length;
  const result: (number | null)[][] = matrix.map(r => [...r]);
  const missingMask = matrix.map(r => r.map(v => v === null));

  // Initial fill with column means
  const colMeans = Array.from({ length: nCols }, (_, j) => {
    const vals = matrix.map(r => r[j]).filter(v => v !== null) as number[];
    return vals.length ? mean(vals) : 0;
  });
  for (let i = 0; i < nRows; i++) {
    for (let j = 0; j < nCols; j++) {
      if (result[i][j] === null) result[i][j] = colMeans[j];
    }
  }

  for (let iter = 0; iter < iters; iter++) {
    for (let j = 0; j < nCols; j++) {
      const missingIdx = Array.from({ length: nRows }, (_, i) => i).filter(i => missingMask[i][j]);
      if (missingIdx.length === 0) continue;
      const trainIdx = Array.from({ length: nRows }, (_, i) => i).filter(i => !missingMask[i][j]);
      const otherCols = Array.from({ length: nCols }, (_, k) => k).filter(k => k !== j);
      if (trainIdx.length < 2 || otherCols.length === 0) continue;
      try {
        const Xtr = trainIdx.map(i => otherCols.map(k => result[i][k] as number));
        const ytr = trainIdx.map(i => result[i][j] as number);
        const Xpr = missingIdx.map(i => otherCols.map(k => result[i][k] as number));
        const preds = olsPredict(Xtr, ytr, Xpr);
        missingIdx.forEach((ri, k) => { result[ri][j] = preds[k]; });
      } catch { /* fallback: keep mean */ }
    }
  }
  return result as number[][];
}

// ── Main preprocess function ───────────────────────────────────────────────────

export function preprocessCSV(rawRows: string[][], opts: PrepOptions, filename: string): PrepResult {
  const headers = [...rawRows[0]];
  let data = rawRows.slice(1).map(r => [...r]);

  const cols_before = headers.length;
  const rows_before = data.length;
  let ohe_cols_added = 0;

  // Build column index
  const getIdx = (name: string) => headers.indexOf(name);

  // 1. Drop selected columns
  const dropIdxs = new Set(opts.drop_columns.map(getIdx).filter(i => i >= 0));
  const keepIdxs = headers.map((_, i) => i).filter(i => !dropIdxs.has(i));
  const filteredHeaders = keepIdxs.map(i => headers[i]);
  data = data.map(row => keepIdxs.map(i => row[i] ?? ""));
  const workHeaders = filteredHeaders;

  // Helper: column indices after drop
  const ci = (name: string) => workHeaders.indexOf(name);

  // 2. Remove duplicates
  if (opts.remove_duplicates) {
    const seen = new Set<string>();
    data = data.filter(row => {
      const key = row.join("\x00");
      if (seen.has(key)) return false;
      seen.add(key); return true;
    });
  }

  // 3. Identify numeric / categorical columns (excluding target)
  const colTypes = workHeaders.map((name, j) => {
    const vals = data.map(r => r[j] ?? "").filter(v => !isMissing(v));
    const numVals = vals.map(v => parseFloat(v)).filter(v => !isNaN(v));
    return numVals.length / Math.max(vals.length, 1) >= 0.95 ? "numeric" : "categorical";
  });

  const numIdxs = workHeaders.map((_, j) => j).filter(j => colTypes[j] === "numeric" && workHeaders[j] !== opts.target_column);
  const catIdxs = workHeaders.map((_, j) => j).filter(j => colTypes[j] === "categorical" && workHeaders[j] !== opts.target_column);
  const targetIdx = ci(opts.target_column);

  // 4. Missing value imputation — numeric
  if (opts.mv_num === "drop") {
    data = data.filter(row => numIdxs.every(j => !isMissing(row[j] ?? "")));
  } else if (opts.mv_num === "ffill") {
    for (const j of numIdxs) {
      let last = "";
      for (const row of data) { if (!isMissing(row[j])) last = row[j]; else if (last) row[j] = last; }
    }
  } else if (opts.mv_num === "bfill") {
    for (const j of numIdxs) {
      let last = "";
      for (let i = data.length - 1; i >= 0; i--) { if (!isMissing(data[i][j])) last = data[i][j]; else if (last) data[i][j] = last; }
    }
  } else if (opts.mv_num === "constant") {
    for (const j of numIdxs) data.forEach(row => { if (isMissing(row[j])) row[j] = "0"; });
  } else if (opts.mv_num === "knn" || opts.mv_num === "mice") {
    // Build numeric matrix
    const numMatrix: (number | null)[][] = data.map(row =>
      numIdxs.map(j => { const v = parseFloat(row[j]); return isNaN(v) ? null : v; })
    );

    if (opts.mv_num === "knn") {
      for (let k = 0; k < numIdxs.length; k++) knnImputeCol(numMatrix, k);
    } else {
      const filled = miceImpute(numMatrix);
      for (let r = 0; r < data.length; r++) {
        for (let k = 0; k < numIdxs.length; k++) {
          numMatrix[r][k] = filled[r][k];
        }
      }
    }
    // Write back
    for (let r = 0; r < data.length; r++) {
      for (let k = 0; k < numIdxs.length; k++) {
        const v = numMatrix[r][k];
        data[r][numIdxs[k]] = v !== null ? String(parseFloat(v.toFixed(6))) : "0";
      }
    }
  } else {
    // mean or median
    for (const j of numIdxs) {
      const vals = data.map(r => parseFloat(r[j])).filter(v => !isNaN(v));
      const fill = opts.mv_num === "median" ? median(vals) : mean(vals);
      data.forEach(row => { if (isMissing(row[j])) row[j] = String(parseFloat(fill.toFixed(6))); });
    }
  }

  // Write back KNN/MICE numeric values
  if (opts.mv_num === "knn" || opts.mv_num === "mice") {
    // already written above
  }

  // 5. Missing value imputation — categorical
  if (opts.mv_cat === "drop") {
    data = data.filter(row => catIdxs.every(j => !isMissing(row[j] ?? "")));
  } else if (opts.mv_cat === "ffill") {
    for (const j of catIdxs) {
      let last = "";
      for (const row of data) { if (!isMissing(row[j])) last = row[j]; else if (last) row[j] = last; }
    }
  } else if (opts.mv_cat === "bfill") {
    for (const j of catIdxs) {
      let last = "";
      for (let i = data.length - 1; i >= 0; i--) { if (!isMissing(data[i][j])) last = data[i][j]; else if (last) data[i][j] = last; }
    }
  } else if (opts.mv_cat === "constant") {
    for (const j of catIdxs) data.forEach(row => { if (isMissing(row[j])) row[j] = "Unknown"; });
  } else {
    // most_frequent
    for (const j of catIdxs) {
      const vals = data.map(r => r[j]).filter(v => !isMissing(v));
      const fill = mode(vals) || "Unknown";
      data.forEach(row => { if (isMissing(row[j])) row[j] = fill; });
    }
  }

  // 6. Remove outliers (IQR method on numeric feature columns)
  if (opts.remove_outliers) {
    for (const j of numIdxs) {
      const vals = data.map(r => parseFloat(r[j])).filter(v => !isNaN(v)).sort((a, b) => a - b);
      if (vals.length < 4) continue;
      const q1 = vals[Math.floor(vals.length * 0.25)];
      const q3 = vals[Math.floor(vals.length * 0.75)];
      const iqr = q3 - q1;
      const lo = q1 - 1.5 * iqr, hi = q3 + 1.5 * iqr;
      data = data.filter(row => {
        const v = parseFloat(row[j]);
        return isNaN(v) || (v >= lo && v <= hi);
      });
    }
  }

  // 7. Fix skewness — log1p for highly skewed positive numeric columns
  if (opts.fix_skewness) {
    for (const j of numIdxs) {
      const vals = data.map(r => parseFloat(r[j])).filter(v => !isNaN(v));
      const m = mean(vals), s = stdDev(vals, m);
      const sk = skewness(vals, m, s);
      if (sk > 1 && Math.min(...vals) >= 0) {
        data.forEach(row => {
          const v = parseFloat(row[j]);
          if (!isNaN(v)) row[j] = String(parseFloat(Math.log1p(Math.max(v, 0)).toFixed(6)));
        });
      }
    }
  }

  // 8. Encoding
  const finalHeaders = [...workHeaders];
  const catColsToEncode = catIdxs.filter(j => workHeaders[j] !== opts.target_column);

  if (opts.encode_method === "onehot") {
    // Collect unique values per column before modifying
    const uniquePerCol: [number, string[]][] = catColsToEncode.map(j => [
      j,
      [...new Set(data.map(r => r[j]).filter(v => !isMissing(v)))].sort(),
    ]);
    // Process in reverse index order so indices stay valid
    for (const [j, uniques] of [...uniquePerCol].reverse()) {
      const newCols = uniques.map(u => `${workHeaders[j]}_${u}`);
      ohe_cols_added += newCols.length;
      for (const row of data) {
        const val = row[j];
        const encoded = uniques.map(u => (val === u ? "1" : "0"));
        row.splice(j, 1, ...encoded);
      }
      finalHeaders.splice(j, 1, ...newCols);
    }
  } else if (opts.encode_method === "ordinal") {
    for (const j of catColsToEncode) {
      const uniques = [...new Set(data.map(r => r[j]).filter(v => !isMissing(v)))].sort();
      const map: Record<string, string> = Object.fromEntries(uniques.map((u, i) => [u, String(i)]));
      data.forEach(row => { row[j] = map[row[j]] ?? "0"; });
    }
  } else if (opts.encode_method === "frequency") {
    for (const j of catColsToEncode) {
      const freq: Record<string, number> = {};
      data.forEach(row => { freq[row[j]] = (freq[row[j]] ?? 0) + 1; });
      const n = data.length;
      data.forEach(row => { row[j] = String(parseFloat(((freq[row[j]] ?? 0) / n).toFixed(6))); });
    }
  } else if (opts.encode_method === "target" && targetIdx >= 0) {
    for (const j of catColsToEncode) {
      const targetMeans: Record<string, number[]> = {};
      data.forEach(row => {
        const cat = row[j], tgt = parseFloat(row[targetIdx]);
        if (!isNaN(tgt)) { targetMeans[cat] = targetMeans[cat] ?? []; targetMeans[cat].push(tgt); }
      });
      const catMean: Record<string, number> = {};
      for (const [cat, vals] of Object.entries(targetMeans)) catMean[cat] = mean(vals);
      const globalMean = mean(data.map(r => parseFloat(r[targetIdx])).filter(v => !isNaN(v)));
      data.forEach(row => { row[j] = String(parseFloat((catMean[row[j]] ?? globalMean).toFixed(6))); });
    }
  }

  // 9. Standardize numeric columns (z-score) — recompute indices after OHE
  if (opts.standardize) {
    const numFinalIdxs = finalHeaders.map((h, i) => i).filter(i => {
      if (finalHeaders[i] === opts.target_column) return false;
      const vals = data.map(r => parseFloat(r[i])).filter(v => !isNaN(v));
      return vals.length > 0 && vals.every(v => !isNaN(v));
    });
    for (const j of numFinalIdxs) {
      const vals = data.map(r => parseFloat(r[j])).filter(v => !isNaN(v));
      const m = mean(vals), s = stdDev(vals, m) || 1;
      data.forEach(row => {
        const v = parseFloat(row[j]);
        if (!isNaN(v)) row[j] = String(parseFloat(((v - m) / s).toFixed(6)));
      });
    }
  }

  // 10. Compute result stats
  const finalRows = [finalHeaders, ...data];
  const csvText = serializeCSV(finalRows);

  const resultCols = finalHeaders.map((name, j) =>
    analyzeColumn(name, data.map(r => r[j] ?? ""))
  );
  const totalMissingAfter = resultCols.reduce((s, c) => s + c.missing, 0);

  const features_before = workHeaders.filter(h => h !== opts.target_column).length;
  const features_after = finalHeaders.filter(h => h !== opts.target_column).length;

  return {
    csvText,
    preprocessed_filename: `preprocessed_${filename}`,
    rows_before,
    rows_after: data.length,
    cols_before,
    cols_after: finalHeaders.length,
    features_before,
    features_after,
    ohe_cols_added,
    total_missing: totalMissingAfter,
    columns: resultCols,
  };
}