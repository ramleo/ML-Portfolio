"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { type IngestStatus } from "./RagIngestButton";
import { PROVIDERS } from "./toolsAiProviders";
import { ML_UNIFIED_API } from "@/config/urls";
import { STEP_LABELS } from "./ToolsAIChatIcons";

export type ToolChatContext = {
  tool: string;
  summary: string;
  /** Markdown user guide — when set, the assistant answers ONLY from it + website topics */
  guide?: string;
  /** Page-specific suggestion chips shown in the empty chat */
  suggestions?: string[];
  /** Answer ONLY from this session's uploaded document(s) — no KB, no web fallback.
   * For tools whose whole point is Q&A over one specific upload. */
  restrictToUploads?: boolean;
};

const SITE_SUMMARY =
  "This website is AIRaML, the ML engineering portfolio of Ramakrishnasai Wuppalapati. " +
  "It hosts interactive AI/ML tools: AutoML model training, EDA, Pipeline Builder, " +
  "Text-to-SQL Agent, Document Intelligence, drift detection, RAG chat, and analytics.";

function buildToolContext(context: ToolChatContext): string {
  if (!context.guide) {
    return `Tool: ${context.tool}\n${context.summary}`;
  }
  return [
    `You are the help assistant for the "${context.tool}" tool on the AIRaML portfolio website.`,
    `SCOPE RULES (strict): Answer ONLY questions about (a) the ${context.tool} tool — using the user guide below as your source of truth — or (b) this website and its tools in general. ` +
      `If the question is about anything else (general ML theory, coding help, unrelated topics), politely reply that you only help with the ${context.tool} tool and this website, and suggest asking about those instead. Do not answer off-topic questions even partially.`,
    `ABOUT THIS WEBSITE: ${SITE_SUMMARY}`,
    `USER GUIDE for ${context.tool}:\n${context.guide}`,
  ].join("\n\n");
}
export type Message  = { role: "user" | "assistant"; content: string };
export type RagSource = { source: string; text: string; score: number; display_score: number };

const LS_PROVIDER = "tools_ai_provider";
const LS_MODEL    = "tools_ai_model";
const LS_KEY      = "tools_ai_key";

