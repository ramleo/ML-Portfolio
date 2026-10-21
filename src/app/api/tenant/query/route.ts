import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/auth/owner";
import { embedTexts, answerFromContext } from "@/lib/tenant/rag";
import { sanitizeConfig } from "@/lib/tenant/config";

/** Q3 M1 — answer a question from ONE tenant's knowledge base.
 * embed question (Space) → match_tenant_chunks(tenant_id, …) (pgvector, filters on
 * tenant_id — the isolation boundary) → answer from ONLY those chunks (Space). */

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isOwnerEmail(user.email))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const tenantId = String(body.tenantId ?? "").trim();
  const question = String(body.question ?? "").trim();
  const k = Math.min(Math.max(Number(body.k) || 5, 1), 10);
  if (!tenantId) return NextResponse.json({ error: "tenantId required" }, { status: 400 });
  if (!question) return NextResponse.json({ error: "question required" }, { status: 400 });

  const admin = createAdminClient();

  // Load this owner's tenant + its bot config (the answer path uses it).
  const { data: tenant } = await admin
    .from("tenants").select("config").eq("id", tenantId).eq("owner_id", user.id).single();
  if (!tenant) return NextResponse.json({ error: "tenant not found" }, { status: 404 });
  const cfg = sanitizeConfig(tenant.config);

  let queryVec: number[][];
  try {
    queryVec = await embedTexts([question]);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }

  const { data: matches, error } = await admin.rpc("match_tenant_chunks", {
    p_tenant_id: tenantId,
    p_query_embedding: `[${queryVec[0].join(",")}]`,
    p_match_count: k,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const chunks = (matches ?? []) as Array<{ content: string; source: string; similarity: number }>;

  // Does this bot have ANY knowledge base? (vs matched nothing for this query) — so the
  // answer never claims a KB was searched when none is attached.
  let hasKb = chunks.length > 0;
  if (!hasKb) {
    const { count } = await admin.from("tenant_chunks").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId);
    hasKb = (count ?? 0) > 0;
  }

  let result: Awaited<ReturnType<typeof answerFromContext>>;
  try {
    result = await answerFromContext(question, chunks.map((c) => c.content),
      { system_prompt: cfg.system_prompt, provider: cfg.provider, model: cfg.model, web_search: cfg.web_search, has_kb: hasKb });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }

  return NextResponse.json({
    answer: result.answer,
    web_used: result.web_used,
    web_sources: result.sources,
    matches: chunks.map((c) => ({ source: c.source, similarity: c.similarity })),
  });
}
