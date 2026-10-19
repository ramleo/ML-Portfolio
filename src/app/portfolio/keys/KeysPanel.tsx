"use client";

import { useCallback, useEffect, useState } from "react";

/** Owner-only panel to manage public API keys: mint one (label, tier, quota,
 * budget, expiry), see it ONCE, copy it, and revoke it. Talks to /api/api-keys,
 * which enforces the owner identity server-side. */

interface Key {
  id: string;
  key_prefix: string;
  label: string | null;
  tier: string;
  monthly_quota: number;
  budget_usd: number;
  request_count: number;
  spend_usd: number;
  created_at: string;
  expires_at: string | null;
  last_used_at: string | null;
  revoked: boolean;
}

const box: React.CSSProperties = {
  maxWidth: 860, margin: "0 auto", padding: 22,
  background: "var(--bg-card)", border: "1px solid var(--border2)", borderRadius: "var(--radius-card)",
};
const input: React.CSSProperties = {
  padding: "9px 11px", fontSize: 14, color: "var(--text)", background: "var(--bg)",
  border: "1px solid var(--border2)", borderRadius: "var(--radius-sm)",
};
const btn: React.CSSProperties = {
  padding: "9px 16px", fontSize: 14, fontWeight: 600, color: "#fff",
  background: "var(--accent)", border: "none", borderRadius: "var(--radius-sm)", cursor: "pointer",
};

function fmtDate(s: string | null) { return s ? new Date(s).toLocaleDateString() : "—"; }

