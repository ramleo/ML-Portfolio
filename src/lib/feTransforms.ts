import { ColInfo, FeResult } from "@/lib/feAlgorithms";

// ── CSV serialiser ────────────────────────────────────────────────────────────

export function serializeCSV(rows: string[][]): string {
  return rows.map(row =>
    row.map(cell => (cell.includes(",") || cell.includes('"') || cell.includes("\n")) ? `"${cell.replace(/"/g, '""')}"` : cell).join(",")
  ).join("\n");
}

// ── Transform engine ──────────────────────────────────────────────────────────

export function applyTransforms(
  rawRows: string[][],
  cols: ColInfo[],
  colTransforms: Record<string, string[]>,
  dateCols: string[],
  dateParts: string[],
  interactions: [string, string][],
  polyCols: string[],
  freqCols: string[],
  ratios: [string, string][],
  sortCol: string,
  lagCols: string[],
  lagN: number,
  lagDiff: boolean,
  rollCols: string[],
  rollN: number,
  rollAgg: string,
  cyclicCols: Record<string, number>,
  rowAggCols: string[],
  rowAggFn: string,
  squareCols: string[],
  binConfigs: Record<string, number>,
  ratioDiffPairs: [string, string][],
  datetimeCols: string[],
): FeResult {
  const headers = [...rawRows[0]];
  const dataRows = rawRows.slice(1).map(r => [...r]);
  const nRows = dataRows.length;
  const newColumns: string[] = [];

  const colMap = Object.fromEntries(cols.map(c => [c.name, c]));
  const headerIdx = Object.fromEntries(headers.map((h, i) => [h, i]));

  const addCol = (name: string, values: (number | string | null)[]) => {
    newColumns.push(name);
    headers.push(name);
    for (let i = 0; i < nRows; i++) {
      const v = values[i];
      dataRows[i].push(v === null || v === undefined ? "" : String(v));
    }
  };

  const getNumVals = (colName: string): (number | null)[] =>
    colMap[colName]?.values ?? dataRows.map(r => { const v = parseFloat(r[headerIdx[colName]] ?? ""); return isNaN(v) ? null : v; });

  // 1. Per-column numeric transforms
  for (const [colName, tList] of Object.entries(colTransforms)) {
    if (!tList.length) continue;
    const col = colMap[colName];
    if (!col) continue;
    const vals = col.values;
    const valid = vals.filter(v => v !== null) as number[];
    const mean = valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : 0;
    const std = valid.length > 1 ? Math.sqrt(valid.reduce((a, b) => a + (b - mean) ** 2, 0) / valid.length) : 1;
    const minV = valid.length ? Math.min(...valid) : 0;
    const maxV = valid.length ? Math.max(...valid) : 1;

    if (tList.includes("log1p")) addCol(`${colName}_log1p`, vals.map(v => v === null ? null : Math.log1p(Math.max(v, 0))));
    if (tList.includes("sqrt")) addCol(`${colName}_sqrt`, vals.map(v => v === null ? null : Math.sqrt(Math.max(v, 0))));
    if (tList.includes("zscore")) addCol(`${colName}_zscore`, vals.map(v => v === null ? null : parseFloat(((v - mean) / (std || 1)).toFixed(4))));
    if (tList.includes("minmax")) {
      const range = maxV - minV || 1;
      addCol(`${colName}_minmax`, vals.map(v => v === null ? null : parseFloat(((v - minV) / range).toFixed(4))));
    }
    if (tList.includes("percentile")) {
      const sorted = [...valid].sort((a, b) => a - b);
      addCol(`${colName}_pct`, vals.map(v => { if (v === null) return null; const rank = sorted.filter(s => s <= v).length; return parseFloat((rank / sorted.length).toFixed(4)); }));
    }
    if (tList.includes("outlier_flag")) addCol(`${colName}_outlier`, vals.map(v => { if (v === null) return null; return Math.abs((v - mean) / (std || 1)) > 3 ? 1 : 0; }));
    if (tList.includes("missing_flag")) addCol(`${colName}_missing`, col.rawValues.map(v => (v === "" || v.toLowerCase() === "nan" || v.toLowerCase() === "null" || v.toLowerCase() === "na") ? 1 : 0));
    if (tList.includes("winsor")) {
      const sorted = [...valid].sort((a, b) => a - b);
      const p1 = sorted[Math.floor(sorted.length * 0.01)] ?? minV;
      const p99 = sorted[Math.min(Math.ceil(sorted.length * 0.99) - 1, sorted.length - 1)] ?? maxV;
      addCol(`${colName}_winsor`, vals.map(v => v === null ? null : parseFloat(Math.min(Math.max(v, p1), p99).toFixed(4))));
    }
    if (tList.includes("above_mean")) addCol(`${colName}_above_mean`, vals.map(v => v === null ? null : (v > mean ? 1 : 0)));
    if (tList.includes("bin_equal")) {
      const range = maxV - minV || 1;
      addCol(`${colName}_bin`, vals.map(v => { if (v === null) return null; return Math.min(Math.floor(((v - minV) / range) * 5), 4); }));
    }
    if (tList.includes("bin_quantile")) {
      const sorted = [...valid].sort((a, b) => a - b);
      addCol(`${colName}_qbin`, vals.map(v => { if (v === null) return null; const rank = sorted.filter(s => s <= v).length; return Math.min(Math.floor((rank / sorted.length) * 5), 4); }));
    }
  }

  // 2. Date extraction
  for (const colName of dateCols) {
    const col = colMap[colName];
    if (!col) continue;
    for (const part of dateParts) {
      const extracted = col.rawValues.map(v => {
        if (!v || v === "") return null;
        const d = new Date(v);
        if (isNaN(d.getTime())) return null;
        switch (part) {
          case "year": return d.getFullYear();
          case "month": return d.getMonth() + 1;
          case "day": return d.getDate();
          case "dayofweek": return d.getDay();
          case "hour": return d.getHours();
          case "quarter": return Math.floor(d.getMonth() / 3) + 1;
          default: return null;
        }
      });
      addCol(`${colName}_${part}`, extracted);
    }
  }

  // 3. Interaction terms (A x B)
  for (const [a, b] of interactions) {
    const valsA = getNumVals(a);
    const valsB = getNumVals(b);
    addCol(`${a}_x_${b}`, valsA.map((va, i) => { const vb = valsB[i]; return va === null || vb === null ? null : parseFloat((va * vb).toFixed(6)); }));
  }

  // 4. Polynomial cross-terms
  const validPoly = polyCols.filter(c => colMap[c]);
  if (validPoly.length >= 2) {
    for (let i = 0; i < validPoly.length; i++) {
      for (let j = i + 1; j < validPoly.length; j++) {
        const valsA = getNumVals(validPoly[i]);
        const valsB = getNumVals(validPoly[j]);
        const name = `${validPoly[i]}_x_${validPoly[j]}`;
        if (!newColumns.includes(name)) {
          addCol(name, valsA.map((va, k) => { const vb = valsB[k]; return va === null || vb === null ? null : parseFloat((va * vb).toFixed(6)); }));
        }
      }
    }
  }

  // 5. Ratio features (A / B)
  for (const [a, b] of ratios) {
    const valsA = getNumVals(a);
    const valsB = getNumVals(b);
    addCol(`${a}_div_${b}`, valsA.map((va, i) => { const vb = valsB[i]; if (va === null || vb === null || vb === 0) return null; return parseFloat((va / vb).toFixed(6)); }));
  }

  // 6. Frequency encoding
  for (const colName of freqCols) {
    const col = colMap[colName];
    if (!col) continue;
    const freq: Record<string, number> = {};
    for (const v of col.rawValues) { const lv = v.trim().toLowerCase(); if (lv && lv !== "nan" && lv !== "null" && lv !== "na") freq[v] = (freq[v] ?? 0) + 1; }
    const total = col.rawValues.length;
    addCol(`${colName}_freq`, col.rawValues.map(v => { const lv = v.trim().toLowerCase(); if (!lv || lv === "nan" || lv === "null" || lv === "na") return null; return parseFloat(((freq[v] ?? 0) / total).toFixed(4)); }));
  }

  // Pre-compute sort order for time-series features
  let sortedToOrig: number[] = [];
  let origToRank: number[] = [];
  if (sortCol && (lagCols.length > 0 || rollCols.length > 0)) {
    const sIdx = headerIdx[sortCol];
    const indices = Array.from({ length: nRows }, (_, i) => i);
    indices.sort((a, b) => { const ra = dataRows[a][sIdx] ?? ""; const rb = dataRows[b][sIdx] ?? ""; const na = parseFloat(ra), nb = parseFloat(rb); if (!isNaN(na) && !isNaN(nb)) return na - nb; return ra < rb ? -1 : ra > rb ? 1 : 0; });
    sortedToOrig = indices;
    origToRank = new Array(nRows);
    for (let r = 0; r < nRows; r++) origToRank[sortedToOrig[r]] = r;
  }

  // 7. Lag / diff features
  if (sortCol && lagCols.length > 0) {
    for (const colName of lagCols) {
      const col = colMap[colName];
      if (!col) continue;
      const sortedVals = sortedToOrig.map(origIdx => col.values[origIdx]);
      const lagVals: (number | null)[] = new Array(nRows).fill(null);
      const diffVals: (number | null)[] = new Array(nRows).fill(null);
      for (let origIdx = 0; origIdx < nRows; origIdx++) {
        const rank = origToRank[origIdx];
        const prevRank = rank - lagN;
        if (prevRank >= 0) {
          lagVals[origIdx] = sortedVals[prevRank];
          if (lagDiff) { const cur = sortedVals[rank]; const prev = sortedVals[prevRank]; if (cur !== null && prev !== null) diffVals[origIdx] = parseFloat(((cur as number) - (prev as number)).toFixed(4)); }
        }
      }
      addCol(`${colName}_lag${lagN}`, lagVals);
      if (lagDiff) addCol(`${colName}_diff${lagN}`, diffVals);
    }
  }

  // 8. Rolling window aggregates
  if (sortCol && rollCols.length > 0) {
    for (const colName of rollCols) {
      const col = colMap[colName];
      if (!col) continue;
      const sortedVals = sortedToOrig.map(origIdx => col.values[origIdx]);
      const rollVals: (number | null)[] = new Array(nRows).fill(null);
      for (let origIdx = 0; origIdx < nRows; origIdx++) {
        const rank = origToRank[origIdx];
        if (rank < rollN - 1) continue;
        const window = (sortedVals.slice(rank - rollN + 1, rank + 1).filter(v => v !== null)) as number[];
        if (window.length === 0) continue;
        let agg: number;
        switch (rollAgg) {
          case "std": { const m = window.reduce((a, b) => a + b, 0) / window.length; agg = Math.sqrt(window.reduce((a, b) => a + (b - m) ** 2, 0) / window.length); break; }
          case "min": agg = Math.min(...window); break;
          case "max": agg = Math.max(...window); break;
          default: agg = window.reduce((a, b) => a + b, 0) / window.length;
        }
        rollVals[origIdx] = parseFloat(agg.toFixed(4));
      }
      addCol(`${colName}_roll${rollN}_${rollAgg}`, rollVals);
    }
  }

  // 9. Cyclical encoding (sin/cos pairs)
  for (const [colName, period] of Object.entries(cyclicCols)) {
    if (!period || period <= 0) continue;
    const col = colMap[colName];
    if (!col) continue;
    const vals = col.values;
    addCol(`${colName}_sin`, vals.map(v => v === null ? null : parseFloat(Math.sin(2 * Math.PI * (v as number) / period).toFixed(6))));
    addCol(`${colName}_cos`, vals.map(v => v === null ? null : parseFloat(Math.cos(2 * Math.PI * (v as number) / period).toFixed(6))));
  }

  // 10. Row-wise aggregates
  const validRowCols = rowAggCols.filter(c => colMap[c]);
  if (validRowCols.length >= 2) {
    const rowVals: (number | null)[] = [];
    for (let ri = 0; ri < nRows; ri++) {
      const vals = validRowCols.map(c => colMap[c].values[ri]).filter(v => v !== null) as number[];
      if (vals.length === 0) { rowVals.push(null); continue; }
      let agg: number;
      switch (rowAggFn) {
        case "max": agg = Math.max(...vals); break;
        case "min": agg = Math.min(...vals); break;
        case "sum": agg = vals.reduce((a, b) => a + b, 0); break;
        case "std": { const m = vals.reduce((a, b) => a + b, 0) / vals.length; agg = Math.sqrt(vals.reduce((a, b) => a + (b - m) ** 2, 0) / vals.length); break; }
        default: agg = vals.reduce((a, b) => a + b, 0) / vals.length;
      }
      rowVals.push(parseFloat(agg.toFixed(4)));
    }
    addCol(`row_${rowAggFn}`, rowVals);
  }

  // 11. Datetime extraction (auto-detected string datetime cols)
  for (const colName of datetimeCols) {
    const col = colMap[colName];
    if (!col) continue;
    const PARTS = ["year", "month", "day", "dayofweek", "hour"];
    for (const part of PARTS) {
      const extracted = col.rawValues.map(v => {
        if (!v) return null;
        const d = new Date(v);
        if (isNaN(d.getTime())) return null;
        switch (part) {
          case "year": return d.getFullYear();
          case "month": return d.getMonth() + 1;
          case "day": return d.getDate();
          case "dayofweek": return d.getDay();
          case "hour": return d.getHours();
          default: return null;
        }
      });
      addCol(`${colName}_${part}`, extracted);
    }
  }

  // 12. Polynomial squares
  for (const colName of squareCols) {
    const col = colMap[colName];
    if (!col) continue;
    addCol(`${colName}_sq`, col.values.map(v => v === null ? null : parseFloat((v * v).toFixed(6))));
  }

  // 13. Custom binning
  for (const [colName, nBins] of Object.entries(binConfigs)) {
    const col = colMap[colName];
    if (!col) continue;
    const valid = col.values.filter(v => v !== null) as number[];
    if (!valid.length) continue;
    const minV = Math.min(...valid), maxV = Math.max(...valid);
    const range = maxV - minV || 1;
    addCol(`${colName}_bin${nBins}`, col.values.map(v => v === null ? null : Math.min(Math.floor(((v - minV) / range) * nBins), nBins - 1)));
  }

  // 14. Ratio + diff pairs
  for (const [a, b] of ratioDiffPairs) {
    const vA = getNumVals(a), vB = getNumVals(b);
    addCol(`${a}_div_${b}`, vA.map((va, i) => {
      const vb = vB[i];
      if (va === null || vb === null) return null;
      return parseFloat((va / ((vb as number) + 1e-8)).toFixed(6));
    }));
    addCol(`${a}_minus_${b}`, vA.map((va, i) => {
      const vb = vB[i];
      if (va === null || vb === null) return null;
      return parseFloat(((va as number) - (vb as number)).toFixed(6));
    }));
  }

  return {
    csv: [headers, ...dataRows],
    headers,
    colsBefore: rawRows[0].length,
    colsAfter: headers.length,
    rows: nRows,
    newColumns,
  };
}
