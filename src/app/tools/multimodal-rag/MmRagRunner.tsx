"use client";

import { useCallback, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useRagChat } from "@/components/useRagChat";
import RagSourceCard from "@/components/RagSourceCard";
import IngestProgressRail from "./IngestProgressRail";
import CitationThumbnailPanel from "./CitationThumbnailPanel";
import type { IngestState } from "./_types";

const ACCENT = "#a78bfa";

const CONTEXT = {
  tool: "Multimodal RAG",
  summary: "Upload a PDF with tables and figures; ask questions grounded in the document's text, tables, and AI-captioned charts, with page citations.",
  restrictToUploads: true,
};

export default function MmRagRunner() {
  const chat = useRagChat(CONTEXT);
  const [ingested, setIngested] = useState<Extract<IngestState, { kind: "done" }> | null>(null);
  const [activeCitation, setActiveCitation] = useState<{ page: number | null; chunkType: string | null; source: string | null } | null>(null);

  const ensureSessionId = useCallback(() => {
    if (chat.sessionId) return chat.sessionId;
    const id = crypto.randomUUID();
    chat.setSessionId(id);
    return id;
  }, [chat]);

  const handleIngested = useCallback((result: Extract<IngestState, { kind: "done" }>) => {
    setIngested(result);
    // Show page 1 immediately — don't make the user click a citation just to
    // discover a preview exists at all.
    setActiveCitation({ page: 1, chunkType: null, source: result.source });
    chat.clearChat();
  }, [chat]);

  const cardStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14,
  };

  return (
    <div className="flex flex-col gap-4">
      <IngestProgressRail sessionId={chat.sessionId} ensureSessionId={ensureSessionId} onIngested={handleIngested}
        previousSource={ingested?.source ?? null} />

      {ingested && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Chat */}
          <div style={cardStyle} className="flex flex-col min-h-0" >
            <div className="px-4 py-2.5 border-b shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <span className="text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: `${ACCENT}99` }}>
                Ask about your document
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3" style={{ maxHeight: 480 }}>
              {chat.messages.length === 0 ? (
                <p className="text-[10px] text-center py-8" style={{ color: "rgba(255,255,255,0.25)" }}>
                  Ask a question — e.g. &quot;What does the table on page 2 show?&quot;
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

              {chat.sources.length > 0 && (
                <div className="flex flex-col gap-1.5 mt-1">
                  {chat.sources.map((s, i) => {
                    const withMeta = s as typeof s & { chunk_type?: string | null; page?: number | null };
                    return (
                      <RagSourceCard key={i} source={s.source} text={s.text}
                        score={s.display_score ?? s.score} rawScore={s.score} accent={ACCENT}
                        chunkType={withMeta.chunk_type} page={withMeta.page}
                        onSelect={() => setActiveCitation({ page: withMeta.page ?? null, chunkType: withMeta.chunk_type ?? null, source: s.source })}
                      />
                    );
                  })}
                </div>
              )}
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

          {/* Citation thumbnail */}
          <div className="flex flex-col gap-3">
            {activeCitation && activeCitation.source && activeCitation.source !== ingested.source ? (
              <div style={cardStyle} className="flex items-center justify-center py-16">
                <p className="text-[10px] text-center px-6" style={{ color: "rgba(255,255,255,0.25)" }}>
                  No preview — this citation is from a previously uploaded document that&apos;s no longer loaded.
                </p>
              </div>
            ) : activeCitation ? (
              <CitationThumbnailPanel pageImages={ingested.pageImages} page={activeCitation.page}
                chunkType={activeCitation.chunkType} source={ingested.source}
                canFindSimilar={ingested.embeddingMode === "caption+clip"} />
            ) : (
              <div style={cardStyle} className="flex items-center justify-center py-16">
                <p className="text-[10px] text-center px-6" style={{ color: "rgba(255,255,255,0.25)" }}>
                  Click a citation to see its page
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}