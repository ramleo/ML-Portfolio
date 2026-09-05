"use client";

import { useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";
import type { ReconciliationResult } from "./_types";

const displayName = (source: string) => source.replace(/^user:/, "").replace(/:[a-f0-9]{8}$/, "");

type Props = { sessionId: string; contractSource: string; invoiceSources: string[]; accent: string };

/** MMRAG-20 — adapts ContradictionsPanel.tsx's fetch/render pattern for the
 * new /rag/reconciliation endpoint: contract-vs-invoice framing instead of
 * generic "contradiction," and the `similarity` value (computed by the
 * backend but never shown in ContradictionsPanel) surfaced as a badge. */
export default function ReconciliationReport({ sessionId, contractSource, invoiceSources, accent }: Props) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<ReconciliationResult | null>(null);

  const check = async () => {
    setState("loading");
    try {
      const res = await fetch(`${ML_UNIFIED_API}/rag/reconciliation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, contract_source: contractSource, invoice_sources: invoiceSources }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setResult(await res.json());
      setState("done");
    } catch {
      setState("error");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button onClick={check} disabled={state === "loading"} data-wt="recon-check"
          className="text-[11px] px-3 py-1.5 rounded-lg border font-medium transition-colors"
          style={{ borderColor: `${accent}55`, background: `${accent}18`, color: accent,
                  opacity: state === "loading" ? 0.6 : 1 }}>
          {state === "loading" ? "Checking for discrepancies…" : "Check for discrepancies"}
        </button>
        {state === "error" && (
          <span className="text-[10px]" style={{ color: "#f87171" }}>Check failed — try again.</span>
        )}
      </div>

      {/* A judge call that never answered is not a pair that came back clean.
          Reporting "no discrepancies" when the checker was rate-limited is
          the one failure this tool must not have, so an incomplete run says
          so — before the count of what it did manage to check. */}
      {state === "done" && result && (result.judge_failures ?? 0) > 0 && (
        <p data-wt="recon-incomplete" className="text-[11px] mb-2" style={{ color: "#fbbf24" }}>
          Incomplete check — {result.judge_failures} of {result.checked_pairs} passage
          pair{result.checked_pairs === 1 ? "" : "s"} could not be checked (the review
          model did not respond). {result.discrepancies.length === 0
            ? "This is not a clean result. Re-run it before relying on it."
            : "Anything found below still stands, but the unchecked pairs were not looked at."}
        </p>
      )}

      {state === "done" && result && (
        result.discrepancies.length === 0 ? (
          (result.judge_failures ?? 0) > 0 ? null : (
          <p data-wt="recon-clean" className="text-[11px]" style={{ color: "var(--text3)" }}>
            No discrepancies found — {result.checked_pairs} contract/invoice passage pair{result.checked_pairs === 1 ? "" : "s"} checked.
          </p>
          )
        ) : (
          <div data-wt="recon-report" className="flex flex-col gap-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "#f87171" }}>
              {result.discrepancies.length} discrepanc{result.discrepancies.length === 1 ? "y" : "ies"} found
            </span>
            {result.discrepancies.map((d, i) => (
              <div key={i} data-wt={`recon-disc-${i}`} className="text-[11px] rounded-lg p-3 flex flex-col gap-2"
                style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.2)" }}>
                <div className="flex items-center justify-between gap-2">
                  <p style={{ color: "var(--text)" }}>{d.explanation}</p>
                  <div className="shrink-0 flex items-center gap-1">
                    {!d.confirmed && (
                      /* Anchored on the badge, not on its row. Which finding
                         comes back unconfirmed changes from run to run, so a
                         guided demo pointing at recon-disc-0 spotlights a row
                         with no badge on it while narrating the badge — it did
                         exactly that, and the expect guard passed because the
                         word was elsewhere on the page. querySelector takes the
                         first match, so the spotlight lands on a badge either way. */
                      <span data-wt="recon-unconfirmed"
                        className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                        title="A second, independently-worded check disagreed with this one — worth reading the passages yourself before trusting it."
                        style={{ background: "rgba(250,204,21,0.15)", color: "#facc15" }}>
                        Unconfirmed
                      </span>
                    )}
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                      style={{ background: "rgba(248,113,113,0.15)", color: "#f87171" }}>
                      {Math.round(d.similarity * 100)}% match
                    </span>
                  </div>
                </div>
                {/* Same reason as the badge above: an unconfirmed row cannot be
                    addressed by index, so it gets a name of its own. */}
                <div data-wt={d.confirmed ? `recon-passages-${i}` : "recon-unconfirmed-passages"}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="rounded px-2 py-1.5" style={{ background: "var(--bg-glass)" }}>
                    <span className="text-[8px] font-bold uppercase tracking-wide" style={{ color: "var(--text3)" }}>
                      Contract{d.contract_chunk.page ? ` · page ${d.contract_chunk.page}` : ""}
                    </span>
                    <p style={{ color: "var(--text2)" }}>{d.contract_chunk.text}</p>
                  </div>
                  <div className="rounded px-2 py-1.5" style={{ background: "var(--bg-glass)" }}>
                    <span className="text-[8px] font-bold uppercase tracking-wide" style={{ color: "var(--text3)" }}>
                      Invoice: {displayName(d.invoice_chunk.source)}{d.invoice_chunk.page ? ` · page ${d.invoice_chunk.page}` : ""}
                    </span>
                    <p style={{ color: "var(--text2)" }}>{d.invoice_chunk.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}