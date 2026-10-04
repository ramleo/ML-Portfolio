import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { analyticsWritesEnabled } from "@/lib/analyticsWrites";

/** Testwright R8 — scheduled monitoring CRUD (see supabase/qa_monitors.sql).
 *  OWNER-ONLY: every request must carry the x-qa-owner-token header matching the
 *  server's QA_OWNER_TOKEN (monitoring spends recurring CI minutes, so it is not
 *  open to visitors). Writes go through the service-role key, same as the share
 *  route. The scheduled ml-qa-runner workflow calls GET ?due=1 and POST action=
 *  record with the same token. */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-qa-owner-token",
};

const MAX_MONITORS = 5;
const MAX_CODE = 60_000;
const INTERVAL_MS: Record<string, number> = { hourly: 3_600_000, daily: 86_400_000 };

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/** Constant-time check of the owner token header against QA_OWNER_TOKEN. */
function ownerOk(req: NextRequest): boolean {
  const secret = process.env.QA_OWNER_TOKEN || "";
  const got = req.headers.get("x-qa-owner-token") || "";
  if (!secret || !got) return false;
  const a = Buffer.from(got), b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

const clip = (s: unknown, n: number) => (typeof s === "string" ? s.slice(0, n) : "");
const isMissingSchema = (err: { code?: string; message?: string } | null): boolean => {
  if (!err) return false;
  const code = err.code ?? "", msg = err.message ?? "";
  return code === "PGRST205" || /schema cache/i.test(msg) || /could not find/i.test(msg) || /does not exist/i.test(msg);
};

function makeId(): string {
  const A = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => A[x % 62]).join("");
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

/** List monitors (owner dashboard), or ?due=1 for ones the scheduler should run. */
export async function GET(req: NextRequest) {
  if (!ownerOk(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS });
  try {
    const { data, error } = await getClient().from("qa_monitors").select("*").order("created_at");
    if (error) {
      const needs = isMissingSchema(error);
      return NextResponse.json({ error: error.message, needs_setup: needs }, { status: needs ? 200 : 500, headers: CORS });
    }
    const rows = data ?? [];
    if (new URL(req.url).searchParams.get("due") === "1") {
      const now = Date.now();
      const due = rows.filter((m) => {
        if (!m.enabled) return false;
        const gap = INTERVAL_MS[m.interval] ?? INTERVAL_MS.daily;
        const last = m.last_run_at ? new Date(m.last_run_at).getTime() : 0;
        return now - last >= gap;
      });
      return NextResponse.json({ monitors: due }, { headers: CORS });
    }
    return NextResponse.json({ monitors: rows }, { headers: CORS });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500, headers: CORS });
  }
}

/** create | toggle | delete | record — all owner-gated. */
export async function POST(req: NextRequest) {
  if (!ownerOk(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS });
  if (!analyticsWritesEnabled()) return NextResponse.json({ skipped: "local" }, { headers: CORS });
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Bad request" }, { status: 400, headers: CORS }); }
  const db = getClient();
  const action = String(body.action || "");

  try {
    if (action === "create") {
      const code = clip(body.code, MAX_CODE);
      if (!code) return NextResponse.json({ error: "A test is required." }, { status: 400, headers: CORS });
      const { count, error: cErr } = await db.from("qa_monitors").select("id", { count: "exact", head: true });
      if (cErr) {
        const needs = isMissingSchema(cErr);
        return NextResponse.json({ error: cErr.message, needs_setup: needs }, { status: needs ? 200 : 500, headers: CORS });
      }
      if ((count ?? 0) >= MAX_MONITORS) {
        return NextResponse.json({ error: `Monitor limit reached (${MAX_MONITORS}). Remove one first.` }, { status: 409, headers: CORS });
      }
      const interval = body.interval === "hourly" ? "hourly" : "daily";
      const id = makeId();
      const { error } = await db.from("qa_monitors").insert({
        id, name: clip(body.name, 200), code, base_url: clip(body.base_url, 500), interval, enabled: true,
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: CORS });
      return NextResponse.json({ id }, { headers: CORS });
    }

    const id = clip(body.id, 40);
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400, headers: CORS });

    if (action === "toggle") {
      const { error } = await db.from("qa_monitors").update({ enabled: body.enabled === true }).eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: CORS });
      return NextResponse.json({ ok: true }, { headers: CORS });
    }
    if (action === "delete") {
      const { error } = await db.from("qa_monitors").delete().eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: CORS });
      return NextResponse.json({ ok: true }, { headers: CORS });
    }
    if (action === "record") {
      // Scheduler reports a completed monitor run; pass->fail transition drives alerts.
      const status = ["passed", "failed", "flaky", "error"].includes(String(body.status)) ? String(body.status) : "error";
      const failed = status !== "passed";
      const { data: cur } = await db.from("qa_monitors").select("consecutive_failures").eq("id", id).maybeSingle();
      const streak = failed ? ((cur?.consecutive_failures ?? 0) + 1) : 0;
      const { error } = await db.from("qa_monitors").update({
        last_run_at: new Date().toISOString(), last_status: status,
        consecutive_failures: streak, last_correlation_id: clip(body.correlation_id, 64) || null,
      }).eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: CORS });
      return NextResponse.json({ ok: true, consecutive_failures: streak }, { headers: CORS });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400, headers: CORS });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500, headers: CORS });
  }
}
