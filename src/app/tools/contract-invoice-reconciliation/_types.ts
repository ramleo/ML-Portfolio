import type { IngestState } from "../multimodal-rag/_types";

export type Role = "contract" | "invoice";

/** One uploaded document (contract or invoice), tagged with which role it
 * plays in this reconciliation report. Role is assigned client-side at
 * upload time — the backend has no concept of it (MMRAG-20 design decision:
 * role is a presentation/grouping concern for one report, not an intrinsic
 * fact about a chunk). */
export type ReconciledDoc = Extract<IngestState, { kind: "done" }> & { role: Role };

export type Discrepancy = {
  similarity: number;
  explanation: string;
  contract_chunk: { text: string; source: string; page: number | null };
  invoice_chunk: { text: string; source: string; page: number | null };
};

export type ReconciliationResult = {
  checked_pairs: number;
  contract_source: string;
  invoice_sources: string[];
  discrepancies: Discrepancy[];
};