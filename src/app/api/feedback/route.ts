import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { analyticsWritesEnabled } from "@/lib/analyticsWrites";

/** Q4 (Portkey-style feedback) — a visitor's thumbs up/down on a chat answer.
 * Public (no auth), like the other analytics writes: the service-role key stays
 * server-side here on Vercel. Content-free — a rating plus tool/provider/model/
 * session, never the question or answer. Local runs are gated out like all
 * analytics so dev/e2e don't pollute live feedback. */

const trunc = (v: unknown, n: number) => (v == null ? null : String(v).slice(0, n));

export async function POST(req: NextRequest) {
  if (!analyticsWritesEnabled()) return NextResponse.json({ ok: true, skipped: "local" });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "not configured" }, { status: 500 });

  try {
    const b = await req.json();
    const rating = b.rating === 1 || b.rating === -1 ? b.rating : null;
    if (rating === null) return NextResponse.json({ error: "rating must be 1 or -1" }, { status: 400 });

    const { error } = await createClient(url, key).from("answer_feedback").insert({
      rating,
      tool: trunc(b.tool, 80),
      provider: trunc(b.provider, 40),
      model: trunc(b.model, 120),
      session_id: trunc(b.session_id, 80),
    });
    if (error) { console.error("feedback: insert failed", error.message); return NextResponse.json({ error: error.message }, { status: 500 }); }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
}
