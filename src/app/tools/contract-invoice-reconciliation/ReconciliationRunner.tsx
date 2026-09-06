"use client";

import { useCallback, useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";
import IngestProgressRail from "../multimodal-rag/IngestProgressRail";
import ReconciliationDocChipsRow from "./ReconciliationDocChipsRow";
import ReconciliationReport from "./ReconciliationReport";
import type { IngestState } from "../multimodal-rag/_types";
import type { ReconciledDoc } from "./_types";
import { trackedFetch } from "@/lib/trackedFetch";

const ACCENT = "#966f2b";

const cardStyle: React.CSSProperties = {
  background: "var(--bg-glass)", backdropFilter: "blur(14px)", border: "1px solid var(--border)",
  borderRadius: 16,
  ["--acc-glow" as string]: `${ACCENT}14`,
};

/** Own session_id, NOT shared with useRagChat's — that hook persists a
 * single session id to a fixed localStorage key used by every tool that
 * calls it, so reusing it here would silently mix reconciliation uploads
 * into whatever session the user already has open in Multimodal RAG (or
 * vice versa). This tool also has no chat/query surface, so none of
 * useRagChat's provider/model/history machinery is needed anyway — just a
 * session id to tag uploads with. */
export default function ReconciliationRunner() {
  const [sessionId, setSessionId] = useState("");
  const [documents, setDocuments] = useState<ReconciledDoc[]>([]);

  const ensureSessionId = useCallback(() => {
    if (sessionId) return sessionId;
    const id = crypto.randomUUID();
    setSessionId(id);
    return id;
  }, [sessionId]);

  const handleIngested = useCallback((result: Extract<IngestState, { kind: "done" }>) => {
    setDocuments(docs => {
      // First upload defaults to "contract"; every one after that defaults
      // to "invoice" — the common case (one contract, several invoices)
      // needs zero clicks. Either can be flipped via the chip toggle.
      const role = docs.length === 0 ? "contract" : "invoice";
      return [...docs, { ...result, role }];
    });
  }, []);

  const setRole = useCallback((source: string, role: "contract" | "invoice") => {
    setDocuments(docs => docs.map(d => {
      if (d.source === source) return { ...d, role };
      // Only one document can be "contract" at a time — assigning it here
      // demotes whichever one held it before.
      if (role === "contract" && d.role === "contract") return { ...d, role: "invoice" };
      return d;
    }));
  }, []);

  const removeDocument = useCallback(async (source: string) => {
    try {
      await trackedFetch(`${ML_UNIFIED_API}/rag/uploads/${encodeURIComponent(source)}`, { method: "DELETE" }, { tool: "contract-invoice-reconciliation" });
    } catch { /* best-effort — a stale chunk left behind is not fatal */ }
    setDocuments(docs => docs.filter(d => d.source !== source));
  }, []);

  const contract = documents.find(d => d.role === "contract") ?? null;
  const invoices = documents.filter(d => d.role === "invoice");

  return (
    <div className="flex flex-col gap-4">
      <div style={cardStyle} className="p-5 subtle-card">
        <IngestProgressRail sessionId={sessionId} ensureSessionId={ensureSessionId}
          onIngested={handleIngested} hideToggles bare accent={ACCENT} />
      </div>

      <ReconciliationDocChipsRow documents={documents} accent={ACCENT} onSetRole={setRole} onRemove={removeDocument} />

      {contract && invoices.length > 0 && (
        <div style={cardStyle} className="p-5 subtle-card">
          <ReconciliationReport sessionId={sessionId} contractSource={contract.source}
            invoiceSources={invoices.map(d => d.source)} accent={ACCENT} />
        </div>
      )}

      {documents.length > 0 && (!contract || invoices.length === 0) && (
        <p className="text-[11px] px-1" style={{ color: "var(--text3)" }}>
          {!contract
            ? "Mark one document as the contract to compare against."
            : "Upload at least one invoice to compare against the contract."}
        </p>
      )}
    </div>
  );
}