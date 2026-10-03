// Per-visitor saved tests + run history for Testwright Run. The site has no
// login, so this lives in the browser (localStorage) — same pattern as the
// Text-to-SQL tool's saved queries. Every access is guarded: storage can be
// unavailable (private window, blocked) or throw.

import type { RunTest, RunSummary } from "./useRun";

export type SavedTest = { id: string; name: string; code: string; savedAt: number };
export type HistoryEntry = {
  id: string;
  name: string;
  status: "passed" | "failed" | "error";
  at: number;
  correlationId: string | null;
  code: string;
  // Per-test counts for the run (a merged suite is ONE run but many tests), so the
  // dashboard can report test cases, not just runs. Optional: older entries lack them.
  tests?: number;
  passedTests?: number;
  failedTests?: number;
  // Full per-test breakdown (title/status/duration/error) for the dashboard drill-down.
  // Recent runs only — older entries predate it; the dashboard falls back to counts.
  testDetail?: RunTest[];
};

const SAVED_KEY = "qa_saved_tests";
const HISTORY_KEY = "qa_run_history";
const MAX_SAVED = 50;
const MAX_HISTORY = 40;

function read<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function write<T>(key: string, val: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch { /* quota / unavailable — silently skip */ }
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** Best-effort human name from the test source — the first `test.describe(...)`
 * suite title, else the first `test(...)` title — so a run/save is named even
 * when the Test name field is left blank. Falls back to "Untitled test". */
export function deriveTestName(code: string): string {
  const m = code.match(/test\.describe\s*\(\s*(['"`])([^'"`]+?)\1/)
        || code.match(/\btest(?:\.(?:only|skip|fixme))?\s*\(\s*(['"`])([^'"`]+?)\1/);
  return (m?.[2]?.trim()) || "Untitled test";
}

export function getSavedTests(): SavedTest[] {
  return read<SavedTest>(SAVED_KEY).sort((a, b) => b.savedAt - a.savedAt);
}

export function saveTest(name: string, code: string): SavedTest {
  const entry: SavedTest = { id: uid(), name: name.trim() || deriveTestName(code), code, savedAt: Date.now() };
  const next = [entry, ...read<SavedTest>(SAVED_KEY).filter((t) => t.code !== code)].slice(0, MAX_SAVED);
  write(SAVED_KEY, next);
  return entry;
}

export function deleteSavedTest(id: string): void {
  write(SAVED_KEY, read<SavedTest>(SAVED_KEY).filter((t) => t.id !== id));
}

export function getHistory(): HistoryEntry[] {
  return read<HistoryEntry>(HISTORY_KEY).sort((a, b) => b.at - a.at);
}

export function addHistory(e: Omit<HistoryEntry, "id" | "at">): void {
  const entry: HistoryEntry = { ...e, id: uid(), at: Date.now() };
  write(HISTORY_KEY, [entry, ...read<HistoryEntry>(HISTORY_KEY)].slice(0, MAX_HISTORY));
}

export function clearHistory(): void {
  write(HISTORY_KEY, []);
}

/** Fire-and-forget: log one completed run to the durable, cross-device history
 *  (R7 Dashboard-B, Supabase qa_runs). Content-light — no code/screenshot. Never
 *  throws and never blocks the UI; the write route gates out local-dev traffic and
 *  returns needs_setup until the migration is run. */
export function logDurableRun(r: {
  name: string;
  status: HistoryEntry["status"];
  tests?: number;
  passed_tests?: number;
  failed_tests?: number;
  flaky?: boolean | null;
  duration_ms?: number | null;
  correlation_id?: string | null;
  run_url?: string | null;
  error_message?: string | null;
}): void {
  try {
    void fetch("/api/qa-run/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(r),
      keepalive: true,
    }).catch(() => { /* best-effort */ });
  } catch { /* fetch unavailable */ }
}

/** Record ONE completed run: into local history (with per-test detail for the
 *  dashboard drill-down) AND the durable cross-device log. One call so the Run stage
 *  stays lean and both sinks always get the same data. */
export function recordRun(r: {
  name: string; status: HistoryEntry["status"]; code: string;
  correlationId: string | null; summary: RunSummary | null; tests: RunTest[];
  flaky: boolean | null; durationMs: number | null;
  runUrl: string | null; errorMessage: string | null;
}): void {
  const s = r.summary;
  const total = s ? s.expected + s.unexpected + s.flaky + s.skipped : undefined;
  const passed = s ? s.expected : undefined;
  const failed = s ? s.unexpected : undefined;
  addHistory({
    name: r.name, status: r.status, correlationId: r.correlationId, code: r.code,
    tests: total, passedTests: passed, failedTests: failed,
    testDetail: r.tests && r.tests.length ? r.tests.slice(0, 40) : undefined,
  });
  logDurableRun({
    name: r.name, status: r.status, tests: total, passed_tests: passed, failed_tests: failed,
    flaky: r.flaky, duration_ms: r.durationMs, correlation_id: r.correlationId,
    run_url: r.runUrl, error_message: r.errorMessage,
  });
}
