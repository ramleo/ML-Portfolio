/** Shapes returned by /api/testops. Kept in one place so the dashboard, the
 *  table and the charts cannot drift apart. */

export interface CaseRow {
  tc_id: string;
  source_file: string | null;
  category: string | null;
  test_name: string | null;
  steps: string | null;
  expected: string | null;
  hint: string | null;
  source_part: string | null;
  lane: string | null;
  ready: string | null;
  lane_origin: string | null;
  lane_locked: boolean | null;
  target_url: string | null;
  resolve_method: string | null;
  spec_path: string | null;
  last_verdict: string | null;
  last_run_at: string | null;
  run_count: number | null;
  fail_count: number | null;
}

export interface EventRow {
  id: number;
  ts: string | null;
  kind: string;
  tc_id: string | null;
  actor: string | null;
  payload: Record<string, unknown> | null;
}

export interface Totals {
  documented: number;
  automated: number;
  passing: number;
  healed: number;
  everRun: number;
  flaky: number;
  resolved: number;
  coveragePct: number;
  passRate: number | null;
}

export interface TestOpsPayload {
  needsSetup: boolean;
  hint?: string;
  generatedAt?: string;
  totals?: Totals;
  byLane?: Record<string, number>;
  byReady?: Record<string, number>;
  byVerdict?: Record<string, number>;
  byResolve?: Record<string, number>;
  byFile?: Record<string, number>;
  series?: { day: string; pass: number; fail: number }[];
  events?: EventRow[];
  cases?: CaseRow[];
}
