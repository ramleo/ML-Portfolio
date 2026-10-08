/** Correlation id (trace id) — O1 of the observability roadmap
 * (ML-Unified docs/OBSERVABILITY_PLAN.md).
 *
 * A trace id is minted per user action and sent on the wire (the `x-trace-id`
 * header, injected once in trackedFetch) so one click can be followed across the
 * browser, the Next API routes and the HF Spaces. The backend echoes it back and
 * stamps it on its error reports (errors.meta.trace_id), so a 500 on the Space
 * links to the action that caused it.
 *
 * It is an opaque random token, never user data (LOGGING_SPEC §6). The run id
 * trackedFetch already mints doubles as the trace id — same value, one less
 * concept — so a run's frontend analytics rows and the backend's record of the
 * same work share a key.
 */
export const TRACE_HEADER = "x-trace-id";

export function newTraceId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `t-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Read an incoming trace id in a Next API route, or mint one when the caller
 * sent none. The incoming value is untrusted, so it is bounded to an
 * opaque-token shape (charset + length) before use. */
export function traceIdFrom(req: { headers: { get(name: string): string | null } }): string {
  const raw = (req.headers.get(TRACE_HEADER) || "").replace(/[^A-Za-z0-9._-]/g, "").slice(0, 64);
  return raw || newTraceId();
}
