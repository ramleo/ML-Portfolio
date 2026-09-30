import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { analyticsWritesEnabled } from "@/lib/analyticsWrites";

/** DIY error store (see supabase/errors.sql) — our own durable, first-party
 * error tracking alongside hosted Sentry.
 *   POST  = ingest one error (from the browser AND from the backend, which posts
 *           here so no DB credentials ever live on the public HF Space).
 *   GET   = grouped read for the analytics dashboard (calls the error_groups RPC).
 * Content-free: no request bodies; message/stack are truncated; the route has
 * its query string stripped by the caller. */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

const clip = (s: unknown, n: number) => (typeof s === "string" ? s.slice(0, n) : null);
const stripQuery = (s: unknown) => (typeof s === "string" ? s.split(/[?#]/)[0].slice(0, 300) : "");

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const source = body.source === "backend" ? "backend" : "frontend";
    const kind = clip(body.kind, 200) || "Error";
    const route = stripQuery(body.route);
    const message = clip(body.message, 1000);
    const stack = clip(body.stack, 6000);
    const session_id = clip(body.session_id, 100);
    const meta = body.meta && typeof body.meta === "object" ? body.meta : {};

    // Local runs are not real errors worth storing — same gate as /api/track.
    if (!analyticsWritesEnabled()) return NextResponse.json({ ok: true, skipped: "local" }, { headers: CORS });

    const fingerprint = `${source}:${kind}:${route || "-"}`.slice(0, 400);
    const supabase = getClient();
    const { error } = await supabase.from("errors").insert({
      source, level: "error", kind, message, route, fingerprint, stack, session_id, meta,
    });
    if (error) {
      const needsSetup = /relation .*errors.* does not exist/i.test(error.message) || error.message.includes("PGRST205");
      return NextResponse.json({ error: error.message, needs_setup: needsSetup }, { status: needsSetup ? 200 : 500, headers: CORS });
    }
    return NextResponse.json({ ok: true }, { headers: CORS });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400, headers: CORS });
  }
}

type Group = {
  fingerprint: string; source: string; kind: string; route: string;
  sample_message: string | null; n: number; first_seen: string; last_seen: string;
};

function getWindow(range: string, startParam: string | null, endParam: string | null): { start: string; end: string } {
  if (startParam) {
    return { start: `${startParam}T00:00:00.000Z`, end: `${endParam ?? startParam}T23:59:59.999Z` };
  }
  const now = new Date();
  if (range === "yesterday") {
    const d = new Date(now); d.setUTCDate(d.getUTCDate() - 1); d.setUTCHours(0, 0, 0, 0);
    const e = new Date(d); e.setUTCHours(23, 59, 59, 999);
    return { start: d.toISOString(), end: e.toISOString() };
  }
  if (range === "7d") { const d = new Date(now); d.setUTCDate(d.getUTCDate() - 7); return { start: d.toISOString(), end: now.toISOString() }; }
  if (range === "30d") { const d = new Date(now); d.setUTCDate(d.getUTCDate() - 30); return { start: d.toISOString(), end: now.toISOString() }; }
  const d = new Date(now); d.setUTCHours(0, 0, 0, 0);
  return { start: d.toISOString(), end: now.toISOString() };
}

export async function GET(req: NextRequest) {
  try {
    const range = req.nextUrl.searchParams.get("range") ?? "today";
    const { start, end } = getWindow(range, req.nextUrl.searchParams.get("start"), req.nextUrl.searchParams.get("end"));
    const supabase = getClient();
    const { data, error } = await supabase.rpc("error_groups", { p_start: start, p_end: end });
    if (error) {
      const needsSetup = /function .*error_groups.* does not exist/i.test(error.message) || error.message.includes("PGRST202");
      return NextResponse.json({ rows: [], error: error.message, needs_setup: needsSetup }, { headers: CORS });
    }
    return NextResponse.json({ rows: (data ?? []) as Group[] }, { headers: CORS });
  } catch (e) {
    return NextResponse.json({ rows: [], error: (e as Error).message }, { status: 500, headers: CORS });
  }
}
