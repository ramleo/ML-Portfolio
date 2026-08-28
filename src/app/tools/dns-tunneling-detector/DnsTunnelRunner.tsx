"use client";

import { useState } from "react";
import { useDnsTunnelAudit } from "./useDnsTunnelAudit";

const SAMPLE_LOG = `www.google.com
mail.google.com
api.github.com
zjceuqrli6o01ib7n7qodki70tlbz6n575yxu8x6kew4inhkijeihaj4dosu.attacker-c2.com
9f7hq2m1x0jvbrltpq8k2n4d6c1a3e5g7i9k1m3o5q7s9u1w3y5.attacker-c2.com
w4vc1z8x6t4r2p0n8l6j4h2f0d8b6z4x2v0t8r6p4n2l0j8h6f4.attacker-c2.com
cdn.jsdelivr.net
static.cloudflareinsights.com`;

/** Paste a DNS query log (one hostname per line) or check a single
 * hostname — pure client-side heuristics (subdomain length + Shannon
 * entropy + query volume per parent domain), no ML, no network call. */
export default function DnsTunnelRunner({ accent }: { accent: string }) {
  const { logResult, hostResult, runLog, runHost, reset } = useDnsTunnelAudit();
  const [logText, setLogText] = useState("");
  const [hostText, setHostText] = useState("");

  const cardStyle: React.CSSProperties = {
    background: "var(--bg-glass)", border: "1px solid var(--border)", borderRadius: 16,
  };

  return (
    <div className="flex flex-col gap-4">
      <div style={cardStyle} className="p-5">
        <p className="text-xs mb-3" style={{ color: "var(--text3)" }}>
          Paste a DNS query log — one hostname per line (the common format for a pasted <code>dig</code>/
          resolver/Pi-hole export). Hostnames are grouped by parent domain and flagged only when subdomain
          length, Shannon entropy, and query volume all agree — never a single signal alone, to avoid
          false-flagging ordinary long CDN-style subdomains.
        </p>
        <textarea
          value={logText}
          onChange={e => setLogText(e.target.value)}
          placeholder={"one hostname per line, e.g.:\nwww.example.com\napi.example.com\n..."}
          rows={7}
          spellCheck={false}
          className="w-full text-xs rounded-lg px-3 py-2 mb-3 font-mono"
          style={{ background: "var(--bg-glass)", border: "1px solid var(--border2)", color: "var(--text)" }}
        />
        <div className="flex items-center gap-2">
          <button onClick={() => runLog(logText)} disabled={!logText.trim()}
            className="text-sm px-4 py-2 rounded-lg font-semibold transition-colors"
            style={{ background: accent, color: "#0b0b12", opacity: logText.trim() ? 1 : 0.5 }}>
            Analyze log
          </button>
          <button onClick={() => { setLogText(SAMPLE_LOG); runLog(SAMPLE_LOG); }}
            className="text-[11px] px-3 py-2 rounded-lg border transition-colors"
            style={{ borderColor: "var(--border2)", color: "var(--text3)" }}>
            Try a sample log
          </button>
          {(logText || logResult) && (
            <button onClick={() => { setLogText(""); reset(); }}
              className="text-[11px] px-3 py-2 rounded-lg border transition-colors"
              style={{ borderColor: "var(--border2)", color: "var(--text3)" }}>
              Clear
            </button>
          )}
        </div>

        {logResult && (
          <div className="mt-4 flex flex-col gap-3">
            <p className="text-[11px]" style={{ color: "var(--text3)" }}>
              {logResult.totalQueries} queries across {logResult.parentDomains.length} parent domain
              {logResult.parentDomains.length === 1 ? "" : "s"} — {logResult.flaggedDomains.length} flagged.
            </p>
            {logResult.parentDomains.filter(d => d.uniqueSubdomains > 0).map(d => (
              <div key={d.parentDomain} className="rounded-lg p-3"
                style={{ border: `1px solid ${d.flagged ? "#f87171" : "var(--border)"}${d.flagged ? "60" : ""}` }}>
                <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                  <span className="text-sm font-bold" style={{ color: d.flagged ? "#f87171" : "var(--text)" }}>
                    {d.parentDomain}
                  </span>
                  {d.flagged && (
                    <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                      style={{ background: "#f8717118", color: "#f87171", border: "1px solid #f8717140" }}>
                      Possible DNS tunneling channel
                    </span>
                  )}
                </div>
                <p className="text-[11px]" style={{ color: "var(--text3)" }}>
                  {d.queryCount} queries · {d.uniqueSubdomains} unique subdomains · avg entropy{" "}
                  {d.avgEntropy.toFixed(1)} bits/char · max length {d.maxLength} chars
                </p>
                {d.matchedSignals.length > 0 && (
                  <ul className="mt-1 flex flex-col gap-0.5">
                    {d.matchedSignals.map((s, i) => (
                      <li key={i} className="text-[11px]" style={{ color: d.flagged ? "#f87171" : "var(--text3)" }}>• {s}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={cardStyle} className="p-5">
        <p className="text-xs mb-3" style={{ color: "var(--text3)" }}>
          Or check a single hostname on its own — a weaker signal than the log above, since real tunneling
          detection relies on volume/repetition a single query can&apos;t show.
        </p>
        <div className="flex items-center gap-2">
          <input value={hostText} onChange={e => setHostText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") runHost(hostText); }}
            placeholder="e.g. suspicious-looking-subdomain.example.com"
            className="flex-1 text-sm rounded-lg px-3 py-1.5 min-w-0"
            style={{ background: "var(--bg-glass)", border: "1px solid var(--border2)", color: "var(--text)" }} />
          <button onClick={() => runHost(hostText)} disabled={!hostText.trim()}
            className="text-sm px-4 py-1.5 rounded-lg font-semibold transition-colors border shrink-0"
            style={{ borderColor: `${accent}50`, color: accent, opacity: hostText.trim() ? 1 : 0.5 }}>
            Check
          </button>
        </div>

        {hostResult && (
          <div className="mt-3 rounded-lg p-3"
            style={{ border: `1px solid ${hostResult.lengthFlag && hostResult.entropyFlag ? "#fbbf24" : "var(--border)"}60` }}>
            <p className="text-[11px]" style={{ color: "var(--text3)" }}>
              Parent domain: <span style={{ color: "var(--text)" }}>{hostResult.parentDomain}</span> · Subdomain length:{" "}
              {hostResult.length} chars · Entropy: {hostResult.entropy.toFixed(1)} bits/char
            </p>
            {hostResult.lengthFlag && hostResult.entropyFlag ? (
              <p className="text-[11px] mt-1 font-semibold" style={{ color: "#fbbf24" }}>
                Both length and entropy are above the published thresholds — worth investigating, but a single
                query alone is not strong evidence of tunneling on its own.
              </p>
            ) : (
              <p className="text-[11px] mt-1" style={{ color: "var(--text3)" }}>
                Nothing unusual about this single hostname&apos;s length or entropy.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
