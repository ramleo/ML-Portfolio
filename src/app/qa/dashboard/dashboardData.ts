// Pure aggregation for the Testwright local dashboard — turns the browser-local run
// history (run/storage.ts) into the numbers the charts render. No I/O here except the
// one loadDashboard() convenience; everything else is a pure function so it is testable.
import { getHistory, type HistoryEntry } from "../run/storage";

export type Status = HistoryEntry["status"];

export type SeqPoint = { status: Status; at: number; name: string };
export type FailRow = { name: string; fails: number; total: number };
export type FlakyRow = { name: string; passed: number; failed: number };

export type DashboardData = {
  total: number;
  passed: number;
  failed: number;
  errored: number;
  /** passed / (passed + failed), excluding infra errors; null when nothing ran. */
  passRate: number | null;
  distinctTests: number;
  /** Test CASES aggregated across runs (a merged suite = 1 run, many tests). Falls
   *  back to 1 per run for older entries that didn't record per-test counts. */
  totalTests: number;
  failedTests: number;
  /** Oldest → newest, for a left-to-right outcome strip. */
  sequence: SeqPoint[];
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

  // getHistory() is newest-first; the strip reads oldest → newest.
  const sequence: SeqPoint[] = [...history]
    .sort((a, b) => a.at - b.at)
    .map((h) => ({ status: h.status, at: h.at, name: h.name }));

  return {
    total, passed, failed, errored,
    passRate: decided > 0 ? passed / decided : null,
    distinctTests: byName.size,
    totalTests, failedTests,
    sequence, topFailing, flaky,
  };
}

export function loadDashboard(): DashboardData {
  return computeDashboard(getHistory());
}
