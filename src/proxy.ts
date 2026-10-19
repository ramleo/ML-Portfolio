import { NextRequest, NextResponse } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/middleware";

/** Edge gate (Next 16 `proxy` convention — the renamed `middleware`). Two jobs:
 *
 * 1. AUTH (Supabase) — refresh the session cookie on every matched request and
 *    guard the signed-in surfaces:
 *      /app/*        → any authenticated user
 *      /portfolio/*  → authenticated (the page itself then requires the OWNER
 *                      identity and sends anyone else to /app)
 *    Not signed in → redirect to /login?next=<path>. Recruiters do NOT sign in:
 *    they view the private portfolio via a share-link at /r/<token>, which is
 *    public (unmatched here) and validated server-side.
 *
 * 2. BASIC-AUTH (unchanged) — the internal click-audit pages (/audit,
 *    /audit/dashboard) stay behind HTTP Basic auth, enforced only when
 *    AUDIT_ADMIN_KEY is set. The click-capture endpoint (/api/audit) is NOT
 *    matched — it must stay public.
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── 1. Basic-auth gate for the internal audit pages ────────────────────────
  if (pathname === "/audit" || pathname.startsWith("/audit/")) {
    const secret = process.env.AUDIT_ADMIN_KEY;
    if (!secret) return NextResponse.next();
    const auth = req.headers.get("authorization") ?? "";
    if (auth.startsWith("Basic ")) {
      try {
        const decoded = atob(auth.slice(6));
        const pass = decoded.slice(decoded.indexOf(":") + 1);
        if (pass === secret) return NextResponse.next();
      } catch {
        /* malformed header → challenge */
      }
    }
    return new NextResponse("Authentication required.", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Click audit (internal)", charset="UTF-8"' },
    });
  }

  // ── 2. Supabase auth gate for /app/* and /recruiter/* ──────────────────────
  const { supabase, response } = createMiddlewareClient(req);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const login = req.nextUrl.clone();
    login.pathname = "/login";
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  return response;
}

// Matched routes: the audit shells (Basic auth) and the signed-in surfaces.
// Everything else — the public showcase, the recruiter share-link /r/<token>,
// APIs, the capture endpoint — is untouched.
export const config = {
  matcher: ["/audit", "/audit/:path*", "/app", "/app/:path*", "/portfolio", "/portfolio/:path*", "/account", "/account/:path*", "/settings", "/settings/:path*"],
};
