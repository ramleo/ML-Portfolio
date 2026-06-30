"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import RagSourceCard from "./RagSourceCard";
import RagIngestButton from "./RagIngestButton";
import ToolsAIChatSettings from "./ToolsAIChatSettings";
import { ML_UNIFIED_API } from "@/config/urls";

export type ToolChatContext = {
  tool: string;
  summary: string;
};

type Message = { role: "user" | "assistant"; content: string };

type ProviderConfig = {
  id: string;
  label: string;
  color: string;
  models: { id: string; label: string }[];
  envKeyNote: string;
};

const PROVIDERS: ProviderConfig[] = [
  {
    id: "gemini", label: "Gemini", color: "#38bdf8",
    models: [
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
      { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash" },
    ],
    envKeyNote: "Default key provided. Add your own for higher limits.",
  },
  {
    id: "claude", label: "Claude", color: "#f59e0b",
    models: [
      { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
      { id: "claude-sonnet-4-6",         label: "Claude Sonnet 4.6" },
    ],
    envKeyNote: "Paste your Anthropic API key.",
  },
  {
    id: "openai", label: "OpenAI", color: "#34d399",
    models: [
      { id: "gpt-4o-mini", label: "GPT-4o Mini" },
      { id: "gpt-4o",      label: "GPT-4o" },
    ],
    envKeyNote: "Paste your OpenAI API key.",
  },
  {
    id: "groq", label: "Groq", color: "#a78bfa",
    models: [
      { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
      { id: "llama-3.1-8b-instant",   label: "Llama 3.1 8B Instant" },
      { id: "mixtral-8x7b-32768",   label: "Mixtral 8x7B" },
      { id: "gemma2-9b-it",         label: "Gemma 2 9B" },
    ],
    envKeyNote: "Paste your Groq API key (free tier available).",
  },
  {
    id: "together", label: "Together AI", color: "#fb923c",
    models: [
      { id: "meta-llama/Llama-3-70b-chat-hf",          label: "Llama 3 70B" },
      { id: "mistralai/Mixtral-8x7B-Instruct-v0.1",    label: "Mixtral 8x7B" },
      { id: "Qwen/Qwen2-72B-Instruct",                 label: "Qwen 2 72B" },
    ],
    envKeyNote: "Paste your Together AI API key.",
  },
  {
    id: "mistral", label: "Mistral", color: "#f472b6",
    models: [
      { id: "mistral-small-latest", label: "Mistral Small" },
      { id: "mistral-large-latest", label: "Mistral Large" },
    ],
    envKeyNote: "Paste your Mistral API key.",
  },
  {
    id: "perplexity", label: "Perplexity", color: "#67e8f9",
    models: [
      { id: "sonar",     label: "Sonar" },
      { id: "sonar-pro", label: "Sonar Pro" },
    ],
    envKeyNote: "Paste your Perplexity API key.",
  },
];

const LS_PROVIDER = "tools_ai_provider";
const LS_MODEL    = "tools_ai_model";
const LS_KEY      = "tools_ai_key";

function ChatIcon() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
        fill="rgba(255,255,255,0.1)" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

type RagSource = { source: string; text: string; score: number };

export default function ToolsAIChat({ context }: { context: ToolChatContext }) {
  const [open, setOpen]           = useState(false);
  const [settings, setSettings]   = useState(false);
  const [messages, setMessages]   = useState<Message[]>([]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [sources, setSources]     = useState<RagSource[]>([]);

  const [provider, setProvider]   = useState("gemini");
  const [model, setModel]         = useState("gemini-2.5-flash");
  const [userKey, setUserKey]     = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const p = localStorage.getItem(LS_PROVIDER);
    const m = localStorage.getItem(LS_MODEL);
    const k = localStorage.getItem(LS_KEY);
    if (p) setProvider(p);
    if (m) setModel(m);
    if (k) setUserKey(k);
  }, []);

  useEffect(() => { localStorage.setItem(LS_PROVIDER, provider); }, [provider]);
  useEffect(() => { localStorage.setItem(LS_MODEL, model); }, [model]);
  useEffect(() => { localStorage.setItem(LS_KEY, userKey); }, [userKey]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);
  useEffect(() => { if (open && !settings) inputRef.current?.focus(); }, [open, settings]);

  const providerConfig = PROVIDERS.find(p => p.id === provider) ?? PROVIDERS[0];
  const accentColor = providerConfig.color;

  const handleProviderChange = useCallback((newProvider: string) => {
    const cfg = PROVIDERS.find(p => p.id === newProvider);
    if (!cfg) return;
    setProvider(newProvider);
    setModel(cfg.models[0].id);
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg: Message = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);
    setSources([]);
    try {
      const res = await fetch(`${ML_UNIFIED_API}/rag/query`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          query: text,
          tool_context: `Tool: ${context.tool}\n${context.summary}`,
          history: messages.slice(-6),
          provider,
          model,
          user_key: userKey || undefined,
        }),
      });
      if (!res.ok || !res.body) throw new Error(`RAG query failed: ${res.statusText}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";
      const collectedSources: RagSource[] = [];
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split("\n").filter(Boolean);
        for (const line of lines) {
          try {
            const evt = JSON.parse(line.replace(/^data:\s*/, ""));
            if (evt.type === "source") {
              collectedSources.push(evt.doc);
              setSources([...collectedSources]);
            } else if (evt.type === "token") {
              assistantText += evt.text;
              setMessages(m => {
                const last = m[m.length - 1];
                if (last?.role === "assistant") {
                  return [...m.slice(0, -1), { role: "assistant", content: assistantText }];
                }
                return [...m, { role: "assistant", content: assistantText }];
              });
            }
          } catch { /* skip malformed */ }
        }
      }
      if (!assistantText) {
        setMessages(m => [...m, { role: "assistant", content: "No response." }]);
      }
    } catch (e) {
      setMessages(m => [...m, { role: "assistant", content: `Error: ${e instanceof Error ? e.message : "Network error"}` }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, provider, model, userKey, context]);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }, [send]);

  const PANEL_W = 360;
  const PANEL_H = 520;

  return (
    <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 9999, fontFamily: "inherit", pointerEvents: "none" }}>

      {open && (
        <div style={{
          position: "absolute", bottom: 64, right: 0, pointerEvents: "auto",
          width: PANEL_W, height: PANEL_H,
          background: "rgba(8,15,30,0.97)",
          border: `1px solid ${accentColor}33`, borderRadius: 16,
          boxShadow: `0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px ${accentColor}18`,
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}>

          {/* Header */}
          <div style={{
            padding: "0.7rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.07)",
            display: "flex", alignItems: "center", gap: "0.5rem",
            background: `linear-gradient(135deg, rgba(8,15,30,1) 0%, rgba(${accentColor === "#38bdf8" ? "56,189,248" : accentColor === "#f59e0b" ? "245,158,11" : "52,211,153"},0.08) 100%)`,
          }}>
            <span style={{ fontSize: "0.7rem", fontWeight: 700, color: accentColor, letterSpacing: "0.06em", textTransform: "uppercase", flex: 1 }}>
              AI Assistant · {context.tool}
            </span>
            <RagIngestButton accent={accentColor} compact />
            <button onClick={() => setSettings(s => !s)}
              style={{ background: settings ? `${accentColor}22` : "transparent", border: `1px solid ${settings ? accentColor + "55" : "rgba(255,255,255,0.1)"}`, borderRadius: 6, color: settings ? accentColor : "var(--text3)", cursor: "pointer", padding: "3px 6px", display: "flex", alignItems: "center" }}>
              <GearIcon />
            </button>
            <button onClick={() => setOpen(false)}
              style={{ background: "transparent", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: "1rem", lineHeight: 1, padding: "2px 4px" }}>
              ×
            </button>
          </div>

          {/* Settings panel */}
          {settings && (
            <ToolsAIChatSettings
              providers={PROVIDERS}
              provider={provider}
              model={model}
              userKey={userKey}
              providerConfig={providerConfig}
              onProviderChange={handleProviderChange}
              onModelChange={setModel}
              onKeyChange={setUserKey}
            />
          )}

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "0.75rem 1rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {messages.length === 0 && (
              <div style={{ margin: "auto", textAlign: "center", color: "var(--text3)", fontSize: "0.72rem", lineHeight: 1.7, padding: "1rem" }}>
                Ask anything about your data, transforms, or ML concepts.
                <div style={{ marginTop: "0.6rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                  {["Which columns need normalisation?", "What does log1p do to skewed data?", "When should I use frequency encoding?"].map(q => (
                    <button key={q} onClick={() => { setInput(q); inputRef.current?.focus(); }}
                      style={{ background: `${accentColor}0f`, border: `1px solid ${accentColor}28`, borderRadius: 8, color: accentColor, fontSize: "0.65rem", padding: "0.3rem 0.6rem", cursor: "pointer", textAlign: "left" }}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "88%", padding: "0.5rem 0.75rem",
                borderRadius: m.role === "user" ? "12px 12px 3px 12px" : "12px 12px 12px 3px",
                background: m.role === "user" ? `${accentColor}22` : "rgba(255,255,255,0.05)",
                border: `1px solid ${m.role === "user" ? accentColor + "44" : "rgba(255,255,255,0.08)"}`,
                fontSize: "0.73rem", lineHeight: 1.65, color: m.role === "user" ? "var(--text)" : "var(--text2)",
              }}>
                {m.role === "assistant" ? (
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p style={{ margin: "0 0 0.4em" }}>{children}</p>,
                      h1: ({ children }) => <p style={{ margin: "0.5em 0 0.3em", fontWeight: 700, fontSize: "0.85em" }}>{children}</p>,
                      h2: ({ children }) => <p style={{ margin: "0.5em 0 0.3em", fontWeight: 700, fontSize: "0.82em" }}>{children}</p>,
                      h3: ({ children }) => <p style={{ margin: "0.4em 0 0.2em", fontWeight: 600, fontSize: "0.79em" }}>{children}</p>,
                      ul: ({ children }) => <ul style={{ margin: "0.2em 0", paddingLeft: "1.2em" }}>{children}</ul>,
                      ol: ({ children }) => <ol style={{ margin: "0.2em 0", paddingLeft: "1.2em" }}>{children}</ol>,
                      li: ({ children }) => <li style={{ marginBottom: "0.15em" }}>{children}</li>,
                      code: ({ children }) => <code style={{ background: "rgba(255,255,255,0.1)", borderRadius: 3, padding: "0 3px", fontSize: "0.9em", fontFamily: "monospace" }}>{children}</code>,
                      pre: ({ children }) => <pre style={{ background: "rgba(0,0,0,0.3)", borderRadius: 6, padding: "0.5em 0.75em", overflowX: "auto", margin: "0.4em 0", fontSize: "0.88em" }}>{children}</pre>,
                      strong: ({ children }) => <strong style={{ color: "var(--text)", fontWeight: 600 }}>{children}</strong>,
                      hr: () => <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.1)", margin: "0.5em 0" }} />,
                    }}
                  >
                    {m.content}
                  </ReactMarkdown>
                ) : (
                  <span style={{ whiteSpace: "pre-wrap" }}>{m.content}</span>
                )}
              </div>
            ))}
            {sources.length > 0 && (
              <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                <div style={{ fontSize: "0.6rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600 }}>
                  Sources retrieved
                </div>
                {sources.map((s, i) => (
                  <RagSourceCard key={i} source={s.source} text={s.text} score={s.score} accent={accentColor} />
                ))}
              </div>
            )}
            {loading && (
              <div style={{ alignSelf: "flex-start", padding: "0.5rem 0.75rem", borderRadius: "12px 12px 12px 3px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", fontSize: "0.73rem", color: "var(--text3)" }}>
                <span style={{ animation: "pulse 1.2s ease-in-out infinite" }}>Thinking...</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "0.6rem 0.75rem", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", gap: "0.5rem", alignItems: "flex-end" }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask about your data or ML techniques…"
              rows={1}
              style={{
                flex: 1, resize: "none", background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9,
                color: "var(--text)", fontSize: "0.74rem", padding: "0.45rem 0.6rem",
                outline: "none", lineHeight: 1.5, maxHeight: 100, overflowY: "auto",
                fontFamily: "inherit",
              }}
            />
            <button onClick={send} disabled={!input.trim() || loading}
              style={{
                background: input.trim() && !loading ? accentColor : "rgba(255,255,255,0.06)",
                border: "none", borderRadius: 9, padding: "0.45rem 0.65rem",
                color: input.trim() && !loading ? "#000" : "var(--text3)",
                cursor: input.trim() && !loading ? "pointer" : "default",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.15s", flexShrink: 0,
              }}>
              <SendIcon />
            </button>
          </div>
        </div>
      )}

      {/* Floating bubble */}
      <button
        onClick={() => { setOpen(o => !o); setSettings(false); }}
        title="AI Assistant"
        style={{
          pointerEvents: "auto",
          width: 52, height: 52, borderRadius: "50%",
          background: open
            ? "rgba(8,15,30,0.95)"
            : `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}99 100%)`,
          border: `2px solid ${open ? accentColor + "66" : "transparent"}`,
          color: open ? accentColor : "#000",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 4px 20px ${accentColor}44`,
          transition: "all 0.2s",
          fontSize: open ? "1.2rem" : "inherit",
        }}>
        {open ? "×" : <ChatIcon />}
      </button>
    </div>
  );
}
