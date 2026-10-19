import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Key verification for the HF Space (Q1). The Space holds no Supabase key, so it
 * calls this token-gated route to validate an API key and meter its use.
 *
 * Auth:  header `x-verify-token` must equal API_KEYS_VERIFY_TOKEN (set on both
 *        Vercel and the Space). Fails closed if the env var is unset.
 * Body:  { key_hash }  — the SHA-256 hex of the caller's key (the plaintext key
 *        never leaves the Space).
 * Reply: { valid, reason?, tier?, remaining?, budget_usd?, spend_usd? }
 *
 * On a valid call it also resets the counters at a new month and increments the
 * request count (coarse metering — the Space caches validity briefly, so counts
 * are approximate; spend metering for LLM tools is wired when they enter /v1/). */
export async function POST(req: NextRequest) {
  const expected = process.env.API_KEYS_VERIFY_TOKEN;
  if (!expected || req.headers.get("x-verify-token") !== expected)
    return NextResponse.json({ valid: false, reason: "unauthorized" }, { status: 401 });

  const { key_hash } = await req.json().catch(() => ({}));
  if (!key_hash) return NextResponse.json({ valid: false, reason: "no_key" }, { status: 400 });

  const admin = createAdminClient();
  const { data: key, error } = await admin
    .from("api_keys")
    .select("id, tier, monthly_quota, budget_usd, request_count, spend_usd, period_start, expires_at, revoked")
    .eq("key_hash", key_hash)
    .maybeSingle();

  if (error) return NextResponse.json({ valid: false, reason: "lookup_error" }, { status: 500 });
  if (!key) return NextResponse.json({ valid: false, reason: "unknown" });
  if (key.revoked) return NextResponse.json({ valid: false, reason: "revoked" });
  if (key.expires_at && new Date(key.expires_at) <= new Date())
    return NextResponse.json({ valid: false, reason: "expired" });

  // Reset the window at the start of a new calendar month.
  const monthStart = new Date(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)
    .toISOString().slice(0, 10);
  let { request_count, spend_usd } = key;
  const newPeriod = key.period_start < monthStart;
  if (newPeriod) { request_count = 0; spend_usd = 0; }

  if (request_count >= key.monthly_quota)
    return NextResponse.json({ valid: false, reason: "quota_exceeded", tier: key.tier });
  // A $0 budget doesn't block zero-cost calls — it just means "no spending
  // endpoints". Spend enforcement for LLM tools happens per-call in M2.
  if (Number(key.budget_usd) > 0 && Number(spend_usd) >= Number(key.budget_usd))
    return NextResponse.json({ valid: false, reason: "budget_exceeded", tier: key.tier });

  await admin
    .from("api_keys")
    .update({
      request_count: request_count + 1,
      spend_usd,
      period_start: newPeriod ? monthStart : key.period_start,
      last_used_at: new Date().toISOString(),
    })
    .eq("id", key.id);

  return NextResponse.json({
    valid: true,
    tier: key.tier,
    remaining: key.monthly_quota - (request_count + 1),
    budget_usd: Number(key.budget_usd),
    spend_usd: Number(spend_usd),
  });
}
