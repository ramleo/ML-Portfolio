"use client";

import { useRef, useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";
import RagTableView from "./RagTableView";

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
  /** Hides the confidence badge — for contexts (e.g. a document summary
   * view) where there's no query relevance score to speak of. */
  hideConfidence?: boolean;
  /** True when this figure's AI caption and its OCR read disagreed on a
   * number — shows a warning badge instead of silently trusting either. */
  numberMismatch?: boolean;
  /** Comma-separated PII categories found in this chunk's own text (e.g.
   * "email,phone") — shows an amber badge naming what was detected. */
  piiTypes?: string | null;
  /** True when this figure/image's edge-sharpness score read low — a
   * heuristic ("worth a second look"), not a certainty. */
  blurry?: boolean;
  /** Structured facts (money/date/percent) found in this chunk's own text
   * via regex at ingest time (MMRAG-03) — e.g. [{type: "money", value: "$1,245.50"}]. */
  entities?: { type: string; value: string }[] | null;
  /** "Why was this cited" trace (MMRAG-08) — per-signal retrieval scores
   * behind this citation's final rank. Undefined for cached answers (the
   * trace isn't persisted in the semantic cache) — the section is simply
   * omitted rather than shown empty. */
  retrievalTrace?: { dense?: { score: number; rank: number }; bm25?: { score: number; rank: number } } | null;
  hybridScore?: number | null;
  rerankScore?: number | null;
  typeBoost?: number | null;
};

const PII_LABEL: Record<string, string> = { email: "Email", phone: "Phone", ssn: "SSN", credit_card: "Card number" };
const ENTITY_COLOR: Record<string, string> = { money: "#34d399", date: "#60a5fa", percent: "#fbbf24" };

type PageChunk = { text: string; chunk_type: string | null; page: number };

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

const CHUNK_TYPE_LABEL: Record<string, string> = { table: "Table", figure: "Figure", image: "Image", video: "Video Frame" };

