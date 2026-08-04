"use client";

import { useRagChat } from "@/components/useRagChat";
import EvidencePanel from "./EvidencePanel";
import CitationThumbnailPanel from "./CitationThumbnailPanel";
import PageThumbnailRail from "./PageThumbnailRail";
import type { Bbox, DetectedObject, Entity, IngestState } from "./_types";

type Doc = Extract<IngestState, { kind: "done" }>;
type ActiveCitation = { page: number | null; chunkType: string | null; source: string | null; bbox: Bbox | null; objects: DetectedObject[] | null; entities?: Entity[] | null; piiTypes?: string | null };

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
                   objects?: DetectedObject[] | null, timestampS?: number | null,
                   entities?: Entity[] | null, piiTypes?: string | null) => void;
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
  // piiTypes exists on NotableChunk too, so the same sibling-lookup applies;
  // entities don't exist at the NotableChunk level (only computed per
  // retrieval-time citation), so that one only ever comes directly off
  // activeCitation, whichever click path populated it.
  const effectivePiiTypes = mediaChunk ? (mediaChunk.piiTypes ?? null) : (activeCitation?.piiTypes ?? null);

  return (
    // Evidence gets its own FIXED height (702px), not a flex-1 share of a
    // budget split with the thumbnail row below it. Sharing a budget means
    // ANY growth in the row (even bounded growth) still comes out of
    // Evidence's side — that was true whether the shared total came from
    // `h-full` (broke below the `lg` 1024px breakpoint) or a fixed total
    // (any growth in the row below it still ate into Evidence's remaining
    // share). Giving Evidence a height that depends on nothing else in this
    // column is the only way "selecting a dropdown action never changes
    // Evidence's size" can hold unconditionally, at every viewport width.
    <div className="flex flex-col gap-3 min-h-0">
      <div style={{ height: 502 }} className="min-h-0 shrink-0">
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
              isImageOrVideoOnly={isImageOrVideoOnly}
              entities={activeCitation.entities ?? null}
              piiTypes={effectivePiiTypes} />
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