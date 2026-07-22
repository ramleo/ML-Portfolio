export type ChunkSummary = { text: number; table: number; figure: number; image?: number; video?: number };
export type NotableChunk = { chunkType: string | null; page: number | null; text: string };

export type IngestState =
  | { kind: "idle" }
  | { kind: "uploading" }
  | { kind: "extracting"; page?: number; pages?: number; indeterminate?: boolean }
  | { kind: "embedding" }
  | { kind: "done"; source: string; chunksAdded: number; summary: ChunkSummary;
      pageImages: string[]; cached: boolean; saveScope: "session" | "shared";
      embeddingMode: EmbeddingMode; notableChunks: NotableChunk[] }
  | { kind: "error"; message: string };

export type EmbeddingMode = "caption" | "caption+clip";
export type SaveScope = "session" | "shared";