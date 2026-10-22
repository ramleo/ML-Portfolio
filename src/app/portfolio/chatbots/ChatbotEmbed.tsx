"use client";

import { useEffect, useState } from "react";
import { input, btn, btnGhost, labelStyle, type Tenant } from "./ui";

/** Q3 M3 — publish a chatbot as an embeddable widget. Owner sets the kill switch, the
 * origin allowlist, and the rate + daily-message caps, and copies a one-line <script>.
 * Reads/writes GET|PATCH /api/tenants/[id]/embed (owner-gated). The abuse controls are
 * enforced server-side on the public embed endpoints. */
interface EmbedState {
  public_key: string | null;
  embed_enabled: boolean;
  allowed_origins: string[];
  embed_rate_per_min: number;
  embed_daily_cap: number;
  embed_day_count: number;
}

export default function ChatbotEmbed({ tenant }: { tenant: Tenant }) {
  const [st, setSt] = useState<EmbedState | null>(null);
  const [origins, setOrigins] = useState("");
  const [rate, setRate] = useState(20);
  const [cap, setCap] = useState(500);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const base = typeof window !== "undefined" ? window.location.origin : "";

  function apply(e: EmbedState) {
    setSt(e);
    setOrigins((e.allowed_origins ?? []).join("\n"));
    setRate(e.embed_rate_per_min ?? 20);
    setCap(e.embed_daily_cap ?? 500);
  }

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/tenants/${tenant.id}/embed`, { cache: "no-store" });
        if (res.ok) apply((await res.json()).embed as EmbedState);
      } catch { /* shown as not-loaded */ }
    })();
  }, [tenant.id]);

  async function patch(body: Record<string, unknown>) {
    setBusy(true); setSaved(false);
    try {
      const res = await fetch(`/api/tenants/${tenant.id}/embed`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (res.ok) { apply((await res.json()).embed as EmbedState); setSaved(true); setTimeout(() => setSaved(false), 1800); }
    } catch { /* ignore */ }
    setBusy(false);
  }

  if (!st) return <p style={{ fontSize: 13, color: "var(--text3)" }}>Loading…</p>;

  const originList = origins.split("\n").map((o) => o.trim()).filter(Boolean);
  const snippet = st.public_key
    ? `<script src="${base}/embed/v1.js" data-bot="${st.public_key}" async></script>`
    : "";
  const canPublish = originList.length > 0;

  return (
    <div style={{ display: "grid", gap: 18, maxWidth: 640 }}>
      {/* Publish toggle (kill switch) */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, justifyContent: "space-between" }}>
        <div>
          <strong style={{ fontSize: 14, color: "var(--text)" }}>{st.embed_enabled ? "Published" : "Not published"}</strong>
          <p style={{ fontSize: 11.5, color: "var(--text3)", margin: "2px 0 0" }}>
            {st.embed_enabled
              ? "Live on your allowed sites. Turn off to disable the widget everywhere instantly."
              : "Add at least one allowed site, then publish to embed this bot."}
          </p>
        </div>
        <button style={st.embed_enabled ? btnGhost : btn} disabled={busy || (!st.embed_enabled && !canPublish)}
          onClick={() => patch(st.embed_enabled
            ? { embed_enabled: false }
            // Publishing also persists the current form, so you can't go live with an
            // unsaved (empty) allowlist.
            : { embed_enabled: true, allowed_origins: originList, embed_rate_per_min: rate, embed_daily_cap: cap })}>
          {st.embed_enabled ? "Unpublish" : "Publish"}
        </button>
      </div>

      {/* Allowed origins */}
      <label style={labelStyle}>Allowed sites (one origin per line, e.g. https://acme.com)
        <textarea style={{ ...input, marginTop: 4, minHeight: 72, resize: "vertical", fontFamily: "var(--type-data, monospace)", fontSize: 13 }}
          placeholder={"https://acme.com\nhttps://www.acme.com"} value={origins} onChange={(e) => setOrigins(e.target.value)} />
      </label>
      <p style={{ fontSize: 11.5, color: "var(--text3)", margin: "-10px 0 0" }}>
        Only these sites can start a chat session. (Scheme + domain; a different subdomain is a different site.)
      </p>

      {/* Caps */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <label style={{ ...labelStyle, flex: "1 1 160px" }}>Messages per minute / visitor
          <input type="number" min={1} max={240} style={{ ...input, marginTop: 4 }} value={rate}
            onChange={(e) => setRate(Number(e.target.value))} />
        </label>
        <label style={{ ...labelStyle, flex: "1 1 160px" }}>Max messages per day
          <input type="number" min={1} max={100000} style={{ ...input, marginTop: 4 }} value={cap}
            onChange={(e) => setCap(Number(e.target.value))} />
        </label>
      </div>
      <p style={{ fontSize: 11.5, color: "var(--text3)", margin: "-10px 0 0" }}>
        Today: <strong style={{ color: "var(--text2)" }}>{st.embed_day_count}</strong> / {st.embed_daily_cap} messages. The daily limit is a hard cost ceiling — the bot stops answering once it&apos;s reached.
      </p>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button style={btn} disabled={busy}
          onClick={() => patch({ allowed_origins: originList, embed_rate_per_min: rate, embed_daily_cap: cap })}>
          {busy ? "Saving…" : "Save settings"}
        </button>
        {saved && <span style={{ fontSize: 13, color: "var(--accent)" }}>Saved</span>}
      </div>

      {/* Install snippet */}
      <div style={{ borderTop: "1px solid var(--border2)", paddingTop: 16, display: "grid", gap: 8 }}>
        <strong style={{ fontSize: 13, color: "var(--text)" }}>Install</strong>
        {st.public_key ? (
          <>
            <p style={{ fontSize: 12, color: "var(--text3)", margin: 0 }}>Paste this once into your site, just before <code style={{ fontFamily: "var(--type-data, monospace)" }}>&lt;/body&gt;</code>:</p>
            <textarea readOnly value={snippet} onFocus={(e) => e.currentTarget.select()}
              style={{ ...input, minHeight: 56, resize: "vertical", fontFamily: "var(--type-data, monospace)", fontSize: 12.5 }} />
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button style={btnGhost} onClick={() => { navigator.clipboard?.writeText(snippet); setCopied(true); setTimeout(() => setCopied(false), 1400); }}>
                {copied ? "Copied" : "Copy snippet"}
              </button>
              <button style={{ ...btnGhost, color: "#f87171", borderColor: "rgba(248,113,113,0.4)" }} disabled={busy}
                onClick={() => { if (confirm("Regenerate the key? The old snippet will stop working.")) patch({ regenerate: true }); }}>
                Regenerate key
              </button>
            </div>
            <p style={{ fontSize: 11, color: "var(--text3)", margin: 0 }}>Key: <code style={{ fontFamily: "var(--type-data, monospace)" }}>{st.public_key}</code> — this is public (it only starts a chat). Regenerating invalidates the old one.</p>
          </>
        ) : (
          <>
            <p style={{ fontSize: 12, color: "var(--text3)", margin: 0 }}>Generate a publishable key to get your embed snippet.</p>
            <button style={btn} disabled={busy} onClick={() => patch({ regenerate: true })}>Generate key</button>
          </>
        )}
      </div>
    </div>
  );
}