export default function KeysPanel() {
  const [keys, setKeys] = useState<Key[]>([]);
  const [label, setLabel] = useState("");
  const [tier, setTier] = useState("free");
  const [quota, setQuota] = useState("1000");
  const [budget, setBudget] = useState("0"); // free spends nothing of the owner's wallet
  const [days, setDays] = useState("0");
  const [busy, setBusy] = useState(false);
  const [fresh, setFresh] = useState<string | null>(null); // the just-created plaintext key
  const [copied, setCopied] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [pending, setPending] = useState<string | null>(null); // id being revoked/deleted
  const [showRevoked, setShowRevoked] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/api-keys");
    if (res.status === 503) { setNeedsSetup(true); return; }
    if (res.ok) setKeys((await res.json()).keys ?? []);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const res = await fetch("/api/api-keys");
      if (!active) return;
      if (res.status === 503) { setNeedsSetup(true); return; }
      if (res.ok) setKeys((await res.json()).keys ?? []);
    })();
    return () => { active = false; };
  }, []);

  // Switching tier resets quota + budget to that tier's sensible defaults.
  function onTier(t: string) {
    setTier(t);
    if (t === "paid") { setQuota("100000"); setBudget("50"); }
    else { setQuota("1000"); setBudget("0"); }
  }

  async function create() {
    setBusy(true); setFresh(null);
    const res = await fetch("/api/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label, tier,
        monthlyQuota: Number(quota) || 0,
        budgetUsd: Number(budget) || 0,
        expiresInDays: Number(days) || 0,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setFresh(data.key);
      setLabel("");
      await load();
    } else if (res.status === 503) {
      setNeedsSetup(true);
    }
    setBusy(false);
  }

  async function revoke(id: string) {
    setFresh(null); // the "copy this key" banner shouldn't linger past a revoke
    setPending(id);
    await fetch("/api/api-keys/revoke", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
    setPending(null);
  }

  async function del(id: string) {
    setPending(id);
    await fetch(`/api/api-keys?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    await load();
    setPending(null);
  }

  function copyFresh() {
    if (!fresh) return;
    navigator.clipboard?.writeText(fresh);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (needsSetup) {
    return (
      <div style={box}>
        <h2 style={{ fontFamily: "var(--type-display)", fontSize: 20, margin: "0 0 8px", color: "var(--text)" }}>API keys</h2>
        <p style={{ fontSize: 14, color: "var(--text2)", margin: 0 }}>
          Run <code style={{ color: "var(--accent)" }}>supabase/api_keys.sql</code> in the Supabase
          SQL editor to enable API keys, then reload.
        </p>
      </div>
    );
  }

  return (
    <div style={box}>
      <h2 style={{ fontFamily: "var(--type-display)", fontSize: 20, margin: "0 0 4px", color: "var(--text)" }}>API keys</h2>
      <p style={{ fontSize: 13.5, color: "var(--text2)", margin: "0 0 18px" }}>
        Mint a key for someone to call the public API. Set a tier, a monthly request
        quota, and a spend budget. You can revoke any key at any time.
      </p>

      {/* Create form */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 16 }}>
        <label style={{ flex: "1 1 200px", fontSize: 12, color: "var(--text2)" }}>
          Label
          <input style={{ ...input, width: "100%", marginTop: 4 }} placeholder="e.g. Acme Corp" value={label} onChange={(e) => setLabel(e.target.value)} />
        </label>
        <label style={{ fontSize: 12, color: "var(--text2)" }}>
          Tier
          <select style={{ ...input, marginTop: 4 }} value={tier} onChange={(e) => onTier(e.target.value)}>
            <option value="free">free</option>
            <option value="paid">paid</option>
          </select>
        </label>
        <label style={{ fontSize: 12, color: "var(--text2)" }}>
          Quota/mo
          <input style={{ ...input, width: 90, marginTop: 4 }} type="number" min={0} value={quota} onChange={(e) => setQuota(e.target.value)} />
        </label>
        <label style={{ fontSize: 12, color: "var(--text2)" }}>
          Budget $/mo
          <input style={{ ...input, width: 90, marginTop: 4 }} type="number" min={0} step="0.5" value={budget} onChange={(e) => setBudget(e.target.value)} />
        </label>
        <label style={{ fontSize: 12, color: "var(--text2)" }}>
          Expires (days, 0=never)
          <input style={{ ...input, width: 110, marginTop: 4 }} type="number" min={0} value={days} onChange={(e) => setDays(e.target.value)} />
        </label>
        <button style={btn} onClick={create} disabled={busy}>{busy ? "Creating…" : "Create key"}</button>
      </div>
      <p style={{ fontSize: 12, color: "var(--text3)", margin: "0 0 16px" }}>
        Quota and budget are independent caps: <strong>quota</strong> limits how many
        requests per month; <strong>budget</strong> limits provider spend ($) on
        LLM-backed tools. Free keys default to $0 (no-cost tools only).
      </p>

      {/* Just-created key — shown once */}
      {fresh && (
        <div style={{ padding: "12px 14px", marginBottom: 18, background: "color-mix(in srgb, var(--accent) 10%, transparent)", border: "1px solid var(--accent)", borderRadius: "var(--radius-sm)" }}>
          <p style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text)", margin: "0 0 6px" }}>
            Copy this key now — it won&apos;t be shown again.
          </p>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <code style={{ flex: "1 1 260px", fontSize: 13, color: "var(--text)", wordBreak: "break-all", fontFamily: "var(--type-data)" }}>{fresh}</code>
            <button style={{ ...btn, background: "transparent", color: "var(--text)", border: "1px solid var(--border2)" }} onClick={copyFresh}>
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}

      {/* List — active keys by default; revoked ones hidden behind a toggle */}
      {(() => {
        const active = keys.filter((k) => !k.revoked);
        const revoked = keys.filter((k) => k.revoked);

        const Row = (k: Key) => (
          <div key={k.id} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "10px 12px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--bg)", opacity: k.revoked ? 0.6 : 1 }}>
            <div style={{ flex: "1 1 200px", minWidth: 0 }}>
              <div style={{ fontSize: 14, color: "var(--text)", fontWeight: 500 }}>
                {k.label || "(no label)"} <span style={{ fontSize: 11, color: "var(--accent)", textTransform: "uppercase", fontWeight: 700 }}>· {k.tier}</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text2)", fontFamily: "var(--type-data)" }}>
                {k.key_prefix}…{"  ·  "}{k.request_count}/{k.monthly_quota} this mo{"  ·  "}
                {k.revoked ? "revoked" : k.expires_at ? `expires ${fmtDate(k.expires_at)}` : "no expiry"}
              </div>
            </div>
            {k.revoked ? (
              <button style={{ ...btn, background: "transparent", color: "var(--text2)", border: "1px solid var(--border2)" }} onClick={() => del(k.id)} disabled={pending === k.id}>
                {pending === k.id ? "Deleting…" : "Delete"}
              </button>
            ) : (
              <button style={{ ...btn, background: "transparent", color: "#f87171", border: "1px solid rgba(248,113,113,0.4)" }} onClick={() => revoke(k.id)} disabled={pending === k.id}>
                {pending === k.id ? "Revoking…" : "Revoke"}
              </button>
            )}
          </div>
        );

        if (keys.length === 0)
          return <p style={{ fontSize: 13.5, color: "var(--text3)", margin: 0 }}>No keys yet.</p>;

        return (
          <div style={{ display: "grid", gap: 10 }}>
            {active.length === 0 && (
              <p style={{ fontSize: 13.5, color: "var(--text3)", margin: 0 }}>No active keys.</p>
            )}
            {active.map(Row)}

            {revoked.length > 0 && (
              <button
                onClick={() => setShowRevoked((s) => !s)}
                style={{ alignSelf: "flex-start", marginTop: 4, padding: 0, background: "none", border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: "var(--text2)" }}
              >
                {showRevoked ? "Hide" : "Show"} revoked ({revoked.length})
              </button>
            )}
            {showRevoked && revoked.map(Row)}
          </div>
        );
      })()}
    </div>
  );
}
