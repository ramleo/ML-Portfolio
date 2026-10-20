import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/auth/owner";

/** Q4 M2 — owner read for the dashboard's Quality section: recent runs (for the
 * pass-rate trend + in-progress state) and the latest completed run's per-item
 * scores (worst-first is handled client-side). */

function isMissingSchema(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  const code = err.code ?? ""; const msg = err.message ?? "";
  return code === "PGRST205" || code === "42P01" || /could not find/i.test(msg) || /does not exist/i.test(msg);
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isOwnerEmail(user?.email))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const { data: runs, error } = await admin.from("eval_runs")
    .select("id,ts,golden_version,judge_model,gen_provider,gen_model,status,n,n_scored,pass_rate,avg_correct,avg_faithful,avg_relevant,error")
    .order("ts", { ascending: false }).limit(20);

  if (error) {
    if (isMissingSchema(error)) return NextResponse.json({ needs_setup: true, runs: [], latest: null, scores: [] });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const latest = runs?.find((r) => r.status === "done") ?? runs?.[0] ?? null;
  let scores: unknown[] = [];
  if (latest) {
    const { data: s } = await admin.from("eval_scores")
      .select("item_id,question,answer,correct,faithful,relevant,groundedness,rationale")
      .eq("run_id", latest.id);
    scores = s ?? [];
  }
  return NextResponse.json({ needs_setup: false, runs: runs ?? [], latest, scores });
}