// Sanitize history before sending: remove error/no-response turns, then ensure strictly alternating roles.
// Prevents Gemini 400 caused by consecutive model turns when previous responses were errors.
function sanitizeHistory(msgs: Message[]): Message[] {
  const filtered = msgs.filter(m =>
    !(m.role === "assistant" && (m.content.startsWith("Error:") || m.content === "No response."))
  );
  const result: Message[] = [];
  for (const m of filtered) {
    if (result.length === 0 || result[result.length - 1].role !== m.role) {
      result.push(m);
    }
  }
  return result;
}
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
  const [forceWeb, setForceWeb]       = useState(false);
  const [agentStep, setAgentStep]     = useState<string | null>(null);
  const [agentDoneSteps, setAgentDoneSteps] = useState<string[]>([]);
  const [agentLoops, setAgentLoops]   = useState(0);
  const [agentRewritten, setAgentRewritten] = useState(false);
  const [expandedQueries, setExpandedQueries] = useState<string[]>([]);
  const [candidatesRetrieved, setCandidatesRetrieved] = useState<number | null>(null);
  const [answerSource, setAnswerSource] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<string | null>(null);
  const [servedProvider, setServedProvider] = useState<string | null>(null);
  const [servedModel, setServedModel] = useState<string | null>(null);
  const [primaryProvider, setPrimaryProvider] = useState<string | null>(null);
  const [primaryFailure, setPrimaryFailure] = useState<string | null>(null);
  const [likelyUsedSources, setLikelyUsedSources] = useState<number[] | null>(null);
  const [provider, setProvider]       = useState("gemini");
  const [model, setModel]             = useState("gemini-2.5-flash");
  const [userKey, setUserKey]         = useState("");
  const [sessionId, setSessionId]     = useState("");
  const [answerLength, setAnswerLength] = useState<"concise" | "normal" | "detailed">("normal");
  const [chunkTypeFilter, setChunkTypeFilter] = useState<string[]>([]);
  const [shareToken, setShareToken] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    const p = localStorage.getItem(LS_PROVIDER);
    const m = localStorage.getItem(LS_MODEL);
    const k = localStorage.getItem(LS_KEY);
    const s = localStorage.getItem(LS_SESSION);
    if (p) setProvider(p); if (m) setModel(m); if (k) setUserKey(k); if (s) setSessionId(s);
    mountedRef.current = true;
  }, []);
  useEffect(() => {
    if (!mountedRef.current) return;
    localStorage.setItem(LS_PROVIDER, provider);
    setUserKey("");
  }, [provider]);
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
    setAnswerSource(null); setConfidence(null);
    setServedProvider(null); setServedModel(null);
    setPrimaryProvider(null); setPrimaryFailure(null);
    setLikelyUsedSources(null);
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
    setAnswerSource(null); setConfidence(null);
    setServedProvider(null); setServedModel(null);
    setPrimaryProvider(null); setPrimaryFailure(null);
    setLikelyUsedSources(null);

    const endpoint = deepSearch ? "/rag/agent" : "/rag/query";
    const history = sanitizeHistory(messages.slice(-10)).slice(-6);
    const toolContext = buildToolContext(context);
    const body = deepSearch
      ? { query: text, tool_context: toolContext,
          history, provider, model,
          user_key: userKey || undefined, session_id: sessionId || undefined,
          force_web: forceWeb || undefined,
          restrict_to_uploads: context.restrictToUploads || undefined }
      : { query: text, tool_context: toolContext,
          history, provider, model,
          user_key: userKey || undefined,
          embedding_model: useJina ? "jina" : "minilm",
          session_id: sessionId || undefined,
          force_web: forceWeb || undefined,
          restrict_to_uploads: context.restrictToUploads || undefined,
          answer_length: answerLength,
          chunk_type_filter: chunkTypeFilter.length > 0 ? chunkTypeFilter : undefined,
          share_token: shareToken || undefined };

    try {
      const res = await fetch(`${ML_UNIFIED_API}${endpoint}`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok || !res.body) throw new Error(`Request failed: ${res.statusText}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";
      let hadError = false;
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
              if (evt.answer_source) setAnswerSource(evt.answer_source);
              if (evt.confidence) setConfidence(evt.confidence);
              if (evt.served_provider) setServedProvider(evt.served_provider);
              if (evt.served_model) setServedModel(evt.served_model);
              setPrimaryProvider(evt.primary_provider ?? null);
              setPrimaryFailure(evt.primary_failure ?? null);
              if (Array.isArray(evt.likely_used_sources)) setLikelyUsedSources(evt.likely_used_sources);
            } else if (evt.type === "token") {
              assistantText += evt.text;
              setMessages(m => {
                const last = m[m.length - 1];
                return last?.role === "assistant"
                  ? [...m.slice(0, -1), { role: "assistant", content: assistantText }]
                  : [...m, { role: "assistant", content: assistantText }];
              });
            } else if (evt.type === "error") {
              hadError = true;
              setMessages(m => [...m, { role: "assistant", content: `Error: ${evt.message}` }]);
            }
          } catch { /* skip malformed lines */ }
        }
      }
      if (!assistantText && !hadError)
        setMessages(m => [...m, { role: "assistant", content: "No response." }]);
    } catch (e) {
      setMessages(m => [...m, { role: "assistant",
        content: `Error: ${e instanceof Error ? e.message : "Network error"}` }]);
    } finally {
      setLoading(false); setAgentStep(null);
    }
  }, [input, loading, messages, provider, model, userKey, sessionId, context, useJina, deepSearch, forceWeb,
      answerLength, chunkTypeFilter, shareToken]);

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
    deepSearch, setDeepSearch, forceWeb, setForceWeb,
    agentStep, agentDoneSteps, agentLoops, agentRewritten,
    expandedQueries, candidatesRetrieved,
    answerSource, confidence, servedProvider, servedModel, primaryProvider, primaryFailure,
    likelyUsedSources,
    provider, model, setModel, userKey, setUserKey,
    sessionId, setSessionId,
    answerLength, setAnswerLength,
    chunkTypeFilter, setChunkTypeFilter,
    shareToken, setShareToken,
    providerConfig, accentColor, loadingLabel,
    handleProviderChange, enableJina, send, clearChat, onKeyDown,
    bottomRef, inputRef,
  };
}