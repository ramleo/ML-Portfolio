import { describe, it, expect } from "vitest";
import { runOutcomes, type EventRow } from "./runOutcomes";

const ev = (type: string, meta: Record<string, unknown> | null = null): EventRow => ({
  created_at: "2026-01-01T00:00:00Z", type, path: "/tools/x", session_id: "s", meta,
});

describe("runOutcomes", () => {
  it("counts a press whose run succeeded as success", () => {
    const { presses, outcome } = runOutcomes([ev("query_run", { run_id: "r1" }), ev("run_success", { run_id: "r1" })]);
    expect(presses).toHaveLength(1);
    expect(outcome(presses[0])).toBe("success");
  });

  it("counts a press whose run errored as error, and lists the error event", () => {
    const err = ev("run_error", { run_id: "r2" });
    const { presses, outcome, errorEvents } = runOutcomes([ev("query_run", { run_id: "r2" }), err]);
    expect(outcome(presses[0])).toBe("error");
    expect(errorEvents).toContain(err);
  });

  it("excludes keepalive pings (run_success/run_error with no matching query_run)", () => {
    const kaErr = ev("run_error", { run_id: "ka1" });
    const { presses, errorEvents } = runOutcomes([ev("run_success", { run_id: "ka0" }), kaErr]);
    expect(presses).toHaveLength(0);          // no press → not a real run
    expect(errorEvents).not.toContain(kaErr); // keepalive error not counted
  });

  it("treats a retried run (error then success) as success", () => {
    const { presses, outcome } = runOutcomes([
      ev("query_run", { run_id: "r3" }), ev("run_error", { run_id: "r3" }), ev("run_success", { run_id: "r3" }),
    ]);
    expect(outcome(presses[0])).toBe("success");
  });

  it("keeps legacy rows' meaning: meta.success on the press itself", () => {
    const ok = ev("query_run", { success: true });
    const notYet = ev("query_run", { success: false });
    const { outcome } = runOutcomes([ok, notYet]);
    expect(outcome(ok)).toBe("success");
    expect(outcome(notYet)).toBe("pending");
  });

  it("keeps legacy `error` events in errorEvents", () => {
    const legacyErr = ev("error");
    expect(runOutcomes([legacyErr]).errorEvents).toContain(legacyErr);
  });
});
