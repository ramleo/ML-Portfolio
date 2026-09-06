/** One instrumented wrapper around fetch, so run outcomes are recorded in a
 * single place instead of at 81 call sites.
 *
 * LOGGING_SPEC.md §5 makes this argument for the backend — "the single funnel
 * every provider call passes through. Not at the twelve individual Gemini
 * call sites, which is how half of them end up uninstrumented" — and it holds
 * identically here. Stages 5 and 7 of §3 come for free for every caller that
 * migrates to this; nothing needs to remember to log.
 *
 * Rule 2 of §6 is the hard constraint: NEVER BLOCK THE USER. Every caller
 * gets back exactly what plain fetch would have returned or thrown, including
 * a non-ok Response. Logging is fire-and-forget and its own failures are
 * swallowed by track().
 */
import { track } from "@/hooks/useAnalytics";
import { EV, ERR, STAGE, classifyStatus, classifyThrown, type Stage } from "@/lib/logEvents";

export type TrackedFetchOptions = {
  /** Which tool made the call — the field every query starts from. */
  tool: string;
  /** Joins this call to the user's click, and to the backend's own record of
   * the same work (LOGGING_SPEC.md §5). Pass the same id to a retry's
   * `run_retry` so an attempt sequence can be reconstructed. */
  runId?: string;
  /** Defaults to "run"; pass "upload" for ingest calls so a failure during
   * upload is distinguishable from one during the run itself. */
  stage?: Stage;
  /** Extra meta merged into the emitted events. Enumerated values and counts
   * only — §6 rule 1 forbids content in this table. */
  meta?: Record<string, unknown>;
};

/** A UUID minted per run, client-side (LOGGING_SPEC.md §3 stage 5). */
export function newRunId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `run-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function trackedFetch(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  opts: TrackedFetchOptions,
): Promise<Response> {
  const { tool, stage = STAGE.RUN, meta = {} } = opts;
  const runId = opts.runId ?? newRunId();
  const t0 = Date.now();
  const base = { tool, run_id: runId, ...meta };

  try {
    const res = await fetch(input, init);
    const latency = Date.now() - t0;
    if (res.ok) {
      track(EV.RUN_SUCCESS, { duration_ms: latency, meta: { ...base, latency_ms: latency } });
    } else {
      // A non-ok Response is NOT thrown — it is returned, exactly as fetch
      // would. Callers that check res.ok keep working unchanged; the failure
      // is recorded on the way past.
      track(EV.RUN_ERROR, {
        duration_ms: latency,
        meta: { ...base, stage, latency_ms: latency,
                error_class: classifyStatus(res.status), http_status: res.status },
      });
    }
    return res;
  } catch (err) {
    const latency = Date.now() - t0;
    track(EV.RUN_ERROR, {
      duration_ms: latency,
      meta: { ...base, stage, latency_ms: latency,
              error_class: classifyThrown(err), http_status: 0 },
    });
    throw err;
  }
}

/** Emit the press itself. Separate from trackedFetch because a run can begin
 * with work that happens before any request (parsing a CSV in the browser),
 * and the click is worth having even when the request never leaves. */
export function trackRunStart(tool: string, runId: string, meta: Record<string, unknown> = {}) {
  track(EV.QUERY_RUN, { meta: { tool, run_id: runId, ...meta } });
}

/** A user-visible failure that did not come from a fetch — a parse error, a
 * validation refusal, a render crash. §3 stage 7 wants these too; without
 * them the only failures on record are network ones. */
export function trackRunError(
  tool: string, runId: string, stage: Stage,
  errorClass: string = ERR.UNKNOWN, meta: Record<string, unknown> = {},
) {
  track(EV.RUN_ERROR, { meta: { tool, run_id: runId, stage, error_class: errorClass, ...meta } });
}
