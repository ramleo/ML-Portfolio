import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

/** Testwright R7 Dashboard-B — read recent durable runs for the "All runs" dashboard
 *  (see supabase/qa_runs.sql). Returns content-light rows shaped like the local
 *  HistoryEntry, so the client reuses the SAME computeDashboard() aggregation + charts
 *  as the local view. Read via the service role (anon has no access under RLS). */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const DEFAULT_LIMIT = 1000;
const MAX_LIMIT = 2000;

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function isMissingSchema(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  const code = err.code ?? "", msg = err.message ?? "";
  return code === "PGRST205" || /schema cache/i.test(msg) || /could not find/i.test(msg) || /does not exist/i.test(msg);
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(req: NextRequest) {
  try {
    const n = Number(new URL(req.url).searchParams.get("limit"));
    const limit = Number.isFinite(n) && n > 0 ? Math.min(n, MAX_LIMIT) : DEFAULT_LIMIT;

    const { data, error } = await getClient()
      .from("qa_runs")
      .select("id,created_at,name,status,tests,passed_tests,failed_tests,flaky,duration_ms,run_url")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      if (isMissingSchema(error)) {
        return NextResponse.json({ rows: [], needs_setup: true }, { headers: CORS });
      }
      return NextResponse.json({ error: error.message }, { status: 500, headers: CORS });
    }

    // Shape each row like run/storage.ts HistoryEntry so the client can feed them
    // straight into computeDashboard (code is unused by the aggregation).
    const rows = (data ?? []).map((r) => ({
      id: r.id,
      name: r.name ?? "",
      status: r.status,
      at: new Date(r.created_at).getTime(),
      correlationId: null,
      code: "",
      tests: r.tests ?? undefined,
      passedTests: r.passed_tests ?? undefined,
      failedTests: r.failed_tests ?? undefined,
    }));
    return NextResponse.json({ rows }, { headers: CORS });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500, headers: CORS });
  }
}
