"use client";

import { trackRunError } from "@/lib/trackedFetch";
import { STAGE, ERR } from "@/lib/logEvents";
import type { Message, RagSource, Groundedness } from "./chatContext";

/** One node's timing in the agent pipeline (O6 observability). */
export type AgentSpan = { node: string; ms: number };

/** The parsed shape of a `data:` line from /rag/query or /rag/agent. Every field
 * past `type` is optional — a given event only carries the ones it needs. */
export interface RagSseEvent {
  type: string;
  step?: string;
  text?: string;
  doc?: RagSource;
  message?: string;
  loops?: number;
  rewritten?: boolean;
  low_confidence?: boolean;
  jina_status?: string;
  cache_hit?: boolean;
  latency_ms?: number;
  expanded_queries?: string[];
  candidates_retrieved?: number;
  answer_source?: string;
  confidence?: string;
  served_provider?: string;
  served_model?: string;
  primary_provider?: string | null;
  primary_failure?: string | null;
  likely_used_sources?: number[];
  groundedness?: Groundedness | null;
  self_corrected?: boolean;
  spans?: AgentSpan[];
}

/** Mutable per-stream scratch state, threaded across every event of one run so
 * the handler can accumulate tokens/sources and remember the previous step. */
export interface RagSseCtx {
  assistantText: string;
  hadError: boolean;
  prevStep: string | null;
  collectedSources: RagSource[];
}

/** The hook's setters + the run identity the handler needs. Grouped so the
 * dispatch lives outside useRagChat (keeping that hook under the line cap)
 * without threading twenty arguments. */
export interface RagSseDeps {
  runId: string;
  provider: string;
  model: string;
  useJina: boolean;
  setAgentDoneSteps: (fn: (s: string[]) => string[]) => void;
  setAgentStep: (v: string | null) => void;
  setSources: (v: RagSource[]) => void;
  setMessages: (fn: (m: Message[]) => Message[]) => void;
  setAgentLoops: (v: number) => void;
  setAgentRewritten: (v: boolean) => void;
  setLowConfidence: (v: boolean) => void;
  setJinaStatus: (v: "idle" | "loading" | "ready" | "error") => void;
  setCacheHit: (v: boolean) => void;
  setLatencyMs: (v: number) => void;
  setExpandedQueries: (v: string[]) => void;
  setCandidatesRetrieved: (v: number) => void;
  setAnswerSource: (v: string) => void;
  setConfidence: (v: string) => void;
  setServedProvider: (v: string) => void;
  setServedModel: (v: string) => void;
  setPrimaryProvider: (v: string | null) => void;
  setPrimaryFailure: (v: string | null) => void;
  setLikelyUsedSources: (v: number[]) => void;
  setGroundedness: (v: Groundedness | null) => void;
  setSelfCorrected: (v: boolean) => void;
  setAgentSpans: (v: AgentSpan[]) => void;
}

/** Apply one SSE event to the chat state. Mutates `ctx` for cross-event scratch
 * (token text, collected sources, previous step) and pushes everything else
 * through `deps` setters. Split out of useRagChat.ts so that hook stays under
 * the 350-line modularize-first cap; behavior is unchanged except the new O6
 * `spans` handling on the `done` event. */
export function handleRagSseEvent(evt: RagSseEvent, ctx: RagSseCtx, deps: RagSseDeps): void {
  if (evt.type === "agent_step") {
    const snap = ctx.prevStep;
    if (snap) deps.setAgentDoneSteps(s => [...s, snap]);
    if (evt.step) { deps.setAgentStep(evt.step); ctx.prevStep = evt.step; }
  } else if (evt.type === "retry") {
    // Backend is regenerating after the first answer scored low on groundedness —
    // drop the first (weakly-grounded) attempt's bubble and sources so the retry's
    // tokens start a clean answer instead of appending onto the discarded one.
    ctx.assistantText = "";
    ctx.collectedSources.length = 0;
    deps.setSources([]);
    deps.setMessages(m => (m[m.length - 1]?.role === "assistant" ? m.slice(0, -1) : m));
  } else if (evt.type === "source") {
    if (evt.doc) { ctx.collectedSources.push(evt.doc); deps.setSources([...ctx.collectedSources]); }
  } else if (evt.type === "done") {
    const snap = ctx.prevStep;
    if (snap) deps.setAgentDoneSteps(s => [...s, snap]);
    deps.setAgentStep(null);
    if (evt.loops)     deps.setAgentLoops(evt.loops);
    if (evt.rewritten) deps.setAgentRewritten(true);
    deps.setLowConfidence(!!evt.low_confidence && !deps.useJina);
    if (evt.jina_status === "ready") deps.setJinaStatus("ready");
    deps.setCacheHit(!!evt.cache_hit);
    if (typeof evt.latency_ms === "number") deps.setLatencyMs(evt.latency_ms);
    if (Array.isArray(evt.expanded_queries)) deps.setExpandedQueries(evt.expanded_queries);
    if (typeof evt.candidates_retrieved === "number") deps.setCandidatesRetrieved(evt.candidates_retrieved);
    if (evt.answer_source) deps.setAnswerSource(evt.answer_source);
    if (evt.confidence) deps.setConfidence(evt.confidence);
    if (evt.served_provider) deps.setServedProvider(evt.served_provider);
    if (evt.served_model) deps.setServedModel(evt.served_model);
    deps.setPrimaryProvider(evt.primary_provider ?? null);
    deps.setPrimaryFailure(evt.primary_failure ?? null);
    if (Array.isArray(evt.likely_used_sources)) deps.setLikelyUsedSources(evt.likely_used_sources);
    deps.setGroundedness(evt.groundedness ?? null);
    deps.setSelfCorrected(!!evt.self_corrected);
    if (Array.isArray(evt.spans)) deps.setAgentSpans(evt.spans); // O6: per-node timing
  } else if (evt.type === "token") {
    ctx.assistantText += evt.text ?? "";
    const text = ctx.assistantText;
    deps.setMessages(m => {
      const last = m[m.length - 1];
      return last?.role === "assistant"
        ? [...m.slice(0, -1), { role: "assistant", content: text }]
        : [...m, { role: "assistant", content: text }];
    });
  } else if (evt.type === "error") {
    ctx.hadError = true;
    const msg = evt.message;
    deps.setMessages(m => [...m, { role: "assistant", content: `Error: ${msg}` }]);
    // Delivered inside a 200 stream that then closes cleanly, so the stream
    // wrapper would record a success while the visitor is reading an error.
    trackRunError("rag-chat", deps.runId, STAGE.RUN,
      /429|rate limit/i.test(String(msg ?? "")) ? ERR.RATE_LIMITED : ERR.UNKNOWN,
      { provider: deps.provider, model: deps.model, reason: "in_band_stream_error",
        message: String(msg ?? "").slice(0, 120) });
  }
}
