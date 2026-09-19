import { useCallback, useRef, useState } from "react";
import { qaPost, qaGet } from "../lib/qaClient";

const TOOL_ID = "qa-run";
const POLL_MS = 4000;
const MAX_POLLS = 90; // ~6 min ceiling (dispatch + queue + run)

export type RunPhase = "idle" | "queued" | "in_progress" | "completed" | "error";

export type RunSummary = { expected: number; unexpected: number; flaky: number; skipped: number };

export type RunState = {
  phase: RunPhase;
  passed: boolean | null;
  conclusion: string | null;
  summary: RunSummary | null;
  screenshot: string | null; // base64 png
  runUrl: string | null;
  error: string | null;
};

type StatusResp = {
  status: string;
  passed?: boolean | null;
  conclusion?: string | null;
  summary?: RunSummary | null;
  screenshot_base64?: string | null;
  run_url?: string | null;
  detail?: string | null;
};

const IDLE: RunState = {
  phase: "idle", passed: null, conclusion: null, summary: null,
  screenshot: null, runUrl: null, error: null,
};

export function useRun() {
  const [state, setState] = useState<RunState>(IDLE);
  const cancelled = useRef(false);

  const reset = useCallback(() => {
    cancelled.current = true;
    setState(IDLE);
  }, []);

  const run = useCallback(async (code: string, baseUrl: string, testName: string) => {
    const src = code.trim();
    if (!src) return;
    cancelled.current = false;
    setState({ ...IDLE, phase: "queued" });

    let correlationId: string;
    try {
      const acc = await qaPost<{ correlation_id: string }>(
        "/qa/run/execute",
        { code: src, base_url: baseUrl.trim(), test_name: testName.trim() },
        { tool: TOOL_ID, meta: { chars: src.length } },
      );
      correlationId = acc?.correlation_id;
      if (!correlationId) throw new Error("The run could not be started.");
    } catch (err) {
      setState({ ...IDLE, phase: "error", error: (err as Error).message || "Could not start the run." });
      return;
    }

    for (let i = 0; i < MAX_POLLS; i++) {
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
        setState({
          phase: "completed",
          passed: s.passed ?? null,
          conclusion: s.conclusion ?? null,
          summary: s.summary ?? null,
          screenshot: s.screenshot_base64 ?? null,
          runUrl: s.run_url ?? null,
          error: null,
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
    setState((prev) => ({ ...prev, phase: "error", error: "Timed out waiting for the run to finish." }));
  }, []);

  return { state, run, reset };
}
