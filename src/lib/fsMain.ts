import type { ColInfo, SelectionOpts, SelectionResult, FeatureScore } from "./fsCore";
import { serializeCSV } from "./fsCore";
import { pearson, miScore, fRegression, fClassif, kendallTau, chiSquaredScore } from "./fsFilters";
import {
  lassoImportance, ridgeImportance, randomForestImportance,
  forwardSelect, exhaustiveSelect,
} from "./fsEmbedded";
import { computePCA, computeUMAP } from "./fsReduction";
import { computeFA } from "./fsFA";
import { computeLDA } from "./fsLDA";

export function runSelection(cols: ColInfo[], opts: SelectionOpts): SelectionResult {
  const targetInfo = opts.targetCol ? (cols.find(c => c.name === opts.targetCol) ?? null) : null;
  const candidates = cols.filter(c => c.type === "numeric" && c.name !== opts.targetCol);

  const EMPTY: SelectionResult = {
    features: [], keptCount: 0, droppedCount: 0, csvText: "",
    kBestActive: false, rfeActive: false, lassoActive: false, ridgeActive: false,
    treeActive: false, kendallActive: false, chiSqActive: false,
    forwardActive: false, exhaustiveActive: false,
    pcaResult: null, umapResult: null, faResult: undefined, ldaResult: undefined,
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
        // Treat NaN scores as 0 so NaN features are always candidates for removal
        const raw = mi * (1 - 0.35 * (isFinite(avgR) ? avgR : 0));
        const score = isFinite(raw) ? raw : 0;
        if (score < minScore) { minScore = score; minName = col.name; }
      }
      if (!minName) break; // only reachable if remaining is empty
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

  // PCA / UMAP / FA / LDA
  const pcaComponents = opts.pcaKaiser ? candidates.length : opts.pcaComponents;
  const pcaResult = opts.usePCA ? computePCA(candidates, cols, opts, pcaComponents, opts.pcaKaiser) : null;
  const umapResult = opts.useUMAP ? computeUMAP(candidates, cols, opts, opts.umapComponents, opts.umapNeighbors) : null;
  const faResult = opts.useFA ? (computeFA(candidates, opts.faFactors ?? 3, { targetCol: opts.targetCol, allCols: cols }) ?? undefined) : undefined;
  const ldaResult = opts.useLDA ? (computeLDA(cols, opts.targetCol ?? "", opts.ldaComponents ?? 2) ?? undefined) : undefined;

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
    faResult,
    ldaResult,
  };
}