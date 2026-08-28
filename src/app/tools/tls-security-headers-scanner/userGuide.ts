// User guide for TLS / Security-Headers Scanner — rendered in
// TlsHeadersScanUserGuideModal (the "User Guide" header button) AND
// injected into the floating AI Assistant as its ONLY tool knowledge.
// Keep factual and in sync with the actual feature set.

export const TLS_HEADERS_GUIDE = `
# TLS / Security-Headers Scanner — User Guide

## What this tool does
Type a domain and it's checked two real ways, the same audit style as
Mozilla Observatory or SSL Labs' Server Test: a real TLS handshake against
port 443 (checking certificate chain validity, expiry, and protocol
version), and a live HTTPS request checking for 6 standard security
response headers. Nothing is simulated — both checks make a genuine live
connection to the domain you type.

## The TLS check
- **Chain verification**: does the certificate actually chain up to a
  trusted root, the same check every browser does? A self-signed or
  otherwise untrusted certificate fails this — shown as the real
  verification error, not glossed over.
- **Expiry**: how many days until the certificate expires, flagged if
  already expired or expiring within 30 days.
- **Protocol version**: SSLv2/SSLv3/TLS 1.0/TLS 1.1 are all formally
  deprecated (RFC 8996) — flagged if negotiated instead of TLS 1.2/1.3.

When a certificate fails verification, its subject/issuer/expiry details
are deliberately **not shown** — those fields were never actually
validated, so displaying them would misleadingly suggest they're
trustworthy. The verification failure itself is the real finding.

## The security headers check
A live HTTPS request checks for 6 headers security-conscious sites set:
**Content-Security-Policy**, **Strict-Transport-Security** (HSTS),
**X-Frame-Options**, **X-Content-Type-Options**, **Referrer-Policy**, and
**Permissions-Policy**. This is the standard checklist real browser
security scanners use — not invented for this tool.

## Private/internal addresses are refused, not scanned
This tool opens a real network connection to whatever domain you type, so
before connecting it resolves the hostname and checks every resolved
address — if any of them is private, loopback, link-local, or otherwise
internal/reserved, the scan is refused with a clear message instead of
silently connecting. This prevents the tool being used to probe internal
network addresses it has no business reaching.

## Reading the result
One of five honest labels — never a fabricated numeric score:
- **Strong** — no issues found in either check.
- **Mostly good, one issue** — a single missing header or minor gap.
- **Weak configuration** — multiple missing headers or soft TLS issues.
- **Critical issues** — the certificate doesn't verify or has expired.
- **Could not fully scan** — the connection or HTTPS request itself
  failed (unrelated to the site's actual security posture, e.g. a
  timeout or the domain being unreachable).

## What this is (and isn't)
A passing TLS/headers check is a real, positive signal but not proof a
site has no other vulnerabilities — it says nothing about the
application's own code, authentication, or data handling. Conversely, a
"critical issues" result on TLS is a genuine, actionable finding (an
expired or untrusted certificate is a real problem any browser would also
flag), while a missing security header is a softer, defense-in-depth gap
rather than proof of an active vulnerability.
`.trim();

export const TLS_HEADERS_SUGGESTIONS = [
  "What does 'chain did not verify' mean?",
  "Why isn't subject/issuer shown for a failed cert?",
  "What are the 6 security headers checked?",
  "Why was my domain refused?",
  "What does 'could not fully scan' mean?",
];
