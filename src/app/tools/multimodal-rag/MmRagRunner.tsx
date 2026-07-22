"use client";

import { useCallback, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useRagChat } from "@/components/useRagChat";
import RagSourceCard from "@/components/RagSourceCard";
import ToolsAIChatSettings from "@/components/ToolsAIChatSettings";
import { PROVIDERS } from "@/components/toolsAiProviders";
import { ML_UNIFIED_API } from "@/config/urls";
import IngestProgressRail from "./IngestProgressRail";
import CitationThumbnailPanel from "./CitationThumbnailPanel";
import PageThumbnailRail from "./PageThumbnailRail";
import type { IngestState } from "./_types";

const ACCENT = "#a78bfa";

const CONTEXT = {
  tool: "Multimodal RAG",
  summary: "Upload PDFs, images, or CSVs with tables and figures; ask questions grounded across all of them, with page citations naming the source document.",
  restrictToUploads: true,
};

type Doc = Extract<IngestState, { kind: "done" }>;

export default function MmRagRunner() {
  const chat = useRagChat(CONTEXT);
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [activeCitation, setActiveCitation] = useState<{ page: number | null; chunkType: string | null; source: string | null } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [summaryOpenFor, setSummaryOpenFor] = useState<string | null>(null);

  const ensureSessionId = useCallback(() => {
    if (chat.sessionId) return chat.sessionId;
    const id = crypto.randomUUID();
    chat.setSessionId(id);
    return id;
  }, [chat]);

  const handleIngested = useCallback((result: Doc) => {
    setDocuments(docs => [...docs, result]);
    // Show page 1 of the just-uploaded doc immediately — don't make the user
    // click a citation just to discover a preview exists at all.
    setActiveCitation({ page: 1, chunkType: null, source: result.source });
  }, []);

  const removeDocument = useCallback(async (source: string) => {
    try {
      await fetch(`${ML_UNIFIED_API}/rag/uploads/${encodeURIComponent(source)}`, { method: "DELETE" });
    } catch { /* best-effort — a stale chunk left behind is not fatal */ }
    setDocuments(docs => docs.filter(d => d.source !== source));
    setActiveCitation(c => (c?.source === source ? null : c));
  }, []);

  const activeDoc = documents.find(d => d.source === activeCitation?.source) ?? null;

  const cardStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14,
  };

  return (
    <div className="flex flex-col gap-4">
      <IngestProgressRail sessionId={chat.sessionId} ensureSessionId={ensureSessionId} onIngested={handleIngested} />

      {documents.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.3)" }}>
            Documents in this chat:
          </span>
          {documents.map(d => (
            <span key={d.source} className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full"
              style={{ background: `${ACCENT}12`, border: `1px solid ${ACCENT}30`, color: "rgba(255,255,255,0.7)" }}>
              {d.source.replace(/^user:/, "").replace(/:[a-f0-9]{8}$/, "")}
              <button onClick={() => setSummaryOpenFor(s => s === d.source ? null : d.source)}
                title="Show extracted structure (tables, figures)"
                style={{ color: summaryOpenFor === d.source ? ACCENT : `${ACCENT}99`, lineHeight: 1 }}>
                {summaryOpenFor === d.source ? "▾" : "▸"} summary
              </button>
              <button onClick={() => removeDocument(d.source)} title="Remove this document"
                style={{ color: `${ACCENT}99`, lineHeight: 1 }}>×</button>
            </span>
          ))}
        </div>
      )}

      {documents.map(d => summaryOpenFor === d.source && (
        <div key={`summary-${d.source}`} style={cardStyle} className="p-3 flex flex-col gap-1.5">
          <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.3)" }}>
            Extracted from {d.source.replace(/^user:/, "").replace(/:[a-f0-9]{8}$/, "")}
          </span>
          {d.notableChunks.length === 0 ? (
            <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
              No tables or figures were detected — only plain text.
            </p>
          ) : (
            d.notableChunks.map((c, i) => (
              <RagSourceCard key={i} source={d.source} text={c.text} score={1} accent={ACCENT}
                chunkType={c.chunkType} page={c.page} hideConfidence
                onSelect={() => setActiveCitation({ page: c.page, chunkType: c.chunkType, source: d.source })}
              />
            ))
          )}
        </div>
      ))}

      {documents.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Chat */}
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
                  const withMeta = s as typeof s & { chunk_type?: string | null; page?: number | null };
                  return (
                    <RagSourceCard key={i} source={s.source} text={s.text}
                      score={s.display_score ?? s.score} rawScore={s.score} accent={ACCENT}
                      chunkType={withMeta.chunk_type} page={withMeta.page}
                      onSelect={() => setActiveCitation({ page: withMeta.page ?? null, chunkType: withMeta.chunk_type ?? null, source: s.source })}
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

          {/* Citation thumbnail + full-document browser */}
          <div className="flex gap-3">
            <div className="flex-1 flex flex-col gap-3 min-w-0">
              {activeCitation && activeCitation.source && !activeDoc ? (
                <div style={cardStyle} className="flex items-center justify-center py-16">
                  <p className="text-[10px] text-center px-6" style={{ color: "rgba(255,255,255,0.25)" }}>
                    No preview — this citation is from a document that&apos;s no longer loaded.
                  </p>
                </div>
              ) : activeCitation && activeDoc ? (
                <CitationThumbnailPanel pageImages={activeDoc.pageImages} page={activeCitation.page}
                  chunkType={activeCitation.chunkType} source={activeDoc.source}
                  canFindSimilar={activeDoc.embeddingMode === "caption+clip"} />
              ) : (
                <div style={cardStyle} className="flex items-center justify-center py-16">
                  <p className="text-[10px] text-center px-6" style={{ color: "rgba(255,255,255,0.25)" }}>
                    Click a citation to see its page
                  </p>
                </div>
              )}
            </div>
            {activeDoc && (
              <PageThumbnailRail pageImages={activeDoc.pageImages}
                activePage={activeCitation?.source === activeDoc.source ? activeCitation.page : null}
                onSelect={(page) => setActiveCitation({ page, chunkType: null, source: activeDoc.source })} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}