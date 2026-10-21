"use client";

import { useEffect, useState } from "react";
import { sanitizeConfig } from "@/lib/tenant/config";
import { input, btn, type Tenant } from "./ui";

/** Test the bot against its own knowledge base (owner-side), using this tenant's
 * saved config. Suggestion chips (from the KB) show on open; typing filters them as
 * typeahead. Each turn calls /api/tenant/query; matches + web citations are shown. */
interface Msg { role: "bot" | "user"; text: string; sources?: string[]; webSources?: string[] }

export default function ChatbotTest({ tenant }: { tenant: Tenant }) {
  const cfg = sanitizeConfig(tenant.config);
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "bot", text: cfg.greeting }]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (!cfg.autosuggest) return;
    (async () => {
      try {
        const res = await fetch(`/api/tenants/${tenant.id}/suggestions`, { cache: "no-store" });
        if (res.ok) setSuggestions((await res.json()).suggestions ?? []);
      } catch { /* suggestions are optional */ }
    })();
  }, [tenant.id, cfg.autosuggest]);

  async function send(text?: string) {
    const question = (text ?? q).trim();
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
        setMsgs((m) => [...m, { role: "bot", text: d.answer || "(no answer)", sources: srcs, webSources: (d.web_sources ?? []) as string[] }]);
      } else {
        setMsgs((m) => [...m, { role: "bot", text: `Error: ${d.error ?? res.status}` }]);
      }
    } catch {
      setMsgs((m) => [...m, { role: "bot", text: "Error reaching the server." }]);
    }
    setBusy(false);
  }

  // Typeahead: filter suggestions by what's typed (cheap — no LLM per keystroke).
  const typed = q.trim().toLowerCase();
  const matches = typed ? suggestions.filter((s) => s.toLowerCase().includes(typed) && s.toLowerCase() !== typed).slice(0, 5) : [];
  const showChips = msgs.length <= 1 && suggestions.length > 0;

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
              {m.webSources && m.webSources.length > 0 && (
                <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>
                  web: {m.webSources.map((u, j) => (
                    <span key={j}>{j > 0 ? ", " : ""}<a href={u} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>{(() => { try { return new URL(u).hostname; } catch { return u; } })()}</a></span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {busy && <div style={{ fontSize: 13, color: "var(--text3)" }}>Thinking…</div>}
      </div>

      {/* Suggestion chips — shown before the first question */}
      {showChips && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {suggestions.map((s) => (
            <button key={s} type="button" onClick={() => send(s)}
              style={{ padding: "6px 11px", fontSize: 12.5, cursor: "pointer", borderRadius: 9999, border: "1px solid var(--border2)", background: "var(--bg-card)", color: "var(--text2)", textAlign: "left" }}>
              {s}
            </button>
          ))}
        </div>
      )}

      <div style={{ position: "relative" }}>
        {/* Typeahead dropdown */}
        {matches.length > 0 && (
          <div style={{ position: "absolute", bottom: "calc(100% + 4px)", left: 0, right: 0, background: "var(--bg-card)", border: "1px solid var(--border2)", borderRadius: "var(--radius-sm)", boxShadow: "0 8px 24px rgba(0,0,0,0.18)", overflow: "hidden", zIndex: 5 }}>
            {matches.map((s) => (
              <button key={s} type="button" onMouseDown={(e) => { e.preventDefault(); send(s); }}
                style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 11px", fontSize: 13, cursor: "pointer", background: "transparent", border: "none", color: "var(--text)" }}>
                {s}
              </button>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <input style={input} placeholder="Ask the bot a question…" value={q}
            onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} />
          <button style={btn} onClick={() => send()} disabled={busy || !q.trim()}>Send</button>
        </div>
      </div>
    </div>
  );
}
