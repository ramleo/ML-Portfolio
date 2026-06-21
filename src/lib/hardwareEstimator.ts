"use client";

// ── Hardware detection + per-algorithm complexity estimator ───────────────────

export interface HardwareInfo {
  cores: number;
  memGB: number | null; // null = not available (Firefox/Safari)
}

export interface AlgoEstimate {
  name: string;
  complexity: string;
  timeMin: number;   // seconds, optimistic
  timeMax: number;   // seconds, pessimistic
  memoryMB: number;
  note?: string;
  sampled?: string;  // e.g. "uses first 600 rows"
}

// ── Benchmark ─────────────────────────────────────────────────────────────────

let cachedOpsPerMs: number | null = null;

export async function runBenchmark(): Promise<number> {
  if (cachedOpsPerMs !== null) return cachedOpsPerMs;
  return new Promise(resolve => {
    setTimeout(() => {
      const OPS = 2_000_000;
      const t0 = performance.now();
      let s = 0;
      for (let i = 0; i < OPS; i++) s += Math.sqrt(i + 0.5) * 0.001;
      const ms = Math.max(performance.now() - t0, 1);
      void s; // prevent dead-code elimination
      cachedOpsPerMs = OPS / ms;
      resolve(cachedOpsPerMs);
    }, 0);
  });
}

export function getHardware(): HardwareInfo {
  const cores = navigator.hardwareConcurrency ?? 2;
  const memGB = (navigator as { deviceMemory?: number }).deviceMemory ?? null;
  return { cores, memGB };
}

// ── Time formatter ────────────────────────────────────────────────────────────

export function fmtTime(min: number, max: number): string {
  const fmt = (s: number) =>
    s < 1 ? `${Math.round(s * 1000)}ms`
    : s < 60 ? `${s < 10 ? s.toFixed(1) : Math.round(s)}s`
    : `${Math.round(s / 60)}min`;
  if (Math.abs(max - min) < 0.5 && min < 2) return `~${fmt(min)}`;
  return `${fmt(min)}–${fmt(max)}`;
}

