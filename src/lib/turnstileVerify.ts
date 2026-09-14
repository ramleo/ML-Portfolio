/** Server-side Cloudflare Turnstile check, shared by every route that takes a
 * token from `getTurnstileToken()` (src/lib/turnstile.ts).
 *
 * Returns true when TURNSTILE_SECRET_KEY is unset, so a route keeps working
 * until Turnstile is configured. Once it is, a missing or invalid token is
 * refused. If Cloudflare itself is unreachable this accepts: an outage there
 * should not silently take a feature down with it.
 */
export async function turnstileOk(token: unknown, ip: string, label: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;                       // not configured — fail open
  if (typeof token !== "string" || !token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
    });
    const out = (await res.json()) as { success?: boolean };
    return out.success === true;
  } catch {
    console.error(`${label}: turnstile verify unreachable`);
    return true;
  }
}

/** Client IP as Vercel forwards it. */
export function clientIp(headers: Headers): string {
  return (headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
}
