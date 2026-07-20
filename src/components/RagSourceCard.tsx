"use client";

import { useState } from "react";

type Props = {
  source: string;
  text: string;
  score: number;
  rawScore?: number;
  accent: string;
  /** Multimodal RAG additions — undefined for ordinary text citations, no visual change when omitted */
  chunkType?: string | null;
  page?: number | null;
  onSelect?: () => void;
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

type SourceCategory = "KB" | "Web" | "User" | "Model";

function categorize(source: string): SourceCategory {
  if (!source)                    return "Model";
  if (source.startsWith("web:"))  return "Web";
  if (source.startsWith("user:")) return "User";
  return "KB";
}

function displayName(source: string, cat: SourceCategory): string {
  if (cat === "Web")  return source.replace(/^web:/, "");
  if (cat === "User") return source.replace(/^user:/, "");
  return source;
}

const CATEGORY_COLORS: Record<SourceCategory, string> = {
  KB:    "#60a5fa",
  Web:   "#34d399",
  User:  "#a78bfa",
  Model: "#94a3b8",
};

function CategoryBadge({ cat }: { cat: SourceCategory }) {
  const color = CATEGORY_COLORS[cat];
  return (
    <span style={{
      fontSize: "0.55rem", fontWeight: 700, letterSpacing: "0.05em",
      color, background: `${color}1a`, borderRadius: 9999,
      padding: "1px 5px", flexShrink: 0, textTransform: "uppercase",
    }}>
      {cat}
    </span>
  );
}

const CHUNK_TYPE_LABEL: Record<string, string> = { table: "Table", figure: "Figure", image: "Image" };

export default function RagSourceCard({ source, text, score, rawScore, accent, chunkType, page, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const rawPct = rawScore !== undefined ? Math.round(rawScore * 100) : Math.round(score * 100);
  const confColor = rawPct <= 50 ? "#f87171" : rawPct <= 80 ? "#fbbf24" : accent;
  const confLabel = rawPct <= 50 ? "Low" : rawPct <= 80 ? "Medium" : "High";
  const confFull = rawPct <= 50 ? "Low confidence" : rawPct <= 80 ? "Medium confidence" : "High confidence";
  const cat = categorize(source);
  const name = displayName(source, cat);
  const typeLabel = chunkType && CHUNK_TYPE_LABEL[chunkType];

  return (
    <div
      onClick={() => { setOpen(o => !o); onSelect?.(); }}
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
        <CategoryBadge cat={cat} />
        <span style={{ flex: 1, fontSize: "0.65rem", color: "var(--text2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {name}{page ? ` · p.${page}` : ""}
        </span>
        {typeLabel && (
          <span style={{
            fontSize: "0.55rem", fontWeight: 700, letterSpacing: "0.03em",
            color: accent, background: `${accent}1a`, borderRadius: 9999,
            padding: "1px 5px", flexShrink: 0, textTransform: "uppercase",
          }}>
            {typeLabel}
          </span>
        )}
        <span
          title={`${confFull} — raw model confidence: ${rawPct}%`}
          style={{
            fontSize: "0.58rem", fontWeight: 700, color: confColor,
            background: `${confColor}18`, borderRadius: 9999,
            padding: "1px 6px", flexShrink: 0,
          }}>
          {confLabel}
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
