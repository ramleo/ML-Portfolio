import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthedUser } from "@/lib/auth/user";
import { answerTenantQuestion } from "@/lib/tenant/answer";
import { sanitizeConfig } from "@/lib/tenant/config";

/** Q3 M4a — answer a question from ONE tenant's knowledge base (owner-side Test path).
 * Any signed-in user, scoped to their own owner_id; the public embed path
 * (/api/embed/query) shares the same answer core via answerTenantQuestion. */

export async function POST(req: NextRequest) {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });

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

  try {
    const result = await answerTenantQuestion(admin, tenantId, question, sanitizeConfig(tenant.config), k);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
