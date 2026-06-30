"use client";

import { useState } from "react";

type Props = {
  source: string;
  text: string;
  score: number;
  rawScore?: number;
  accent: string;
};

function DocIcon() {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg width={11} height={11} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export default function RagSourceCard({ source, text, score, rawScore, accent }: Props) {
  const [open, setOpen] = useState(false);
  const pct = Math.round(score * 100);
  const rawPct = rawScore !== undefined ? Math.round(rawScore * 100) : null;
  const confColor = pct <= 50 ? "#f87171" : pct <= 80 ? "#fbbf24" : accent;
  const confLabel = pct <= 50 ? "Low confidence" : pct <= 80 ? "Medium confidence" : "High confidence";

  return (
    <div
      onClick={() => setOpen(o => !o)}
      style={{
        background: "rgba(255,255,255,0.03)",
        border: `1px solid ${accent}28`,
        borderRadius: 8,
        padding: "0.35rem 0.55rem",
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
        <span style={{ color: accent, flexShrink: 0 }}><DocIcon /></span>
        <span style={{ flex: 1, fontSize: "0.65rem", color: "var(--text2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {source}
        </span>
        <span
          title={
            rawPct !== null
              ? `${confLabel} — ${pct}% relative to the best match in this response (raw model confidence: ${rawPct}%)`
              : `${confLabel} (${pct}%) that the answer lies in this source`
          }
          style={{
            fontSize: "0.58rem", fontWeight: 700, color: confColor,
            background: `${confColor}18`, borderRadius: 9999,
            padding: "1px 6px", flexShrink: 0,
          }}>
          {pct}%
        </span>
        <span style={{ color: "var(--text3)", flexShrink: 0 }}><ChevronIcon open={open} /></span>
      </div>

      {open && (
        <div style={{
          marginTop: "0.4rem",
          fontSize: "0.63rem",
          color: "var(--text3)",
          lineHeight: 1.6,
          borderTop: `1px solid rgba(255,255,255,0.06)`,
          paddingTop: "0.35rem",
        }}>
          {rawPct !== null && (
            <div style={{ marginBottom: "0.3rem", color: "var(--text2)" }}>
              Raw model confidence: <strong>{rawPct}%</strong>
            </div>
          )}
          {text.slice(0, 200)}{text.length > 200 ? "…" : ""}
        </div>
      )}
    </div>
  );
}
