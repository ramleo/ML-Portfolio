"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Message = { role: "user" | "assistant"; content: string };
type Provider = "gemini" | "claude" | "groq";

const PROVIDERS: { id: Provider; label: string; color: string }[] = [
  { id: "gemini", label: "Gemini", color: "#38bdf8" },
  { id: "claude", label: "Claude", color: "#f59e0b" },
  { id: "groq",   label: "Groq",   color: "#34d399" },
];

const SECTION_IDS = ["hero", "about", "skills", "projects", "pipeline", "news", "timeline", "contact"];

const SECTION_HINTS: Record<string, string> = {
  hero:     "Ask me about Ramakrishnasai's ML experience",
  about:    "Ask about background, education, or availability",
  skills:   "Ask how XGBoost, CNNs, RAG, or any skill is used",
  projects: "Ask about tech stack, accuracy, or how a project was built",
  pipeline: "Curious about any stage of the ML pipeline?",
  news:     "Ask anything about his work or AI/ML in general",
  timeline: "Ask about career milestones or education",
  contact:  "Ask about availability, roles, or collaboration",
};

function ChatIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
        fill="rgba(255,255,255,0.12)" />
      <line x1="9" y1="10" x2="15" y2="10" />
      <line x1="9" y1="13" x2="13" y2="13" />
    </svg>
  );
}

function CloseIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function SendIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" fill="rgba(255,255,255,0.15)" />
    </svg>
  );
}

function SparkIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="#818cf8" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L14 9.5L22 12L14 14.5L12 22L10 14.5L2 12L10 9.5L12 2Z"
        fill="#818cf8" fillOpacity={0.2} />
    </svg>
  );
}

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentSection, setCurrentSection] = useState("hero");
  const [provider, setProvider] = useState<Provider>("gemini");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Track which section is most visible via IntersectionObserver
  useEffect(() => {
    const visible = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          visible.set(entry.target.id, entry.intersectionRatio);
        }
        let best = "hero";
        let bestRatio = -1;
        for (const [id, ratio] of visible) {
          if (ratio > bestRatio) { bestRatio = ratio; best = id; }
        }
        setCurrentSection(best);
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1.0] }
    );

    for (const id of SECTION_IDS) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  // Scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200);
  }, [open]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          section: currentSection,
          provider,
        }),
      });
      const data = await res.json();
      setMessages([...next, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages([...next, { role: "assistant", content: "Something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, currentSection]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const hint = SECTION_HINTS[currentSection] ?? "Ask me anything";
  const hasMessages = messages.length > 0;

  return (
    <>
      {/* Floating chat window */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="chat-window"
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            style={{
              position: "fixed",
              bottom: "5.5rem",
              right: "1.25rem",
              width: 340,
              maxWidth: "calc(100vw - 2rem)",
              zIndex: 9999,
              display: "flex",
              flexDirection: "column",
              borderRadius: 18,
              overflow: "hidden",
              background: "var(--bg-glass)",
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
              border: "1px solid var(--border2)",
              boxShadow: "0 24px 64px rgba(0,0,0,0.35), 0 0 0 1px rgba(129,140,248,0.12)",
            }}
          >
            {/* Header */}
            <div style={{
              height: 3,
              background: "linear-gradient(90deg, #818cf8, #38bdf8, #34d399)",
              flexShrink: 0,
            }} />
            <div style={{
              padding: "0.85rem 1rem",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              flexShrink: 0,
            }}>
              <span style={{
                width: 30, height: 30, borderRadius: 9,
                background: "linear-gradient(135deg, #6366f1, #38bdf8)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <ChatIcon size={15} />
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text)" }}>AIRaML Assistant</div>
                <div style={{ fontSize: "0.68rem", color: "var(--text3)", marginTop: 1 }}>
                  {currentSection} section
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--text3)", padding: "0.25rem",
                  borderRadius: 6, display: "flex", alignItems: "center",
                  transition: "color 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text3)")}
                aria-label="Close chat"
              >
                <CloseIcon size={15} />
              </button>
            </div>

            {/* Provider picker */}
            <div style={{
              padding: "0.5rem 0.85rem",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              flexShrink: 0,
            }}>
              <span style={{ fontSize: "0.62rem", color: "var(--text3)", marginRight: "0.2rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Model</span>
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setProvider(p.id); setMessages([]); }}
                  style={{
                    padding: "0.2rem 0.6rem",
                    borderRadius: 999,
                    border: `1px solid ${provider === p.id ? p.color + "88" : "var(--border)"}`,
                    background: provider === p.id ? p.color + "18" : "transparent",
                    color: provider === p.id ? p.color : "var(--text3)",
                    fontSize: "0.7rem",
                    fontWeight: provider === p.id ? 700 : 400,
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Messages */}
            <div style={{
              flex: 1,
              overflowY: "auto",
              padding: "0.85rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.65rem",
              minHeight: 240,
              maxHeight: 360,
            }}>
              {!hasMessages && (
                <div style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  justifyContent: "center", height: "100%", gap: "0.5rem",
                  textAlign: "center", padding: "1rem 0.5rem",
                }}>
                  <SparkIcon size={20} />
                  <p style={{ fontSize: "0.78rem", color: "var(--text2)", lineHeight: 1.6, margin: 0 }}>
                    {hint}
                  </p>
                </div>
              )}

              {messages.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                  }}
                >
                  <div style={{
                    maxWidth: "82%",
                    padding: "0.55rem 0.8rem",
                    borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                    fontSize: "0.82rem",
                    lineHeight: 1.55,
                    background: msg.role === "user"
                      ? "linear-gradient(135deg, #6366f1, #38bdf8)"
                      : "var(--bg-card)",
                    color: msg.role === "user" ? "#fff" : "var(--text2)",
                    border: msg.role === "user" ? "none" : "1px solid var(--border)",
                  }}>
                    {msg.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div style={{ display: "flex", justifyContent: "flex-start" }}>
                  <div style={{
                    padding: "0.55rem 0.8rem",
                    borderRadius: "14px 14px 14px 4px",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    display: "flex", gap: "0.3rem", alignItems: "center",
                  }}>
                    {[0, 1, 2].map((d) => (
                      <span key={d} style={{
                        width: 6, height: 6, borderRadius: "50%",
                        background: "var(--text3)",
                        animation: `bounce 1.2s ease-in-out ${d * 0.2}s infinite`,
                        display: "inline-block",
                      }} />
                    ))}
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{
              padding: "0.75rem",
              borderTop: "1px solid var(--border)",
              display: "flex",
              gap: "0.5rem",
              flexShrink: 0,
            }}>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={hint}
                disabled={loading}
                style={{
                  flex: 1,
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "0.5rem 0.75rem",
                  fontSize: "0.82rem",
                  color: "var(--text)",
                  outline: "none",
                  transition: "border-color 0.15s",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#818cf8")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
              />
              <button
                onClick={send}
                disabled={!input.trim() || loading}
                style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: input.trim() && !loading
                    ? "linear-gradient(135deg, #6366f1, #38bdf8)"
                    : "var(--border)",
                  border: "none", cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                  color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "background 0.2s, transform 0.15s",
                }}
                onMouseEnter={(e) => { if (input.trim() && !loading) e.currentTarget.style.transform = "scale(1.07)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                aria-label="Send message"
              >
                <SendIcon size={15} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating trigger button */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close chat" : "Open chat"}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        style={{
          position: "fixed",
          bottom: "1.25rem",
          right: "1.25rem",
          zIndex: 9999,
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #6366f1, #38bdf8)",
          border: "none",
          cursor: "pointer",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 20px rgba(99,102,241,0.45), 0 0 0 2px rgba(99,102,241,0.18)",
        }}
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.18 }}>
              <CloseIcon size={18} />
            </motion.span>
          ) : (
            <motion.span key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.18 }}>
              <ChatIcon size={20} />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
      `}</style>
    </>
  );
}
