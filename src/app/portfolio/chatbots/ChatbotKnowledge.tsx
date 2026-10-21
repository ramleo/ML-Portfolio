"use client";

import { useCallback, useEffect, useState } from "react";
import { input, btn, btnDanger, labelStyle, type Tenant } from "./ui";

/** A chatbot's knowledge base: paste a document (chunked + embedded + stored tagged
 * with this tenant), and list / remove existing sources. (File upload for PDF/docx
 * is a fast follow — M2 starts with pasted text.) */
interface Source { source: string; chunks: number }

export default function ChatbotKnowledge({ tenant }: { tenant: Tenant }) {
  const [sources, setSources] = useState<Source[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/tenants/${tenant.id}/sources`, { cache: "no-store" });
      if (res.ok) setSources((await res.json()).sources ?? []);
    } catch { /* ignore */ }
    setLoaded(true);
  }, [tenant.id]);

  useEffect(() => { (async () => { await load(); })(); }, [load]);

  async function add() {
    const t = text.trim();
    if (!t) return;
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/tenant/ingest", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: tenant.id, source: name.trim() || "document", text: t }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) { setMsg(`Indexed ${d.indexed} chunks.`); setText(""); setName(""); await load(); }
      else setMsg(d.error ?? "Ingest failed.");
    } catch { setMsg("Ingest failed."); }
    setBusy(false);
  }

  async function del(source: string) {
    setPending(source);
    try {
      await fetch(`/api/tenants/${tenant.id}/sources`, {
        method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ source }),
      });
      await load();
    } catch { /* ignore */ }
    setPending(null);
  }

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 680 }}>
      <div style={{ display: "grid", gap: 10 }}>
        <label style={labelStyle}>Source name (optional)
          <input style={{ ...input, marginTop: 4 }} placeholder="e.g. FAQ, Pricing page" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label style={labelStyle}>Paste document text
          <textarea style={{ ...input, marginTop: 4, minHeight: 130, resize: "vertical", fontFamily: "inherit" }}
            placeholder="Paste the content this bot should answer from…" value={text} onChange={(e) => setText(e.target.value)} />
        </label>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button style={btn} onClick={add} disabled={busy || !text.trim()}>{busy ? "Indexing…" : "Add to knowledge base"}</button>
          {msg && <span style={{ fontSize: 13, color: "var(--text2)" }}>{msg}</span>}
        </div>
      </div>

      <div>
        <p style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text3)", margin: "0 0 8px" }}>Sources</p>
        {!loaded ? <p style={{ fontSize: 13, color: "var(--text3)", margin: 0 }}>Loading…</p>
          : sources.length === 0 ? <p style={{ fontSize: 13, color: "var(--text3)", margin: 0 }}>No documents yet. Add one above.</p>
          : (
            <div style={{ display: "grid", gap: 8 }}>
              {sources.map((s) => (
                <div key={s.source} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "9px 12px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ fontSize: 14, color: "var(--text)" }}>{s.source}</span>
                    <span style={{ fontSize: 12, color: "var(--text3)", marginLeft: 8 }}>{s.chunks} chunk{s.chunks === 1 ? "" : "s"}</span>
                  </span>
                  <button style={{ ...btnDanger, padding: "5px 11px", fontSize: 13 }} onClick={() => del(s.source)} disabled={pending === s.source}>
                    {pending === s.source ? "Removing…" : "Remove"}
                  </button>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}
