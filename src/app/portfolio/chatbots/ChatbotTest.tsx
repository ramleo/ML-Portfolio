"use client";

import { useState } from "react";
import { sanitizeConfig } from "@/lib/tenant/config";
import { input, btn, type Tenant } from "./ui";

/** Test the bot against its own knowledge base (owner-side), using this tenant's
 * saved config. Each turn calls /api/tenant/query; matches are shown so you can see
 * which sources it used. */
interface Msg { role: "bot" | "user"; text: string; sources?: string[] }

export default function ChatbotTest({ tenant }: { tenant: Tenant }) {
  const cfg = sanitizeConfig(tenant.config);
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "bot", text: cfg.greeting }]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    const question = q.trim();
    if (!question || busy) return;
    setMsgs((m) => [...m, { role: "user", text: question }]);
    setQ(""); setBusy(true);
    try {
      const res = await fetch("/api/tenant/query", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: tenant.id, question }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        const srcs = [...new Set((d.matches ?? []).map((m: { source: string }) => m.source))] as string[];
        setMsgs((m) => [...m, { role: "bot", text: d.answer || "(no answer)", sources: srcs }]);
      } else {
        setMsgs((m) => [...m, { role: "bot", text: `Error: ${d.error ?? res.status}` }]);
      }
    } catch {
      setMsgs((m) => [...m, { role: "bot", text: "Error reaching the server." }]);
    }
    setBusy(false);
  }

  return (
    <div style={{ display: "grid", gap: 12, maxWidth: 680 }}>
      <div style={{ display: "grid", gap: 10, padding: 14, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", minHeight: 160 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{ maxWidth: "85%", padding: "8px 12px", borderRadius: 12, fontSize: 14, lineHeight: 1.5,
              background: m.role === "user" ? "var(--accent)" : "var(--bg-card)",
              color: m.role === "user" ? "#fff" : "var(--text)",
              border: m.role === "user" ? "none" : "1px solid var(--border2)" }}>
              <div style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>
              {m.sources && m.sources.length > 0 && (
                <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 6 }}>sources: {m.sources.join(", ")}</div>
              )}
            </div>
          </div>
        ))}
        {busy && <div style={{ fontSize: 13, color: "var(--text3)" }}>Thinking…</div>}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input style={input} placeholder="Ask the bot a question…" value={q}
          onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} />
        <button style={btn} onClick={send} disabled={busy || !q.trim()}>Send</button>
      </div>
    </div>
  );
}
