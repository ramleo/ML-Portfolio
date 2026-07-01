"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import RagIngestButton, { type IngestStatus } from "./RagIngestButton";
import RagIngestBanner from "./RagIngestBanner";
import RagUploadsPanel from "./RagUploadsPanel";
import RagJinaBanner from "./RagJinaBanner";
import ToolsAIChatSettings from "./ToolsAIChatSettings";
import ChatMessageList from "./ChatMessageList";
import AgentGraphDiagram from "./AgentGraphDiagram";
import { PROVIDERS } from "./toolsAiProviders";
import { ML_UNIFIED_API } from "@/config/urls";

export type ToolChatContext = { tool: string; summary: string };

type Message = { role: "user" | "assistant"; content: string };
type RagSource = { source: string; text: string; score: number; display_score: number };

const LS_PROVIDER = "tools_ai_provider";
const LS_MODEL    = "tools_ai_model";
const LS_KEY      = "tools_ai_key";

// Maps agent_step → human-readable loading label
const STEP_LABELS: Record<string, string> = {
  routing:    "Analyzing query…",
  retrieving: "Searching knowledge base…",
  grading:    "Evaluating results…",
  rewriting:  "Refining search…",
  generating: "Generating response…",
};

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
      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" fill="currentColor" stroke="none" />
    </svg>
  );
}
function SparkleIcon() {
  return <svg width={11} height={11} viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>;
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
function DeepSearchIcon() {
  return (
    <svg width={11} height={11} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
      <path d="M11 8 C9 8 8 9.5 8 11" strokeWidth={2.2} />
    </svg>
  );
}

export default function ToolsAIChat({ context }: { context: ToolChatContext }) {
  const [open, setOpen]               = useState(false);
  const [settings, setSettings]       = useState(false);
  const [messages, setMessages]       = useState<Message[]>([]);
  const [input, setInput]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [sources, setSources]         = useState<RagSource[]>([]);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [ingestStatus, setIngestStatus] = useState<IngestStatus>({ kind: "idle" });
  const [useJina, setUseJina]         = useState(false);
  const [jinaStatus, setJinaStatus]   = useState<"idle"|"loading"|"ready"|"error">("idle");
  const [lowConfidence, setLowConfidence] = useState(false);

  // Deep Search (LangGraph agent) state
  const [deepSearch, setDeepSearch]         = useState(false);
  const [agentStep, setAgentStep]           = useState<string | null>(null);
  const [agentDoneSteps, setAgentDoneSteps] = useState<string[]>([]);
  const [agentLoops, setAgentLoops]         = useState(0);
  const [agentRewritten, setAgentRewritten] = useState(false);

  const [provider, setProvider] = useState("gemini");
  const [model, setModel]       = useState("gemini-2.5-flash");
  const [userKey, setUserKey]   = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const p = localStorage.getItem(LS_PROVIDER);
    const m = localStorage.getItem(LS_MODEL);
    const k = localStorage.getItem(LS_KEY);
    if (p) setProvider(p); if (m) setModel(m); if (k) setUserKey(k);
  }, []);
  useEffect(() => { localStorage.setItem(LS_PROVIDER, provider); }, [provider]);
  useEffect(() => { localStorage.setItem(LS_MODEL, model); }, [model]);
  useEffect(() => { localStorage.setItem(LS_KEY, userKey); }, [userKey]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);
  useEffect(() => { if (open && !settings) inputRef.current?.focus(); }, [open, settings]);
  useEffect(() => {
    if (ingestStatus.kind !== "ok" && ingestStatus.kind !== "error" && ingestStatus.kind !== "deleted") return;
    const t = setTimeout(() => setIngestStatus({ kind: "idle" }), 6000);
    return () => clearTimeout(t);
  }, [ingestStatus]);

  useEffect(() => {
    if (!open || jinaStatus !== "error") return;
    fetch(`${ML_UNIFIED_API}/rag/health`).then(r => r.json())
      .then(d => { if (!d.jina_error) setJinaStatus("idle"); }).catch(() => {});
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (jinaStatus !== "loading") return;
    const id = setInterval(async () => {
      try {
        const d = await (await fetch(`${ML_UNIFIED_API}/rag/health`)).json();
        if (d.jina_ready) setJinaStatus("ready");
        else if (d.initialized && d.jina_error) setJinaStatus("error");
      } catch { /* ignore */ }
    }, 5000);
    return () => clearInterval(id);
  }, [jinaStatus]);

  const providerConfig = PROVIDERS.find(p => p.id === provider) ?? PROVIDERS[0];
  const accentColor    = providerConfig.color;

  const handleProviderChange = useCallback((p: string) => {
    const cfg = PROVIDERS.find(x => x.id === p);
    if (!cfg) return;
    setProvider(p); setModel(cfg.models[0].id);
  }, []);

  const enableJina = useCallback(async () => {
    if (useJina && jinaStatus !== "error") { setUseJina(false); return; }
    setUseJina(true);
    if (jinaStatus === "ready") return;
    setJinaStatus("loading");
    try {
      const d = await (await fetch(`${ML_UNIFIED_API}/rag/prepare-jina`, { method: "POST" })).json();
      if (d.status === "ready") setJinaStatus("ready");
    } catch { /* status updates via done event */ }
  }, [useJina, jinaStatus]);

  // Current loading label — context-aware for deep search
  const loadingLabel = deepSearch && agentStep
    ? (STEP_LABELS[agentStep] ?? "Thinking…")
    : "Thinking…";

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    setSources([]);
    setSourcesOpen(false);
    setLowConfidence(false);
    setAgentStep(null);
    setAgentDoneSteps([]);
    setAgentLoops(0);
    setAgentRewritten(false);

    const endpoint = deepSearch ? "/rag/agent" : "/rag/query";
    const body = deepSearch
      ? { query: text, tool_context: `Tool: ${context.tool}\n${context.summary}`,
          history: messages.slice(-6), provider, model,
          user_key: userKey || undefined }
      : { query: text, tool_context: `Tool: ${context.tool}\n${context.summary}`,
          history: messages.slice(-6), provider, model,
          user_key: userKey || undefined,
          embedding_model: useJina ? "jina" : "minilm" };

    try {
      const res = await fetch(`${ML_UNIFIED_API}${endpoint}`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok || !res.body) throw new Error(`Request failed: ${res.statusText}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";
      const collectedSources: RagSource[] = [];
      let prevStep: string | null = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split("\n").filter(Boolean);
        for (const line of lines) {
          try {
            const evt = JSON.parse(line.replace(/^data:\s*/, ""));

            if (evt.type === "agent_step") {
              if (prevStep) setAgentDoneSteps(s => [...s, prevStep!]);
              setAgentStep(evt.step);
              prevStep = evt.step;

            } else if (evt.type === "source") {
              collectedSources.push(evt.doc);
              setSources([...collectedSources]);

            } else if (evt.type === "done") {
              // Mark last step done
              if (prevStep) setAgentDoneSteps(s => [...s, prevStep!]);
              setAgentStep(null);
              if (evt.loops)     setAgentLoops(evt.loops);
              if (evt.rewritten) setAgentRewritten(true);
              setLowConfidence(!!evt.low_confidence && !useJina);
              if (evt.jina_status === "ready") setJinaStatus("ready");

            } else if (evt.type === "token") {
              assistantText += evt.text;
              setMessages(m => {
                const last = m[m.length - 1];
                if (last?.role === "assistant")
                  return [...m.slice(0, -1), { role: "assistant", content: assistantText }];
                return [...m, { role: "assistant", content: assistantText }];
              });

            } else if (evt.type === "error") {
              setMessages(m => [...m, { role: "assistant", content: `Error: ${evt.message}` }]);
            }
          } catch { /* skip malformed lines */ }
        }
      }
      if (!assistantText) {
        setMessages(m => [...m, { role: "assistant", content: "No response." }]);
      }
    } catch (e) {
      setMessages(m => [...m, {
        role: "assistant",
        content: `Error: ${e instanceof Error ? e.message : "Network error"}`,
      }]);
    } finally {
      setLoading(false);
      setAgentStep(null);
    }
  }, [input, loading, messages, provider, model, userKey, context, useJina, deepSearch]);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }, [send]);

  const PANEL_W = 370;
  const PANEL_H = 540;

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
            <RagIngestButton busy={ingestStatus.kind === "uploading" || ingestStatus.kind === "processing"} onStatusChange={setIngestStatus} />
            <RagUploadsPanel accent={accentColor} onStatusChange={setIngestStatus} />
            {/* Deep Search toggle */}
            <button
              onClick={() => setDeepSearch(d => !d)}
              title={deepSearch
                ? "Deep Search active — LangGraph agentic loop (adds ~3–5 s). Click to disable."
                : "Enable Deep Search — LangGraph agent refines query if retrieval quality is low (adds ~3–5 s)"}
              style={{
                background: deepSearch ? `${accentColor}22` : "transparent",
                border: `1px solid ${deepSearch ? accentColor + "55" : "rgba(255,255,255,0.1)"}`,
                borderRadius: 6, color: deepSearch ? accentColor : "var(--text3)",
                cursor: "pointer", padding: "3px 6px",
                display: "flex", alignItems: "center", gap: "3px",
                fontSize: "0.58rem", fontWeight: 600,
              }}>
              <DeepSearchIcon />
              {deepSearch ? "Deep" : "Std"}
            </button>
            <button onClick={enableJina}
              title={useJina && jinaStatus === "loading" ? "Jina v3 loading…" : useJina ? "Jina v3 active — click to disable" : "Enable Jina v3 embeddings"}
              style={{ background: useJina ? `${accentColor}22` : "transparent", border: `1px solid ${useJina ? accentColor + "55" : "rgba(255,255,255,0.1)"}`, borderRadius: 6, color: useJina ? accentColor : "var(--text3)", cursor: "pointer", padding: "3px 6px", display: "flex", alignItems: "center", gap: "3px", fontSize: "0.58rem", fontWeight: 600 }}>
              <SparkleIcon />{useJina ? "Jina" : "Std"}
            </button>
            <button onClick={() => setSettings(s => !s)}
              style={{ background: settings ? `${accentColor}22` : "transparent", border: `1px solid ${settings ? accentColor + "55" : "rgba(255,255,255,0.1)"}`, borderRadius: 6, color: settings ? accentColor : "var(--text3)", cursor: "pointer", padding: "3px 6px", display: "flex", alignItems: "center" }}>
              <GearIcon />
            </button>
            <button onClick={() => setOpen(false)}
              style={{ background: "transparent", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: "1rem", lineHeight: 1, padding: "2px 4px" }}>
              ×
            </button>
          </div>

          {settings && (
            <ToolsAIChatSettings
              providers={PROVIDERS} provider={provider} model={model} userKey={userKey}
              providerConfig={providerConfig}
              onProviderChange={handleProviderChange} onModelChange={setModel} onKeyChange={setUserKey}
            />
          )}

          {ingestStatus.kind !== "idle" && (
            <div style={{ padding: "0.5rem 1rem 0" }}>
              <RagIngestBanner status={ingestStatus} accent={accentColor} />
            </div>
          )}
          {(useJina || lowConfidence) && (
            <div style={{ padding: "0.3rem 1rem 0" }}>
              <RagJinaBanner jinaStatus={jinaStatus} useJina={useJina} lowConfidence={lowConfidence} accent={accentColor} onEnableJina={enableJina} />
            </div>
          )}

          {/* Deep Search latency note */}
          {deepSearch && !loading && (
            <div style={{ padding: "0.25rem 1rem 0", fontSize: "0.6rem", color: "var(--text3)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="var(--text3)" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="6" cy="6" r="5" /><line x1="6" y1="4" x2="6" y2="6.5" /><line x1="6" y1="8" x2="6" y2="8.5" />
              </svg>
              LangGraph agent active — adds ~3–5 s for query refinement
            </div>
          )}

          {/* "Query refined N×" note after a rewrite */}
          {agentRewritten && !loading && (
            <div style={{ padding: "0.25rem 1rem 0", fontSize: "0.6rem", color: accentColor, display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 6 C2 3 6 1 9 4" /><polyline points="7,1 9,4 6,5" />
              </svg>
              Query was refined {agentLoops}× for better results
            </div>
          )}

          {/* Messages */}
          <ChatMessageList
            messages={messages}
            loading={loading}
            loadingLabel={loadingLabel}
            sources={sources}
            sourcesOpen={sourcesOpen}
            accentColor={accentColor}
            bottomRef={bottomRef}
            onSuggestion={q => { setInput(q); inputRef.current?.focus(); }}
            onSourcesToggle={() => setSourcesOpen(o => !o)}
          />

          {/* Agent graph diagram — shown when Deep Search is on */}
          {deepSearch && (
            <div style={{ padding: "0 0.75rem", borderTop: "1px solid rgba(255,255,255,0.06)", overflowY: "auto", maxHeight: 220 }}>
              <AgentGraphDiagram
                activeStep={agentStep}
                completedSteps={agentDoneSteps}
                loops={agentLoops}
                accent={accentColor}
              />
            </div>
          )}

          {/* Input */}
          <div style={{ padding: "0.6rem 0.75rem", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", gap: "0.5rem", alignItems: "flex-end" }}>
            <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown} placeholder="Ask about your data or ML techniques…" rows={1}
              style={{ flex: 1, resize: "none", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, color: "var(--text)", fontSize: "0.74rem", padding: "0.45rem 0.6rem", outline: "none", lineHeight: 1.5, maxHeight: 100, overflowY: "auto", fontFamily: "inherit" }}
            />
            <button onClick={send} disabled={!input.trim() || loading}
              style={{ background: input.trim() && !loading ? accentColor : "rgba(255,255,255,0.06)", border: "none", borderRadius: 9, padding: "0.45rem 0.65rem", color: input.trim() && !loading ? "#000" : "var(--text3)", cursor: input.trim() && !loading ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", flexShrink: 0 }}>
              <SendIcon />
            </button>
          </div>
        </div>
      )}

      {/* Floating bubble */}
      <button onClick={() => { setOpen(o => !o); setSettings(false); }} title="AI Assistant"
        style={{ pointerEvents: "auto", width: 52, height: 52, borderRadius: "50%", background: open ? "rgba(8,15,30,0.95)" : `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}99 100%)`, border: `2px solid ${open ? accentColor + "66" : "transparent"}`, color: open ? accentColor : "#000", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 4px 20px ${accentColor}44`, transition: "all 0.2s", fontSize: open ? "1.2rem" : "inherit" }}>
        {open ? "×" : <ChatIcon />}
      </button>
    </div>
  );
}