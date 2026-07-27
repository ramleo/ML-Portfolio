"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRagChat } from "@/components/useRagChat";
import { ML_UNIFIED_API } from "@/config/urls";
import IngestProgressRail from "./IngestProgressRail";
import ChatPanel from "./ChatPanel";
import CitationThumbnailPanel from "./CitationThumbnailPanel";
import PageThumbnailRail from "./PageThumbnailRail";
import DocumentSummaryPanel from "./DocumentSummaryPanel";
import ShareWatermark from "./ShareWatermark";
import RevisionPromptBanner from "./RevisionPromptBanner";
import DocumentChipsRow from "./DocumentChipsRow";
import ContradictionsPanel from "./ContradictionsPanel";
import type { Bbox, DetectedObject, IngestState, RevisionCandidate, TranscriptSegment } from "./_types";

function nearestSegmentIndex(segments: TranscriptSegment[], time: number): number | null {
  if (segments.length === 0) return null;
  let bestIdx = 0;
  let bestDist = Infinity;
  segments.forEach((seg, i) => {
    const dist = Math.abs(seg.start - time);
    if (dist < bestDist) { bestDist = dist; bestIdx = i; }
  });
  return bestIdx;
}

/** "Where is the cyclist" -> the "bicycle"/"person" detection, if this
 * citation has one — precomputed labels (MMRAG-07 follow-up) matched
 * against the question's wording, no query-time vision call. Longest
 * label first so a multi-word class ("traffic light") wins over a
 * shorter overlapping word. Word-boundary match avoids "car" firing
 * inside "scar"/"cart". */
function matchObjectToQuestion(objects: DetectedObject[] | null | undefined, question: string): DetectedObject | null {
  if (!objects?.length || !question.trim()) return null;
  const q = question.toLowerCase();
  const sorted = [...objects].sort((a, b) => b.label.length - a.label.length);
  for (const obj of sorted) {
    const escaped = obj.label.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`\\b${escaped}\\b`).test(q)) return obj;
  }
  return null;
}

const ACCENT = "#a78bfa";

const CONTEXT = {
  tool: "Multimodal RAG",
  summary: "Upload PDFs, images, or CSVs with tables and figures; ask questions grounded across all of them, with page citations naming the source document.",
  restrictToUploads: true,
};

type Doc = Extract<IngestState, { kind: "done" }>;

// A citation's chunk text is a chunk_document()-derived window over the
// flat transcript, so it won't align exactly with Whisper's own segment
// boundaries — find whichever segment shares the most words with it, to
// jump/highlight the closest real match rather than requiring an exact one.
function bestMatchingSegmentIndex(segments: TranscriptSegment[], citationText: string): number | null {
  const citWords = new Set(citationText.toLowerCase().match(/\w+/g) ?? []);
  if (citWords.size === 0) return null;
  let bestIdx: number | null = null;
  let bestScore = 0;
  segments.forEach((seg, i) => {
    const segWords = seg.text.toLowerCase().match(/\w+/g) ?? [];
    if (segWords.length === 0) return;
    let overlap = 0;
    for (const w of segWords) if (citWords.has(w)) overlap++;
    const score = overlap / segWords.length;
    if (score > bestScore) { bestScore = score; bestIdx = i; }
  });
  return bestScore > 0 ? bestIdx : null;
}

