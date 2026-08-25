"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRagChat } from "@/components/useRagChat";
import { ML_UNIFIED_API } from "@/config/urls";
import ChatPanel from "./ChatPanel";
import EvidenceColumn from "./EvidenceColumn";
import DocumentTray from "./DocumentTray";
import DocumentSummaryPanel from "./DocumentSummaryPanel";
import ShareWatermark from "./ShareWatermark";
import RevisionPromptBanner from "./RevisionPromptBanner";
import DocumentChipsRow from "./DocumentChipsRow";
import ContradictionsPanel from "./ContradictionsPanel";
import type { Bbox, DetectedObject, Entity, IngestState, PersistedEdit, RevisionCandidate, TranscriptSegment } from "./_types";

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
// Generic over any `{text}[]` array — reused for both transcript segments
// and a PDF/CSV/image document's extracted text segments.
function bestMatchingSegmentIndex(segments: { text: string }[], citationText: string): number | null {
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
  const [activeCitation, setActiveCitation] = useState<{ page: number | null; chunkType: string | null; source: string | null; bbox: Bbox | null; objects: DetectedObject[] | null; entities?: Entity[] | null; piiTypes?: string | null; signatures?: DetectedObject[] | null; tampering?: DetectedObject[] | null; personCount?: number | null } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Below `lg`, the 3-column (or 2-column shared-view) workspace becomes a
  // single-panel tab switcher instead of one long stacked page — ChatPanel/
  // DocumentTray's internal scroll relies on `h-full` off a definite
  // ancestor height, which the grid only supplies at `lg:`. See
  // EvidenceColumn/DocumentTray/ChatPanel wrappers below for the mobile-only
  // height these tabs are given.
  const [mobileTab, setMobileTab] = useState<"documents" | "evidence" | "chat">("chat");
  const [summaryOpenFor, setSummaryOpenFor] = useState<string | null>(null);
  const [highlightedSegment, setHighlightedSegment] = useState<{ source: string; index: number } | null>(null);
  // Same idea as highlightedSegment, but for a PDF/CSV/image document's
  // extracted-text list (no transcript exists there) — a separate key since
  // the two lists are independent even if a doc somehow had both.
  const [highlightedTextSegment, setHighlightedTextSegment] = useState<{ source: string; index: number } | null>(null);
  // A visual-only video-frame citation (MMRAG-09) — no transcript segment
  // to key off of, so it carries its own real timestamp instead.
  const [videoSeek, setVideoSeek] = useState<{ source: string; time: number } | null>(null);
  const segmentRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const textSegmentRefs = useRef<(HTMLParagraphElement | null)[]>([]);
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
    // click a citation just to discover a preview exists at all. Detections
    // (faces/objects) are already computed at ingest time and sit in
    // notableChunks — pull them in here instead of hardcoding null, so
    // "Detect faces" works on this auto-shown preview without an extra click.
    const page1Chunk = result.notableChunks.find(c => (c.page ?? 1) === 1);
    setActiveCitation({
      page: 1,
      chunkType: page1Chunk?.chunkType ?? null,
      source: result.source,
      bbox: page1Chunk?.bbox ?? null,
      objects: page1Chunk?.objects ?? null,
      piiTypes: page1Chunk?.piiTypes ?? null,
      entities: page1Chunk?.entities ?? null,
      signatures: page1Chunk?.signatures ?? null,
      tampering: page1Chunk?.tampering ?? null,
      personCount: page1Chunk?.personCount ?? null,
    });
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
    chat.removeSourceFromEvidence(source);
  }, [chat.removeSourceFromEvidence]);

  const activeDoc = documents.find(d => d.source === activeCitation?.source) ?? null;

  // Switches the Evidence panel to a different already-uploaded document's
  // page 1 — same page-1-preview logic handleIngested uses for a freshly
  // uploaded doc, factored out so DocumentTray's "Session sources" list can
  // call it too. Clicking a document there previously only toggled its
  // summary popup and had no way to actually change what's shown.
  const selectDocument = useCallback((source: string) => {
    const doc = documents.find(d => d.source === source);
    if (!doc) return;
    const page1Chunk = doc.notableChunks.find(c => (c.page ?? 1) === 1);
    setActiveCitation({
      page: 1,
      chunkType: page1Chunk?.chunkType ?? null,
      source,
      bbox: page1Chunk?.bbox ?? null,
      objects: page1Chunk?.objects ?? null,
      piiTypes: page1Chunk?.piiTypes ?? null,
      entities: page1Chunk?.entities ?? null,
      signatures: page1Chunk?.signatures ?? null,
      tampering: page1Chunk?.tampering ?? null,
      personCount: page1Chunk?.personCount ?? null,
    });
  }, [documents]);

  // Persists (or clears, edit === null) a region-removal edit into the
  // owning doc's `edits` map — lifted here (not left in useInpaint's local
  // state) so it survives switching to a different citation and back.
  const updateDocEdit = useCallback((source: string, page: number, edit: PersistedEdit | null) => {
    setDocuments(docs => docs.map(d => {
      if (d.source !== source) return d;
      const edits = { ...d.edits };
      if (edit) edits[String(page)] = edit; else delete edits[String(page)];
      return { ...d, edits };
    }));
  }, []);

  // A transcript-chunk citation (chunkType "text", same tag plain PDF text
  // chunks use — harmless here since non-video docs always have empty
  // transcriptSegments) additionally opens that document's summary panel
  // and highlights/scrolls to the closest-matching transcript segment.
  const jumpToCitation = useCallback((source: string, chunkType: string | null | undefined,
                                      page: number | null | undefined, text: string, bbox?: Bbox | null,
                                      objects?: DetectedObject[] | null, timestampS?: number | null,
                                      entities?: Entity[] | null, piiTypes?: string | null,
                                      signatures?: DetectedObject[] | null, tampering?: DetectedObject[] | null,
                                      personCount?: number | null) => {
    setActiveCitation({ page: page ?? null, chunkType: chunkType ?? null, source, bbox: bbox ?? null, objects: objects ?? null, entities: entities ?? null, piiTypes: piiTypes ?? null, signatures: signatures ?? null, tampering: tampering ?? null, personCount: personCount ?? null });
    // A captioned video frame (MMRAG-09) — nothing was necessarily SAID at
    // this moment, so there's no transcript segment to match against; jump
    // straight to the frame's own real timestamp instead.
    if (chunkType === "video" && typeof timestampS === "number") {
      const doc = documents.find(d => d.source === source);
      if (!doc || (doc.summary.video ?? 0) === 0) return;
      setSummaryOpenFor(source);
      setHighlightedSegment(null);
      setVideoSeek({ source, time: timestampS });
      return;
    }
    if (chunkType !== "text") return;
    const doc = documents.find(d => d.source === source);
    if (!doc) return;
    if (doc.transcriptSegments.length > 0) {
      const idx = bestMatchingSegmentIndex(doc.transcriptSegments, text);
      if (idx === null) return;
      setSummaryOpenFor(source);
      setVideoSeek(null);
      setHighlightedTextSegment(null);
      setHighlightedSegment({ source, index: idx });
      return;
    }
    // No transcript (a PDF/CSV/image doc) — scroll/highlight the matching
    // entry in its own "Extracted text" list instead, the same jump-to
    // pattern transcript citations already get, previously missing here
    // (a text citation on a non-video doc used to do nothing but show the
    // cropped page thumbnail).
    if (doc.textSegments.length === 0) return;
    const idx = bestMatchingSegmentIndex(doc.textSegments, text);
    if (idx === null) return;
    setSummaryOpenFor(source);
    setHighlightedSegment(null);
    setHighlightedTextSegment({ source, index: idx });
  }, [documents]);

  const jumpToChapter = useCallback((source: string, segments: TranscriptSegment[], time: number) => {
    const idx = nearestSegmentIndex(segments, time);
    if (idx === null) return;
    setSummaryOpenFor(source);
    setVideoSeek(null);
    setHighlightedSegment({ source, index: idx });
  }, []);

  useEffect(() => {
    if (!highlightedSegment) return;
    segmentRefs.current[highlightedSegment.index]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [highlightedSegment]);

  useEffect(() => {
    if (!highlightedTextSegment) return;
    textSegmentRefs.current[highlightedTextSegment.index]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [highlightedTextSegment]);

  // Matches the homepage ProjectCard.tsx pattern (var(--bg-glass), no colored
  // top bar) used site-wide as of 2026-08-22 — the bar was dropped everywhere
  // after being flagged as a common AI-generated-design tell.
  const cardStyle: React.CSSProperties = {
    background: "var(--bg-glass)", backdropFilter: "blur(14px)",
    border: "1px solid var(--border)",
    borderRadius: 16,
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
      {isSharedView && (
        <div className="flex items-center gap-2 text-[10px] px-3 py-2 rounded-lg"
          style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", color: "#fbbf24" }}>
          Viewing a session someone shared with you — read and chat only. The owner can revoke this
          link at any time, and it expires automatically after 24 hours.
        </div>
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
        setEntityTypeFilter={chat.setEntityTypeFilter} showDocuments={false} />

      {documents.length >= 2 && !isSharedView && (
        <ContradictionsPanel sessionId={chat.sessionId} accent={ACCENT} />
      )}

      {documents.map(d => summaryOpenFor === d.source && (
        <DocumentSummaryPanel key={`summary-${d.source}`} doc={d} accent={ACCENT} cardStyle={cardStyle}
          highlightedIndex={highlightedSegment?.source === d.source ? highlightedSegment.index : null}
          highlightedTextIndex={highlightedTextSegment?.source === d.source ? highlightedTextSegment.index : null}
          seekTime={videoSeek?.source === d.source ? videoSeek.time : null}
          onSegmentRef={(i, el) => { segmentRefs.current[i] = el; }}
          onTextSegmentRef={(i, el) => { textSegmentRefs.current[i] = el; }}
          onSelectChunk={(chunkType, page, text, bbox, objects, timestampS, piiTypes, entities, signatures, tampering, personCount) => jumpToCitation(d.source, chunkType, page, text, bbox, objects, timestampS, entities, piiTypes, signatures, tampering, personCount)}
          onSelectChapter={(time) => jumpToChapter(d.source, d.transcriptSegments, time)}
        />
      ))}

      {!isSharedView && (
        <>
          {documents.length > 0 && (
            <div className="flex items-center rounded border overflow-hidden self-start lg:hidden"
              style={{ borderColor: "var(--border2)" }}>
              {(["documents", "evidence", "chat"] as const).map(tab => (
                <button key={tab} onClick={() => setMobileTab(tab)}
                  className="text-[11px] px-3 py-1.5 capitalize transition-colors"
                  style={mobileTab === tab
                    ? { background: `${ACCENT}22`, color: ACCENT }
                    : { color: "var(--text2)" }}>
                  {tab}
                </button>
              ))}
            </div>
          )}
          <div className={documents.length > 0
            ? "grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)_440px] gap-4 lg:h-[88vh]"
            : "max-w-xs"}>
            <div className={documents.length === 0 ? "" : `${mobileTab === "documents" ? "block" : "hidden"} lg:block max-lg:h-[70dvh] max-lg:overflow-y-auto`}>
              <DocumentTray documents={documents} accent={ACCENT} cardStyle={cardStyle}
                activeSource={activeCitation?.source ?? null} onSelectDocument={selectDocument}
                summaryOpenFor={summaryOpenFor} setSummaryOpenFor={setSummaryOpenFor} removeDocument={removeDocument}
                sessionId={chat.sessionId} ensureSessionId={ensureSessionId} onIngested={handleIngested} />
            </div>

            {documents.length > 0 && (<>

            {/* EvidenceColumn (which holds the citation image/detection-box
                panel) gets the flexible middle slot instead of ChatPanel —
                a citation image with several overlapping detection boxes
                needs real width for its labels to stay readable; a fixed
                440px column was cramping small/narrow boxes badly. ChatPanel
                is just a message list + input, which stays comfortable at a
                fixed width, so it takes the slot Evidence used to have. */}
            <div className={`${mobileTab === "evidence" ? "block" : "hidden"} lg:block max-lg:h-[70dvh] max-lg:overflow-y-auto`}>
              <EvidenceColumn chat={chat} accent={ACCENT} cardStyle={cardStyle} jumpToCitation={jumpToCitation}
                activeCitation={activeCitation} activeDoc={activeDoc} setActiveCitation={setActiveCitation}
                onEditChange={updateDocEdit} />
            </div>

            <div className={`${mobileTab === "chat" ? "flex" : "hidden"} lg:flex flex-col gap-2 max-lg:h-[70dvh] max-lg:overflow-y-auto`}>
              <div className="flex items-center rounded border overflow-hidden self-start"
                style={{ borderColor: "var(--border2)" }}>
                {(["concise", "normal", "detailed"] as const).map(len => (
                  <button key={len} onClick={() => chat.regenerateLastAnswer(len)}
                    disabled={chat.messages.length === 0}
                    title={len === "concise" ? "1-3 sentences, no extra context"
                         : len === "detailed" ? "Thorough — includes reasoning and related details"
                         : "Default answer length"}
                    className="text-[11px] px-2 py-1 capitalize transition-colors"
                    style={chat.answerLength === len
                      ? { background: `${ACCENT}22`, color: ACCENT }
                      : { color: "var(--text2)" }}>
                    {len}
                  </button>
                ))}
              </div>
              <ChatPanel chat={chat} documents={documents} accent={ACCENT} cardStyle={cardStyle}
                settingsOpen={settingsOpen} setSettingsOpen={setSettingsOpen} />
            </div>
            </>)}
          </div>
        </>
      )}

      {isSharedView && (
        <>
          <div className="flex items-center rounded border overflow-hidden self-start lg:hidden"
            style={{ borderColor: "var(--border2)" }}>
            {(["evidence", "chat"] as const).map(tab => (
              <button key={tab} onClick={() => setMobileTab(tab)}
                className="text-[11px] px-3 py-1.5 capitalize transition-colors"
                style={mobileTab === tab
                  ? { background: `${ACCENT}22`, color: ACCENT }
                  : { color: "var(--text2)" }}>
                {tab}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_440px] gap-4 lg:h-[88vh]">
            <div className={`${mobileTab === "evidence" ? "block" : "hidden"} lg:block max-lg:h-[70dvh] max-lg:overflow-y-auto`}>
              <EvidenceColumn chat={chat} accent={ACCENT} cardStyle={cardStyle} jumpToCitation={jumpToCitation}
                activeCitation={activeCitation} activeDoc={activeDoc} setActiveCitation={setActiveCitation}
                onEditChange={updateDocEdit} />
            </div>

            <div className={`${mobileTab === "chat" ? "block" : "hidden"} lg:block max-lg:h-[70dvh] max-lg:overflow-y-auto`}>
              <ChatPanel chat={chat} documents={documents} accent={ACCENT} cardStyle={cardStyle}
                settingsOpen={settingsOpen} setSettingsOpen={setSettingsOpen} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}