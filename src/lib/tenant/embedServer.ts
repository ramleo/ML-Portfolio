/** Q3 M3 — shared helpers for the public embed endpoints (server-only): origin
 * handling, CORS, and the durable per-IP limiter. Kept in one place so the session
 * and query routes read as one system and stay small. */
import { createHmac } from "node:crypto";
import type { NextRequest } from "next/server";
import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

/** Lowercase scheme+host(+port), no path/slash. "" if unparseable. */
export function normalizeOrigin(raw: string | null | undefined): string {
  if (!raw) return "";
  try { return new URL(raw).origin.toLowerCase(); } catch { return ""; }
}

/** The embedding site's origin for a cross-origin request: prefer Origin, fall back
 * to the Referer's origin (some browsers omit Origin on simple requests). */
export function requestOrigin(req: NextRequest): string {
  return normalizeOrigin(req.headers.get("origin")) || normalizeOrigin(req.headers.get("referer"));
}

export function originAllowed(origin: string, allowed: string[] | null | undefined): boolean {
  if (!origin) return false;
  return (allowed ?? []).map(normalizeOrigin).includes(origin);
}

/** CORS headers reflecting a specific (already-allowlisted) origin. `Vary: Origin`
 * keeps a cached response from being reused for a different site. */
export function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin || "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

export function clientIp(req: NextRequest): string {
  return (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
}

/** Durable, shared-across-instances per-IP limit (rate_limit.sql's rate_limit_hit).
 * The caller is a salted HMAC of its IP, never the raw IP. Returns true when OVER the
 * limit. Fails OPEN (a limiter must never break a chat) — the daily cap + kill switch
 * are the hard backstops. */
export async function overRateLimit(
  admin: Admin, bucket: string, ip: string, max: number, windowSeconds: number,
): Promise<boolean> {
  try {
    const ipHash = createHmac("sha256", process.env.AIRAML_LOG_TOKEN ?? "unsalted").update(ip).digest("hex");
    const { data, error } = await admin.rpc("rate_limit_hit", {
      p_bucket: bucket, p_ip_hash: ipHash, p_max: Math.max(max, 1), p_window_seconds: windowSeconds,
    });
    if (error) return false;
    return data === false; // the RPC returns false when the caller is over its limit
  } catch {
    return false;
  }
}
