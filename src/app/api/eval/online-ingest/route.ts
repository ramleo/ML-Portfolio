import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/** Q4 M3 — receives one content-free online judge verdict from the Space and writes it
 * to online_scores. Same trust model as /api/rag-log: the Space holds no Supabase key and
 * authenticates with AIRAML_LOG_TOKEN; unset → 404 (fail closed). Verdict + categorical
 * signals only — never the question, answer, or context. */

const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });
const trunc = (v: unknown, n: number) => (v == null ? null : String(v).slice(0, n));
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
    const { error } = await createClient(url, serviceKey).from("online_scores").insert({
      surface: trunc(b.surface, 80) ?? "rag",
      faithful: bl(b.faithful),
      relevant: bl(b.relevant),
      passed: bl(b.passed),
      sampled_reason: trunc(b.sampled_reason, 20),
      provider: trunc(b.provider, 40),
      model: trunc(b.model, 60),
      answer_source: trunc(b.answer_source, 40),
      groundedness: num(b.groundedness),
    });
    if (error) {
      console.error("online-ingest: insert failed", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("online-ingest: bad payload", err);
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
