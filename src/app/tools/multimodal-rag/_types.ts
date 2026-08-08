export type ChunkSummary = { text: number; table: number; figure: number; image?: number; video?: number };
/** [x, y, w, h], each 0-1, page-relative (MMRAG-07) — normalized so it draws
 * correctly over a page thumbnail of any rendered size. */
export type Bbox = [number, number, number, number];
/** One closed-vocabulary (COCO 80-class) detection on an image/video-frame
 * citation (MMRAG-07 follow-up) — precomputed at ingest, matched against
 * the asked question's wording at display time, no query-time vision call. */
export type DetectedObject = { label: string; confidence: number; bbox: Bbox;
  /** Pixel-accurate outline (backlog item 5, Segment Anything) — a list of
   * normalized [x,y] points tracing the detection's real shape, refined
   * from `bbox` via a SAM box prompt. Only ever present on signature/
   * tampering detections (see mm_segment.py) — absent everywhere else,
   * which still render as a plain rectangle from `bbox` alone. */
  mask?: [number, number][] | null };
/** A named entity (person/org/location) spaCy extracted from a citation's
 * text (MMRAG-26) — same shape RagSourceCard already renders as chips. */
export type Entity = { type: string; value: string };
/** A near-duplicate match found via perceptual hash (backlog item 3) —
 * another page/frame already uploaded this session whose image is the same
 * or a lightly modified (resized/recompressed/cropped) copy of this one. */
export type DuplicateMatch = { source: string; page: number; similarity: number };
export type NotableChunk = { chunkType: string | null; page: number | null; text: string; bbox?: Bbox | null; objects?: DetectedObject[] | null; numberMismatch?: boolean; piiTypes?: string | null; blurry?: boolean;
  /** Real seconds into the source video for a captioned frame chunk (MMRAG-09) — null for everything else. */
  timestampS?: number | null;
  /** Person/org/location/money/date/percent entities (MMRAG-26), same shape
   * as a query-time citation's `entities` — now also computed at ingest so
   * "Key facts" works on the auto-shown preview, not just post-answer. */
  entities?: Entity[] | null;
  /** Detected handwritten-signature regions (backlog item 1) — same shape
   * as `objects` but a different model/vocabulary, kept as its own field
   * so it can't corrupt the OIV7 "Detect faces"/"Detect objects" counts. */
  signatures?: DetectedObject[] | null;
  /** Suspicious ELA (Error Level Analysis) regions — possible edited/spliced
   * areas (backlog item 2), same {label,confidence,bbox} shape as `objects`/
   * `signatures` but its own field since it's a compression-error heuristic,
   * not a labeled detector. */
  tampering?: DetectedObject[] | null;
  /** Near-duplicate matches (backlog item 3) — see DuplicateMatch above. */
  duplicates?: DuplicateMatch[] | null };
export type TextSegment = { page: number | null; text: string };
/** A citation's persisted region-removal state (Image Inpainting & Object
 * Remover) — one per edited page, lifted into MmRagRunner's `documents`
 * state (see `IngestState`'s `edits` field) so it survives switching
 * citations, not just local component state in useInpaint.ts. */
export type PersistedEdit = {
  image: string;
  removedBboxes: Bbox[];
  /** Indices into removedBboxes that have since had content added back
   * (text/image/AI-fill) — hides that region's "+" affordance once filled. */
  filledIndices: number[];
};
export type TranscriptSegment = { start: number; end: number; text: string; speaker?: string | null };
export type Chapter = { time: number; label: string };
export type RevisionCandidate = { source: string; filename: string; reason: "same_filename" | "similar_content"; similarity: number };

export type IngestState =
  | { kind: "idle" }
  | { kind: "uploading" }
  | { kind: "extracting"; page?: number; pages?: number; indeterminate?: boolean }
  | { kind: "embedding" }
  | { kind: "done"; source: string; chunksAdded: number; summary: ChunkSummary;
      /** "pdf" | "csv" | "video" | "audio" | "image" — the actual uploaded
       * file type, from the backend (never derived from chunk counts, which
       * can mislead: a standalone image containing a readable chart/grid
       * still produces a "table" chunk_type alongside its "image" chunk). */
      fileType: string;
      pageImages: string[]; cached: boolean; saveScope: "session" | "shared";
      embeddingMode: EmbeddingMode; notableChunks: NotableChunk[]; transcript: string | null;
      transcriptSegments: TranscriptSegment[]; chapters: Chapter[]; possibleRevisionOf: RevisionCandidate | null;
      /** Which entity types (money/date/percent) appear anywhere in this
       * document (MMRAG-03) — powers the "Only search" entity filter chips. */
      entityTypes: string[];
      /** This document's plain-text chunks, in reading order — powers the
       * live search/highlight box in the summary panel for non-video docs
       * (a video already has the richer, timestamped transcriptSegments). */
      textSegments: TextSegment[];
      /** Region-removal edits (Image Inpainting & Object Remover), keyed by
       * page number as a string. In-memory only — survives switching between
       * citations within the session, not a page reload. */
      edits?: Record<string, PersistedEdit> }
  | { kind: "error"; message: string };

export type EmbeddingMode = "caption" | "caption+clip";
export type SaveScope = "session" | "shared";