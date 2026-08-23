"use client";

import IngestProgressRail from "./IngestProgressRail";
import type { IngestState } from "./_types";

type Doc = Extract<IngestState, { kind: "done" }>;

const displayName = (source: string) => source.replace(/^user:/, "").replace(/:[a-f0-9]{8}$/, "");

function kindOf(source: string): "video" | "image" | "pdf" {
  const s = source.toLowerCase();
  if (/\.(mp4|mov|webm|avi|mkv)(:|$)/.test(s)) return "video";
  if (/\.(png|jpe?g|gif|webp)(:|$)/.test(s)) return "image";
  return "pdf";
}

function DocIcon({ kind }: { kind: "video" | "image" | "pdf" }) {
  if (kind === "video") {
    return (
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="6" width="13" height="12" rx="1.5" /><path d="M16 10l5-3v10l-5-3" />
      </svg>
    );
  }
  if (kind === "image") {
    return (
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
      </svg>
    );
  }
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3h9l5 5v13H6z" /><path d="M8 12h8M8 16h5" />
    </svg>
  );
}

function subtitle(d: Doc): string {
  const parts: string[] = [];
  if (d.pageImages.length > 0) parts.push(`${d.pageImages.length} page${d.pageImages.length > 1 ? "s" : ""}`);
  if (d.summary.figure) parts.push(`${d.summary.figure} figure${d.summary.figure > 1 ? "s" : ""}`);
  if (d.summary.video) parts.push(`${d.summary.video} frame${d.summary.video > 1 ? "s" : ""}`);
  return parts.length > 0 ? parts.join(" · ") : `${d.chunksAdded} chunk${d.chunksAdded === 1 ? "" : "s"}`;
}

type Props = {
  documents: Doc[];
  accent: string;
  cardStyle: React.CSSProperties;
  activeSource: string | null;
  /** Switches the Evidence panel to this document's page 1 — see
   * MmRagRunner.tsx's selectDocument. */
  onSelectDocument: (source: string) => void;
  summaryOpenFor: string | null;
  setSummaryOpenFor: (fn: (s: string | null) => string | null) => void;
  removeDocument: (source: string) => void;
  sessionId: string;
  ensureSessionId: () => string;
  onIngested: (result: Doc) => void;
};

/** Vertical "evidence stack" of the session's uploaded documents — the left
 * column of the 3-column layout. Clicking a row switches the Evidence panel
 * to that document's page 1 AND toggles its extracted-structure summary
 * (the same summary action the horizontal chip row's "summary" link already
 * performs) — previously only the summary toggle happened, so clicking a
 * different document in this list appeared to do nothing to the view. Hosts
 * the actual upload control (IngestProgressRail,
 * in its borderless "bare" mode) at the bottom, so there's exactly one
 * "add a document" entry point instead of a second one duplicated above the
 * 3-column grid. Split out of MmRagRunner.tsx to stay under the project's
 * file-length limit. */
export default function DocumentTray({ documents, accent, cardStyle, activeSource, onSelectDocument, summaryOpenFor, setSummaryOpenFor, removeDocument, sessionId, ensureSessionId, onIngested }: Props) {
  return (
    <div style={cardStyle} className="flex flex-col gap-1 p-2 h-full">
      <span className="text-[11px] font-bold uppercase tracking-[0.1em] px-1.5 pt-1 pb-1.5 shrink-0" style={{ color: `${accent}99` }}>
        Session sources
      </span>
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1">
        {documents.map(d => {
          const isOpen = summaryOpenFor === d.source;
          const isActive = activeSource === d.source;
          return (
            <div key={d.source}
              onClick={() => { onSelectDocument(d.source); setSummaryOpenFor(s => s === d.source ? null : d.source); }}
              className="flex items-start gap-2 px-1.5 py-1.5 rounded-lg cursor-pointer transition-colors"
              style={{ background: isOpen || isActive ? "var(--border)" : "transparent" }}>
              <span className="mt-0.5 shrink-0" style={{ color: accent }}><DocIcon kind={kindOf(d.source)} /></span>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium truncate" style={{ color: "var(--text)" }}>
                  {displayName(d.source)}
                </div>
                <div className="text-[11px] mt-0.5" style={{ color: "var(--text2)", fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace" }}>
                  {subtitle(d)}
                </div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); removeDocument(d.source); }} title="Remove this document"
                className="shrink-0 px-1 text-[13px]" style={{ color: `${accent}99` }}>
                ×
              </button>
            </div>
          );
        })}
      </div>
      <div className="px-1 pt-1 shrink-0">
        <IngestProgressRail sessionId={sessionId} ensureSessionId={ensureSessionId} onIngested={onIngested} bare />
      </div>
    </div>
  );
}