import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeConfig } from "@/lib/tenant/config";
import { mintEmbedToken } from "@/lib/tenant/embedToken";
import { requestOrigin, originAllowed, corsHeaders, clientIp, overRateLimit } from "@/lib/tenant/embedServer";

/** Q3 M3 — mint a short-lived widget session (PUBLIC).
 *
 * Called cross-origin by the loader running ON the embedding site, so this request
 * carries that site's real Origin. We look the bot up by its publishable key, confirm
 * it is published and the origin is allowlisted, rate-limit session creation, then
 * return a short JWT the in-iframe widget uses for same-origin query calls. The origin
 * check here is the only place the host origin is visible — the query path trusts the
 * token. CORS is reflected ONLY for an allowlisted origin, so a disallowed site's
 * browser can't even read the response. */

const KEY_PREFIX = "pk_live_";

export async function OPTIONS(req: NextRequest) {
  // The loader mints with a "simple" request (text/plain, no custom headers), so this
  // normally isn't hit. Kept defensive: reflect the origin for a preflight; the real
  // authorization (key + origin allowlist) happens on POST, which returns CORS only when
  // the origin is allowlisted — so a disallowed site can never read a token.
  return new NextResponse(null, { status: 204, headers: corsHeaders(requestOrigin(req)) });
}

export async function POST(req: NextRequest) {
  const origin = requestOrigin(req);
  const body = await req.json().catch(() => ({}));
  const key = String(body.key ?? "").trim();

  // Generic failures only (never reveal whether a key exists / is published).
  const deny = () => NextResponse.json({ error: "not available" }, { status: 403 });
  if (!key.startsWith(KEY_PREFIX) || !origin) return deny();

  const admin = createAdminClient();
  const { data: tenant } = await admin.from("tenants")
    .select("id, name, config, embed_enabled, allowed_origins")
    .eq("public_key", key).maybeSingle();
  if (!tenant || !tenant.embed_enabled || !originAllowed(origin, tenant.allowed_origins)) return deny();

  // Throttle session creation per IP (a burst of mints is the cheap part to abuse).
  if (await overRateLimit(admin, `embed:s:${tenant.id}`, clientIp(req), 30, 60))
    return NextResponse.json({ error: "rate limited" }, { status: 429, headers: corsHeaders(origin) });

  let token: string;
  try {
    token = mintEmbedToken({ tenant_id: tenant.id, origin });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503, headers: corsHeaders(origin) });
  }

  const cfg = sanitizeConfig(tenant.config);
  return NextResponse.json(
    { token, name: tenant.name, greeting: cfg.greeting, autosuggest: cfg.autosuggest, ghost_completion: cfg.ghost_completion },
    { headers: corsHeaders(origin) },
  );
}
