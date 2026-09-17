"use client";

import { useAttackSurfaceScan } from "./useAttackSurfaceScan";

/** Live, entirely passive recon check against a real domain — GET/HEAD
 * requests and plain TCP connects only, never active exploitation. The
 * backend refuses to connect to private/internal addresses (SSRF
 * hardening, same guard as the TLS/Security-Headers Scanner). */
export default function AttackSurfaceScanRunner({ accent }: { accent: string }) {
  const { host, setHost, scan, running, result, error, reset } = useAttackSurfaceScan();

  const cardStyle: React.CSSProperties = {
    background: "var(--bg-glass)", border: "1px solid var(--border)", borderRadius: 16,
  };

  return (
    <div className="flex flex-col gap-4">
      <div style={cardStyle} className="p-5">
        <p className="text-xs mb-3" style={{ color: "var(--text3)" }}>
          Type a domain. Four passive checks run live: exposed sensitive paths (.git/.env/etc.), directory
          listing, passive CMS fingerprinting, and a short common-port connectivity check. No exploitation —
          just GET/HEAD requests and plain TCP connects. Private/internal addresses are refused.
        </p>
        <div className="flex items-center gap-2">
          <input data-wt="as-input" value={host} onChange={e => setHost(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") scan(); }}
            placeholder="example.com"
            className="flex-1 text-sm rounded-lg px-3 py-2 min-w-0"
            style={{ background: "var(--bg-glass)", border: "1px solid var(--border2)", color: "var(--text)" }} />
          <button data-wt="as-scan" onClick={scan} disabled={!host.trim() || running}
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
          {result.findings.length > 0 && (
            <div style={cardStyle} className="p-5">
              <p className="text-xs font-bold mb-2" style={{ color: "#f87171" }}>Findings</p>
              <ul className="flex flex-col gap-1">
                {result.findings.map((f, i) => (
                  <li key={i} className="text-[11px]" style={{ color: "#f87171" }}>• {f}</li>
                ))}
              </ul>
            </div>
          )}

          <div data-wt="as-paths" style={cardStyle} className="p-5">
            <p className="text-xs font-semibold mb-2" style={{ color: "var(--text)" }}>Exposed Sensitive Paths</p>
            {result.exposed_paths.length === 0 ? (
              <p className="text-[11px]" style={{ color: "#34d399" }}>None of the checked paths appear exposed.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {result.exposed_paths.map(p => (
                  <li key={p.path} className="text-[11px] font-mono" style={{ color: "#f87171" }}>{p.path}</li>
                ))}
              </ul>
            )}
          </div>

          <div style={cardStyle} className="p-5">
            <p className="text-xs font-semibold mb-2" style={{ color: "var(--text)" }}>Directory Listing</p>
            {result.directory_listings.length === 0 ? (
              <p className="text-[11px]" style={{ color: "#34d399" }}>No directory listing found at the checked paths.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {result.directory_listings.map(p => (
                  <li key={p} className="text-[11px] font-mono" style={{ color: "#f87171" }}>{p}</li>
                ))}
              </ul>
            )}
          </div>

          <div style={cardStyle} className="p-5">
            <p className="text-xs font-semibold mb-2" style={{ color: "var(--text)" }}>CMS Fingerprint (Passive)</p>
            {result.cms ? (
              <p className="text-[11px]" style={{ color: "var(--text)" }}>Detected: {result.cms.generator}</p>
            ) : (
              <p className="text-[11px]" style={{ color: "var(--text3)" }}>No generator meta tag found on the homepage.</p>
            )}
          </div>

          <div data-wt="as-ports" style={cardStyle} className="p-5">
            <p className="text-xs font-semibold mb-2" style={{ color: "var(--text)" }}>Common Ports</p>
            <div className="flex flex-wrap gap-1.5">
              {result.open_ports.map(p => (
                <span key={p.port} className="text-[11px] px-2 py-0.5 rounded-full"
                  style={{
                    background: p.open ? "#f8717118" : "#34d39918",
                    color: p.open ? "#f87171" : "#34d399",
                    border: `1px solid ${p.open ? "#f8717140" : "#34d39940"}`,
                  }}>
                  {p.open ? "Open" : "Closed"} — {p.port} ({p.service})
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
