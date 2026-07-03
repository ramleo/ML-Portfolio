"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { type IngestStatus } from "./RagIngestButton";
import { PROVIDERS } from "./toolsAiProviders";
import { ML_UNIFIED_API } from "@/config/urls";
import { STEP_LABELS } from "./ToolsAIChatIcons";

export type ToolChatContext = { tool: string; summary: string };
export type Message  = { role: "user" | "assistant"; content: string };
export type RagSource = { source: string; text: string; score: number; display_score: number };

const LS_PROVIDER = "tools_ai_provider";
const LS_MODEL    = "tools_ai_model";
const LS_KEY      = "tools_ai_key";
const LS_SESSION  = "rag_session_id";

export function useRagChat(context: ToolChatContext) {
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
  const [cacheHit, setCacheHit]       = useState(false);
  const [latencyMs, setLatencyMs]     = useState<number | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [deepSearch, setDeepSearch]   = useState(false);
  const [agentStep, setAgentStep]     = useState<string | null>(null);
  const [agentDoneSteps, setAgentDoneSteps] = useState<string[]>([]);
  const [agentLoops, setAgentLoops]   = useState(0);
  const [agentRewritten, setAgentRewritten] = useState(false);
  const [expandedQueries, setExpandedQueries] = useState<string[]>([]);
  const [candidatesRetrieved, setCandidatesRetrieved] = useState<number | null>(null);
  const [provider, setProvider]       = useState("gemini");
  const [model, setModel]             = useState("gemini-2.5-flash");
  const [userKey, setUserKey]         = useState("");
  const [sessionId, setSessionId]     = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const p = localStorage.getItem(LS_PROVIDER);
    const m = localStorage.getItem(LS_MODEL);
    const k = localStorage.getItem(LS_KEY);
    const s = localStorage.getItem(LS_SESSION);
    if (p) setProvider(p); if (m) setModel(m); if (k) setUserKey(k); if (s) setSessionId(s);
  }, []);
  useEffect(() => { localStorage.setItem(LS_PROVIDER, provider); }, [provider]);
  useEffect(() => { localStorage.setItem(LS_MODEL, model); }, [model]);
  useEffect(() => { localStorage.setItem(LS_KEY, userKey); }, [userKey]);
  useEffect(() => { localStorage.setItem(LS_SESSION, sessionId); }, [sessionId]);
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

  const loadingLabel = deepSearch && agentStep ? (STEP_LABELS[agentStep] ?? "Thinking…") : "Thinking…";

  const clearChat = useCallback(() => {
    setMessages([]); setSources([]); setSourcesOpen(false);
    setLowConfidence(false); setCacheHit(false); setLatencyMs(null);
    setAgentRewritten(false); setAgentLoops(0); setAgentStep(null);
    setAgentDoneSteps([]); setExpandedQueries([]); setCandidatesRetrieved(null);
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next); setInput(""); setLoading(true);
    setSources([]); setSourcesOpen(false); setLowConfidence(false);
    setCacheHit(false); setLatencyMs(null); setAgentStep(null);
    setAgentDoneSteps([]); setAgentLoops(0); setAgentRewritten(false);
    setExpandedQueries([]); setCandidatesRetrieved(null);

    const endpoint = deepSearch ? "/rag/agent" : "/rag/query";
    const body = deepSearch
      ? { query: text, tool_context: `Tool: ${context.tool}\n${context.summary}`,
          history: messages.slice(-6), provider, model,
          user_key: userKey || undefined, session_id: sessionId || undefined }
      : { query: text, tool_context: `Tool: ${context.tool}\n${context.summary}`,
          history: messages.slice(-6), provider, model,
          user_key: userKey || undefined,
          embedding_model: useJina ? "jina" : "minilm",
          session_id: sessionId || undefined };

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
      let sseBuffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        sseBuffer += decoder.decode(value);
        const parts = sseBuffer.split("\n");
        sseBuffer = parts.pop() ?? "";
        for (const line of parts.filter(Boolean)) {
          try {
            const evt = JSON.parse(line.replace(/^data:\s*/, ""));
            if (evt.type === "agent_step") {
              const snap = prevStep; if (snap) setAgentDoneSteps(s => [...s, snap]);
              setAgentStep(evt.step); prevStep = evt.step;
            } else if (evt.type === "source") {
              collectedSources.push(evt.doc); setSources([...collectedSources]);
            } else if (evt.type === "done") {
              const snap = prevStep; if (snap) setAgentDoneSteps(s => [...s, snap]);
              setAgentStep(null);
              if (evt.loops)     setAgentLoops(evt.loops);
              if (evt.rewritten) setAgentRewritten(true);
              setLowConfidence(!!evt.low_confidence && !useJina);
              if (evt.jina_status === "ready") setJinaStatus("ready");
              setCacheHit(!!evt.cache_hit);
              if (typeof evt.latency_ms === "number") setLatencyMs(evt.latency_ms);
              if (Array.isArray(evt.expanded_queries)) setExpandedQueries(evt.expanded_queries);
              if (typeof evt.candidates_retrieved === "number") setCandidatesRetrieved(evt.candidates_retrieved);
            } else if (evt.type === "token") {
              assistantText += evt.text;
              setMessages(m => {
                const last = m[m.length - 1];
                return last?.role === "assistant"
                  ? [...m.slice(0, -1), { role: "assistant", content: assistantText }]
                  : [...m, { role: "assistant", content: assistantText }];
              });
            } else if (evt.type === "error") {
              setMessages(m => [...m, { role: "assistant", content: `Error: ${evt.message}` }]);
            }
          } catch { /* skip malformed lines */ }
        }
      }
      if (!assistantText)
        setMessages(m => [...m, { role: "assistant", content: "No response." }]);
    } catch (e) {
      setMessages(m => [...m, { role: "assistant",
        content: `Error: ${e instanceof Error ? e.message : "Network error"}` }]);
    } finally {
      setLoading(false); setAgentStep(null);
    }
  }, [input, loading, messages, provider, model, userKey, sessionId, context, useJina, deepSearch]);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }, [send]);

  return {
    open, setOpen, settings, setSettings,
    messages, input, setInput, loading,
    sources, sourcesOpen, setSourcesOpen,
    ingestStatus, setIngestStatus,
    useJina, jinaStatus, setJinaStatus, lowConfidence,
    cacheHit, latencyMs, confirmClear, setConfirmClear,
    deepSearch, setDeepSearch,
    agentStep, agentDoneSteps, agentLoops, agentRewritten,
    expandedQueries, candidatesRetrieved,
    provider, model, setModel, userKey, setUserKey,
    sessionId, setSessionId,
    providerConfig, accentColor, loadingLabel,
    handleProviderChange, enableJina, send, clearChat, onKeyDown,
    bottomRef, inputRef,
  };
}