export function fmtMem(mb: number): string {
  return mb < 1 ? `<1 MB` : mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${Math.round(mb)} MB`;
}

// ── Per-algorithm estimators ──────────────────────────────────────────────────
// opsPerMs: calibrated from benchmark (each algo has its own constant factor)

function secs(ops: number, opsPerMs: number, factor = 1): number {
  return (ops / opsPerMs) * factor / 1000;
}

export function estimateFS(
  n: number,
  p: number,
  opts: {
    usePCA?: boolean; pcaComponents?: number;
    useUMAP?: boolean; umapComponents?: number; umapNeighbors?: number;
    useFA?: boolean; faFactors?: number;
    useLDA?: boolean; ldaComponents?: number;
    useLasso?: boolean; useRidge?: boolean;
    useTree?: boolean; treeNTrees?: number;
    useRFE?: boolean; rfeTargetK?: number;
    useForward?: boolean; useExhaustive?: boolean; exhaustiveK?: number;
    useVariance?: boolean; useCorrelation?: boolean;
  },
  opsPerMs: number,
): AlgoEstimate[] {
  const results: AlgoEstimate[] = [];

  // Variance / Correlation — O(n·p)
  if (opts.useVariance || opts.useCorrelation) {
    const ops = n * p + (opts.useCorrelation ? p * p * n : 0);
    const t = secs(ops, opsPerMs, 2);
    results.push({ name: "Variance + Correlation", complexity: "O(n·p) / O(p²)", timeMin: t * 0.5, timeMax: t * 2, memoryMB: (n * p * 8) / 1e6, note: "Always fast" });
  }

  // Lasso / Ridge — O(n·p·iter)
  if (opts.useLasso || opts.useRidge) {
    const ops = n * p * 100;
    const t = secs(ops, opsPerMs, 3);
    results.push({ name: "Lasso / Ridge", complexity: "O(n·p·iter)", timeMin: t * 0.5, timeMax: t * 2.5, memoryMB: (n * p * 8) / 1e6 });
  }

  // Tree importance — O(n·p·log(n)·trees)
  if (opts.useTree) {
    const trees = opts.treeNTrees ?? 50;
    const ops = n * p * Math.log2(Math.max(n, 2)) * trees;
    const t = secs(ops, opsPerMs, 4);
    results.push({ name: "Tree Importance", complexity: "O(n·p·log n·trees)", timeMin: t * 0.5, timeMax: t * 3, memoryMB: (n * trees * 8) / 1e6, note: "Most expensive filter" });
  }

  // RFE — O(n·p²·rounds)
  if (opts.useRFE) {
    const rounds = p - (opts.rfeTargetK ?? Math.max(1, Math.floor(p / 2)));
    const ops = n * p * p * Math.max(rounds, 1);
    const t = secs(ops, opsPerMs, 4);
    results.push({ name: "RFE", complexity: "O(n·p²·rounds)", timeMin: t * 0.5, timeMax: t * 3, memoryMB: (n * p * 8) / 1e6 });
  }

  // Forward / Exhaustive
  if (opts.useForward) {
    const ops = n * p * p;
    const t = secs(ops, opsPerMs, 3);
    results.push({ name: "Forward Selection", complexity: "O(n·p²)", timeMin: t * 0.5, timeMax: t * 2.5, memoryMB: (n * p * 8) / 1e6 });
  }
  if (opts.useExhaustive) {
    const k = opts.exhaustiveK ?? 3;
    const comb = p <= 15 ? factorial(p) / (factorial(k) * factorial(p - k)) : n * p * p;
    const ops = n * Math.min(comb, 3003);
    const t = secs(ops, opsPerMs, 3);
    results.push({ name: "Exhaustive Search", complexity: p <= 15 ? `O(n·C(${p},${k}))` : "O(n·p²) fallback", timeMin: t * 0.5, timeMax: Math.max(t * 3, 5), memoryMB: (n * p * 8) / 1e6, note: p > 15 ? "Auto-falls back to Forward" : undefined });
  }

  // PCA — O(n·p·k·iter)
  if (opts.usePCA) {
    const k = opts.pcaComponents ?? 3;
    const ops = n * p * k * 100;
    const t = secs(ops, opsPerMs, 2);
    results.push({ name: "PCA", complexity: "O(n·p·k)", timeMin: Math.max(t * 0.3, 0.01), timeMax: t * 1.5, memoryMB: (n * p * 8) / 1e6, note: "Very fast" });
  }

  // UMAP — O(n_s²·p) for distance matrix where n_s = min(n, 600)
  if (opts.useUMAP) {
    const ns = Math.min(n, 600);
    const ops = ns * ns * p + ns * (opts.umapNeighbors ?? 15) * 50;
    const t = secs(ops, opsPerMs, 5);
    const memMB = (ns * ns * 8) / 1e6;
    results.push({
      name: "UMAP",
      complexity: "O(n²) distance graph",
      timeMin: t * 0.5, timeMax: t * 3,
      memoryMB: memMB,
      sampled: n > 600 ? `graph on ${ns} rows · ${(n - ns).toLocaleString()} via kNN` : `all ${n} rows`,
    });
  }

  // FA — O(n_s·p²) where n_s = min(n, 800)
  if (opts.useFA) {
    const ns = Math.min(n, 800);
    const ops = ns * p * p * 20;
    const t = secs(ops, opsPerMs, 3);
    results.push({
      name: "Factor Analysis",
      complexity: "O(n·p²) + O(p³)",
      timeMin: t * 0.4, timeMax: t * 2.5,
      memoryMB: (p * p * 8) / 1e6 + (ns * p * 8) / 1e6,
      sampled: n > 800 ? `factoring on ${ns} rows · ${(n - ns).toLocaleString()} via kNN` : `all ${n} rows`,
    });
  }

  // LDA (FS) — O(n·p²) scatter matrices
  if (opts.useLDA) {
    const ops = n * p * p;
    const t = secs(ops, opsPerMs, 2);
    results.push({ name: "LDA (Discriminant)", complexity: "O(n·p²) + O(p³)", timeMin: t * 0.3, timeMax: t * 2, memoryMB: (p * p * 8) / 1e6, note: "p² dominates, fast" });
  }

  return results;
}

export function estimateFELDA(
  n: number,
  vocabCap = 500,
  k = 5,
  iter = 50,
  opsPerMs: number,
): AlgoEstimate {
  const ns = Math.min(n, 2000);
  const ops = ns * vocabCap * k * iter;
  const t = secs(ops, opsPerMs, 6);
  return {
    name: "LDA Topic Model (Gibbs)",
    complexity: "O(D·V·K·iter)",
    timeMin: t * 0.5, timeMax: t * 3,
    memoryMB: (ns * k * 8 + vocabCap * k * 8) / 1e6,
    sampled: n > 2000 ? `first 2,000 of ${n.toLocaleString()} rows` : `all ${n} rows`,
  };
}

export function estimatePreprocessing(n: number, p: number, opsPerMs: number): AlgoEstimate {
  const ops = n * p * 10;
  const t = secs(ops, opsPerMs, 1.5);
  return { name: "Preprocessing", complexity: "O(n·p)", timeMin: Math.max(t * 0.3, 0.005), timeMax: t * 2, memoryMB: (n * p * 8) / 1e6 };
}

export function estimateAutoML(n: number, p: number, opsPerMs: number): AlgoEstimate {
  const iters = n < 500 ? 5 : n < 2000 ? 12 : n < 10000 ? 25 : 50;
  const ops = n * p * iters * 50;
  const t = secs(ops, opsPerMs, 5);
  return { name: "AutoML (RF+XGB+LGB+Cat)", complexity: "O(n·p·iter·trees)", timeMin: t * 0.4, timeMax: t * 3, memoryMB: (n * p * 8 * 4) / 1e6, note: `${iters} CV iterations for ${n.toLocaleString()} rows` };
}

function factorial(n: number): number {
  if (n <= 1) return 1;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}
