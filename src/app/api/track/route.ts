import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { analyticsWritesEnabled } from "@/lib/analyticsWrites";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, path = "", session_id = "", referrer = "", duration_ms = 0, meta = {} } = body;
    if (!type) return NextResponse.json({ error: "type required" }, { status: 400, headers: CORS });
    // Local runs are not visitors — see analyticsWrites.ts.
    if (!analyticsWritesEnabled()) return NextResponse.json({ ok: true, skipped: "local" }, { headers: CORS });

    const country = req.headers.get("CF-IPCountry") ?? req.headers.get("x-vercel-ip-country") ?? "";
    const supabase = getClient();
    const { error } = await supabase.from("events").insert({
      type, path, session_id, country, referrer, duration_ms, meta,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: CORS });
    return NextResponse.json({ ok: true }, { headers: CORS });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400, headers: CORS });
  }
}