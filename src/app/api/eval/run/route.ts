import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/auth/owner";

/** The generation models the application actually uses (the RAG provider cascade).
 * The eval can run the golden set through any of them to compare answer quality.
 * Kept server-side as an allowlist so a run can't be pointed at an arbitrary model. */
const MODELS: Record<string, { provider: string; model: string }> = {
  "cohere/command-a-03-2025": { provider: "cohere", model: "command-a-03-2025" },
  "gemini/gemini-3.6-flash": { provider: "gemini", model: "gemini-3.6-flash" },
  "mistral/mistral-small-latest": { provider: "mistral", model: "mistral-small-latest" },
  // Groq free tier (OpenAI-compatible; no new provider integration needed).
  "groq/gpt-oss-20b": { provider: "groq", model: "openai/gpt-oss-20b" },
  "groq/gpt-oss-120b": { provider: "groq", model: "openai/gpt-oss-120b" },
};
const DEFAULT_KEY = "cohere/command-a-03-2025";

/** Q4 M2 — owner starts a quality-scoring run. The frontend owns the control
 * plane: it creates the eval_runs row, then asks the Space to do the compute
 * (fresh RAG answer + Gemini judge per golden item) in the background. The Space
 * posts results back to /api/eval/ingest. Spend is real (one judge call per item),
 * so this is owner-gated and refuses to start a second run while one is running. */

const ML_API_URL = process.env.ML_API_URL ?? "https://wram1708-ml-unified.hf.space";
const INTERNAL_TOKEN = process.env.TENANT_INTERNAL_TOKEN;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isOwnerEmail(user?.email))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!INTERNAL_TOKEN)
    return NextResponse.json({ error: "TENANT_INTERNAL_TOKEN not configured" }, { status: 500 });

  let key = DEFAULT_KEY;
  try { const b = await req.json(); if (typeof b?.model === "string" && MODELS[b.model]) key = b.model; } catch { /* default */ }
  const gen = MODELS[key];

  const admin = createAdminClient();

  // Don't let two runs spend at once. A run older than 15 min is treated as stuck
  // (the background thread died) and no longer blocks a fresh start.
  const since = new Date(Date.now() - 15 * 60_000).toISOString();
  const { data: active } = await admin.from("eval_runs")
    .select("id").eq("status", "running").gte("ts", since).limit(1);
  if (active && active.length)
    return NextResponse.json({ error: "A run is already in progress.", run_id: active[0].id }, { status: 409 });

  const { data: run, error } = await admin.from("eval_runs")
    .insert({ golden_version: "pending", status: "running", gen_provider: gen.provider, gen_model: gen.model })
    .select("id").single();
  if (error || !run)
    return NextResponse.json({ error: error?.message ?? "could not create run" }, { status: 500 });

  try {
    const res = await fetch(`${ML_API_URL}/internal/eval/run`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-internal-token": INTERNAL_TOKEN },
      body: JSON.stringify({ run_id: run.id, provider: gen.provider, model: gen.model }),
    });
    if (!res.ok) {
      await admin.from("eval_runs").update({ status: "error", error: `space ${res.status}` }).eq("id", run.id);
      return NextResponse.json({ error: `Space rejected the run (${res.status}).` }, { status: 502 });
    }
    const info = await res.json();
    await admin.from("eval_runs")
      .update({ n: info.n, golden_version: info.golden_version, judge_model: info.judge_model })
      .eq("id", run.id);
    return NextResponse.json({ run_id: run.id, n: info.n, golden_version: info.golden_version, gen_model: gen.model });
  } catch (err) {
    await admin.from("eval_runs").update({ status: "error", error: "space unreachable" }).eq("id", run.id);
    return NextResponse.json({ error: err instanceof Error ? err.message : "space unreachable" }, { status: 502 });
  }
}
