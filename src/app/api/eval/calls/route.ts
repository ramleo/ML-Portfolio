import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/auth/owner";

/** Q4 M1 (feature A) — owner-only drill-down behind the /eval breakdowns. Given
 * a filter (tool / provider / model / status, within the window) it returns the
 * individual recent llm_calls rows so a bar on the dashboard can open into the
 * actual calls — and the one broken call. Content-free, same as /api/eval:
 * counts, timings, cost, and the provider's own (already-truncated) error text —
 * never prompt or document content. Newest first, capped. */

const FILTERABLE = ["tool", "provider", "model", "status"] as const;
type Filter = (typeof FILTERABLE)[number];

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isOwnerEmail(user?.email))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const sp = req.nextUrl.searchParams;
  const days = Math.max(1, Math.min(90, Number(sp.get("days")) || 30));
  const limit = Math.max(1, Math.min(500, Number(sp.get("limit")) || 100));
  const start = new Date(); start.setUTCDate(start.getUTCDate() - days);

  const admin = createAdminClient();
  let q = admin
    .from("llm_calls")
    .select("ts,tool,provider,model,status,latency_ms,cost_usd,input_tokens,output_tokens,http_status,error_code,error_message,run_id")
    .gte("ts", start.toISOString())
    .order("ts", { ascending: false })
    .limit(limit);

  // Apply whichever of the known filters are present. "unknown" means the
  // column is empty/null (how the dashboard labels blank values), so match that.
  for (const f of FILTERABLE) {
    const v = sp.get(f);
    if (v === null) continue;
    if (f === "tool" && v === "unknown") { q = q.or("tool.is.null,tool.eq."); continue; }
    if (v === "unknown") { q = q.is(f, null); continue; }
    q = q.eq(f as Filter, v);
  }

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rows: data ?? [] });
}
