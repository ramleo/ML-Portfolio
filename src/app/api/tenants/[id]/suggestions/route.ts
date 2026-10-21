import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/auth/owner";
import { suggestQuestions } from "@/lib/tenant/rag";
import { sanitizeConfig } from "@/lib/tenant/config";

/** Q3 — starter-question suggestions for a chatbot (chips + typeahead). Generated from
 * the bot's knowledge base; when it has no KB, generated from the bot's persona/domain
 * instead so a brand-new bot still suggests relevant questions. Respects the per-bot
 * autosuggest toggle. Owner-gated + owner_id-scoped. Not persisted; cheap (free provider). */

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isOwnerEmail(user.email))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;

  const admin = createAdminClient();
  const { data: tenant } = await admin
    .from("tenants").select("id, name, config").eq("id", id).eq("owner_id", user.id).single();
  if (!tenant) return NextResponse.json({ error: "tenant not found" }, { status: 404 });

  const cfg = sanitizeConfig((tenant as { config: unknown }).config);
  if (!cfg.autosuggest) return NextResponse.json({ suggestions: [] });

  const { data: rows } = await admin
    .from("tenant_chunks").select("content").eq("tenant_id", id).limit(8);
  const chunks = (rows ?? []).map((r) => (r as { content: string }).content);

  // No KB → base suggestions on the bot's persona/domain so it still has starters.
  const persona = chunks.length ? "" : (cfg.system_prompt || `You are the ${(tenant as { name: string }).name} assistant.`);
  const suggestions = await suggestQuestions(chunks, persona);
  return NextResponse.json({ suggestions });
}
