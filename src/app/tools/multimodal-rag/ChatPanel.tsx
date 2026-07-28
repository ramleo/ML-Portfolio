"use client";

import ReactMarkdown from "react-markdown";
import { useRagChat } from "@/components/useRagChat";
import RagSourceCard from "@/components/RagSourceCard";
import GroundednessBadge from "@/components/GroundednessBadge";
import ToolsAIChatSettings from "@/components/ToolsAIChatSettings";
import { PROVIDERS } from "@/components/toolsAiProviders";
import type { Bbox, DetectedObject, IngestState } from "./_types";

type Doc = Extract<IngestState, { kind: "done" }>;

type Props = {
  chat: ReturnType<typeof useRagChat>;
  documents: Doc[];
  accent: string;
  cardStyle: React.CSSProperties;
  settingsOpen: boolean;
  setSettingsOpen: (fn: (o: boolean) => boolean) => void;
  jumpToCitation: (source: string, chunkType: string | null | undefined,
                   page: number | null | undefined, text: string, bbox?: Bbox | null,
                   objects?: DetectedObject[] | null, timestampS?: number | null) => void;
};

/** The chat message list + input box + citation cards — split out of
 * MmRagRunner.tsx to stay under the project's file-length limit. */
export default function ChatPanel({ chat, documents, accent: ACCENT, cardStyle, settingsOpen, setSettingsOpen, jumpToCitation }: Props) {
  return (
    <div style={cardStyle} className="flex flex-col min-h-0" >
      <div className="px-4 py-2.5 border-b shrink-0 flex items-center justify-between" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <span className="text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: `${ACCENT}99` }}>
          Ask about your document{documents.length > 1 ? "s" : ""}
        </span>
        <div className="flex items-center gap-1.5">
          {chat.servedProvider && !chat.loading && (
            chat.primaryProvider && chat.primaryProvider !== chat.servedProvider ? (
              <span title={`Tried ${chat.primaryProvider} first (${chat.primaryFailure}), used ${chat.servedModel ?? chat.servedProvider} instead.`}
                className="text-[8px] px-1.5 py-0.5 rounded cursor-help"
                style={{ background: "rgba(245,158,11,0.1)", color: "#fbbf24" }}>
                {chat.primaryProvider} failed ({chat.primaryFailure}) — answered via {chat.servedProvider}
              </span>
            ) : (
              <span title={chat.servedModel ?? undefined}
                className="text-[8px] px-1.5 py-0.5 rounded"
                style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.35)" }}>
                Answered via {chat.servedProvider}
              </span>
            )
          )}
          <div className="flex items-center rounded border overflow-hidden" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
            {(["concise", "normal", "detailed"] as const).map(len => (
              <button key={len} onClick={() => chat.regenerateLastAnswer(len)}
                title={len === "concise" ? "1-3 sentences, no extra context"
                     : len === "detailed" ? "Thorough — includes reasoning and related details"
                     : "Default answer length"}
                className="text-[9px] px-1.5 py-0.5 capitalize transition-colors"
                style={chat.answerLength === len
                  ? { background: `${ACCENT}22`, color: ACCENT }
                  : { color: "rgba(255,255,255,0.4)" }}>
                {len}
              </button>
            ))}
          </div>
          <button onClick={() => setSettingsOpen(o => !o)}
            title="Provider & API key settings"
            className="text-[9px] px-2 py-0.5 rounded border transition-colors hover:bg-white/5"
            style={settingsOpen
              ? { borderColor: `${ACCENT}55`, background: `${ACCENT}22`, color: ACCENT }
              : { borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.4)" }}>
            {chat.userKey ? "Using your key" : "Provider"}
          </button>
        </div>
      </div>
      {settingsOpen && (
        <ToolsAIChatSettings
          providers={PROVIDERS} provider={chat.providerConfig.id} model={chat.model} userKey={chat.userKey}
          providerConfig={chat.providerConfig}
          onProviderChange={chat.handleProviderChange} onModelChange={chat.setModel} onKeyChange={chat.setUserKey}
        />
      )}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3" style={{ maxHeight: 480 }}>
        {chat.messages.length === 0 ? (
          <p className="text-[10px] text-center py-8" style={{ color: "rgba(255,255,255,0.25)" }}>
            Ask a question — e.g. &quot;What does the table on page 2 show?&quot;
            {documents.length > 1 ? " or “compare these documents”" : ""}
          </p>
        ) : (
          chat.messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "self-end max-w-[85%]" : "self-start max-w-[90%]"}>
              <div className="px-3 py-2 rounded-xl text-[11px] leading-relaxed"
                style={m.role === "user"
                  ? { background: `${ACCENT}18`, color: "rgba(255,255,255,0.9)" }
                  : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.8)" }}>
                {m.role === "assistant"
                  ? <ReactMarkdown>{m.content}</ReactMarkdown>
                  : m.content}
              </div>
            </div>
          ))
        )}
        {chat.loading && (
          <div className="self-start flex items-center gap-1 px-1 py-1" style={{ color: `${ACCENT}99` }}>
            {[0, 1, 2].map(i => (
              <span key={i} className="inline-block w-1.5 h-1.5 rounded-full"
                style={{ background: "currentColor", animation: `mmragBounce 1.1s ${i * 0.15}s infinite ease-in-out` }} />
            ))}
            <style>{`@keyframes mmragBounce { 0%, 80%, 100% { transform: translateY(0); opacity: 0.4; } 40% { transform: translateY(-3px); opacity: 1; } }`}</style>
          </div>
        )}

        {chat.sources.length > 0 && (() => {
          const used = chat.likelyUsedSources;
          // Only split into two groups when the signal is meaningful —
          // some sources flagged used AND some not. An all-or-nothing
          // result (e.g. heavy paraphrasing with low literal overlap)
          // falls back to one flat list rather than mislabeling everything.
          const canSplit = !!used && used.length > 0 && used.length < chat.sources.length;
          const renderCard = (s: typeof chat.sources[number], i: number) => {
            const withMeta = s as typeof s & {
              chunk_type?: string | null; page?: number | null; timestamp_s?: number | null; bbox?: Bbox | null; objects?: DetectedObject[] | null;
              number_mismatch?: boolean | null; pii_types?: string | null; blurry?: boolean | null;
              entities?: { type: string; value: string }[] | null;
              retrieval_trace?: { dense?: { score: number; rank: number }; bm25?: { score: number; rank: number } } | null;
              hybrid_score?: number | null; rerank_score?: number | null; type_boost?: number | null;
            };
            return (
              <RagSourceCard key={i} source={s.source} text={s.text}
                score={s.display_score ?? s.score} rawScore={s.score} accent={ACCENT}
                chunkType={withMeta.chunk_type} page={withMeta.page} numberMismatch={!!withMeta.number_mismatch}
                piiTypes={withMeta.pii_types} blurry={!!withMeta.blurry} entities={withMeta.entities}
                retrievalTrace={withMeta.retrieval_trace} hybridScore={withMeta.hybrid_score}
                rerankScore={withMeta.rerank_score} typeBoost={withMeta.type_boost}
                onSelect={() => jumpToCitation(s.source, withMeta.chunk_type, withMeta.page, s.text, withMeta.bbox, withMeta.objects, withMeta.timestamp_s)}
              />
            );
          };
          if (!canSplit) {
            return <div className="flex flex-col gap-1.5 mt-1">{chat.sources.map(renderCard)}</div>;
          }
          const usedSet = new Set(used);
          return (
            <div className="flex flex-col gap-2.5 mt-1">
              <div className="flex flex-col gap-1.5">
                <span className="text-[8px] font-bold uppercase tracking-wide" style={{ color: `${ACCENT}99` }}>
                  Directly cited
                </span>
                {chat.sources.map((s, i) => usedSet.has(i) ? renderCard(s, i) : null)}
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[8px] font-bold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.3)" }}
                  title="Sent to the AI as context, but the answer doesn't appear to draw from this">
                  Additional context (not used in this answer)
                </span>
                {chat.sources.map((s, i) => usedSet.has(i) ? null : renderCard(s, i))}
              </div>
            </div>
          );
        })()}
        {!chat.loading && <GroundednessBadge groundedness={chat.groundedness} />}
        <div ref={chat.bottomRef} />
      </div>
      <div className="p-3 border-t flex gap-2 shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <textarea
          ref={chat.inputRef}
          value={chat.input}
          onChange={e => chat.setInput(e.target.value)}
          onKeyDown={chat.onKeyDown}
          rows={1}
          placeholder="Ask anything about this document…"
          className="flex-1 bg-transparent text-[11px] px-3 py-2 rounded-lg border outline-none resize-none"
          style={{ borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.85)" }}
        />
        <button onClick={chat.send} disabled={chat.loading || !chat.input.trim()}
          className="text-[10px] px-3 py-2 rounded-lg font-medium shrink-0"
          style={{ background: `${ACCENT}20`, color: ACCENT, border: `1px solid ${ACCENT}40`,
                  opacity: chat.loading || !chat.input.trim() ? 0.5 : 1 }}>
          Ask
        </button>
      </div>
    </div>
  );
}