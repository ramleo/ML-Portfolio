"use client";

/**
 * Site search — a grounded, website-only search box (⌘K or the navbar icon).
 *
 * No-hallucination by construction:
 *  - Structured asks ("list tools", "what platforms") and as-you-type matches are
 *    answered DIRECTLY from the real site data (capabilities + registry.json) and
 *    rendered as links / a table. No model, so nothing can be invented.
 *  - A free-form question ("Ask") is answered by the existing site RAG assistant
 *    (/api/chat), which is grounded in the handbook KB and already declines
 *    off-topic questions — reused as-is, no new ungrounded generation.
 *  - Anything with no data match and no grounded answer shows a fixed "only this
 *    website" message rather than guessing.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import capabilities from "@/data/capabilities";
import { scoreCapability } from "@/lib/toolSearch";
import { trackedFetch } from "@/lib/trackedFetch";
import registry from "@/data/registry.json";

type Platform = { id: string; title: string; description: string; href: string; tags: string[] };
const PLATFORMS = registry as unknown as Platform[];

// A few first-class pages the search should also be able to point at.
const PAGES: { title: string; href: string; keywords: string }[] = [
  { title: "Handbook", href: "/handbook", keywords: "handbook guide docs documentation book manual" },
  { title: "All tools", href: "/#tools", keywords: "tools toolkit catalog all capabilities" },
  { title: "Resume", href: "/Resume_W_Ramakrishnasai.pdf", keywords: "resume cv experience" },
];

const toolLink = (c: (typeof capabilities)[number]) => c.internalLink || c.link;
const wantsAll = (q: string, word: RegExp) =>
  word.test(q) && (/\b(list|show|all|every|what|which|give)\b/.test(q) || q.trim().split(/\s+/).length <= 2);

export default function SiteSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ⌘K / Ctrl-K to open, Esc to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else { setQ(""); setAnswer(null); setAsking(false); }
  }, [open]);

  const query = q.trim().toLowerCase();
  const showAllTools = query.length > 0 && wantsAll(query, /\btools?\b/);
  const showAllPlatforms = query.length > 0 && wantsAll(query, /\bplatforms?\b/);

  const toolMatches = query && !showAllTools
    ? capabilities.map((c) => ({ c, s: scoreCapability(c, query) })).filter((x) => x.s > 0)
        .sort((a, b) => b.s - a.s).slice(0, 8).map((x) => x.c)
    : [];
  const platformMatches = query && !showAllPlatforms
    ? PLATFORMS.filter((p) => (p.title + " " + p.tags.join(" ") + " " + p.description).toLowerCase().includes(query)).slice(0, 4)
    : [];
  const pageMatches = query
    ? PAGES.filter((p) => (p.title + " " + p.keywords).toLowerCase().includes(query)).slice(0, 3)
    : [];

  const hasResults = showAllTools || showAllPlatforms || toolMatches.length > 0 || platformMatches.length > 0 || pageMatches.length > 0;

  const ask = useCallback(async () => {
    const text = q.trim();
    if (!text || asking) return;
    setAsking(true); setAnswer(null);
    try {
      const res = await trackedFetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: text }], section: "hero", provider: "cohere" }),
      }, { tool: "site-search" });
      const data = await res.json();
      setAnswer(data.reply || "I can only help with questions about this website.");
    } catch {
      setAnswer("Something went wrong. Please try again.");
    } finally {
      setAsking(false);
    }
  }, [q, asking]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Search the site"
        style={{
          display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer",
          background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 999,
          padding: "0.35rem 0.7rem", color: "var(--text3)", fontSize: "0.8rem",
        }}
      >
        <SearchIcon size={14} />
        <span className="site-search-label">Search</span>
        <kbd style={{ fontSize: "0.62rem", border: "1px solid var(--border)", borderRadius: 4, padding: "0 0.25rem", color: "var(--text3)" }}>⌘K</kbd>
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(3px)", display: "flex", alignItems: "flex-start", justifyContent: "center",
            paddingTop: "10vh",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 640, maxWidth: "calc(100vw - 2rem)", maxHeight: "72vh", display: "flex", flexDirection: "column",
              background: "var(--bg-glass)", backdropFilter: "blur(18px)", border: "1px solid var(--border2)",
              borderRadius: 16, overflow: "hidden", boxShadow: "var(--shadow)",
            }}
          >
            {/* Input */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.9rem 1rem", borderBottom: "1px solid var(--border)" }}>
              <SearchIcon size={18} />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => { setQ(e.target.value); setAnswer(null); }}
                onKeyDown={(e) => { if (e.key === "Enter") ask(); }}
                placeholder="Search tools, platforms, pages — or ask a question"
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "var(--text)", fontSize: "0.95rem" }}
              />
              <kbd style={{ fontSize: "0.62rem", border: "1px solid var(--border)", borderRadius: 4, padding: "0 0.3rem", color: "var(--text3)" }}>Esc</kbd>
            </div>

            {/* Results */}
            <div style={{ overflowY: "auto", padding: "0.5rem" }}>
              {!query && (
                <p style={{ color: "var(--text3)", fontSize: "0.82rem", padding: "0.6rem 0.75rem", margin: 0 }}>
                  Try &quot;list tools&quot;, a tool name, or ask &quot;what can this platform do?&quot; — answers come only from this website.
                </p>
              )}

              {showAllTools && <ToolTable rows={capabilities} />}

              {showAllPlatforms && (
                <Group label="Platforms">
                  {PLATFORMS.map((p) => <ResultLink key={p.id} href={p.href} title={p.title} sub={p.description} />)}
                </Group>
              )}

              {toolMatches.length > 0 && (
                <Group label="Tools">
                  {toolMatches.map((c) => <ResultLink key={c.id} href={toolLink(c)} title={c.title} sub={c.subtitle} />)}
                </Group>
              )}
              {platformMatches.length > 0 && (
                <Group label="Platforms">
                  {platformMatches.map((p) => <ResultLink key={p.id} href={p.href} title={p.title} sub={p.description} />)}
                </Group>
              )}
              {pageMatches.length > 0 && (
                <Group label="Pages">
                  {pageMatches.map((p) => <ResultLink key={p.href} href={p.href} title={p.title} sub="" />)}
                </Group>
              )}

              {/* Ask (grounded) */}
              {query && (
                <div style={{ padding: "0.4rem 0.75rem" }}>
                  <button
                    onClick={ask} disabled={asking}
                    style={{
                      display: "flex", alignItems: "center", gap: "0.45rem", width: "100%", textAlign: "left",
                      background: "transparent", border: "1px dashed var(--border2)", borderRadius: 10,
                      padding: "0.55rem 0.7rem", color: "var(--text2)", cursor: asking ? "default" : "pointer", fontSize: "0.85rem",
                    }}
                  >
                    <SparkIcon size={14} />
                    {asking ? "Asking the site assistant…" : <>Ask the site assistant: <strong style={{ color: "var(--text)" }}>{q}</strong></>}
                  </button>
                  {answer && (
                    <div style={{ marginTop: "0.6rem", padding: "0.7rem 0.85rem", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text)", fontSize: "0.85rem", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                      {answer}
                    </div>
                  )}
                </div>
              )}

              {query && !hasResults && !answer && !asking && (
                <p style={{ color: "var(--text3)", fontSize: "0.82rem", padding: "0.6rem 0.75rem", margin: 0 }}>
                  No pages or tools match. Press Enter to ask the site assistant — it only answers about this website.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: "0.3rem 0" }}>
      <div style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text3)", padding: "0.3rem 0.75rem" }}>{label}</div>
      {children}
    </div>
  );
}

