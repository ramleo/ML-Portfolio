"use client";

import { Card, Label } from "./TextToImageRunner";
import type { HistoryEntry } from "./useTextToImageRunner";

/** The "Recent prompts" card — split out of TextToImageRunner.tsx to keep
 * that file under the project's 400-line cap. Each thumbnail has its own
 * small "×" remove button (stopPropagation so it doesn't also trigger
 * restoreFromHistory) alongside the existing "Clear" (wipe all) action. */
export default function TextToImageHistoryPanel({
  accent, history, activeHistoryTimestamp, onRestore, onRemove, onClearAll,
}: {
  accent: string;
  history: HistoryEntry[];
  activeHistoryTimestamp: number | null;
  onRestore: (entry: HistoryEntry) => void;
  onRemove: (timestamp: number) => void;
  onClearAll: () => void;
}) {
  if (history.length === 0) return null;

  return (
    <Card accent={accent}>
      <div className="flex items-center justify-between">
        <Label>Recent prompts</Label>
        <button
          onClick={onClearAll}
          style={{ fontSize: "0.68rem", color: "var(--text3)", background: "none", border: "none", cursor: "pointer" }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--text3)")}
        >
          Clear
        </button>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {history.map(entry => {
          const isActive = entry.timestamp === activeHistoryTimestamp;
          return (
            <div key={entry.timestamp} style={{ position: "relative", flexShrink: 0 }}>
              <button
                onClick={() => onRestore(entry)}
                title={entry.prompt}
                style={{
                  display: "block", width: 68, height: 68, borderRadius: 10, overflow: "hidden",
                  border: isActive ? `2px solid ${accent}` : "1px solid var(--border2)",
                  boxShadow: isActive ? `0 0 0 2px ${accent}33` : "none",
                  cursor: "pointer", padding: 0,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`data:${entry.mimeType};base64,${entry.image}`}
                  alt={entry.prompt}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </button>
              <button
                onClick={e => { e.stopPropagation(); onRemove(entry.timestamp); }}
                title="Remove from history"
                style={{
                  position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: 9999,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "var(--bg)", border: "1px solid var(--border2)",
                  color: "var(--text3)", cursor: "pointer", padding: 0,
                }}
                onMouseEnter={e => { e.currentTarget.style.color = "#f87171"; e.currentTarget.style.borderColor = "#f87171"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "var(--text3)"; e.currentTarget.style.borderColor = "var(--border2)"; }}
              >
                <svg width="9" height="9" viewBox="0 0 14 14" fill="none">
                  <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: "0.68rem", color: "var(--text3)" }}>
        Click a thumbnail to load that image and prompt — stored on this device only, doesn&apos;t re-generate.
      </p>
    </Card>
  );
}