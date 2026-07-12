import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, path = "", session_id = "", referrer = "", duration_ms = 0, meta = {} } = body;
    if (!type) return NextResponse.json({ error: "type required" }, { status: 400 });

    const country = req.headers.get("CF-IPCountry") ?? req.headers.get("x-vercel-ip-country") ?? "";
    const supabase = getClient();
    const { error } = await supabase.from("events").insert({
      type, path, session_id, country, referrer, duration_ms, meta,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}