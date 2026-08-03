"use client";

import { useRagChat } from "@/components/useRagChat";
import EvidencePanel from "./EvidencePanel";
import CitationThumbnailPanel from "./CitationThumbnailPanel";
import PageThumbnailRail from "./PageThumbnailRail";
import type { Bbox, DetectedObject, IngestState } from "./_types";

type Doc = Extract<IngestState, { kind: "done" }>;
type ActiveCitation = { page: number | null; chunkType: string | null; source: string | null; bbox: Bbox | null; objects: DetectedObject[] | null };

// Open Images V7 is hierarchical (e.g. "Man"/"Woman"/"Boy"/"Girl" are all
// subclasses of "Person") — the detector reports whichever specific
// subclass it actually recognized, not the generic parent, so a literal
// label match alone misses a real, common phrasing. Observed live: "locate
// the person" found nothing on a frame where "Man" was detected at 73%
// confidence, since "person" never appears as a label named "Man". Only
// covers the generic terms someone would plausibly type, not the full
// 601-class taxonomy.
const HIERARCHY_SYNONYMS: Record<string, string[]> = {
  person: ["man", "woman", "boy", "girl"],
  people: ["man", "woman", "boy", "girl"],
  vehicle: ["car", "truck", "van", "bus", "bicycle", "motorcycle", "train", "airplane", "boat", "limousine", "taxi"],
};

function matchObjectsToQuestion(objects: DetectedObject[] | null | undefined, question: string): DetectedObject[] {
  if (!objects?.length || !question.trim()) return [];
  const q = question.toLowerCase();
  const sorted = [...objects].sort((a, b) => b.label.length - a.label.length);
  for (const obj of sorted) {
    const escaped = obj.label.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`\\b${escaped}\\b`).test(q)) {
      // "where is the goldfish" on an image with TWO separate goldfish
      // detections should highlight both, not just whichever happened to
      // be first — every detection sharing this same matched label, not
      // just the single best-scoring one.
      return objects.filter(o => o.label.toLowerCase() === obj.label.toLowerCase());
    }
  }
  for (const [generic, subclasses] of Object.entries(HIERARCHY_SYNONYMS)) {
    if (!new RegExp(`\\b${generic}\\b`).test(q)) continue;
    const matches = sorted.filter(obj => subclasses.includes(obj.label.toLowerCase()));
    if (matches.length) return matches;
  }
  return [];
}

type Props = {
  chat: ReturnType<typeof useRagChat>;
  accent: string;
  cardStyle: React.CSSProperties;
  jumpToCitation: (source: string, chunkType: string | null | undefined,
                   page: number | null | undefined, text: string, bbox?: Bbox | null,
                   objects?: DetectedObject[] | null, timestampS?: number | null) => void;
  activeCitation: ActiveCitation | null;
  activeDoc: Doc | null;
  setActiveCitation: (c: ActiveCitation) => void;
};

/** The right-hand column: ranked evidence cards, then the citation's page/
 * frame preview and page rail below it. Shared by both the normal and
 * shared-view layouts in MmRagRunner.tsx, which previously duplicated this
 * whole block — split out to stay under the project's file-length limit
 * and de-duplicate the two copies. */
export default function EvidenceColumn({ chat, accent, cardStyle, jumpToCitation, activeCitation, activeDoc, setActiveCitation }: Props) {
  const isImageOrVideoOnly = activeDoc ? (activeDoc.fileType === "image" || activeDoc.fileType === "video") : false;
  // A standalone image/video upload can produce a SIBLING "table" chunk on
  // the same page (e.g. Mistral OCR reading the photo's background as a
  // table, or a real extracted chart) — that sibling citation carries no
  // `objects`/real caption of its own, only the "image"/"video"-typed chunk
  // does. Clicking the table citation must still show the SAME photo's
  // detections/caption, not an empty dropdown — so look them up from the
  // media chunk itself rather than trusting whichever citation was clicked.
  const mediaChunk = (isImageOrVideoOnly && activeDoc && activeCitation)
    ? activeDoc.notableChunks.find(c => c.page === activeCitation.page && (c.chunkType === "image" || c.chunkType === "video")) ?? null
    : null;
  const effectiveObjects = mediaChunk ? (mediaChunk.objects ?? null) : (activeCitation?.objects ?? null);

  return (
    // A self-contained height (not `h-full`) — `h-full` only resolves to
    // something real inside MmRagRunner.tsx's `lg:h-[88vh]` grid, which is
    // gated to >=1024px viewports. Below that width (a narrower browser
    // window, not just mobile) that ancestor height vanishes, so `h-full`/
    // `flex-1` became no-ops and Evidence + the thumbnail row each sprawled
    // to their own natural size instead of sharing a budget — the empty
    // placeholder ballooned while the detections list ran long below it.
    // A fixed viewport-relative height here works identically at every
    // width, matching the desktop-only budget this was designed for.
    <div className="flex flex-col gap-3 min-h-0" style={{ height: "min(88vh, 820px)" }}>
      <div className="flex-1 min-h-0">
        <EvidencePanel chat={chat} accent={accent} cardStyle={cardStyle} jumpToCitation={jumpToCitation} />
      </div>

      {/* shrink-0: sized to its own content, NOT forced to a fixed height.
          A fixed height here (tried earlier) always reserves that much
          space even when nothing's selected below the image, which
          permanently starves Evidence's flex-1 share instead of just
          sometimes. The actual growth risk — the description/objects text
          block appearing/disappearing as the dropdown selection changes —
          is already bounded by that block's own `maxHeight: 160` cap in
          CitationThumbnailPanel.tsx (plus the image's own 460px cap), so
          the row's natural height only ever varies within a small, known
          range. Letting it size naturally keeps Evidence as large as
          possible the rest of the time. */}
      <div className="flex gap-3 shrink-0">
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
              matchedObjects={matchObjectsToQuestion(
                effectiveObjects,
                [...chat.messages].reverse().find(m => m.role === "user")?.content ?? ""
              )}
              objects={effectiveObjects}
              source={activeDoc.source}
              canFindSimilar={activeDoc.embeddingMode === "caption+clip"}
              captionText={mediaChunk?.text ?? activeDoc.notableChunks.find(c => c.page === activeCitation.page)?.text ?? null}
              isImageOrVideoOnly={isImageOrVideoOnly} />
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
  );
}