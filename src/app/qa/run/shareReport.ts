// Testwright R7 — client helpers for shareable run reports.
// create: POST the current run to the Next.js route (Vercel, service-role key) and get
// a permalink. reconstruct: turn a fetched share row back into a RunState so the
// read-only share page can reuse the existing <Result> component.
// These routes live on the SITE origin (not the QA/HF backend), so we use plain fetch.
import type { RunState, RunStep, RunSummary, RunTest } from "./useRun";

export function verdictStatus(s: RunState): "passed" | "failed" | "flaky" {
  if (s.flaky === true) return "flaky";
  return s.passed === true ? "passed" : "failed";
}

/** Shape stored in qa_shared_runs (and returned by GET). */
export type SharedRunRow = {
  id: string;
  created_at: string;
  name: string;
  status: "passed" | "failed" | "flaky" | "error";
  summary: RunSummary | null;
  error_message: string | null;
  steps: RunStep[] | null;
  tests?: RunTest[] | null;
  test_ms: number | null;
  total_ms: number | null;
  run_url: string | null;
  runs: number | null;
  passed_runs: number | null;
  pass_rate: number | null;
  flaky: boolean | null;
  code: string | null;
};

/** POST a finished run → { id } or an error. include_code opts the test source in. */
export async function createShare(
  state: RunState,
  name: string,
  includeCode: boolean,
  code: string,
): Promise<{ id?: string; error?: string; needsSetup?: boolean; skipped?: boolean }> {
  const payload = {
    name,
    status: verdictStatus(state),
    summary: state.summary,
    error_message: state.errorMessage,
    steps: state.steps,
    test_ms: state.testMs,
    total_ms: state.totalMs,
    run_url: state.runUrl,
    runs: state.runs,
    passed_runs: state.passedRuns,
    pass_rate: state.passRate,
    flaky: state.flaky,
    include_code: includeCode,
    code: includeCode ? code : null,
  };
  try {
    const res = await fetch("/api/qa-run/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { error: data?.error || "Could not create the share link." };
    if (data?.skipped) return { skipped: true };
    if (data?.needs_setup) return { needsSetup: true };
    return { id: data?.id };
  } catch {
    return { error: "Could not reach the share service." };
  }
}

/** Fetch a shared report by id. */
export async function fetchShare(id: string): Promise<{ row?: SharedRunRow; error?: string }> {
  try {
    const res = await fetch(`/api/qa-run/share/${id}`);
    const data = await res.json().catch(() => null);
    if (!res.ok) return { error: data?.error || "This report could not be loaded." };
    return { row: data?.report as SharedRunRow };
  } catch {
    return { error: "This report could not be loaded." };
  }
}

/** Rebuild a RunState from a stored row so <Result> can render it read-only.
 *  correlationId stays null so the video/trace/screenshot sections never render
 *  (those artifacts are short-lived and not stored — see the plan). */
export function rowToRunState(row: SharedRunRow): RunState {
  return {
    phase: "completed",
    passed: row.status === "passed",
    conclusion: null,
    summary: row.summary ?? null,
    screenshot: null,
    steps: Array.isArray(row.steps) ? row.steps : [],
    tests: Array.isArray(row.tests) ? row.tests : [],
    hasVideo: false,
    hasTrace: false,
    correlationId: null,
    runUrl: row.run_url ?? null,
    error: null,
    errorMessage: row.error_message ?? null,
    runs: row.runs ?? null,
    passedRuns: row.passed_runs ?? null,
    failedRuns: row.runs != null && row.passed_runs != null ? row.runs - row.passed_runs : null,
    passRate: row.pass_rate ?? null,
    flaky: row.flaky ?? (row.status === "flaky"),
    totalMs: row.total_ms ?? null,
    testMs: row.test_ms ?? null,
  };
}
