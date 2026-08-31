"use client";

import { useTlsHeadersScan } from "./useTlsHeadersScan";

const VERDICT_COLOR: Record<string, string> = {
  "strong": "#34d399",
  "mostly good, one issue": "#a3e635",
  "weak configuration": "#fbbf24",
  "critical issues": "#f87171",
  "could not fully scan": "var(--text3)",
};

const HEADER_LABELS: { field: string; label: string }[] = [
  { field: "content_security_policy", label: "Content-Security-Policy" },
  { field: "strict_transport_security", label: "Strict-Transport-Security" },
  { field: "x_frame_options", label: "X-Frame-Options" },
  { field: "x_content_type_options", label: "X-Content-Type-Options" },
  { field: "referrer_policy", label: "Referrer-Policy" },
  { field: "permissions_policy", label: "Permissions-Policy" },
];

/** Live TLS certificate + HTTP security header check against a real
 * domain — a Mozilla-Observatory-/SSL-Labs-style audit, zero ML. The
 * backend refuses to connect to private/internal addresses (SSRF
 * hardening); everything shown here is a real, independently-run check,
 * not a simulated result. */
export default function TlsHeadersScanRunner({ accent }: { accent: string }) {
  const { host, setHost, scan, running, result, error, reset } = useTlsHeadersScan();

  const cardStyle: React.CSSProperties = {
    background: "var(--bg-glass)", border: "1px solid var(--border)", borderRadius: 16,
  };

  return (
    <div className="flex flex-col gap-4">
      <div style={cardStyle} className="p-5">
        <p className="text-xs mb-3" style={{ color: "var(--text3)" }}>
          Type a domain. A real TLS handshake checks its certificate (chain verification, expiry, protocol
          version), and a live HTTPS request checks for 6 standard security headers — the same checklist
          Mozilla Observatory uses. Private/internal addresses are refused, not scanned.
        </p>
        <div className="flex items-center gap-2">
          <input data-wt="tls-host" value={host} onChange={e => setHost(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") scan(); }}
            placeholder="example.com"
            className="flex-1 text-sm rounded-lg px-3 py-2 min-w-0"
            style={{ background: "var(--bg-glass)", border: "1px solid var(--border2)", color: "var(--text)" }} />
          <button onClick={scan} disabled={!host.trim() || running} data-wt="tls-scan"
            className="text-sm px-4 py-2 rounded-lg font-semibold transition-colors shrink-0"
            style={{ background: accent, color: "#fff", opacity: host.trim() && !running ? 1 : 0.5 }}>
            {running ? "Scanning…" : "Scan"}
          </button>
          {result && (
            <button onClick={reset}
              className="text-[11px] px-3 py-2 rounded-lg border transition-colors shrink-0"
              style={{ borderColor: "var(--border2)", color: "var(--text3)" }}>
              Clear
            </button>
          )}
        </div>
        {error && <p className="text-xs mt-2" style={{ color: "#f87171" }}>{error}</p>}
      </div>

      {result?.blocked && (
        <div style={cardStyle} className="p-5">
          <p className="text-xs" style={{ color: "#fbbf24" }}>{result.reason}</p>
        </div>
      )}

      {result && !result.blocked && (
        <>
          <div style={cardStyle} className="p-5" data-wt="tls-verdict">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <span className="text-sm font-bold" style={{ color: VERDICT_COLOR[result.verdict] || "var(--text)" }}>
                {result.verdict}
              </span>
              <span className="text-[11px]" style={{ color: "var(--text3)" }}>{result.host}</span>
            </div>
            {result.warnings.length > 0 && (
              <ul className="flex flex-col gap-1">
                {result.warnings.map((w, i) => (
                  <li key={i} className="text-[11px]" style={{ color: "#fbbf24" }}>• {w}</li>
                ))}
              </ul>
            )}
          </div>

          <div style={cardStyle} className="p-5" data-wt="tls-cert">
            <p className="text-xs font-semibold mb-2" style={{ color: "var(--text)" }}>TLS Certificate</p>
            {result.tls.connected ? (
              <div className="flex flex-col gap-1 text-[11px]" style={{ color: "var(--text3)" }}>
                <p>Protocol: <span style={{ color: result.tls.deprecated_protocol ? "#f87171" : "var(--text)" }}>{result.tls.protocol}</span></p>
                <p>Cipher: <span style={{ color: "var(--text)" }}>{result.tls.cipher}</span></p>
                <p>Chain verified: <span style={{ color: result.tls.verified ? "#34d399" : "#f87171" }}>{result.tls.verified ? "Yes" : "No"}</span></p>
                {result.tls.verify_error && <p style={{ color: "#f87171" }}>{result.tls.verify_error}</p>}
                {result.tls.verified && (
                  <>
                    <p>Subject: <span style={{ color: "var(--text)" }}>{result.tls.subject}</span></p>
                    <p>Issuer: <span style={{ color: "var(--text)" }}>{result.tls.issuer}</span></p>
                    <p>Expires: <span style={{ color: result.tls.expired ? "#f87171" : "var(--text)" }}>
                      {result.tls.not_after} ({result.tls.days_until_expiry} days)
                    </span></p>
                  </>
                )}
              </div>
            ) : (
              <p className="text-[11px]" style={{ color: "#f87171" }}>Could not establish a TLS connection.</p>
            )}
          </div>

          <div style={cardStyle} className="p-5" data-wt="tls-headers">
            <p className="text-xs font-semibold mb-2" style={{ color: "var(--text)" }}>Security Headers</p>
            {result.headers.reachable ? (
              <div className="flex flex-wrap gap-1.5">
                {HEADER_LABELS.map(({ field, label }) => {
                  const present = (result.headers as unknown as Record<string, boolean>)[field];
                  return (
                    <span key={field} className="text-[11px] px-2 py-0.5 rounded-full"
                      style={{
                        background: present ? "#34d39918" : "#f8717118",
                        color: present ? "#34d399" : "#f87171",
                        border: `1px solid ${present ? "#34d39940" : "#f8717140"}`,
                      }}>
                      {present ? "✓" : "✗"} {label}
                    </span>
                  );
                })}
              </div>
            ) : (
              <p className="text-[11px]" style={{ color: "#f87171" }}>Could not fetch the site over HTTPS.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
