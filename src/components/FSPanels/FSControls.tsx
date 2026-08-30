"use client";

import type { SelectionResult } from "@/lib/fsAlgorithms";

const ACCENT = "#a9652d";

interface FSControlsProps {
  tabs: { id: string; label: string; enabled: boolean; cat: string }[];
  tabCategories: { label: string; color: string }[];
  activeTab: string;
  setActiveTab: (id: string) => void;
  result: SelectionResult | null;
  running: boolean;
  aiLoading: boolean;
  aiError: string;
  hasFile: boolean;
  onRun: () => void;
  onAISuggest: () => void;
}

export default function FSControls({
  tabs,
  tabCategories,
  activeTab,
  setActiveTab,
  result,
  running,
  aiLoading,
  aiError,
  hasFile,
  onRun,
  onAISuggest,
}: FSControlsProps) {
  const activePipeline = tabs.filter(t => t.enabled);

  return (
    <>
      {/* Grouped tab bar */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", marginBottom: "1.25rem" }}>
        {tabCategories.map(cat => {
          const catTabs = tabs.filter(t => t.cat === cat.label);
          return (
            <div key={cat.label} style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <span style={{
                fontSize: "0.6rem", fontWeight: 700, color: cat.color,
                textTransform: "uppercase", letterSpacing: "0.09em",
                width: 58, flexShrink: 0, textAlign: "right",
              }}>{cat.label}</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.2rem", flex: 1, background: "rgba(0,0,0,0.2)", borderRadius: 7, padding: "0.2rem", borderLeft: `2px solid ${cat.color}30` }}>
                {catTabs.map(tab => {
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      style={{
                        padding: "0.32rem 0.6rem", border: "none", borderRadius: 5, cursor: "pointer",
                        fontSize: "0.74rem", fontWeight: 600, transition: "all 0.15s",
                        background: active ? cat.color : "transparent",
                        color: active ? "#000" : tab.enabled ? "var(--text)" : "var(--text3)",
                        boxShadow: active ? `0 0 8px ${cat.color}44` : "none",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {tab.label}
                      {tab.enabled && !active && (
                        <span style={{ marginLeft: "0.3rem", display: "inline-block", width: 5, height: 5, borderRadius: 9999, background: cat.color, verticalAlign: "middle", opacity: 0.8 }} />
                      )}
                      {result && tab.enabled && (
                        <span style={{ fontSize: "0.58rem", background: "rgba(0,0,0,0.3)", borderRadius: 9999, padding: "1px 5px", marginLeft: "0.25rem", color: active ? "#000" : "var(--text3)" }}>
                          {result.keptCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pipeline indicator */}
      {activePipeline.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", flexWrap: "wrap", padding: "0.6rem 0.9rem", background: "var(--bg-glass)", backdropFilter: "blur(14px)", borderRadius: 8, border: "1px solid var(--border)", marginBottom: "0.75rem" }}>
          <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em", marginRight: "0.25rem" }}>Pipeline</span>
          {activePipeline.map((t, i) => {
            const cat = tabCategories.find(c => c.label === t.cat);
            return (
              <span key={t.id} style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                {i > 0 && <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.7rem" }}>&rarr;</span>}
                <span style={{ fontSize: "0.7rem", fontWeight: 600, color: cat?.color ?? ACCENT, padding: "1px 7px", borderRadius: 4, background: `${cat?.color ?? ACCENT}14`, border: `1px solid ${cat?.color ?? ACCENT}28` }}>
                  {t.label}
                </span>
              </span>
            );
          })}
        </div>
      )}

      {/* Run + AI Suggest row */}
      <div style={{ position: "sticky", bottom: "1.5rem", zIndex: 20, alignSelf: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <button
            onClick={onRun}
            disabled={running}
            onMouseEnter={e => { if (!running) { e.currentTarget.style.opacity = "0.88"; e.currentTarget.style.transform = "translateY(-1px)"; } }}
            onMouseLeave={e => { e.currentTarget.style.opacity = running ? "0.6" : "1"; e.currentTarget.style.transform = "translateY(0)"; }}
            style={{
              padding: "0.75rem 2rem",
              background: ACCENT, border: "none", borderRadius: 9999,
              color: "#fff", fontWeight: 700, fontSize: "0.9rem",
              cursor: running ? "wait" : "pointer",
              opacity: running ? 0.6 : 1, transition: "opacity 0.15s, transform 0.15s",
            }}
          >
            {running ? "Running..." : "Run Feature Selection"}
          </button>
          <button
            onClick={onAISuggest}
            disabled={aiLoading || !hasFile}
            title="Let AI analyze your dataset and suggest which methods to enable"
            style={{
              display: "flex", alignItems: "center", gap: "0.45rem",
              padding: "0.75rem 1.25rem",
              background: "rgba(139,92,246,0.12)",
              border: "1px solid rgba(139,92,246,0.35)",
              borderRadius: 8,
              color: aiLoading ? "var(--text3)" : "#a78bfa",
              fontWeight: 600, fontSize: "0.84rem",
              cursor: aiLoading ? "wait" : "pointer",
              transition: "all 0.15s",
              opacity: aiLoading ? 0.6 : 1,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            {aiLoading ? "Analyzing..." : "AI Suggest Methods"}
          </button>
        </div>
        {aiError && (
          <div style={{ fontSize: "0.72rem", color: aiError.startsWith("Done") ? "#4ade80" : "#f87171", marginTop: "0.35rem" }}>
            {aiError}
          </div>
        )}
      </div>
    </>
  );
}