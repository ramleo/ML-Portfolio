import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/auth/owner";

/** Q4 M2 — owner starts a quality-scoring run. The frontend owns the control
 * plane: it creates the eval_runs row, then asks the Space to do the compute
 * (fresh RAG answer + Gemini judge per golden item) in the background. The Space
 * posts results back to /api/eval/ingest. Spend is real (one judge call per item),
 * so this is owner-gated and refuses to start a second run while one is running. */

const ML_API_URL = process.env.ML_API_URL ?? "https://wram1708-ml-unified.hf.space";
const INTERNAL_TOKEN = process.env.TENANT_INTERNAL_TOKEN;

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isOwnerEmail(user?.email))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!INTERNAL_TOKEN)
    return NextResponse.json({ error: "TENANT_INTERNAL_TOKEN not configured" }, { status: 500 });

  const admin = createAdminClient();

  // Don't let two runs spend at once. A run older than 15 min is treated as stuck
  // (the background thread died) and no longer blocks a fresh start.
  const since = new Date(Date.now() - 15 * 60_000).toISOString();
  const { data: active } = await admin.from("eval_runs")
    .select("id").eq("status", "running").gte("ts", since).limit(1);
  if (active && active.length)
    return NextResponse.json({ error: "A run is already in progress.", run_id: active[0].id }, { status: 409 });

  const { data: run, error } = await admin.from("eval_runs")
    .insert({ golden_version: "pending", status: "running" }).select("id").single();
  if (error || !run)
    return NextResponse.json({ error: error?.message ?? "could not create run" }, { status: 500 });

  try {
    const res = await fetch(`${ML_API_URL}/internal/eval/run`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-internal-token": INTERNAL_TOKEN },
      body: JSON.stringify({ run_id: run.id }),
    });
    if (!res.ok) {
      await admin.from("eval_runs").update({ status: "error", error: `space ${res.status}` }).eq("id", run.id);
      return NextResponse.json({ error: `Space rejected the run (${res.status}).` }, { status: 502 });
    }
    const info = await res.json();
    await admin.from("eval_runs")
      .update({ n: info.n, golden_version: info.golden_version, judge_model: info.judge_model })
      .eq("id", run.id);
    return NextResponse.json({ run_id: run.id, n: info.n, golden_version: info.golden_version });
  } catch (err) {
    await admin.from("eval_runs").update({ status: "error", error: "space unreachable" }).eq("id", run.id);
    return NextResponse.json({ error: err instanceof Error ? err.message : "space unreachable" }, { status: 502 });
  }
}
