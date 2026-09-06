/** Receives one backend LLM call record and writes it to Supabase.
 *
 * LOGGING_SPEC.md §5. The Space cannot write to Supabase directly: that would
 * mean putting a service-role key on the Space, and on 2026-09-05 the Space's
 * logs were found leaking a Gemini key in plaintext (fixed in e5f47e7). A
 * database key is a far worse thing to leak, so the key stays here on Vercel
 * and the Space authenticates with a shared secret instead.
 *
 * Gating copies routers/security_status.py: if AIRAML_LOG_TOKEN is unset the
 * route 404s as though it does not exist, so a deploy that forgets the secret
 * fails closed rather than accepting anonymous writes.
 */
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });

/** §6 rule 5 — truncate everything free-form. */
const trunc = (v: unknown, n: number) =>
  v === null || v === undefined ? null : String(v).slice(0, n);

const int = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
};

export async function POST(req: NextRequest) {
  const expected = process.env.AIRAML_LOG_TOKEN ?? "";
  if (!expected) return notFound();
  if (req.headers.get("x-log-token") !== expected) return notFound();

  // Checked before the try, and reported as 500 rather than 400. A missing
  // service-role key is OUR misconfiguration, not a malformed request, and
  // collapsing the two into one swallowed "Bad request" is exactly the kind
  // of silent failure this spec exists to remove.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("llm-log: Supabase env missing", { url: !!url, serviceKey: !!serviceKey });
    return NextResponse.json({ error: "Log sink not configured" }, { status: 500 });
  }

  try {
    const b = await req.json();
    const supabase = createClient(url, serviceKey);
    const { error } = await supabase.from("llm_calls").insert({
      service:       trunc(b.service, 40),
      tool:          trunc(b.tool, 80),
      provider:      trunc(b.provider, 40),
      model:         trunc(b.model, 120),
      status:        b.status === "ok" ? "ok" : "error",
      http_status:   int(b.http_status),
      error_code:    trunc(b.error_code, 80),
      error_message: trunc(b.error_message, 400),
      latency_ms:    int(b.latency_ms),
      session_id:    trunc(b.session_id, 80),
      run_id:        trunc(b.run_id, 80),
    });
    if (error) {
      console.error("llm-log: insert failed", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("llm-log: bad payload", err);
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
