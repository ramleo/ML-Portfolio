"use client";

import { useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

// Turn internal site paths (bare or in `backticks`) and [label](/path) markdown into
// clickable links, so a reply that mentions /tools/preprocessing is a link the user can
// click — no need to retype a path (case/spelling no longer matters). External URLs are
// left as plain text; the homepage assistant is website-only.
const RICH_RE =
  /\[([^\]]+)\]\((\/[^)\s]+)\)|`?(\/(?:tools|platforms|qa|audit|eval|docs|api|dashboard)\/[A-Za-z0-9/_-]+)`?/g;

function renderRich(text: string) {
  const out: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  RICH_RE.lastIndex = 0;
  while ((m = RICH_RE.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const href = m[2] || m[3];
    const label = m[1] || m[3];
    out.push(
      <a key={m.index} href={href} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-from)", fontWeight: 600, textDecoration: "underline" }}>
        {label}
      </a>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function CopyButton({ text, align }: { text: string; align: "flex-start" | "flex-end" }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ }
      }}
      aria-label="Copy message"
      style={{
        marginTop: 3, alignSelf: align, display: "inline-flex", alignItems: "center", gap: "0.25rem",
        background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: "0.66rem", padding: "2px 2px",
      }}
    >
      {copied ? "Copied" : (
        <>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          Copy
        </>
      )}
    </button>
  );
}

/** The chat transcript: bubbles (selectable text + a Copy button on replies) and the
 *  typing indicator. Extracted from Chatbot.tsx to keep that file under the line limit. */
export default function ChatMessages({ messages, loading }: { messages: Message[]; loading: boolean }) {
  return (
    <>
      {messages.map((msg, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
          <div style={{
            maxWidth: "82%",
            padding: "0.55rem 0.8rem",
            borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
            fontSize: "0.82rem",
            lineHeight: 1.55,
            background: msg.role === "user" ? "linear-gradient(135deg, var(--accent), var(--accent-via))" : "var(--bg-card)",
            color: msg.role === "user" ? "#fff" : "var(--text2)",
            border: msg.role === "user" ? "none" : "1px solid var(--border)",
            whiteSpace: "pre-wrap",
            userSelect: "text",
          }}>
            {msg.role === "assistant" ? renderRich(msg.content) : msg.content}
          </div>
          <CopyButton text={msg.content} align={msg.role === "user" ? "flex-end" : "flex-start"} />
        </div>
      ))}

      {loading && (
        <div style={{ display: "flex", justifyContent: "flex-start" }}>
          <div style={{
            padding: "0.55rem 0.8rem", borderRadius: "14px 14px 14px 4px",
            background: "var(--bg-card)", border: "1px solid var(--border)",
            display: "flex", gap: "0.3rem", alignItems: "center",
          }}>
            {[0, 1, 2].map((d) => (
              <span key={d} style={{
                width: 6, height: 6, borderRadius: "50%", background: "var(--text3)",
                animation: `bounce 1.2s ease-in-out ${d * 0.2}s infinite`, display: "inline-block",
              }} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
