import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/auth/owner";

/** Q4 (Portkey-style trace) — owner read of every LLM call that shares a run_id
 * (the trace id): the full LLM-call story of one request — query expansion,
 * generation (incl. provider fallbacks) and any judge call — oldest first.
 * Content-free, from llm_calls. (rag_queries has no run_id, so retrieval signals
 * aren't joined here yet.) */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isOwnerEmail(user?.email))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const runId = req.nextUrl.searchParams.get("run");
  if (!runId) return NextResponse.json({ error: "run required" }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin.from("llm_calls")
    .select("ts,tool,provider,model,status,latency_ms,cost_usd,input_tokens,output_tokens,operation,error_code,http_status,error_message")
    .eq("run_id", runId).order("ts", { ascending: true }).limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ run_id: runId, calls: data ?? [] });
}
