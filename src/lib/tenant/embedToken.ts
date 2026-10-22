/** Q3 M3 — short-lived session token for the embeddable widget (server-only).
 *
 * Our tenant bots are PUBLIC/anonymous — there is no end-user login — so this token
 * is NOT a user identity. It is an abuse-control token: after the session endpoint
 * verifies the embedding site's origin against the bot's allowlist, it mints this
 * token bound to {tenant, origin} with a short expiry, and the query endpoint accepts
 * it as proof that the origin check already passed. That keeps the per-query path
 * same-origin (no CORS) while still binding every query to an allowlisted site.
 *
 * Hand-rolled HS256 (Node crypto) so we add no dependency. EMBED_JWT_SECRET is
 * server-only (no NEXT_PUBLIC_ prefix) and never reaches the browser.
 */
import { createHmac, timingSafeEqual } from "crypto";

const SECRET = process.env.EMBED_JWT_SECRET ?? "";
const TTL_SECONDS = 15 * 60; // 15 min — long enough for a chat, short enough to limit replay

export interface EmbedClaims { tenant_id: string; origin: string }
interface Payload extends EmbedClaims { iat: number; exp: number }

const b64url = (b: Buffer | string) =>
  Buffer.from(b).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const b64urlJson = (o: unknown) => b64url(JSON.stringify(o));

function sign(data: string): string {
  return b64url(createHmac("sha256", SECRET).update(data).digest());
}

/** Mint a signed token for {tenant_id, origin}. Throws if the secret is unconfigured
 * (fail-closed — we never issue an unsigned/guessable token). */
export function mintEmbedToken(claims: EmbedClaims): string {
  if (!SECRET) throw new Error("EMBED_JWT_SECRET not configured");
  const now = Math.floor(Date.now() / 1000);
  const payload: Payload = { ...claims, iat: now, exp: now + TTL_SECONDS };
  const head = b64urlJson({ alg: "HS256", typ: "JWT" });
  const body = b64urlJson(payload);
  return `${head}.${body}.${sign(`${head}.${body}`)}`;
}

/** Verify a token and return its claims, or null if it is missing, malformed,
 * tampered, or expired. Constant-time signature compare. */
export function verifyEmbedToken(token: string | null | undefined): EmbedClaims | null {
  if (!SECRET || !token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [head, body, sig] = parts;
  const expected = sign(`${head}.${body}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(body.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString()) as Payload;
    if (!p.tenant_id || !p.origin || typeof p.exp !== "number") return null;
    if (Math.floor(Date.now() / 1000) >= p.exp) return null;
    return { tenant_id: p.tenant_id, origin: p.origin };
  } catch {
    return null;
  }
}
