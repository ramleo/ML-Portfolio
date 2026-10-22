import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeConfig } from "@/lib/tenant/config";
import { verifyEmbedToken } from "@/lib/tenant/embedToken";
import { answerTenantQuestion } from "@/lib/tenant/answer";
import { clientIp, overRateLimit } from "@/lib/tenant/embedServer";

/** Q3 M3 — answer one question for an embedded widget (PUBLIC).
 *
 * Called same-origin from inside our widget iframe, so there is no host Origin to
 * check here — the Bearer token is the proof that the origin check already passed at
 * session mint. Order: verify token → per-IP rate limit → daily cap (atomic) → answer.
 * The daily cap is the hard cost backstop; the owner can also unpublish instantly. */

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const claims = verifyEmbedToken(auth.startsWith("Bearer ") ? auth.slice(7) : null);
  if (!claims) return NextResponse.json({ error: "invalid or expired session" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const question = String(body.question ?? "").trim().slice(0, 2000);
  if (!question) return NextResponse.json({ error: "question required" }, { status: 400 });

  const admin = createAdminClient();

  // Load the bot (verify it is still published) + its config.
  const { data: tenant } = await admin.from("tenants")
    .select("config, embed_enabled, embed_rate_per_min").eq("id", claims.tenant_id).maybeSingle();
  if (!tenant || !tenant.embed_enabled)
    return NextResponse.json({ error: "not available" }, { status: 403 });

  // Per-IP query rate limit (the owner's chosen per-minute ceiling).
  if (await overRateLimit(admin, `embed:q:${claims.tenant_id}`, clientIp(req), tenant.embed_rate_per_min ?? 20, 60))
    return NextResponse.json({ error: "Too many messages — please slow down." }, { status: 429 });

  // Hard daily message cap (atomic): the enforceable cost ceiling + kill switch backstop.
  const { data: within } = await admin.rpc("tenant_embed_charge", { p_tenant_id: claims.tenant_id });
  if (within === false)
    return NextResponse.json({ error: "This assistant has reached its daily limit. Please try again tomorrow." }, { status: 429 });

  try {
    const result = await answerTenantQuestion(admin, claims.tenant_id, question, sanitizeConfig(tenant.config));
    return NextResponse.json({ answer: result.answer, web_sources: result.web_sources, matches: result.matches });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
