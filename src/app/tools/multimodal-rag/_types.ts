export type ChunkSummary = { text: number; table: number; figure: number; image?: number };

export type IngestState =
  | { kind: "idle" }
  | { kind: "uploading" }
  | { kind: "extracting" }
  | { kind: "embedding" }
  | { kind: "done"; source: string; chunksAdded: number; summary: ChunkSummary;
      pageImages: string[]; cached: boolean; saveScope: "session" | "shared";
      embeddingMode: EmbeddingMode }
  | { kind: "error"; message: string };

export type EmbeddingMode = "caption" | "caption+clip";
export type SaveScope = "session" | "shared";