function ResultLink({ href, title, sub }: { href: string; title: string; sub: string }) {
  return (
    <a href={href} style={{ display: "block", padding: "0.5rem 0.75rem", borderRadius: 8, textDecoration: "none", color: "var(--text)" }}
       onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-card)")}
       onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
      <div style={{ fontSize: "0.87rem", fontWeight: 600 }}>{title}</div>
      {sub && <div style={{ fontSize: "0.74rem", color: "var(--text3)", marginTop: 1 }}>{sub}</div>}
    </a>
  );
}

function ToolTable({ rows }: { rows: typeof capabilities }) {
  return (
    <div style={{ padding: "0.3rem 0.5rem", overflowX: "auto" }}>
      <div style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text3)", padding: "0.3rem 0.25rem" }}>
        All tools ({rows.length})
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
        <thead>
          <tr style={{ textAlign: "left", color: "var(--text3)" }}>
            <th style={{ padding: "0.3rem 0.4rem", fontWeight: 600 }}>Tool</th>
            <th style={{ padding: "0.3rem 0.4rem", fontWeight: 600 }}>What it does</th>
            <th style={{ padding: "0.3rem 0.4rem", fontWeight: 600 }}>Open</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id} style={{ borderTop: "1px solid var(--border)" }}>
              <td style={{ padding: "0.4rem 0.4rem", fontWeight: 600, color: "var(--text)" }}>{c.title}</td>
              <td style={{ padding: "0.4rem 0.4rem", color: "var(--text2)" }}>{c.subtitle}</td>
              <td style={{ padding: "0.4rem 0.4rem" }}>
                <a href={toolLink(c)} style={{ color: "var(--accent-from)", textDecoration: "none", fontWeight: 600 }}>Open →</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SearchIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function SparkIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
    </svg>
  );
}
