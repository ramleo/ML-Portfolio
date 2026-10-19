import { randomBytes, createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/auth/owner";

/** Owner-only management of public API keys (Q1).
 *   GET  → list keys (no secrets — hash/prefix only)
 *   POST → mint a key { label?, tier?, monthlyQuota?, budgetUsd?, expiresInDays? }
 *          and return the FULL key ONCE (only its SHA-256 hash is stored).
 * The HF Space never reads this table; it verifies keys via /api/keys/verify. */

async function requireOwner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return isOwnerEmail(user?.email);
}

const PUBLIC_COLS =
  "id, key_prefix, label, tier, monthly_quota, budget_usd, request_count, spend_usd, period_start, created_at, expires_at, last_used_at, revoked";

export async function GET() {
  if (!(await requireOwner()))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("api_keys")
    .select(PUBLIC_COLS)
    .order("created_at", { ascending: false });
  if (error) {
    if (/relation .*api_keys.* does not exist|could not find the table/i.test(error.message))
      return NextResponse.json({ error: "needs_setup" }, { status: 503 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ keys: data ?? [] });
}

export async function POST(req: NextRequest) {
  if (!(await requireOwner()))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const label = typeof body.label === "string" ? body.label.slice(0, 120) : null;
  const tier = body.tier === "paid" ? "paid" : "free";
  const monthly_quota = Math.max(0, Math.min(1_000_000, Number(body.monthlyQuota) || (tier === "paid" ? 100_000 : 1_000)));
  const budget_usd = Math.max(0, Math.min(10_000, Number(body.budgetUsd) || (tier === "paid" ? 50 : 1)));
  const days = Number(body.expiresInDays);
  const expires_at =
    Number.isFinite(days) && days > 0
      ? new Date(Date.now() + days * 86_400_000).toISOString()
      : null;

  // ak_live_<random>; store only the hash, show the full key once.
  const key = `ak_live_${randomBytes(24).toString("base64url")}`;
  const key_hash = createHash("sha256").update(key).digest("hex");
  const key_prefix = key.slice(0, 14);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("api_keys")
    .insert({ key_hash, key_prefix, label, tier, monthly_quota, budget_usd, expires_at })
    .select("id, key_prefix, label, tier, monthly_quota, budget_usd, expires_at")
    .single();
  if (error) {
    if (/relation .*api_keys.* does not exist|could not find the table/i.test(error.message))
      return NextResponse.json({ error: "needs_setup" }, { status: 503 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // `key` is returned exactly once — it is never retrievable again.
  return NextResponse.json({ key, ...data });
}
