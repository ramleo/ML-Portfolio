/** Q3 — answer one question from a single tenant's knowledge base (server-only).
 *
 * The shared core of the owner Test path and the public embed path:
 *   embed question (Space) → match_tenant_chunks(tenant_id, …) (pgvector, filters on
 *   tenant_id — the isolation boundary) → answer from ONLY those chunks (Space).
 * Both callers pass a tenant_id derived from a trusted source (the owner's session,
 * or a verified embed token), never from untrusted user input.
 */
import type { createAdminClient } from "@/lib/supabase/admin";
import { embedTexts, answerFromContext } from "@/lib/tenant/rag";
import type { TenantConfig } from "@/lib/tenant/config";

type Admin = ReturnType<typeof createAdminClient>;

export interface TenantQueryResult {
  answer: string;
  web_used: boolean;
  web_sources: string[];
  matches: { source: string; similarity: number }[];
}

/** Retrieve + answer. Throws Error on an embed/generation failure (callers map it to a
 * 502); a Supabase error is thrown the same way. */
export async function answerTenantQuestion(
  admin: Admin, tenantId: string, question: string, cfg: TenantConfig, k = 5,
): Promise<TenantQueryResult> {
  const queryVec = await embedTexts([question]);

  const { data: matches, error } = await admin.rpc("match_tenant_chunks", {
    p_tenant_id: tenantId,
    p_query_embedding: `[${queryVec[0].join(",")}]`,
    p_match_count: Math.min(Math.max(k, 1), 10),
  });
  if (error) throw new Error(error.message);

  const chunks = (matches ?? []) as Array<{ content: string; source: string; similarity: number }>;

  // Does this bot have ANY knowledge base? (vs matched nothing for this query) — so the
  // answer never claims a KB was searched when none is attached.
  let hasKb = chunks.length > 0;
  if (!hasKb) {
    const { count } = await admin.from("tenant_chunks")
      .select("id", { count: "exact", head: true }).eq("tenant_id", tenantId);
    hasKb = (count ?? 0) > 0;
  }

  const result = await answerFromContext(question, chunks.map((c) => c.content), {
    system_prompt: cfg.system_prompt, provider: cfg.provider, model: cfg.model,
    web_search: cfg.web_search, has_kb: hasKb,
  });

  return {
    answer: result.answer,
    web_used: result.web_used,
    web_sources: result.sources,
    matches: chunks.map((c) => ({ source: c.source, similarity: c.similarity })),
  };
}
