"use client";

import { useEffect, useState, type CSSProperties } from "react";

/** Q3 M4b — billing UI. Reads /api/billing/status, then starts Stripe Checkout (upgrade)
 * or the Billing Portal (manage/cancel) via the server routes — both return a hosted URL
 * we redirect to, so no card data touches the browser. */
interface Status {
  plan: "free" | "pro";
  is_owner: boolean;
  max_bots: number | null;
  has_billing_account: boolean;
  configured: boolean;
}

const card: CSSProperties = {
  padding: 20, background: "var(--bg-card)", border: "1px solid var(--border2)", borderRadius: "var(--radius-card)",
};
const btn: CSSProperties = {
  padding: "10px 18px", fontSize: 14, fontWeight: 600, color: "#fff", background: "var(--accent)",
  border: "none", borderRadius: "var(--radius-sm)", cursor: "pointer",
};
const btnGhost: CSSProperties = { ...btn, background: "transparent", color: "var(--text)", border: "1px solid var(--border2)" };

function Feature({ children, on }: React.PropsWithChildren<{ on: boolean }>) {
  return (
    <li style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13.5, color: on ? "var(--text)" : "var(--text3)" }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={on ? "var(--accent)" : "var(--text3)"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
        {on ? <path d="M20 6 9 17l-5-5" /> : <path d="M18 6 6 18M6 6l12 12" />}
      </svg>
      <span>{children}</span>
    </li>
  );
}

export default function BillingPanel() {
  const [st, setSt] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<"upgraded" | "canceled" | null>(null);
  const [err, setErr] = useState("");

  async function load() {
    try {
      const res = await fetch("/api/billing/status", { cache: "no-store" });
      if (res.ok) setSt(await res.json());
    } catch { /* shown as loading */ }
  }

  useEffect(() => {
    (async () => {
      const q = new URLSearchParams(window.location.search);
      if (q.get("upgraded")) setBanner("upgraded");
      else if (q.get("canceled")) setBanner("canceled");
      await load();
      // The webhook may land a moment after redirect; re-check once so Pro shows.
      if (q.get("upgraded")) setTimeout(() => { void load(); }, 3500);
    })();
  }, []);

  async function go(path: string) {
    setBusy(true); setErr("");
    try {
      const res = await fetch(path, { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.url) { window.location.href = d.url; return; }
      setErr(d.error || "Something went wrong.");
    } catch { setErr("Couldn't reach the billing service."); }
    setBusy(false);
  }

  if (!st) return <p style={{ fontSize: 13, color: "var(--text3)" }}>Loading…</p>;

  const pro = st.plan === "pro";

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {banner === "upgraded" && (
        <div style={{ ...card, borderColor: "var(--accent)", background: "color-mix(in srgb, var(--accent) 10%, transparent)", fontSize: 13.5, color: "var(--text)" }}>
          Payment received — you&apos;re on <strong>Pro</strong>. If it still shows Free, give it a few seconds and refresh.
        </div>
      )}
      {banner === "canceled" && (
        <div style={{ ...card, fontSize: 13.5, color: "var(--text2)" }}>Checkout canceled — no charge was made.</div>
      )}

      {/* Current plan */}
      <div style={{ ...card, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <span style={{ fontSize: 12, color: "var(--text3)" }}>Current plan</span>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>
            {st.is_owner ? "Owner" : pro ? "Pro" : "Free"}
          </div>
          <span style={{ fontSize: 12.5, color: "var(--text3)" }}>
            {st.is_owner ? "Unlimited (platform owner)" : `Up to ${st.max_bots ?? "unlimited"} bot${st.max_bots === 1 ? "" : "s"} · ${pro ? "can publish live" : "build & test only"}`}
          </span>
        </div>
        {!st.is_owner && pro && (
          <button style={btnGhost} disabled={busy} onClick={() => go("/api/billing/portal")}>Manage billing</button>
        )}
      </div>

      {/* Plans */}
      {!st.is_owner && (
        <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          <div style={card}>
            <h3 style={{ margin: "0 0 10px", fontSize: 16, color: "var(--text)" }}>Free{!pro && <span style={{ fontSize: 11, color: "var(--accent)", marginLeft: 8 }}>current</span>}</h3>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 7 }}>
              <Feature on>Build &amp; test chatbots</Feature>
              <Feature on>Up to 2 bots</Feature>
              <Feature on>Add knowledge &amp; configure</Feature>
              <Feature on={false}>Publish live (embed on a site)</Feature>
            </ul>
          </div>
          <div style={{ ...card, borderColor: pro ? "var(--accent)" : "var(--border2)" }}>
            <h3 style={{ margin: "0 0 10px", fontSize: 16, color: "var(--text)" }}>Pro{pro && <span style={{ fontSize: 11, color: "var(--accent)", marginLeft: 8 }}>current</span>}</h3>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 7 }}>
              <Feature on>Everything in Free</Feature>
              <Feature on>Up to 10 bots</Feature>
              <Feature on>Publish live &amp; embed on your sites</Feature>
              <Feature on>Manage your subscription anytime</Feature>
            </ul>
            {!pro && (
              <div style={{ marginTop: 14 }}>
                {st.configured ? (
                  <button style={btn} disabled={busy} onClick={() => go("/api/billing/checkout")}>
                    {busy ? "Starting…" : "Upgrade to Pro"}
                  </button>
                ) : (
                  <p style={{ fontSize: 12, color: "var(--text3)", margin: 0 }}>Upgrades aren&apos;t available yet — billing isn&apos;t configured.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {st.is_owner && (
        <p style={{ fontSize: 12.5, color: "var(--text3)" }}>You&apos;re the platform owner — all features are unlocked, no billing needed.</p>
      )}
      {err && <p style={{ fontSize: 13, color: "#f87171" }}>{err}</p>}
    </div>
  );
}
