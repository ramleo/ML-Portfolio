"use client";

import { useEffect, useRef, useState } from "react";
import { sanitizeConfig } from "@/lib/tenant/config";
import ChatMarkdown from "./ChatMarkdown";
import { input, btn, type Tenant } from "./ui";

/** Test the bot against its own knowledge base (owner-side), using this tenant's saved
 * config. Starter chips + a typeahead dropdown (from the KB/persona) help before/while
 * typing; Smart completion adds inline ghost-text prediction (Tab to accept). Bot
 * answers render as markdown. Each turn calls /api/tenant/query. */
interface Msg { role: "bot" | "user"; text: string; sources?: string[]; webSources?: string[] }

export default function ChatbotTest({ tenant }: { tenant: Tenant }) {
  const cfg = sanitizeConfig(tenant.config);
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "bot", text: cfg.greeting }]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [ghost, setGhost] = useState("");
  const [hideDropdown, setHideDropdown] = useState(false);
  const qRef = useRef("");
  const ghostTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!cfg.autosuggest) return;
    (async () => {
      try {
        const res = await fetch(`/api/tenants/${tenant.id}/suggestions`, { cache: "no-store" });
        if (res.ok) setSuggestions((await res.json()).suggestions ?? []);
      } catch { /* optional */ }
    })();
  }, [tenant.id, cfg.autosuggest]);

  function onChange(v: string) {
    qRef.current = v; setQ(v); setGhost(""); setHideDropdown(false);
    if (ghostTimer.current) clearTimeout(ghostTimer.current);
    // Don't suggest a continuation once the question is already complete.
    if (!cfg.ghost_completion || v.trim().length < 4 || v.length > 80 || /[?.!]\s*$/.test(v)) return;
    ghostTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/tenants/${tenant.id}/complete`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prefix: v }),
        });
        if (res.ok && qRef.current === v) setGhost((await res.json()).completion ?? "");
      } catch { /* optional */ }
    }, 400);
  }

  function accept() {
    const nv = q + ghost; qRef.current = nv; setQ(nv); setGhost("");
  }

  async function send(text?: string) {
    const question = (text ?? q).trim();
    if (!question || busy) return;
    setMsgs((m) => [...m, { role: "user", text: question }]);
    setQ(""); qRef.current = ""; setGhost(""); setBusy(true);
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
              {m.role === "bot" ? <ChatMarkdown text={m.text} /> : <div style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>}
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
        {matches.length > 0 && !hideDropdown && (
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
          <div style={{ position: "relative", flex: 1 }}>
            {ghost && (
              <div aria-hidden style={{ position: "absolute", inset: 0, padding: "9px 11px", border: "1px solid transparent", boxSizing: "border-box", fontSize: 14, display: "flex", alignItems: "center", whiteSpace: "pre", overflow: "hidden", pointerEvents: "none", borderRadius: "var(--radius-sm)" }}>
                <span style={{ color: "transparent" }}>{q}</span><span style={{ color: "var(--text3)" }}>{ghost}</span>
              </div>
            )}
            <input style={{ ...input, background: "transparent", position: "relative" }} placeholder="Ask the bot a question…" value={q}
              onChange={(e) => onChange(e.target.value)}
              onBlur={() => setHideDropdown(true)}
              onKeyDown={(e) => {
                if (ghost && e.key === "Tab") { e.preventDefault(); accept(); return; }
                if (ghost && e.key === "ArrowRight") {
                  const el = e.currentTarget;
                  if (el.selectionStart === q.length && el.selectionEnd === q.length) { e.preventDefault(); accept(); return; }
                }
                if (e.key === "Escape") { setGhost(""); setHideDropdown(true); return; }
                if (e.key === "Enter") send();
              }} />
          </div>
          <button style={btn} onClick={() => send()} disabled={busy || !q.trim()}>Send</button>
        </div>
      </div>
    </div>
  );
}
