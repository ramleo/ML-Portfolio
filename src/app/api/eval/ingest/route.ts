import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/** Q4 M2 — receives a finished quality run from the Space and writes it to
 * Supabase. Same trust model as /api/llm-log: the Space holds no Supabase key and
 * authenticates with the shared AIRAML_LOG_TOKEN; with it unset the route 404s
 * (fail closed). Writes the per-item eval_scores and flips the eval_runs row to
 * its final state. */

const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });
const trunc = (v: unknown, n: number) => (v == null ? null : String(v).slice(0, n));
const bl = (v: unknown) => (v === true ? true : v === false ? false : null);
const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : null; };

interface ScoreIn {
  item_id?: unknown; question?: unknown; answer?: unknown;
  correct?: unknown; faithful?: unknown; relevant?: unknown;
  groundedness?: unknown; rationale?: unknown;
}

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
    if (!b.run_id) return NextResponse.json({ error: "run_id required" }, { status: 400 });
    const admin = createClient(url, serviceKey);

    // Lightweight progress ping during a run: just advance n_scored so the
    // dashboard can draw a progress bar. Never touches status or scores.
    if (b.kind === "progress") {
      await admin.from("eval_runs").update({ n_scored: num(b.n_scored) }).eq("id", b.run_id);
      return NextResponse.json({ ok: true });
    }

    const scores: ScoreIn[] = Array.isArray(b.scores) ? b.scores : [];
    if (scores.length) {
      const { error } = await admin.from("eval_scores").insert(scores.map((s) => ({
        run_id: b.run_id,
        item_id: trunc(s.item_id, 80) ?? "unknown",
        question: trunc(s.question, 1000) ?? "",
        answer: trunc(s.answer, 4000),
        correct: bl(s.correct), faithful: bl(s.faithful), relevant: bl(s.relevant),
        groundedness: num(s.groundedness), rationale: trunc(s.rationale, 400),
      })));
      if (error) console.error("eval ingest: scores insert failed", error.message);
    }

    const patch = b.status === "done"
      ? { status: "done", n_scored: num(b.n_scored), pass_rate: num(b.pass_rate),
          avg_correct: num(b.avg_correct), avg_faithful: num(b.avg_faithful), avg_relevant: num(b.avg_relevant) }
      : { status: "error", error: trunc(b.error, 400) };
    const { error: upErr } = await admin.from("eval_runs").update(patch).eq("id", b.run_id);
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("eval ingest: bad payload", err);
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
