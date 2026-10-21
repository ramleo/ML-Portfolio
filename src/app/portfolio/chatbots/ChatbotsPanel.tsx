"use client";

import { useCallback, useEffect, useState } from "react";
import ChatbotDetail from "./ChatbotDetail";
import { box, input, btn, type Tenant } from "./ui";

/** Owner builder orchestrator: list + create + delete chatbots, pick one to open its
 * detail (Configure / Knowledge / Test). Talks to /api/tenants, owner-gated +
 * owner_id-scoped server-side. */
export default function ChatbotsPanel() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/tenants", { cache: "no-store" });
      if (res.ok) { setTenants((await res.json()).tenants ?? []); setErr(null); }
      else setErr("Couldn't load chatbots.");
    } catch { setErr("Couldn't load chatbots."); }
    setLoaded(true);
  }, []);

  useEffect(() => { (async () => { await load(); })(); }, [load]);

  async function create() {
    const n = name.trim();
    if (!n) return;
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/tenants", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: n }),
      });
      if (res.ok) { const d = await res.json(); setName(""); await load(); setSelectedId(d.tenant?.id ?? null); }
      else setErr((await res.json().catch(() => ({}))).error ?? "Create failed.");
    } catch { setErr("Create failed."); }
    setBusy(false);
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={box}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <label style={{ flex: "1 1 240px", fontSize: 12, color: "var(--text2)" }}>
            New chatbot name
            <input style={{ ...input, marginTop: 4 }} placeholder="e.g. Acme Support" value={name}
              onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && create()} />
          </label>
          <button style={btn} onClick={create} disabled={busy || !name.trim()}>{busy ? "Creating…" : "Create chatbot"}</button>
        </div>
        {err && <p style={{ fontSize: 13, color: "#f87171", margin: "10px 0 0" }}>{err}</p>}
      </div>

      {/* List */}
      <div style={{ display: "grid", gap: 10 }}>
        {!loaded ? <p style={{ fontSize: 13.5, color: "var(--text3)", margin: 0 }}>Loading…</p>
          : tenants.length === 0 ? <p style={{ fontSize: 13.5, color: "var(--text3)", margin: 0 }}>No chatbots yet — create one above.</p>
          : tenants.map((t) => {
            const isOpen = t.id === selectedId;
            return (
              <div key={t.id} style={{ ...box, padding: 0, overflow: "hidden", borderColor: isOpen ? "var(--accent)" : "var(--border2)" }}>
                <button onClick={() => setSelectedId(isOpen ? null : t.id)}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", textAlign: "left", padding: "14px 16px", background: "transparent", border: "none", cursor: "pointer" }}>
                  <span>
                    <span style={{ fontSize: 15, color: "var(--text)", fontWeight: 600 }}>{t.name}</span>
                    <span style={{ fontSize: 12, color: "var(--text3)", marginLeft: 10 }}>
                      {(t.config?.provider ?? "cohere")} · {t.slug}
                    </span>
                  </span>
                  <span style={{ fontSize: 13, color: "var(--text2)" }}>{isOpen ? "▲" : "▼"}</span>
                </button>
                {isOpen && (
                  <div style={{ borderTop: "1px solid var(--border)", padding: 16 }}>
                    <ChatbotDetail tenant={t} onChanged={load} onDeleted={() => { setSelectedId(null); void load(); }} />
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
