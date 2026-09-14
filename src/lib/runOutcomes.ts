/** Query success for the analytics dashboard, from the run event model.
 *
 * Since the 2026-09-06 logging rewrite (27bc14f, 441eeeb) a run is three
 * events joined by `meta.run_id`: `query_run` when the visitor presses the
 * button, then `run_success` or `run_error` when it ends. The stats route
 * kept reading `meta.success` off `query_run`, which nothing sets any more,
 * so every run after that date counted as a failure and every `run_error`
 * was left out of the error count.
 *
 * Outcomes are counted only when they belong to a press. That is what keeps
 * `keepalive` out: it is a background ping that emits run_success/run_error
 * with no `query_run`, and it outnumbers real runs many times over.
 *
 * Rows from before the rewrite carry no run_id; they keep their old meaning
 * (`meta.success === true` on the `query_run` itself).
 */

export type EventRow = {
  created_at: string; type: string; path: string | null;
  session_id: string | null; meta: Record<string, unknown> | null;
};

export type RunOutcome = "success" | "error" | "pending";

export function runOutcomes(events: EventRow[]) {
  const runId = (e: EventRow) => (typeof e.meta?.run_id === "string" ? e.meta.run_id : null);

  const succeeded = new Set<string>();
  const failed = new Set<string>();
  for (const e of events) {
    const id = runId(e);
    if (!id) continue;
    if (e.type === "run_success") succeeded.add(id);
    else if (e.type === "run_error") failed.add(id);
  }

  const presses = events.filter((e) => e.type === "query_run");
  const pressIds = new Set(presses.map(runId).filter((id): id is string => !!id));

  // A run that retried can have both; the success is what the visitor got.
  const outcome = (e: EventRow): RunOutcome => {
    const id = runId(e);
    if (!id) return e.meta?.success === true ? "success" : "pending";
    if (succeeded.has(id)) return "success";
    if (failed.has(id)) return "error";
    return "pending";
  };

  // Error events that belong to a visitor's run, for the error sparkline.
  // Legacy `error` events are kept. A retried run can emit several run_error
  // rows, so counts of failed RUNS come from `outcome`, not from this list.
  const errorEvents = events.filter(
    (e) => e.type === "error" || (e.type === "run_error" && pressIds.has(runId(e) ?? "")),
  );

  return { presses, outcome, errorEvents };
}
