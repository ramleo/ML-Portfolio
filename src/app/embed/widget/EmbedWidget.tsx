"use client";

import { useEffect, useRef, useState } from "react";
import ChatMarkdown from "@/app/portfolio/chatbots/ChatMarkdown";

/** The in-iframe chat client. The loader posts `embed:init` with a session token +
 * the bot's greeting/config; we answer via /api/embed/query (Bearer token) and load
 * starter chips via /api/embed/suggest. No secret lives here — the token is minted on
 * the host side after the origin check and is short-lived. */
interface Msg { role: "bot" | "user"; text: string; web?: string[] }
interface Init { token: string; name?: string; greeting?: string; autosuggest?: boolean }

function CopyBtn({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" aria-label="Copy message"
      onClick={() => { navigator.clipboard?.writeText(text); setDone(true); setTimeout(() => setDone(false), 1200); }}
      style={{ marginTop: 3, background: "transparent", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4 }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>
      {done ? "Copied" : "Copy"}
    </button>
  );
}

export default function EmbedWidget() {
  const [init, setInit] = useState<Init | null>(null);
  const [status, setStatus] = useState<"loading" | "active" | "unavailable">("loading");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const token = useRef("");
  const scroller = useRef<HTMLDivElement>(null);

  // Announce readiness to the loader, which replies with embed:init. If nothing arrives
  // (the bot isn't published / origin not allowed), show a quiet unavailable state.
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.source !== window.parent) return;
      const d = e.data as { type?: string } & Init;
      if (d?.type === "embed:init" && typeof d.token === "string" && d.token) {
        token.current = d.token;
        setInit({ token: d.token, name: d.name, greeting: d.greeting, autosuggest: d.autosuggest });
        setStatus("active");
        setMsgs([{ role: "bot", text: d.greeting || "Hi! How can I help?" }]);
      } else if (d?.type === "embed:unavailable") {
        setStatus("unavailable");
      }
    };
    window.addEventListener("message", onMsg);
    window.parent?.postMessage({ type: "embed:ready" }, "*");
    const t = setTimeout(() => setStatus((s) => (s === "loading" ? "unavailable" : s)), 8000);
    return () => { window.removeEventListener("message", onMsg); clearTimeout(t); };
  }, []);

  // Starter chips (best-effort) once we have a session and the bot allows them.
  useEffect(() => {
    if (!init?.token || init.autosuggest === false) return;
    (async () => {
      try {
        const res = await fetch("/api/embed/suggest", {
          method: "POST", headers: { Authorization: `Bearer ${init.token}` },
        });
        if (res.ok) setSuggestions((await res.json()).suggestions ?? []);
      } catch { /* optional */ }
    })();
  }, [init?.token, init?.autosuggest]);

  useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight }); }, [msgs, busy]);

  async function send(text?: string) {
    const question = (text ?? q).trim();
    if (!question || busy || !token.current) return;
    setMsgs((m) => [...m, { role: "user", text: question }]);
    setQ(""); setBusy(true);
    try {
      const res = await fetch("/api/embed/query", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token.current}` },
        body: JSON.stringify({ question }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) setMsgs((m) => [...m, { role: "bot", text: d.answer || "(no answer)", web: (d.web_sources ?? []) as string[] }]);
      else setMsgs((m) => [...m, { role: "bot", text: d.error || "Something went wrong. Please try again." }]);
    } catch {
      setMsgs((m) => [...m, { role: "bot", text: "Couldn't reach the assistant. Please try again." }]);
    }
    setBusy(false);
  }

  const showChips = msgs.length <= 1 && suggestions.length > 0;

  return (
    <div className="ew-root" style={rootVars}>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--bg)" }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "12px 14px", borderBottom: "1px solid var(--border)", background: "var(--bg-card)" }}>
          <strong style={{ fontSize: 14, color: "var(--text)" }}>{init?.name || "Assistant"}</strong>
          <button aria-label="Close" onClick={() => window.parent?.postMessage({ type: "embed:close" }, "*")}
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text2)", display: "inline-flex", padding: 2 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </header>

        <div ref={scroller} style={{ flex: 1, overflowY: "auto", padding: 14, display: "grid", gap: 10, alignContent: "start" }}>
          {status === "unavailable" && (
            <p style={{ fontSize: 13, color: "var(--text2)", textAlign: "center", margin: "auto" }}>
              This assistant isn&apos;t available on this site.
            </p>
          )}
          {msgs.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "88%" }}>
                <div style={{ padding: "8px 12px", borderRadius: 12, fontSize: 14, lineHeight: 1.5,
                  background: m.role === "user" ? "var(--accent)" : "var(--bg-card)",
                  color: m.role === "user" ? "#fff" : "var(--text)",
                  border: m.role === "user" ? "none" : "1px solid var(--border)" }}>
                  {m.role === "bot" ? <ChatMarkdown text={m.text} /> : <div style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>}
                  {m.web && m.web.length > 0 && (
                    <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>
                      web: {m.web.map((u, j) => (
                        <span key={j}>{j > 0 ? ", " : ""}<a href={u} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>{(() => { try { return new URL(u).hostname; } catch { return u; } })()}</a></span>
                      ))}
                    </div>
                  )}
                </div>
                {m.role === "bot" && <CopyBtn text={m.text} />}
              </div>
            </div>
          ))}
          {busy && <div style={{ fontSize: 13, color: "var(--text3)" }}>Thinking…</div>}
          {showChips && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
              {suggestions.map((s) => (
                <button key={s} type="button" onClick={() => send(s)}
                  style={{ padding: "6px 10px", fontSize: 12.5, cursor: "pointer", borderRadius: 9999, border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text2)", textAlign: "left" }}>
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {status === "active" && (
          <div style={{ display: "flex", gap: 8, padding: 12, borderTop: "1px solid var(--border)", background: "var(--bg-card)" }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }}
              placeholder="Type a message…" aria-label="Message"
              style={{ flex: 1, padding: "9px 11px", fontSize: 14, color: "var(--text)", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, outline: "none" }} />
            <button onClick={() => send()} disabled={busy || !q.trim()}
              style={{ padding: "9px 14px", fontSize: 14, fontWeight: 600, color: "#fff", background: "var(--accent)", border: "none", borderRadius: 8, cursor: busy || !q.trim() ? "default" : "pointer", opacity: busy || !q.trim() ? 0.6 : 1 }}>
              Send
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Self-contained palette so the widget looks consistent on any host site, independent
 * of whatever CSS the embedding page loads. Also supplies the var() names ChatMarkdown
 * uses. (Light, neutral — safe on both light and dark host pages.)
 *
 * Anchored to the iframe viewport with fixed/inset:0 (not height:100%) so it always
 * fills the frame regardless of the host app's layout height chain, and paints its own
 * white ground over the site's (dark) <body> — otherwise the page background shows
 * through below the chat. */
const rootVars: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  overflow: "hidden",
  background: "#ffffff",
  ["--bg" as string]: "#ffffff",
  ["--bg-card" as string]: "#f6f7f9",
  ["--text" as string]: "#15181d",
  ["--text2" as string]: "#4a515b",
  ["--text3" as string]: "#8a919c",
  ["--border" as string]: "#e4e7ec",
  ["--border2" as string]: "#e4e7ec",
  ["--accent" as string]: "#2563eb",
  ["--radius-sm" as string]: "8px",
  colorScheme: "light",
  fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
};
