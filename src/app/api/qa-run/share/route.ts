import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { analyticsWritesEnabled } from "@/lib/analyticsWrites";

/** Testwright R7 — create a shareable run report (see supabase/qa_shared_runs.sql).
 *  POST a finished run's result → writes one row (service role) → returns { id }.
 *  Reads happen in GET /api/qa-run/share/[id]. No HF/backend involved: all the data
 *  is already in the browser's run state. Content-light; code stored only if opted in. */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const TTL_DAYS = 90;
const MAX_BODY_CHARS = 200_000; // size bound (abuse guard)
const MAX_STEPS = 60;
const MAX_ERR = 4000;
const MAX_CODE = 40_000;

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

const clip = (s: unknown, n: number) => (typeof s === "string" ? s.slice(0, n) : null);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : null);

/** Unguessable share token: 16 base62 chars from a CSPRNG. */
function makeId(): string {
  const A = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => A[x % 62]).join("");
}

/** Table not created yet (migration not run) — same detection as /api/error. */
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
      return NextResponse.json({ error: "Report too large to share." }, { status: 413, headers: CORS });
    }
    const body = JSON.parse(raw);

    // Local runs must not write to prod (same gate as every other write route).
    if (!analyticsWritesEnabled()) {
      return NextResponse.json({ id: null, skipped: "local" }, { headers: CORS });
    }

    const steps = Array.isArray(body.steps)
      ? body.steps.slice(0, MAX_STEPS).map((s: Record<string, unknown>) => ({
          title: clip(s.title, 300) ?? "",
          category: clip(s.category, 60),
          duration: num(s.duration),
          ok: s.ok === true,
        }))
      : [];
    const status = ["passed", "failed", "flaky", "error"].includes(body.status) ? body.status : "failed";

    const id = makeId();
    const expires_at = new Date(Date.now() + TTL_DAYS * 86_400_000).toISOString();
    const row = {
      id,
      expires_at,
      name: clip(body.name, 200) ?? "",
      status,
      summary: body.summary && typeof body.summary === "object" ? body.summary : null,
      error_message: clip(body.error_message, MAX_ERR),
      steps,
      test_ms: num(body.test_ms),
      total_ms: num(body.total_ms),
      run_url: clip(body.run_url, 500),
      runs: num(body.runs),
      passed_runs: num(body.passed_runs),
      pass_rate: typeof body.pass_rate === "number" ? body.pass_rate : null,
      flaky: typeof body.flaky === "boolean" ? body.flaky : null,
      code: body.include_code === true ? clip(body.code, MAX_CODE) : null,
    };

    const { error } = await getClient().from("qa_shared_runs").insert(row);
    if (error) {
      const needs = isMissingSchema(error);
      return NextResponse.json({ error: error.message, needs_setup: needs }, { status: needs ? 200 : 500, headers: CORS });
    }
    return NextResponse.json({ id }, { headers: CORS });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400, headers: CORS });
  }
}
