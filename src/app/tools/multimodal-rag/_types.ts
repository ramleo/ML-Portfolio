export type ChunkSummary = { text: number; table: number; figure: number; image?: number; video?: number };
/** [x, y, w, h], each 0-1, page-relative (MMRAG-07) — normalized so it draws
 * correctly over a page thumbnail of any rendered size. */
export type Bbox = [number, number, number, number];
/** One closed-vocabulary (COCO 80-class) detection on an image/video-frame
 * citation (MMRAG-07 follow-up) — precomputed at ingest, matched against
 * the asked question's wording at display time, no query-time vision call. */
export type DetectedObject = { label: string; confidence: number; bbox: Bbox };
export type NotableChunk = { chunkType: string | null; page: number | null; text: string; bbox?: Bbox | null; objects?: DetectedObject[] | null; numberMismatch?: boolean; piiTypes?: string | null; blurry?: boolean };
export type TextSegment = { page: number | null; text: string };
export type TranscriptSegment = { start: number; end: number; text: string; speaker?: string | null };
export type Chapter = { time: number; label: string };
export type RevisionCandidate = { source: string; filename: string; reason: "same_filename" | "similar_content"; similarity: number };

export type IngestState =
  | { kind: "idle" }
  | { kind: "uploading" }
  | { kind: "extracting"; page?: number; pages?: number; indeterminate?: boolean }
  | { kind: "embedding" }
  | { kind: "done"; source: string; chunksAdded: number; summary: ChunkSummary;
      pageImages: string[]; cached: boolean; saveScope: "session" | "shared";
      embeddingMode: EmbeddingMode; notableChunks: NotableChunk[]; transcript: string | null;
      transcriptSegments: TranscriptSegment[]; chapters: Chapter[]; possibleRevisionOf: RevisionCandidate | null;
      /** Which entity types (money/date/percent) appear anywhere in this
       * document (MMRAG-03) — powers the "Only search" entity filter chips. */
      entityTypes: string[];
      /** This document's plain-text chunks, in reading order — powers the
       * live search/highlight box in the summary panel for non-video docs
       * (a video already has the richer, timestamped transcriptSegments). */
      textSegments: TextSegment[] }
  | { kind: "error"; message: string };

export type EmbeddingMode = "caption" | "caption+clip";
export type SaveScope = "session" | "shared";