export default function MmRagRunner() {
  const chat = useRagChat(CONTEXT);
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [activeCitation, setActiveCitation] = useState<{ page: number | null; chunkType: string | null; source: string | null; bbox: Bbox | null; objects: DetectedObject[] | null } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [summaryOpenFor, setSummaryOpenFor] = useState<string | null>(null);
  const [highlightedSegment, setHighlightedSegment] = useState<{ source: string; index: number } | null>(null);
  const segmentRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const [isSharedView, setIsSharedView] = useState(false);
  const [revisionPrompt, setRevisionPrompt] = useState<{ newSource: string; old: RevisionCandidate } | null>(null);

  // A shared-session link (?share=<token>) puts this tab into a read/chat-only
  // mode against someone else's uploaded documents — never generate our own
  // session_id or show upload/delete controls in that case.
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("share");
    if (!token) return;
    setIsSharedView(true);
    chat.setShareToken(token);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    setActiveCitation({ page: 1, chunkType: null, source: result.source, bbox: null, objects: null });
    // Ingestion diffing is informational only — never auto-replaces anything.
    // Only prompt if the flagged older doc is still actually in this session
    // (it always should be, but don't trust it blindly).
    if (result.possibleRevisionOf) {
      setRevisionPrompt(prev => prev ?? { newSource: result.source, old: result.possibleRevisionOf! });
    }
  }, []);

  const removeDocument = useCallback(async (source: string) => {
    try {
      await fetch(`${ML_UNIFIED_API}/rag/uploads/${encodeURIComponent(source)}`, { method: "DELETE" });
    } catch { /* best-effort — a stale chunk left behind is not fatal */ }
    setDocuments(docs => docs.filter(d => d.source !== source));
    setActiveCitation(c => (c?.source === source ? null : c));
  }, []);

  const activeDoc = documents.find(d => d.source === activeCitation?.source) ?? null;

  // A transcript-chunk citation (chunkType "text", same tag plain PDF text
  // chunks use — harmless here since non-video docs always have empty
  // transcriptSegments) additionally opens that document's summary panel
  // and highlights/scrolls to the closest-matching transcript segment.
  const jumpToCitation = useCallback((source: string, chunkType: string | null | undefined,
                                      page: number | null | undefined, text: string, bbox?: Bbox | null,
                                      objects?: DetectedObject[] | null) => {
    setActiveCitation({ page: page ?? null, chunkType: chunkType ?? null, source, bbox: bbox ?? null, objects: objects ?? null });
    if (chunkType !== "text") return;
    const doc = documents.find(d => d.source === source);
    if (!doc || doc.transcriptSegments.length === 0) return;
    const idx = bestMatchingSegmentIndex(doc.transcriptSegments, text);
    if (idx === null) return;
    setSummaryOpenFor(source);
    setHighlightedSegment({ source, index: idx });
  }, [documents]);

  const jumpToChapter = useCallback((source: string, segments: TranscriptSegment[], time: number) => {
    const idx = nearestSegmentIndex(segments, time);
    if (idx === null) return;
    setSummaryOpenFor(source);
    setHighlightedSegment({ source, index: idx });
  }, []);

  useEffect(() => {
    if (!highlightedSegment) return;
    segmentRefs.current[highlightedSegment.index]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [highlightedSegment]);

  const cardStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14,
  };

  // Only worth offering a filter once 2+ distinct chunk types actually exist
  // across the uploaded document(s) — a single-type document has nothing to filter.
  const availableChunkTypes = Array.from(new Set(
    documents.flatMap(d => Object.entries(d.summary).filter(([, v]) => (v ?? 0) > 0).map(([k]) => k))
  ));
  const availableEntityTypes = Array.from(new Set(documents.flatMap(d => d.entityTypes)));
  return (
    <div className="relative flex flex-col gap-4">
      {isSharedView && chat.shareToken && <ShareWatermark token={chat.shareToken} />}
      {isSharedView ? (
        <div className="flex items-center gap-2 text-[10px] px-3 py-2 rounded-lg"
          style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", color: "#fbbf24" }}>
          Viewing a session someone shared with you — read and chat only. The owner can revoke this
          link at any time, and it expires automatically after 24 hours.
        </div>
      ) : (
        <IngestProgressRail sessionId={chat.sessionId} ensureSessionId={ensureSessionId} onIngested={handleIngested} />
      )}

      {revisionPrompt && (
        <RevisionPromptBanner newSource={revisionPrompt.newSource} old={revisionPrompt.old} accent={ACCENT}
          onReplace={() => { removeDocument(revisionPrompt.old.source); setRevisionPrompt(null); }}
          onKeepBoth={() => setRevisionPrompt(null)} />
      )}

      <DocumentChipsRow documents={documents} accent={ACCENT} sessionId={chat.sessionId}
        summaryOpenFor={summaryOpenFor} setSummaryOpenFor={setSummaryOpenFor} removeDocument={removeDocument}
        availableChunkTypes={availableChunkTypes} chunkTypeFilter={chat.chunkTypeFilter}
        setChunkTypeFilter={chat.setChunkTypeFilter}
        availableEntityTypes={availableEntityTypes} entityTypeFilter={chat.entityTypeFilter}
        setEntityTypeFilter={chat.setEntityTypeFilter} />

      {documents.length >= 2 && !isSharedView && (
        <ContradictionsPanel sessionId={chat.sessionId} accent={ACCENT} />
      )}

      {documents.map(d => summaryOpenFor === d.source && (
        <DocumentSummaryPanel key={`summary-${d.source}`} doc={d} accent={ACCENT} cardStyle={cardStyle}
          highlightedIndex={highlightedSegment?.source === d.source ? highlightedSegment.index : null}
          onSegmentRef={(i, el) => { segmentRefs.current[i] = el; }}
          onSelectChunk={(chunkType, page, text, bbox, objects) => jumpToCitation(d.source, chunkType, page, text, bbox, objects)}
          onSelectChapter={(time) => jumpToChapter(d.source, d.transcriptSegments, time)}
        />
      ))}

      {(documents.length > 0 || isSharedView) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChatPanel chat={chat} documents={documents} accent={ACCENT} cardStyle={cardStyle}
            settingsOpen={settingsOpen} setSettingsOpen={setSettingsOpen} jumpToCitation={jumpToCitation} />

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
                  chunkType={activeCitation.chunkType} bbox={activeCitation.bbox}
                  matchedObject={matchObjectToQuestion(
                    activeCitation.objects,
                    [...chat.messages].reverse().find(m => m.role === "user")?.content ?? ""
                  )}
                  source={activeDoc.source}
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
                onSelect={(page) => setActiveCitation({ page, chunkType: null, source: activeDoc.source, bbox: null, objects: null })} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}