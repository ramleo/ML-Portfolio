import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/** Receives one content-free RAG-health row from the Space and writes it to
 * Supabase. Same trust model as /api/llm-log: the Space holds no Supabase key and
 * authenticates with AIRAML_LOG_TOKEN; with it unset the route 404s (fail closed).
 * Content-free — categorical/numeric signals only, never query or answer text. */

const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });
const trunc = (v: unknown, n: number) => (v == null ? null : String(v).slice(0, n));
const int = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? Math.trunc(n) : null; };
const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
const bl = (v: unknown) => (v === true ? true : v === false ? false : null);

export async function POST(req: NextRequest) {
  const expected = process.env.AIRAML_LOG_TOKEN ?? "";
  if (!expected) return notFound();
  if (req.headers.get("x-log-token") !== expected) return notFound();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey)
    return NextResponse.json({ error: "Sink not configured" }, { status: 500 });

  try {
    const b = await req.json();
    const { error } = await createClient(url, serviceKey).from("rag_queries").insert({
      cache_hit: bl(b.cache_hit),
      answer_source: trunc(b.answer_source, 40),
      confidence: trunc(b.confidence, 20),
      groundedness: num(b.groundedness),
      low_confidence: bl(b.low_confidence),
      provider: trunc(b.provider, 40),
      latency_ms: int(b.latency_ms),
      web_fallback: bl(b.web_fallback),
    });
    if (error) {
      console.error("rag-log: insert failed", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("rag-log: bad payload", err);
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
