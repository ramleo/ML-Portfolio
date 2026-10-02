import { useCallback, useRef, useState } from "react";
import { qaPost, qaGet } from "../lib/qaClient";

const TOOL_ID = "qa-run";
const POLL_MS = 4000;
const MAX_POLLS = 90; // ~6 min ceiling (dispatch + queue + run)
const MAX_POLLS_FLAKY = 200; // ~13 min — a repeat run (up to 10×) takes longer

export type RunPhase = "idle" | "queued" | "in_progress" | "completed" | "error" | "cancelled";

export type RunSummary = { expected: number; unexpected: number; flaky: number; skipped: number };

export type RunStep = { title: string; category?: string | null; duration?: number | null; ok: boolean };

export type RunState = {
  phase: RunPhase;
  passed: boolean | null;
  conclusion: string | null;
  summary: RunSummary | null;
  screenshot: string | null; // base64 png
  steps: RunStep[];
  hasVideo: boolean;
  hasTrace: boolean;
  correlationId: string | null;
  runUrl: string | null;
  error: string | null;
  // The failure reason (Playwright error of the first failing test), shown when
  // a run fails so the result explains itself.
  errorMessage: string | null;
  // Flakiness (populated only when the test ran more than once)
  runs: number | null;
  passedRuns: number | null;
  failedRuns: number | null;
  passRate: number | null;
  flaky: boolean | null;
  // Timing: totalMs = wall-clock from dispatch to completion (incl. CI overhead);
  // testMs = sum of the test's own step durations.
  totalMs: number | null;
  testMs: number | null;
};

type StatusResp = {
  status: string;
  passed?: boolean | null;
  conclusion?: string | null;
  summary?: RunSummary | null;
  screenshot_base64?: string | null;
  steps?: RunStep[];
  has_video?: boolean;
  has_trace?: boolean;
  correlation_id?: string | null;
  run_url?: string | null;
  detail?: string | null;
  error_message?: string | null;
  runs?: number | null;
  passed_runs?: number | null;
  failed_runs?: number | null;
  pass_rate?: number | null;
  flaky?: boolean | null;
};

const IDLE: RunState = {
  phase: "idle", passed: null, conclusion: null, summary: null,
  screenshot: null, steps: [], hasVideo: false, hasTrace: false,
  correlationId: null, runUrl: null, error: null, errorMessage: null,
  runs: null, passedRuns: null, failedRuns: null, passRate: null, flaky: null,
  totalMs: null, testMs: null,
};

export function useRun() {
  const [state, setState] = useState<RunState>(IDLE);
  const cancelled = useRef(false);
  const startedAt = useRef(0);
  const corrRef = useRef<string | null>(null);

  const reset = useCallback(() => {
    cancelled.current = true;
    setState(IDLE);
  }, []);

  // Restore a previously completed result (e.g. after navigating away and back).
  const hydrate = useCallback((s: RunState) => { setState(s); }, []);

  // Stop an in-flight run: cancel the GitHub job server-side (frees the runner,
  // not just the client poll) and stop polling.
  const stop = useCallback(async () => {
    cancelled.current = true;
    const cid = corrRef.current;
    setState((prev) => ({ ...prev, phase: "cancelled" }));
    if (cid) {
      try { await qaPost(`/qa/run/cancel/${cid}`, {}, { tool: TOOL_ID }); } catch { /* best-effort */ }
    }
  }, []);

  const run = useCallback(async (code: string, baseUrl: string, testName: string, runs = 1, authorized = false) => {
    const src = code.trim();
    if (!src) return;
    cancelled.current = false;
    startedAt.current = Date.now();
    corrRef.current = null;
    setState({ ...IDLE, phase: "queued" });
    const maxPolls = runs > 1 ? MAX_POLLS_FLAKY : MAX_POLLS;

    let correlationId: string;
    try {
      const acc = await qaPost<{ correlation_id: string }>(
        "/qa/run/execute",
        { code: src, base_url: baseUrl.trim(), test_name: testName.trim(), runs, authorized },
        { tool: TOOL_ID, meta: { chars: src.length, runs } },
      );
      correlationId = acc?.correlation_id;
      if (!correlationId) throw new Error("The run could not be started.");
      corrRef.current = correlationId;
    } catch (err) {
      setState({ ...IDLE, phase: "error", error: (err as Error).message || "Could not start the run." });
      return;
    }

    for (let i = 0; i < maxPolls; i++) {
      if (cancelled.current) return;
      await new Promise((r) => setTimeout(r, POLL_MS));
      if (cancelled.current) return;

      let s: StatusResp;
      try {
        s = await qaGet<StatusResp>(`/qa/run/status/${correlationId}`);
      } catch {
        continue; // transient — keep polling
      }

      if (s.status === "completed") {
        const steps = s.steps ?? [];
        const testMs = steps.reduce((a, st) => a + (st.duration || 0), 0);
        setState({
          phase: "completed",
          passed: s.passed ?? null,
          conclusion: s.conclusion ?? null,
          summary: s.summary ?? null,
          screenshot: s.screenshot_base64 ?? null,
          steps,
          hasVideo: !!s.has_video,
          hasTrace: !!s.has_trace,
          correlationId: s.correlation_id ?? correlationId,
          runUrl: s.run_url ?? null,
          error: null,
          errorMessage: s.error_message ?? null,
          runs: s.runs ?? null,
          passedRuns: s.passed_runs ?? null,
          failedRuns: s.failed_runs ?? null,
          passRate: s.pass_rate ?? null,
          flaky: s.flaky ?? null,
          totalMs: Date.now() - startedAt.current,
          testMs: testMs || null,
        });
        return;
      }
      if (s.status === "error") {
        setState({ ...IDLE, phase: "error", runUrl: s.run_url ?? null, error: s.detail || "The run failed to execute." });
        return;
      }
      // pending | queued | in_progress
      setState((prev) => ({
        ...prev,
        phase: s.status === "in_progress" ? "in_progress" : "queued",
        runUrl: s.run_url ?? prev.runUrl,
      }));
    }
    setState((prev) => ({ ...prev, phase: "error", error: "Stopped waiting after the time limit — the run may still be finishing on GitHub. Open it to check, or Stop it." }));
  }, []);

  return { state, run, reset, stop, hydrate };
}
