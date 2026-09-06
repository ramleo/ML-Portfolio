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
  /** Set for endpoints that stream their answer (SSE, chunked text).
   *
   * fetch() resolves at the response HEADERS — the moment the server says it
   * is about to start sending — not when the answer finishes arriving. So
   * without this, a 25-second chat answer logs latency_ms of ~800, and a
   * stream that dies halfway (visitor sees half a sentence) logs a clean
   * success. That is the same "HTTP 200 is not the same as it worked" trap
   * that hid the rate-limited reconciliation report on 2026-09-05.
   *
   * With it, the response body is wrapped and the outcome is recorded when
   * the stream actually ends. */
  streaming?: boolean;
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
      // 204/205/304 must not be given a body, and a null body has nothing to
      // wrap — both fall through to logging at the headers, as before.
      if (opts.streaming && res.body && ![204, 205, 304].includes(res.status)) {
        return new Response(watchStream(res.body, t0, base), {
          status: res.status, statusText: res.statusText, headers: res.headers,
        });
      }
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

/** Wraps a streaming body so the run is recorded when the stream ENDS.
 *
 * Three outcomes, kept distinct on purpose:
 *   - finished  → run_success with the real end-to-end duration.
 *   - broke     → run_error. The visitor got a truncated answer; that is a
 *                 failure however healthy the headers looked.
 *   - cancelled → run_success with completed:false. This is mostly the
 *                 visitor pressing Stop, which is normal behaviour, not an
 *                 outage — counting it as an error would inflate the error
 *                 rate with people changing their minds. The flag keeps it
 *                 filterable without pretending the answer was delivered.
 */
function watchStream(body: ReadableStream<Uint8Array>, t0: number,
                     base: Record<string, unknown>): ReadableStream<Uint8Array> {
  const reader = body.getReader();
  let settled = false;
  const once = (fn: () => void) => { if (!settled) { settled = true; fn(); } };

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done: finished, value } = await reader.read();
        if (finished) {
          const ms = Date.now() - t0;
          once(() => track(EV.RUN_SUCCESS, { duration_ms: ms,
            meta: { ...base, latency_ms: ms, streamed: true, completed: true } }));
          controller.close();
          return;
        }
        controller.enqueue(value);
      } catch (err) {
        const ms = Date.now() - t0;
        once(() => track(EV.RUN_ERROR, { duration_ms: ms,
          meta: { ...base, stage: STAGE.RUN, latency_ms: ms, streamed: true,
                  error_class: classifyThrown(err), http_status: 200,
                  reason: "stream_broke_after_headers" } }));
        controller.error(err);
      }
    },
    cancel(reason) {
      const ms = Date.now() - t0;
      once(() => track(EV.RUN_SUCCESS, { duration_ms: ms,
        meta: { ...base, latency_ms: ms, streamed: true, completed: false,
                reason: "cancelled" } }));
      return reader.cancel(reason);
    },
  });
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
