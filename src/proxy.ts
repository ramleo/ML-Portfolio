import { NextRequest, NextResponse } from "next/server";

/** Gate the internal click-audit PAGES (/audit, /audit/dashboard) behind HTTP
 * Basic auth, so strangers cannot even reach the key form — a second, outer layer
 * on top of the data gate.
 *
 * The audit DATA is already protected independently by AUDIT_ADMIN_KEY on
 * /api/audit/lookup and /api/audit/stats; this only covers the page shells. The
 * click-capture endpoint (/api/audit) is deliberately NOT matched here — it must
 * stay public so every visitor's browser can post its own clicks.
 *
 * Enforced only when AUDIT_ADMIN_KEY is configured (production). When it is unset
 * (e.g. local dev) the pages stay open and the data is still gated by the API, so
 * nothing breaks without the secret. Password = AUDIT_ADMIN_KEY (username
 * ignored), so there is no new credential to manage. */
export function proxy(req: NextRequest) {
  const secret = process.env.AUDIT_ADMIN_KEY;
  if (!secret) return NextResponse.next();

  const auth = req.headers.get("authorization") ?? "";
  if (auth.startsWith("Basic ")) {
    try {
      const decoded = atob(auth.slice(6));
      const pass = decoded.slice(decoded.indexOf(":") + 1);
      if (pass === secret) return NextResponse.next();
    } catch {
      /* malformed header → fall through to the challenge */
    }
  }
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Click audit (internal)", charset="UTF-8"' },
  });
}

// Only the audit page shells — never /api/audit (public capture) or anything else.
export const config = { matcher: ["/audit", "/audit/:path*"] };
