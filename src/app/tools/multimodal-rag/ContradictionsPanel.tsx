"use client";

import { useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";

type Contradiction = {
  similarity: number;
  explanation: string;
  chunk_a: { text: string; source: string; page: number | null };
  chunk_b: { text: string; source: string; page: number | null };
};

type Result = { checked_pairs: number; sources: string[]; contradictions: Contradiction[] };

const displayName = (source: string) => source.replace(/^user:/, "").replace(/:[a-f0-9]{8}$/, "");

/** MMRAG-02 — cross-document contradiction check. Only meaningful once 2+
 * documents are uploaded to the same session (nothing to compare with one),
 * so callers should only render this when that's true. */
export default function ContradictionsPanel({ sessionId, accent }: { sessionId: string; accent: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<Result | null>(null);

  const check = async () => {
    setState("loading");
    try {
      const res = await fetch(`${ML_UNIFIED_API}/rag/contradictions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setResult(await res.json());
      setState("done");
    } catch {
      setState("error");
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button onClick={check} disabled={state === "loading"}
          className="text-[9px] px-2 py-1 rounded-full border transition-colors"
          style={{ borderColor: `${accent}55`, background: `${accent}18`, color: accent,
                  opacity: state === "loading" ? 0.6 : 1 }}>
          {state === "loading" ? "Checking for contradictions…" : "Check documents for contradictions"}
        </button>
        {state === "error" && (
          <span className="text-[9px]" style={{ color: "#f87171" }}>Check failed — try again.</span>
        )}
      </div>

      {state === "done" && result && (
        result.contradictions.length === 0 ? (
          <p className="text-[9px]" style={{ color: "var(--text3)" }}>
            No contradictions found ({result.checked_pairs} overlapping passage{result.checked_pairs === 1 ? "" : "s"} checked across your documents).
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: "#f87171" }}>
              {result.contradictions.length} possible contradiction{result.contradictions.length === 1 ? "" : "s"} found
            </span>
            {result.contradictions.map((c, i) => (
              <div key={i} className="text-[10px] rounded-lg p-2.5 flex flex-col gap-1.5"
                style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.2)" }}>
                <p style={{ color: "var(--text)" }}>{c.explanation}</p>
                {[c.chunk_a, c.chunk_b].map((chunk, j) => (
                  <div key={j} className="rounded px-2 py-1" style={{ background: "var(--border)" }}>
                    <span className="text-[8px] font-bold uppercase tracking-wide" style={{ color: "var(--text3)" }}>
                      {displayName(chunk.source)}{chunk.page ? ` · page ${chunk.page}` : ""}
                    </span>
                    <p style={{ color: "var(--text2)" }}>{chunk.text}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}