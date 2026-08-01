"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useRagChat } from "@/components/useRagChat";
import GroundednessBadge from "@/components/GroundednessBadge";
import ToolsAIChatSettings from "@/components/ToolsAIChatSettings";
import { PROVIDERS } from "@/components/toolsAiProviders";
import type { IngestState } from "./_types";

type Doc = Extract<IngestState, { kind: "done" }>;

// A serif face for the user's own question only — sets it apart from the
// generated answer below (sans) the way a dossier separates the question
// asked from the finding, without touching the rest of the site's type.
const DISPLAY_FONT = "ui-serif, 'Iowan Old Style', 'Palatino Linotype', 'Source Serif Pro', Georgia, serif";

type Props = {
  chat: ReturnType<typeof useRagChat>;
  documents: Doc[];
  accent: string;
  cardStyle: React.CSSProperties;
  settingsOpen: boolean;
  setSettingsOpen: (fn: (o: boolean) => boolean) => void;
};

/** The chat message list + input box — citation cards live in the
 * separate EvidencePanel now. Split out of MmRagRunner.tsx to stay under
 * the project's file-length limit. */
export default function ChatPanel({ chat, documents, accent: ACCENT, cardStyle, settingsOpen, setSettingsOpen }: Props) {
  // UI-only capture for now — no backend endpoint to persist this yet.
  const [feedback, setFeedback] = useState<Record<number, "up" | "down">>({});
  // Screen-reader announcement, deliberately decoupled from the visible
  // token-by-token stream: an aria-live region that updates on every token
  // gets announced at typing speed and comes out chaotic/too fast. Instead
  // announce once when a response starts, then once more with the full
  // text when it finishes — same information, at a pace a screen reader
  // can actually speak.
  const [liveAnnouncement, setLiveAnnouncement] = useState("");
  const wasLoadingRef = useRef(false);
  useEffect(() => {
    if (chat.loading && !wasLoadingRef.current) {
      setLiveAnnouncement("Generating answer…");
    } else if (!chat.loading && wasLoadingRef.current) {
      const last = chat.messages[chat.messages.length - 1];
      if (last?.role === "assistant") setLiveAnnouncement(last.content);
    }
    wasLoadingRef.current = chat.loading;
  }, [chat.loading, chat.messages]);
  return (
    <div style={cardStyle} className="flex flex-col min-h-0 h-full" >
      <div className="px-4 py-2.5 border-b shrink-0 flex items-center justify-between" style={{ borderColor: `${ACCENT}18` }}>
        <span className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: `${ACCENT}99` }}>
          Ask about your document{documents.length > 1 ? "s" : ""}
        </span>
        <div className="flex items-center gap-1.5">
          {chat.servedProvider && !chat.loading && (
            chat.primaryProvider && chat.primaryProvider !== chat.servedProvider ? (
              <span title={`Tried ${chat.primaryProvider} first (${chat.primaryFailure}), used ${chat.servedModel ?? chat.servedProvider} instead.`}
                className="text-[10px] px-1.5 py-0.5 rounded cursor-help"
                style={{ background: "rgba(245,158,11,0.1)", color: "#fbbf24" }}>
                {chat.primaryProvider} failed ({chat.primaryFailure}) — answered via {chat.servedProvider}
              </span>
            ) : (
              <span title={chat.servedModel ?? undefined}
                className="text-[10px] px-1.5 py-0.5 rounded"
                style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.35)" }}>
                Answered via {chat.servedProvider}
              </span>
            )
          )}
          <button onClick={() => setSettingsOpen(o => !o)}
            title="Provider & API key settings"
            className="text-[11px] px-2 py-0.5 rounded border transition-colors hover:bg-white/5"
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
      <div aria-live="polite" aria-atomic="true" style={{
        position: "absolute", width: 1, height: 1, padding: 0, margin: -1,
        overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: 0,
      }}>
        {liveAnnouncement}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-3">
        {chat.messages.length === 0 ? (
          <div className="text-center py-8 px-2">
            <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.3)" }}>
              Ask a question — e.g. &quot;What does the table on page 2 show?&quot;
              {documents.length > 1 ? " or “compare these documents”" : ""}
            </p>
            {/* First-run capability hint — without this, a new user has no
             * reason to expect the tool understands tables/charts/video
             * frames/multi-doc comparisons beyond plain text Q&A. */}
            <p className="text-[11px] mt-2" style={{ color: "rgba(255,255,255,0.18)" }}>
              Works with tables, charts, images, and video frames — and can
              compare details across multiple uploaded documents.
            </p>
          </div>
        ) : (
          chat.messages.map((m, i) => {
            const isLastAssistant = m.role === "assistant" && i === chat.messages.length - 1;
            const showFeedback = m.role === "assistant" && !(chat.loading && isLastAssistant) && m.content;
            return (
              <div key={i} className="self-start w-full">
                <div className={m.role === "user" ? "px-3 py-2 rounded-xl text-[15px] leading-snug" : "px-3 py-2 rounded-xl text-[13.5px] leading-relaxed"}
                  style={m.role === "user"
                    ? { background: `${ACCENT}18`, color: "rgba(255,255,255,0.92)", fontFamily: DISPLAY_FONT }
                    : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.8)" }}>
                  {m.role === "assistant"
                    ? <ReactMarkdown>{m.content}</ReactMarkdown>
                    : m.content}
                </div>
                {m.role === "assistant" && (showFeedback || (isLastAssistant && !chat.loading && chat.groundedness)) && (
                  <div className="flex items-center justify-between gap-2 mt-1.5 pl-1">
                    <div>
                      {isLastAssistant && !chat.loading && (
                        <GroundednessBadge groundedness={chat.groundedness} selfCorrected={chat.selfCorrected} />
                      )}
                    </div>
                    {showFeedback && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        {(["up", "down"] as const).map(dir => (
                          <button key={dir} onClick={() => setFeedback(f => ({ ...f, [i]: dir }))}
                            title={dir === "up" ? "Good answer" : "Bad answer"}
                            aria-label={dir === "up" ? "Good answer" : "Bad answer"}
                            className="w-7 h-7 rounded-lg border flex items-center justify-center transition-colors hover:bg-white/5"
                            style={{
                              borderColor: feedback[i] === dir ? `${ACCENT}55` : "rgba(255,255,255,0.12)",
                              background: feedback[i] === dir ? `${ACCENT}18` : "transparent",
                              color: feedback[i] === dir ? ACCENT : "rgba(255,255,255,0.4)",
                            }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              {dir === "up"
                                ? <path d="M7 22V11l5-9 1.5 1L12 11h8a2 2 0 0 1 2 2.24l-1.2 7A2 2 0 0 1 18.83 22H7Z" transform="translate(0,-1)" />
                                : <path d="M17 2v11l-5 9-1.5-1L12 13H4a2 2 0 0 1-2-2.24l1.2-7A2 2 0 0 1 5.17 2H17Z" transform="translate(0,1)" />}
                            </svg>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
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

        <div ref={chat.bottomRef} />
      </div>
      <div className="p-3 border-t shrink-0" style={{ borderColor: `${ACCENT}18` }}>
        <div className="flex items-end gap-2 rounded-2xl p-1.5 pl-3.5"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <textarea
            ref={chat.inputRef}
            value={chat.input}
            onChange={e => chat.setInput(e.target.value)}
            onKeyDown={chat.onKeyDown}
            rows={1}
            placeholder="Ask anything about this document…"
            className="flex-1 bg-transparent text-[14px] py-1.5 outline-none resize-none"
            style={{ color: "rgba(255,255,255,0.85)" }}
          />
          {chat.loading ? (
            <button onClick={chat.stop} title="Stop generating"
              className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.4)" }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="2" /></svg>
            </button>
          ) : (
            <button onClick={chat.send} disabled={!chat.input.trim()} title="Ask"
              className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: ACCENT, color: "#0c0f16", opacity: !chat.input.trim() ? 0.4 : 1 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1.5 pl-1 text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>
          <span>↵ to ask</span>
          {documents.length > 1 && <span>Try: &quot;compare these documents&quot;</span>}
        </div>
      </div>
    </div>
  );
}