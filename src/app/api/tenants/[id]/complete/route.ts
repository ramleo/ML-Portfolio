import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/auth/owner";
import { completeQuery } from "@/lib/tenant/rag";
import { sanitizeConfig } from "@/lib/tenant/config";

/** Q3 — inline ghost-text completion for a chatbot's chat input. Owner-gated +
 * owner_id-scoped. Off unless the bot's ghost_completion toggle is on (LLM cost). */

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isOwnerEmail(user.email))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const prefix = String(body.prefix ?? "").trim();
  if (prefix.length < 3) return NextResponse.json({ completion: "" });

  const admin = createAdminClient();
  const { data: tenant } = await admin
    .from("tenants").select("name, config").eq("id", id).eq("owner_id", user.id).single();
  if (!tenant) return NextResponse.json({ error: "tenant not found" }, { status: 404 });

  const cfg = sanitizeConfig((tenant as { config: unknown }).config);
  if (!cfg.ghost_completion) return NextResponse.json({ completion: "" });

  const persona = cfg.system_prompt || `You are the ${(tenant as { name: string }).name} assistant.`;
  const completion = await completeQuery(prefix, persona);
  return NextResponse.json({ completion });
}
