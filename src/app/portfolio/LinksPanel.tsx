"use client";

import { useCallback, useEffect, useState } from "react";

/** Owner-only panel to manage recruiter share-links: create one (with an optional
 * label + expiry), copy its URL, and revoke it. Talks to /api/recruiter-links,
 * which enforces the owner identity server-side. */

interface Link {
  token: string;
  label: string | null;
  created_at: string;
  expires_at: string | null;
  revoked: boolean;
}

const box: React.CSSProperties = {
  maxWidth: 820,
  margin: "90px auto 0",
  padding: "22px",
  background: "var(--bg-card)",
  border: "1px solid var(--border2)",
  borderRadius: "var(--radius-card)",
};
const input: React.CSSProperties = {
  padding: "9px 11px", fontSize: 14, color: "var(--text)", background: "var(--bg)",
  border: "1px solid var(--border2)", borderRadius: "var(--radius-sm)",
};
const btn: React.CSSProperties = {
  padding: "9px 16px", fontSize: 14, fontWeight: 600, color: "#fff",
  background: "var(--accent)", border: "none", borderRadius: "var(--radius-sm)", cursor: "pointer",
};

function status(l: Link): { text: string; color: string } {
  if (l.revoked) return { text: "revoked", color: "var(--text3)" };
  if (l.expires_at && new Date(l.expires_at) <= new Date()) return { text: "expired", color: "#f87171" };
  if (l.expires_at) return { text: `expires ${new Date(l.expires_at).toLocaleDateString()}`, color: "var(--text2)" };
  return { text: "no expiry", color: "var(--text2)" };
}

export default function LinksPanel() {
  const [links, setLinks] = useState<Link[]>([]);
  const [label, setLabel] = useState("");
  const [days, setDays] = useState("14");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [origin] = useState(() => (typeof window !== "undefined" ? window.location.origin : ""));

  const load = useCallback(async () => {
    const res = await fetch("/api/recruiter-links");
    if (res.ok) setLinks((await res.json()).links ?? []);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const res = await fetch("/api/recruiter-links");
      if (active && res.ok) setLinks((await res.json()).links ?? []);
    })();
    return () => { active = false; };
  }, []);

  async function create() {
    setBusy(true);
    await fetch("/api/recruiter-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, expiresInDays: Number(days) || 0 }),
    });
    setLabel("");
    await load();
    setBusy(false);
  }

  async function revoke(token: string) {
    await fetch("/api/recruiter-links/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    await load();
  }

  function copy(token: string) {
    const url = `${origin}/r/${token}`;
    navigator.clipboard?.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied((c) => (c === token ? null : c)), 1500);
  }

  return (
    <div style={box}>
      <h2 style={{ fontFamily: "var(--type-display)", fontSize: 20, margin: "0 0 4px", color: "var(--text)" }}>
        Recruiter share-links
      </h2>
      <p style={{ fontSize: 13.5, color: "var(--text2)", margin: "0 0 18px" }}>
        Generate a secret link that shows this portfolio to a recruiter with no
        login. Set an expiry, copy it, and revoke it anytime.
      </p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 20 }}>
        <input
          style={{ ...input, flex: "1 1 220px" }}
          placeholder="Label (e.g. Acme Corp — Jane)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <label style={{ fontSize: 13, color: "var(--text2)", display: "flex", alignItems: "center", gap: 6 }}>
          Expires in
          <input style={{ ...input, width: 64 }} type="number" min={0} value={days} onChange={(e) => setDays(e.target.value)} />
          days (0 = never)
        </label>
        <button style={btn} onClick={create} disabled={busy}>
          {busy ? "Creating…" : "Create link"}
        </button>
      </div>

      {links.length === 0 ? (
        <p style={{ fontSize: 13.5, color: "var(--text3)", margin: 0 }}>No links yet.</p>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {links.map((l) => {
            const st = status(l);
            return (
              <div
                key={l.token}
                style={{
                  display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
                  padding: "10px 12px", border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)", background: "var(--bg)",
                }}
              >
                <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                  <div style={{ fontSize: 14, color: "var(--text)", fontWeight: 500 }}>
                    {l.label || "(no label)"}
                  </div>
                  <div style={{ fontSize: 12, color: st.color, fontFamily: "var(--type-data)" }}>
                    /r/{l.token.slice(0, 8)}… · {st.text}
                  </div>
                </div>
                {!l.revoked && (
                  <>
                    <button style={{ ...btn, background: "transparent", color: "var(--text)", border: "1px solid var(--border2)" }} onClick={() => copy(l.token)}>
                      {copied === l.token ? "Copied" : "Copy link"}
                    </button>
                    <button style={{ ...btn, background: "transparent", color: "#f87171", border: "1px solid rgba(248,113,113,0.4)" }} onClick={() => revoke(l.token)}>
                      Revoke
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
