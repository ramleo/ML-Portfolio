import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { analyticsWritesEnabled } from "@/lib/analyticsWrites";

/** Testwright R7 Dashboard-B — log one COMPLETED run to the durable history
 *  (see supabase/qa_runs.sql). Called fire-and-forget from the Run stage when a run
 *  finishes, so /qa/dashboard "All runs" can trend across devices. Content-light:
 *  name, outcome, per-test counts, flakiness, timing, run_url, clipped reason — no
 *  test code, no screenshot. Reads happen in GET /api/qa-run/stats. No HF/backend. */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const MAX_BODY_CHARS = 20_000; // a run record is tiny; bound abuse
const MAX_ERR = 4000;

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

const clip = (s: unknown, n: number) => (typeof s === "string" ? s.slice(0, n) : null);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : null);

/** Unguessable row id: 16 base62 chars from a CSPRNG. */
function makeId(): string {
  const A = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => A[x % 62]).join("");
}

/** Table not created yet (migration not run) — same detection as /api/qa-run/share. */
function isMissingSchema(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  const code = err.code ?? "", msg = err.message ?? "";
  return code === "PGRST205" || /schema cache/i.test(msg) || /could not find/i.test(msg) || /does not exist/i.test(msg);
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY_CHARS) {
      return NextResponse.json({ error: "Run record too large." }, { status: 413, headers: CORS });
    }
    const body = JSON.parse(raw);

    // Local runs must not write to prod (same gate as every other write route).
    if (!analyticsWritesEnabled()) {
      return NextResponse.json({ id: null, skipped: "local" }, { headers: CORS });
    }

    // Only persist a run that actually completed with a real outcome.
    const status = ["passed", "failed", "error"].includes(body.status) ? body.status : null;
    if (!status) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400, headers: CORS });
    }

    const id = makeId();
    const row = {
      id,
      name: clip(body.name, 200) ?? "",
      status,
      tests: num(body.tests),
      passed_tests: num(body.passed_tests),
      failed_tests: num(body.failed_tests),
      flaky: typeof body.flaky === "boolean" ? body.flaky : null,
      duration_ms: num(body.duration_ms),
      correlation_id: clip(body.correlation_id, 80),
      run_url: clip(body.run_url, 500),
      error_message: clip(body.error_message, MAX_ERR),
    };

    const { error } = await getClient().from("qa_runs").insert(row);
    if (error) {
      const needs = isMissingSchema(error);
      return NextResponse.json({ error: error.message, needs_setup: needs }, { status: needs ? 200 : 500, headers: CORS });
    }
    return NextResponse.json({ id }, { headers: CORS });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400, headers: CORS });
  }
}
