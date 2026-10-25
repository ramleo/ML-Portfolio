import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/auth/owner";

/** TestOps — owner-only read over the test-case automation registry.
 *
 * Answers "which of the ~1,795 documented cases actually run, and what happened".
 * Reads testops_cases (current state) and testops_events (the extensible log:
 * run_verdict / finding / cost / decision / sync — new kinds need no migration).
 *
 * Returns `needsSetup: true` rather than a 500 when the tables do not exist yet,
 * so the page renders its own instructions instead of an error. */

export const dynamic = "force-dynamic";

function isMissingSchema(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  const code = err.code ?? "";
  const msg = err.message ?? "";
  return code === "PGRST205" || code === "42P01" || code === "42703"
    || /schema cache/i.test(msg) || /does not exist/i.test(msg);
}

export interface CaseRow {
  tc_id: string; source_file: string | null; category: string | null;
  test_name: string | null; steps: string | null; expected: string | null;
  hint: string | null; source_part: string | null;
  lane: string | null; ready: string | null; lane_origin: string | null;
  lane_locked: boolean | null;
  target_url: string | null; resolve_method: string | null; spec_path: string | null;
  last_verdict: string | null; last_run_at: string | null;
  run_count: number | null; fail_count: number | null;
}

export interface EventRow {
  id: number; ts: string | null; kind: string; tc_id: string | null;
  actor: string | null; payload: Record<string, unknown> | null;
}

type Bucket = Record<string, number>;

function tally(rows: CaseRow[], pick: (r: CaseRow) => string | null | undefined): Bucket {
  const out: Bucket = {};
  for (const r of rows) {
    const k = pick(r) || "—";
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

/** Daily run outcomes, oldest first — the trend line. A single snapshot hides
 *  regressions, so the dashboard always plots pass rate over time. */
function dailySeries(events: EventRow[]): { day: string; pass: number; fail: number }[] {
  const by = new Map<string, { pass: number; fail: number }>();
  for (const e of events) {
    if (e.kind !== "run_verdict" || !e.ts) continue;
    const day = e.ts.slice(0, 10);
    const v = String((e.payload as { verdict?: string } | null)?.verdict ?? "");
    const slot = by.get(day) ?? { pass: 0, fail: 0 };
    if (v === "PASS" || v === "HEALED") slot.pass += 1;
    else slot.fail += 1;
    by.set(day, slot);
  }
  return [...by.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, v]) => ({ day, ...v }));
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isOwnerEmail(user?.email)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const url = new URL(req.url);
  const lane = url.searchParams.get("lane");
  const verdict = url.searchParams.get("verdict");
  const q = (url.searchParams.get("q") || "").trim();

  // The whole registry: ~1,795 narrow rows is one cheap read, and having it all
  // client-side makes filtering instant with no round trip per keystroke.
  let query = admin.from("testops_cases")
    .select("tc_id,source_file,category,test_name,steps,expected,hint,source_part,"
      + "lane,ready,lane_origin,lane_locked,target_url,resolve_method,spec_path,"
      + "last_verdict,last_run_at,run_count,fail_count")
    .order("tc_id", { ascending: true })
    .limit(5000);
  if (lane) query = query.eq("lane", lane);
  if (verdict) query = query.eq("last_verdict", verdict);
  if (q) query = query.or(`tc_id.ilike.%${q}%,test_name.ilike.%${q}%`);

  const { data: cases, error } = await query;
  if (error) {
    if (isMissingSchema(error)) {
      return NextResponse.json({
        needsSetup: true,
        hint: "Run ML-Unified/supabase/testops.sql in the Supabase SQL editor, "
          + "then: .venv/bin/python scripts/testops_sync.py",
      });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: events } = await admin.from("testops_events")
    .select("id,ts,kind,tc_id,actor,payload")
    .order("ts", { ascending: false })
    .limit(400);

  // PostgREST's generic widens to GenericStringError[] on a long select string.
  const rows = (cases ?? []) as unknown as CaseRow[];
  const evs = (events ?? []) as unknown as EventRow[];

  const automated = rows.filter((r) => r.spec_path).length;
  const passing = rows.filter((r) => r.last_verdict === "PASS").length;
  const healed = rows.filter((r) => r.last_verdict === "HEALED").length;
  const everRun = rows.filter((r) => r.last_run_at).length;
  // Flakiness: cases that have both passed and failed at least once.
  const flaky = rows.filter((r) => (r.fail_count ?? 0) > 0 && r.last_verdict === "PASS").length;

  return NextResponse.json({
    needsSetup: false,
    generatedAt: new Date().toISOString(),
    totals: {
      documented: rows.length,
      automated,
      passing,
      healed,
      everRun,
      flaky,
      resolved: rows.filter((r) => r.target_url).length,
      // Coverage is the number that matters here: documented cases with a spec.
      coveragePct: rows.length ? Math.round((automated / rows.length) * 1000) / 10 : 0,
      passRate: everRun ? Math.round(((passing + healed) / everRun) * 1000) / 10 : null,
    },
    byLane: tally(rows, (r) => r.lane),
    byReady: tally(rows.filter((r) => r.lane === "BROWSER"), (r) => r.ready),
    byVerdict: tally(rows.filter((r) => r.last_verdict), (r) => r.last_verdict),
    byResolve: tally(rows, (r) => r.resolve_method),
    byFile: tally(rows, (r) => r.source_file),
    series: dailySeries(evs),
    events: evs,
    cases: rows,
  });
}
