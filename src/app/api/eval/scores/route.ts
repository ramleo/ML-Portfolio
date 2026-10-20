import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/auth/owner";

/** Q4 — owner read of one eval run's per-item scores, so the Answer-quality
 * section can switch which model's run it shows. The window read (/api/eval/quality)
 * returns the latest run's scores inline; this fetches any other run on demand. */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isOwnerEmail(user?.email))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const runId = req.nextUrl.searchParams.get("run");
  if (!runId) return NextResponse.json({ error: "run required" }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin.from("eval_scores")
    .select("item_id,question,answer,correct,faithful,relevant,groundedness,rationale")
    .eq("run_id", runId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ scores: data ?? [] });
}
