"use client";

import type { ReconciledDoc } from "./_types";

const displayName = (source: string) => source.replace(/^user:/, "").replace(/:[a-f0-9]{8}$/, "");

type Props = {
  documents: ReconciledDoc[];
  accent: string;
  onSetRole: (source: string, role: "contract" | "invoice") => void;
  onRemove: (source: string) => void;
};

/** Each chip shows the doc name, a role toggle ("Contract"/"Invoice" — click
 * to flip), and a remove button. Exactly one document can be the contract at
 * a time; onSetRole enforces that in the parent (assigning "contract" to one
 * chip flips any other contract chip to "invoice"). Not a reuse of
 * DocumentChipsRow — that component carries chunk-type/entity-type filter
 * state and a ShareSessionPanel that don't apply here (no chat/query
 * surface on this tool). */
export default function ReconciliationDocChipsRow({ documents, accent, onSetRole, onRemove }: Props) {
  if (documents.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: "var(--text3)" }}>
        Documents:
      </span>
      {documents.map(d => (
        <span key={d.source} className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full"
          style={{ background: `${accent}12`, border: `1px solid ${accent}30`, color: "var(--text2)" }}>
          {displayName(d.source)}
          <button onClick={() => onSetRole(d.source, d.role === "contract" ? "invoice" : "contract")}
            title="Click to flip role"
            className="px-1.5 py-px rounded-full font-bold uppercase tracking-wide"
            style={{
              fontSize: 8,
              background: d.role === "contract" ? `${accent}30` : "var(--bg-glass)",
              color: d.role === "contract" ? accent : "var(--text3)",
            }}>
            {d.role}
          </button>
          <button onClick={() => onRemove(d.source)} title="Remove this document"
            style={{ color: `${accent}99`, lineHeight: 1 }}>×</button>
        </span>
      ))}
    </div>
  );
}