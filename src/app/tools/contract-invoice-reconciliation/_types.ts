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
  /** Whether a SECOND, independently-worded judge call agreed this is a
   * real discrepancy — the first pass alone (a small model) was observed
   * to occasionally flag two passages that state the same value in
   * different wording. false doesn't mean "not a discrepancy," it means
   * the two automated checks disagreed — worth reading the passages
   * yourself before trusting it. */
  confirmed: boolean;
  contract_chunk: { text: string; source: string; page: number | null };
  invoice_chunk: { text: string; source: string; page: number | null };
};

export type ReconciliationResult = {
  checked_pairs: number;
  /** Pairs whose judge call never answered — rate-limited, timed out, or
   *  unparseable. Distinct from a pair the judge looked at and cleared: an
   *  empty report with judge_failures > 0 means "not checked", not "clean". */
  judge_failures?: number;
  contract_source: string;
  invoice_sources: string[];
  discrepancies: Discrepancy[];
};