export default function RagSourceCard({ source, text, score, rawScore, accent, chunkType, page, onSelect, hideConfidence, numberMismatch, piiTypes, blurry, entities, retrievalTrace, hybridScore, rerankScore, typeBoost }: Props) {
  const piiList = piiTypes ? piiTypes.split(",").map(t => PII_LABEL[t] ?? t) : [];
  const [open, setOpen] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [tooltipBelow, setTooltipBelow] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [traceOpen, setTraceOpen] = useState(false);
  const [pageChunks, setPageChunks] = useState<PageChunk[] | "loading" | null>(null);
  const hasTrace = !!(retrievalTrace?.dense || retrievalTrace?.bm25 || hybridScore != null || rerankScore != null);
  const rawPct = rawScore !== undefined ? Math.round(rawScore * 100) : Math.round(score * 100);
  const confColor = rawPct <= 50 ? "#f87171" : rawPct <= 80 ? "#fbbf24" : accent;
  const confLabel = rawPct <= 50 ? "Low" : rawPct <= 80 ? "Medium" : "High";
  const confFull = rawPct <= 50 ? "Low confidence" : rawPct <= 80 ? "Medium confidence" : "High confidence";
  const cat = categorize(source);
  const name = displayName(source, cat);
  const typeLabel = chunkType && CHUNK_TYPE_LABEL[chunkType];

  const loadPageChunks = async () => {
    if (!page) return;
    setPageChunks("loading");
    try {
      const res = await fetch(`${ML_UNIFIED_API}/rag/page-chunks/${encodeURIComponent(source)}?page=${page}`);
      const data = await res.json();
      setPageChunks((data.chunks ?? []).filter((c: PageChunk) => c.text !== text));
    } catch {
      setPageChunks(null);
    }
  };

  return (
    <div
      ref={cardRef}
      onClick={() => { setOpen(o => !o); onSelect?.(); }}
      onMouseEnter={() => {
        // Flip below when there isn't ~100px of room above — the card is
        // often the first in a scrolling list, where an above-positioned
        // tooltip gets clipped by the container's overflow instead of
        // simply reading off the top of the viewport.
        setTooltipBelow((cardRef.current?.getBoundingClientRect().top ?? 999) < 100);
        setHovering(true);
      }}
      onMouseLeave={() => setHovering(false)}
      style={{
        background: "rgba(255,255,255,0.03)",
        border: `1px solid ${accent}28`,
        borderRadius: 8,
        padding: "0.35rem 0.55rem",
        cursor: "pointer",
        userSelect: "none",
        position: "relative",
      }}
    >
      {hovering && !open && (
        <div style={{
          position: "absolute", left: 0, zIndex: 20,
          ...(tooltipBelow
            ? { top: "100%", marginTop: "0.3rem" }
            : { bottom: "100%", marginBottom: "0.3rem" }),
          maxWidth: 320, background: "#141420", border: `1px solid ${accent}40`,
          borderRadius: 6, padding: "0.4rem 0.55rem", fontSize: "0.62rem", lineHeight: 1.5,
          color: "var(--text2)", boxShadow: "0 4px 14px rgba(0,0,0,0.4)", pointerEvents: "none",
        }}>
          {text.slice(0, 180)}{text.length > 180 ? "…" : ""}
        </div>
      )}
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
        {numberMismatch && (
          <span
            title="This figure's AI description and a separate OCR reading disagree on at least one number — verify the exact value against the original."
            style={{
              display: "flex", alignItems: "center", gap: "2px",
              fontSize: "0.55rem", fontWeight: 700, color: "#f87171",
              background: "#f8717118", borderRadius: 9999,
              padding: "1px 6px", flexShrink: 0,
            }}>
            <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Verify number
          </span>
        )}
        {blurry && (
          <span
            title="Low-sharpness signal from a quick edge-detail scan — the caption/OCR for this image may be less reliable than usual. A heuristic, not a certainty."
            style={{
              display: "flex", alignItems: "center", gap: "2px",
              fontSize: "0.55rem", fontWeight: 700, color: "#94a3b8",
              background: "#94a3b818", borderRadius: 9999,
              padding: "1px 6px", flexShrink: 0,
            }}>
            <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M8 12h.01M12 12h.01M16 12h.01" strokeLinecap="round" />
            </svg>
            Maybe blurry
          </span>
        )}
        {piiList.length > 0 && (
          <span
            title={`Detected: ${piiList.join(", ")} — this document's own text contains this, be mindful before sharing a screenshot.`}
            style={{
              display: "flex", alignItems: "center", gap: "2px",
              fontSize: "0.55rem", fontWeight: 700, color: "#fbbf24",
              background: "#fbbf2418", borderRadius: 9999,
              padding: "1px 6px", flexShrink: 0,
            }}>
            <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v4H8a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2h-1V4a3 3 0 0 0-3-3z" />
            </svg>
            Contains {piiList.join(", ")}
          </span>
        )}
        {!hideConfidence && (
          <span
            title={`${confFull} — raw model confidence: ${rawPct}%`}
            style={{
              fontSize: "0.58rem", fontWeight: 700, color: confColor,
              background: `${confColor}18`, borderRadius: 9999,
              padding: "1px 6px", flexShrink: 0,
            }}>
            {confLabel}
          </span>
        )}
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
          {!hideConfidence && rawPct !== null && (
            <div style={{ marginBottom: "0.3rem", color: "var(--text2)" }}>
              Raw model confidence: <strong>{rawPct}%</strong>
            </div>
          )}
          {entities && entities.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", marginBottom: "0.4rem" }}>
              {entities.map((e, i) => {
                const color = ENTITY_COLOR[e.type] ?? "#94a3b8";
                return (
                  <span key={i} style={{
                    fontSize: "0.58rem", fontWeight: 600, color,
                    background: `${color}18`, borderRadius: 9999, padding: "1px 6px",
                  }}>
                    {e.value}
                  </span>
                );
              })}
            </div>
          )}
          {chunkType === "table" ? <RagTableView text={text} accent={accent} filename={`${displayName(source, cat).replace(/\.[^.]+$/, "") || "table"}-p${page ?? 1}.csv`} /> : <>{text.slice(0, 200)}{text.length > 200 ? "…" : ""}</>}
          {hasTrace && (
            <div style={{ marginTop: "0.4rem" }}>
              <button onClick={(e) => { e.stopPropagation(); setTraceOpen(o => !o); }}
                style={{ fontSize: "0.6rem", color: accent, background: "none", border: "none", padding: 0, cursor: "pointer", textDecoration: "underline" }}>
                {traceOpen ? "Hide" : "Why was this cited?"}
              </button>
              {traceOpen && (
                <div style={{ marginTop: "0.3rem", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                  {retrievalTrace?.dense && (
                    <div>Semantic (meaning) match: <strong style={{ color: "var(--text2)" }}>{retrievalTrace.dense.score.toFixed(3)}</strong> similarity, ranked #{retrievalTrace.dense.rank} of the candidates this signal alone found.</div>
                  )}
                  {retrievalTrace?.bm25 && (
                    <div>Keyword (BM25) match: <strong style={{ color: "var(--text2)" }}>{retrievalTrace.bm25.score.toFixed(2)}</strong> score, ranked #{retrievalTrace.bm25.rank} of the candidates this signal alone found.</div>
                  )}
                  {!retrievalTrace?.dense && !retrievalTrace?.bm25 && hybridScore != null && (
                    <div>Retrieved via a fallback/tiered path — the individual semantic vs. keyword breakdown wasn't tracked for this specific hop.</div>
                  )}
                  {typeBoost && typeBoost !== 1 && (
                    <div>Your question's wording ({chunkType ? CHUNK_TYPE_LABEL[chunkType] ?? chunkType : "this type"}-related) gave this chunk type a <strong style={{ color: "var(--text2)" }}>{typeBoost}×</strong> boost.</div>
                  )}
                  {hybridScore != null && (
                    <div>Combined retrieval score (semantic + keyword, fused): <strong style={{ color: "var(--text2)" }}>{hybridScore.toFixed(4)}</strong>.</div>
                  )}
                  {rerankScore != null && (
                    <div>Final relevance re-check against your exact question: <strong style={{ color: "var(--text2)" }}>{Math.round(rerankScore * 100)}%</strong> — this is what decided its final rank and whether it made the cut at all.</div>
                  )}
                </div>
              )}
            </div>
          )}
          {page && (
            <div style={{ marginTop: "0.4rem" }}>
              {pageChunks === null && (
                <button onClick={(e) => { e.stopPropagation(); loadPageChunks(); }}
                  style={{ fontSize: "0.6rem", color: accent, background: "none", border: "none", padding: 0, cursor: "pointer", textDecoration: "underline" }}>
                  Show everything else on this page
                </button>
              )}
              {pageChunks === "loading" && (
                <span style={{ fontSize: "0.6rem", color: "var(--text3)" }}>Loading…</span>
              )}
              {Array.isArray(pageChunks) && (
                pageChunks.length === 0 ? (
                  <span style={{ fontSize: "0.6rem", color: "var(--text3)" }}>Nothing else was extracted from page {page}.</span>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                    {pageChunks.map((c, i) => (
                      <div key={i} style={{ background: "rgba(255,255,255,0.02)", borderRadius: 6, padding: "0.3rem 0.45rem" }}>
                        {c.chunk_type && c.chunk_type !== "text" && (
                          <span style={{ fontSize: "0.55rem", fontWeight: 700, color: accent, textTransform: "uppercase", marginRight: "0.3rem" }}>
                            {CHUNK_TYPE_LABEL[c.chunk_type] ?? c.chunk_type}
                          </span>
                        )}
                        {c.text.slice(0, 200)}{c.text.length > 200 ? "…" : ""}
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
