// Pure aggregation for the Testwright local dashboard — turns the browser-local run
// history (run/storage.ts) into the numbers the charts render. No I/O here except the
// one loadDashboard() convenience; everything else is a pure function so it is testable.
import { getHistory, type HistoryEntry } from "../run/storage";
import type { RunTest } from "../run/useRun";

export type Status = HistoryEntry["status"];

/** One RUN in the outcome strip — carries its per-test counts and (for recent runs)
 *  the full per-test breakdown, so clicking a bar can drill into what passed/failed. */
export type SeqPoint = {
  id: string; status: Status; at: number; name: string;
  passedTests: number; failedTests: number; detail?: RunTest[];
};
/** One individual TEST CASE across runs, for the per-test view of the strip. */
export type TestPoint = { passed: boolean; title: string; runName: string; at: number };
export type FailRow = { name: string; fails: number; total: number };
export type FlakyRow = { name: string; passed: number; failed: number };

export type DashboardData = {
  total: number;
  passed: number;
  failed: number;
  errored: number;
  /** RUN pass rate: passed / (passed + failed) runs, excluding infra errors; null when
   *  nothing ran. A run counts as failed if ANY test in it failed — use for the per-run
   *  trend/strip, NOT as the headline (it reads far lower than the test-case rate). */
  passRate: number | null;
  distinctTests: number;
  /** Test CASES aggregated across runs (a merged suite = 1 run, many tests). Falls
   *  back to 1 per run for older entries that didn't record per-test counts. */
  totalTests: number;
  passedTests: number;
  failedTests: number;
  /** HEADLINE pass rate, at the test-case level: passedTests / totalTests. Reflects
   *  "most individual tests pass" even when few whole runs are all-green; null when
   *  nothing ran. This is what the gauge shows. */
  testPassRate: number | null;
  /** Oldest → newest, for a left-to-right outcome strip (one entry per RUN). */
  sequence: SeqPoint[];
  /** Oldest → newest, one entry per individual TEST CASE (the per-test view). */
  testSequence: TestPoint[];
  /** Tests with ≥1 failure, most failures first (capped). */
  topFailing: FailRow[];
  /** Tests that both passed and failed in history — real flakiness. */
  flaky: FlakyRow[];
};

const TOP_FAILING = 8;

export function computeDashboard(history: HistoryEntry[]): DashboardData {
  const total = history.length;
  const passed = history.filter((h) => h.status === "passed").length;
  const failed = history.filter((h) => h.status === "failed").length;
  const errored = history.filter((h) => h.status === "error").length;
  const decided = passed + failed;

  const byName = new Map<string, { passed: number; failed: number; errored: number }>();
  for (const h of history) {
    const r = byName.get(h.name) ?? { passed: 0, failed: 0, errored: 0 };
    if (h.status === "passed") r.passed++;
    else if (h.status === "failed") r.failed++;
    else r.errored++;
    byName.set(h.name, r);
  }

  const topFailing: FailRow[] = [...byName.entries()]
    .map(([name, r]) => ({ name, fails: r.failed, total: r.passed + r.failed + r.errored }))
    .filter((r) => r.fails > 0)
    .sort((a, b) => b.fails - a.fails || b.total - a.total)
    .slice(0, TOP_FAILING);

  const flaky: FlakyRow[] = [...byName.entries()]
    .filter(([, r]) => r.passed > 0 && r.failed > 0)
    .map(([name, r]) => ({ name, passed: r.passed, failed: r.failed }))
    .sort((a, b) => b.failed - a.failed);

  // Test CASES across runs — use recorded per-test counts, else count the run as 1.
  const totalTests = history.reduce((n, h) => n + (h.tests ?? 1), 0);
  const failedTests = history.reduce((n, h) => n + (h.failedTests ?? (h.status === "failed" ? 1 : 0)), 0);
  const passedTests = Math.max(0, totalTests - failedTests);

  // getHistory() is newest-first; the strip reads oldest → newest.
  const sorted = [...history].sort((a, b) => a.at - b.at);
  const pOf = (h: HistoryEntry) => h.passedTests ?? (h.status === "passed" ? (h.tests ?? 1) : 0);
  const fOf = (h: HistoryEntry) => h.failedTests ?? (h.status === "failed" ? (h.tests ?? 1) : 0);

  const sequence: SeqPoint[] = sorted.map((h) => ({
    id: h.id, status: h.status, at: h.at, name: h.name,
    passedTests: pOf(h), failedTests: fOf(h), detail: h.testDetail,
  }));

  // Per-test view: use the real per-test breakdown when we have it, else synthesise
  // one entry per passed/failed count (older runs that predate testDetail).
  const testSequence: TestPoint[] = [];
  for (const h of sorted) {
    if (h.testDetail && h.testDetail.length) {
      for (const t of h.testDetail) {
        testSequence.push({ passed: t.status === "passed", title: t.title, runName: h.name, at: h.at });
      }
    } else {
      // No per-test detail (durable "All runs" rows and older local runs): we don't
      // know each test's real title, so NUMBER them within the run instead of repeating
      // the run name — which otherwise read as "Untitled test · Untitled test" on every
      // bar. The run name still shows as the bar's `runName` for context.
      const total = pOf(h) + fOf(h);
      let k = 0;
      const tLabel = () => (total > 1 ? `Test ${++k}` : (++k, "Test"));
      for (let i = 0; i < pOf(h); i++) testSequence.push({ passed: true, title: tLabel(), runName: h.name, at: h.at });
      for (let i = 0; i < fOf(h); i++) testSequence.push({ passed: false, title: tLabel(), runName: h.name, at: h.at });
    }
  }

  return {
    total, passed, failed, errored,
    passRate: decided > 0 ? passed / decided : null,
    distinctTests: byName.size,
    totalTests, passedTests, failedTests,
    testPassRate: totalTests > 0 ? passedTests / totalTests : null,
    sequence, testSequence, topFailing, flaky,
  };
}

export function loadDashboard(): DashboardData {
  return computeDashboard(getHistory());
}

/** Durable, cross-device dashboard (R7 Option B): fetch recent runs logged to Supabase
 *  and run them through the SAME aggregation as the local view. Returns { needs_setup }
 *  when the qa_runs migration hasn't been run yet, or null on a transient error. */
export async function loadDurableDashboard():
    Promise<DashboardData | { needs_setup: true } | null> {
  try {
    const res = await fetch("/api/qa-run/stats?limit=1000", { cache: "no-store" });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json) return null;
    if (json.needs_setup) return { needs_setup: true };
    const rows = Array.isArray(json.rows) ? (json.rows as HistoryEntry[]) : [];
    return computeDashboard(rows);
  } catch {
    return null;
  }
}
