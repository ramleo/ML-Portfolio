"use client";

import ShareSessionPanel from "./ShareSessionPanel";
import type { IngestState } from "./_types";

const displayName = (source: string) => source.replace(/^user:/, "").replace(/:[a-f0-9]{8}$/, "");

const CHUNK_TYPE_FILTER_LABEL: Record<string, string> = {
  text: "Text", table: "Table", figure: "Figure", image: "Image", video: "Video Frame",
};
const ENTITY_TYPE_FILTER_LABEL: Record<string, string> = { money: "Money", date: "Date", percent: "Percent" };

type Doc = Extract<IngestState, { kind: "done" }>;

type Props = {
  documents: Doc[];
  accent: string;
  sessionId: string;
  summaryOpenFor: string | null;
  setSummaryOpenFor: (fn: (s: string | null) => string | null) => void;
  removeDocument: (source: string) => void;
  availableChunkTypes: string[];
  chunkTypeFilter: string[];
  setChunkTypeFilter: (fn: (cur: string[]) => string[]) => void;
  availableEntityTypes: string[];
  entityTypeFilter: string[];
  setEntityTypeFilter: (fn: (cur: string[]) => string[]) => void;
  /** False when the DocumentTray sidebar already renders the per-doc list
   * (the 3-column layout) — this row then only shows filters + share. */
  showDocuments?: boolean;
};

export default function DocumentChipsRow({
  documents, accent, sessionId, summaryOpenFor, setSummaryOpenFor, removeDocument,
  availableChunkTypes, chunkTypeFilter, setChunkTypeFilter,
  availableEntityTypes, entityTypeFilter, setEntityTypeFilter, showDocuments = true,
}: Props) {
  if (documents.length === 0) return null;

  const toggleChunkType = (t: string) => {
    setChunkTypeFilter(cur => cur.includes(t) ? cur.filter(x => x !== t) : [...cur, t]);
  };
  const toggleEntityType = (t: string) => {
    setEntityTypeFilter(cur => cur.includes(t) ? cur.filter(x => x !== t) : [...cur, t]);
  };

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        {showDocuments && (
          <>
            <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.3)" }}>
              Documents in this chat:
            </span>
            {documents.map(d => (
              <span key={d.source} className="flex items-center gap-1.5 text-[12px] px-2 py-1 rounded-full"
                style={{ background: `${accent}12`, border: `1px solid ${accent}30`, color: "rgba(255,255,255,0.7)" }}>
                {displayName(d.source)}
                <button onClick={() => setSummaryOpenFor(s => s === d.source ? null : d.source)}
                  title="Show extracted structure (tables, figures)"
                  style={{ color: summaryOpenFor === d.source ? accent : `${accent}99`, lineHeight: 1 }}>
                  {summaryOpenFor === d.source ? "▾" : "▸"} summary
                </button>
                <button onClick={() => removeDocument(d.source)} title="Remove this document"
                  style={{ color: `${accent}99`, lineHeight: 1 }}>×</button>
              </span>
            ))}
          </>
        )}
        <ShareSessionPanel sessionId={sessionId} accent={accent} />
      </div>

      {(availableChunkTypes.length > 1 || availableEntityTypes.length > 0) && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.3)" }}>
            Only search:
          </span>
          <button onClick={() => { setChunkTypeFilter(() => []); setEntityTypeFilter(() => []); }}
            className="text-[11px] px-2 py-0.5 rounded-full border transition-colors"
            style={chunkTypeFilter.length === 0 && entityTypeFilter.length === 0
              ? { borderColor: `${accent}55`, background: `${accent}22`, color: accent }
              : { borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.4)" }}>
            All
          </button>
          {availableChunkTypes.length > 1 && availableChunkTypes.map(t => (
            <button key={t} onClick={() => toggleChunkType(t)}
              className="text-[11px] px-2 py-0.5 rounded-full border transition-colors"
              style={chunkTypeFilter.includes(t)
                ? { borderColor: `${accent}55`, background: `${accent}22`, color: accent }
                : { borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.4)" }}>
              {CHUNK_TYPE_FILTER_LABEL[t] ?? t}
            </button>
          ))}
          {availableEntityTypes.map(t => (
            <button key={t} onClick={() => toggleEntityType(t)}
              title={`Only search chunks containing a ${ENTITY_TYPE_FILTER_LABEL[t]?.toLowerCase() ?? t}`}
              className="text-[11px] px-2 py-0.5 rounded-full border transition-colors"
              style={entityTypeFilter.includes(t)
                ? { borderColor: `${accent}55`, background: `${accent}22`, color: accent }
                : { borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.4)" }}>
              {ENTITY_TYPE_FILTER_LABEL[t] ?? t}
            </button>
          ))}
        </div>
      )}
    </>
  );
}