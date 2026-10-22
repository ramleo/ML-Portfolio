import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { suggestQuestions } from "@/lib/tenant/rag";
import { sanitizeConfig } from "@/lib/tenant/config";
import { verifyEmbedToken } from "@/lib/tenant/embedToken";

/** Q3 M3 — starter-question chips for an embedded widget (PUBLIC, token-gated).
 * Mirrors the owner suggestions route but trusts the embed token for the tenant id,
 * and only runs when the bot's autosuggest toggle is on. Cheap (free provider, cached
 * client-side for the chat's lifetime). */

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const claims = verifyEmbedToken(auth.startsWith("Bearer ") ? auth.slice(7) : null);
  if (!claims) return NextResponse.json({ suggestions: [] });

  const admin = createAdminClient();
  const { data: tenant } = await admin.from("tenants")
    .select("name, config, embed_enabled").eq("id", claims.tenant_id).maybeSingle();
  if (!tenant || !tenant.embed_enabled) return NextResponse.json({ suggestions: [] });

  const cfg = sanitizeConfig(tenant.config);
  if (!cfg.autosuggest) return NextResponse.json({ suggestions: [] });

  const { data: rows } = await admin
    .from("tenant_chunks").select("content").eq("tenant_id", claims.tenant_id).limit(8);
  const chunks = (rows ?? []).map((r) => (r as { content: string }).content);
  const persona = chunks.length ? "" : (cfg.system_prompt || `You are the ${tenant.name} assistant.`);
  const suggestions = await suggestQuestions(chunks, persona);
  return NextResponse.json({ suggestions });
}
