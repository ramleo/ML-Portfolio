"use client";

import RagIngestButton from "./RagIngestButton";
import RagIngestBanner from "./RagIngestBanner";
import RagUploadsPanel from "./RagUploadsPanel";
import RagJinaBanner from "./RagJinaBanner";
import ToolsAIChatSettings from "./ToolsAIChatSettings";
import ChatMessageList from "./ChatMessageList";
import AgentGraphDiagram from "./AgentGraphDiagram";
import AgentStepRail from "./AgentStepRail";
import { PROVIDERS } from "./toolsAiProviders";
import { useRagChat } from "./useRagChat";
import { ChatIcon, SendIcon, SparkleIcon, GearIcon, TrashIcon, DeepSearchIcon } from "./ToolsAIChatIcons";

export type { ToolChatContext } from "./useRagChat";

const PANEL_W = 370;
const PANEL_H = 540;

export default function ToolsAIChat({ context }: { context: import("./useRagChat").ToolChatContext }) {
  // Guide mode: the assistant is a scoped help bot for this tool — hide the
  // dataset-RAG controls (doc upload, Deep Search, Web override, Jina) that
  // would confuse or undermine the guide-only scope.
  const helpMode = !!context.guide;
  const {
    open, setOpen, settings, setSettings,
    messages, input, setInput, loading,
    sources, sourcesOpen, setSourcesOpen,
    ingestStatus, setIngestStatus,
    useJina, jinaStatus, lowConfidence,
    cacheHit, latencyMs, confirmClear, setConfirmClear,
    deepSearch, setDeepSearch, forceWeb, setForceWeb,
    agentStep, agentDoneSteps, agentLoops, agentRewritten,
    expandedQueries, candidatesRetrieved,
    answerSource, confidence,
    model, setModel, userKey, setUserKey, sessionId, setSessionId,
    providerConfig, accentColor, loadingLabel,
    handleProviderChange, enableJina, send, clearChat, onKeyDown,
    bottomRef, inputRef,
  } = useRagChat(context);

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
            {confirmClear ? (
              <>
                <span style={{ fontSize: "0.7rem", color: "var(--text2)", flex: 1 }}>Clear conversation?</span>
                <button onClick={() => { clearChat(); setConfirmClear(false); }}
                  style={{ background: "#ef444418", border: "1px solid #ef444455", borderRadius: 6, color: "#ef4444", cursor: "pointer", padding: "3px 12px", fontSize: "0.65rem", fontWeight: 700 }}>
                  Yes
                </button>
                <button onClick={() => setConfirmClear(false)}
                  style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, color: "var(--text2)", cursor: "pointer", padding: "3px 12px", fontSize: "0.65rem", fontWeight: 700 }}>
                  No
                </button>
              </>
            ) : (
              <>
                <span title={`AI Assistant · ${context.tool}`}
                  style={{ fontSize: "0.62rem", fontWeight: 700, color: accentColor, letterSpacing: "0.05em", textTransform: "uppercase", flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  AI Assistant · {context.tool}
                </span>
                {!helpMode && <>
                <RagIngestButton busy={ingestStatus.kind === "uploading" || ingestStatus.kind === "processing"} onStatusChange={setIngestStatus} onSessionId={id => setSessionId(id)} />
                <RagUploadsPanel accent={accentColor} onStatusChange={setIngestStatus} />
                <button onClick={() => setDeepSearch(d => !d)}
                  title={deepSearch ? "Deep Search active — click to disable." : "Enable Deep Search — LangGraph agent refines query if retrieval quality is low"}
                  style={{ background: deepSearch ? `${accentColor}22` : "transparent", border: `1px solid ${deepSearch ? accentColor + "55" : "rgba(255,255,255,0.1)"}`, borderRadius: 6, color: deepSearch ? accentColor : "var(--text3)", cursor: "pointer", padding: "3px 6px", display: "flex", alignItems: "center", gap: "3px", fontSize: "0.58rem", fontWeight: 600 }}>
                  <DeepSearchIcon />{deepSearch ? "Deep" : "Std"}
                </button>
                <button onClick={() => setForceWeb(w => !w)}
                  title={forceWeb ? "Web override active — responses sourced from live web. Click to disable." : "Force web search — bypasses dataset/KB, searches the web directly"}
                  style={{ background: forceWeb ? "#f59e0b22" : "transparent", border: `1px solid ${forceWeb ? "#f59e0b55" : "rgba(255,255,255,0.1)"}`, borderRadius: 6, color: forceWeb ? "#f59e0b" : "var(--text3)", cursor: "pointer", padding: "3px 6px", display: "flex", alignItems: "center", gap: "3px", fontSize: "0.58rem", fontWeight: 600 }}>
                  <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="5"/><path d="M6 1 C4 3 4 9 6 11"/><path d="M6 1 C8 3 8 9 6 11"/><line x1="1.5" y1="4.5" x2="10.5" y2="4.5"/><line x1="1.5" y1="7.5" x2="10.5" y2="7.5"/></svg>
                  Web
                </button>
                <button onClick={enableJina}
                  title={useJina && jinaStatus === "loading" ? "Jina v3 loading…" : useJina ? "Jina v3 active — click to disable" : "Enable Jina v3 embeddings"}
                  style={{ background: useJina ? `${accentColor}22` : "transparent", border: `1px solid ${useJina ? accentColor + "55" : "rgba(255,255,255,0.1)"}`, borderRadius: 6, color: useJina ? accentColor : "var(--text3)", cursor: "pointer", padding: "3px 6px", display: "flex", alignItems: "center", gap: "3px", fontSize: "0.58rem", fontWeight: 600 }}>
                  <SparkleIcon />{useJina ? "Jina" : "Std"}
                </button>
                </>}
                <button onClick={() => setSettings(s => !s)}
                  style={{ background: settings ? `${accentColor}22` : "transparent", border: `1px solid ${settings ? accentColor + "55" : "rgba(255,255,255,0.1)"}`, borderRadius: 6, color: settings ? accentColor : "var(--text3)", cursor: "pointer", padding: "3px 6px", display: "flex", alignItems: "center" }}>
                  <GearIcon />
                </button>
                {messages.length > 0 && (
                  <button onClick={() => setConfirmClear(true)} title="Clear conversation"
                    style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "var(--text3)", cursor: "pointer", padding: "3px 6px", display: "flex", alignItems: "center" }}>
                    <TrashIcon />
                  </button>
                )}
                <button onClick={() => setOpen(false)}
                  style={{ background: "transparent", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: "1rem", lineHeight: 1, padding: "2px 4px" }}>
                  ×
                </button>
              </>
            )}
          </div>

          {settings && (
            <ToolsAIChatSettings
              providers={PROVIDERS} provider={providerConfig.id} model={model} userKey={userKey}
              providerConfig={providerConfig}
              onProviderChange={handleProviderChange} onModelChange={setModel} onKeyChange={setUserKey}
            />
          )}

          {!helpMode && ingestStatus.kind !== "idle" && (
            <div style={{ padding: "0.5rem 1rem 0" }}>
              <RagIngestBanner status={ingestStatus} accent={accentColor} />
            </div>
          )}
          {!helpMode && (useJina || lowConfidence) && (
            <div style={{ padding: "0.3rem 1rem 0" }}>
              <RagJinaBanner jinaStatus={jinaStatus} useJina={useJina} lowConfidence={lowConfidence} accent={accentColor} onEnableJina={enableJina} />
            </div>
          )}

          {/* Live step rail — visible while Deep Search query is in flight */}
          {deepSearch && loading && (
            <AgentStepRail activeStep={agentStep} completedSteps={agentDoneSteps} accent={accentColor} />
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

          {/* Query refined N× note */}
          {agentRewritten && !loading && (
            <div style={{ padding: "0.25rem 1rem 0", fontSize: "0.6rem", color: accentColor, display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 6 C2 3 6 1 9 4" /><polyline points="7,1 9,4 6,5" />
              </svg>
              Query was refined {agentLoops}× for better results
            </div>
          )}

          <ChatMessageList
            messages={messages} loading={loading} loadingLabel={loadingLabel}
            sources={sources} sourcesOpen={sourcesOpen} accentColor={accentColor}
            bottomRef={bottomRef} cacheHit={cacheHit} latencyMs={latencyMs}
            expandedQueries={expandedQueries} candidatesRetrieved={candidatesRetrieved}
            answerSource={answerSource} confidence={confidence}
            onSuggestion={q => { setInput(q); inputRef.current?.focus(); }}
            onSourcesToggle={() => setSourcesOpen(o => !o)}
            suggestions={context.suggestions}
            emptyHint={context.guide ? `Ask me anything about ${context.tool} or this website.` : undefined}
          />

          {deepSearch && (
            <div style={{ padding: "0 0.75rem", borderTop: "1px solid rgba(255,255,255,0.06)", overflowY: "auto", maxHeight: 220 }}>
              <AgentGraphDiagram activeStep={agentStep} completedSteps={agentDoneSteps} loops={agentLoops} accent={accentColor} />
            </div>
          )}

          {/* Input */}
          <div style={{ padding: "0.6rem 0.75rem", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", gap: "0.5rem", alignItems: "flex-end" }}>
            <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={helpMode ? `Ask about ${context.tool} or this website…` : "Ask about your data or ML techniques…"}
              rows={1}
              style={{ flex: 1, resize: "none", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, color: "var(--text)", fontSize: "0.74rem", padding: "0.45rem 0.6rem", outline: "none", lineHeight: 1.5, maxHeight: 100, overflowY: "auto", fontFamily: "inherit" }}
            />
            <button onClick={send} disabled={!input.trim() || loading}
              style={{ background: input.trim() && !loading ? accentColor : "rgba(255,255,255,0.06)", border: "none", borderRadius: 9, padding: "0.45rem 0.65rem", color: input.trim() && !loading ? "#000" : "var(--text3)", cursor: input.trim() && !loading ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", flexShrink: 0 }}>
              <SendIcon />
            </button>
          </div>
        </div>
      )}

      <button onClick={() => { setOpen(o => !o); setSettings(false); }} title="AI Assistant"
        style={{ pointerEvents: "auto", width: 52, height: 52, borderRadius: "50%", background: open ? "rgba(8,15,30,0.95)" : `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}99 100%)`, border: `2px solid ${open ? accentColor + "66" : "transparent"}`, color: open ? accentColor : "#000", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 4px 20px ${accentColor}44`, transition: "all 0.2s", fontSize: open ? "1.2rem" : "inherit" }}>
        {open ? "×" : <ChatIcon />}
      </button>
    </div>
  );
}