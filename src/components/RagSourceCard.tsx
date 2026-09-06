"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ML_UNIFIED_API } from "@/config/urls";
import RagTableView from "./RagTableView";
import RagSourceFlags from "./RagSourceFlags";
import RagRetrievalTrace from "./RagRetrievalTrace";
import { trackedFetch } from "@/lib/trackedFetch";

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
  retrievalTrace?: { dense?: { score: number; rank: number }; bm25?: { score: number; rank: number }; vision?: { score: number; rank: number }; graph?: { score: number; rank: number } } | null;
  hybridScore?: number | null;
  rerankScore?: number | null;
  typeBoost?: number | null;
  /** 1-based rank shown as a small numbered chip — undefined omits it
   * (contexts like DocumentSummaryPanel list chunks, not ranked evidence). */
  index?: number;
  /** Whether the generated answer's own wording actually overlaps this
   * chunk (see citations.py::likely_used_indices) — null/undefined when
   * that signal wasn't computed (e.g. a document-summary chunk list with
   * no answer to compare against), which hides the row entirely rather
   * than guessing. */
  usedInAnswer?: boolean | null;
};

const PII_LABEL: Record<string, string> = { email: "Email", phone: "Phone", ssn: "SSN", credit_card: "Card number" };

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
      fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.05em",
      color, background: `${color}1a`, borderRadius: 9999,
      padding: "1px 5px", flexShrink: 0, textTransform: "uppercase",
    }}>
      {cat}
    </span>
  );
}

const CHUNK_TYPE_LABEL: Record<string, string> = { table: "Table", figure: "Figure", image: "Image", video: "Video Frame" };

export default function RagSourceCard({ source, text, score, rawScore, accent, chunkType, page, onSelect, hideConfidence, numberMismatch, piiTypes, blurry, entities, retrievalTrace, hybridScore, rerankScore, typeBoost, index, usedInAnswer }: Props) {
  const piiList = piiTypes ? piiTypes.split(",").map(t => PII_LABEL[t] ?? t) : [];
  const [open, setOpen] = useState(false);
  const [hovering, setHovering] = useState(false);
  // Fixed-position coords computed at hover time, not CSS top/bottom-100% --
  // this card usually sits inside a small overflow-y-auto scroll panel (the
  // Evidence column), not the full page. An absolutely-positioned tooltip
  // nested inside that panel gets clipped by ITS overflow the moment the
  // card is near the panel's own top edge, even when there's plenty of room
  // in the actual viewport above it -- a real bug found live: the panel's
  // scroll container starts well below the page's top, so "is this card
  // near the viewport top" (the old check) said no room needed flipping
  // when the card was actually flush against the panel's own top edge.
  // Portal-rendering into document.body as position:fixed escapes that
  // ancestor's overflow entirely, and viewport-relative math becomes valid
  // again since fixed positioning IS relative to the viewport.
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number; below: boolean } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [traceOpen, setTraceOpen] = useState(false);
  const [pageChunks, setPageChunks] = useState<PageChunk[] | "loading" | null>(null);
  const hasTrace = !!(retrievalTrace?.dense || retrievalTrace?.bm25 || retrievalTrace?.vision || retrievalTrace?.graph || hybridScore != null || rerankScore != null);
  const rawPct = rawScore !== undefined ? Math.round(rawScore * 100) : Math.round(score * 100);
  const confColor = rawPct <= 50 ? "#f87171" : rawPct <= 80 ? "#fbbf24" : accent;
  const confLabel = rawPct <= 50 ? "Low" : rawPct <= 80 ? "Medium" : "High";
  const confFull = rawPct <= 50 ? "Low confidence" : rawPct <= 80 ? "Medium confidence" : "High confidence";
  const cat = categorize(source);
  const name = displayName(source, cat);
  const typeLabel = chunkType && CHUNK_TYPE_LABEL[chunkType];
  // One chip per retrieval signal that independently surfaced this chunk —
  // a chunk found by 3 methods used to render as one long joined string
  // ("dense · rank 1 + keyword · rank 1 + graph · rank 2") that got harder
  // to scan as more signals (MMRAG-24 vision, MMRAG-25 graph) were added.
  const retrievalSignals = [
    retrievalTrace?.dense && { label: "dense", rank: retrievalTrace.dense.rank, color: "#60a5fa",
      desc: "Matched by meaning — this chunk's embedding is semantically close to your question" },
    retrievalTrace?.bm25 && { label: "keyword", rank: retrievalTrace.bm25.rank, color: "#34d399",
      desc: "Matched by keyword overlap (BM25) with your question's exact wording" },
    retrievalTrace?.vision && { label: "vision", rank: retrievalTrace.vision.rank, color: "#fbbf24",
      desc: "Matched by visual similarity — the image itself, not its caption, is close to your question" },
    retrievalTrace?.graph && { label: "graph", rank: retrievalTrace.graph.rank, color: "#c084fc",
      desc: "Matched by sharing an exact value or name (amount, date, person, etc.) with your question" },
  ].filter(Boolean) as { label: string; rank: number; color: string; desc: string }[];
  const rerankValue = rerankScore ?? rawScore ?? score;

  const loadPageChunks = async () => {
    if (!page) return;
    setPageChunks("loading");
    try {
      const res = await trackedFetch(`${ML_UNIFIED_API}/rag/page-chunks/${encodeURIComponent(source)}?page=${page}`, undefined, { tool: "rag-sources" });
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
      role="button"
      tabIndex={0}
      aria-label={`Citation ${index}${page ? `, page ${page}` : ""}`}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(o => !o); onSelect?.(); } }}
      onMouseEnter={() => {
        const rect = cardRef.current?.getBoundingClientRect();
        if (!rect) { setHovering(true); return; }
        // Two threshold-guessing attempts against "distance from the card
        // to the viewport top" both failed: this card usually sits inside a
        // small internal-scroll panel with its own header mid-page, so a
        // fixed pixel distance from the card to the viewport's top edge has
        // no reliable relationship to whether an ABOVE tooltip would clear
        // that panel's own header -- worked out via the actual numbers live
        // (card at ~288px from viewport top, panel header ends ~230px, a
        // ~110px-tall tooltip anchored above the card still lands on top of
        // it). Flipping the default instead of tuning a magic number: most
        // cards have plenty of room below them in a normal-height viewport,
        // so default to below, and only go above when there truly isn't
        // room left in the viewport underneath the card (i.e. near the very
        // bottom of the page/list, not near some arbitrary top offset).
        const below = window.innerHeight - rect.bottom > 150;
        setTooltipPos({ top: below ? rect.bottom + 5 : rect.top - 5, left: rect.left, below });
        setHovering(true);
      }}
      onMouseLeave={() => setHovering(false)}
      style={{
        background: "var(--bg-glass)",
        border: `1px solid ${accent}28`,
        borderRadius: 8,
        padding: "0.35rem 0.55rem",
        cursor: "pointer",
        userSelect: "none",
        position: "relative",
      }}
    >
      {hovering && !open && tooltipPos && typeof document !== "undefined" && createPortal(
        <div style={{
          position: "fixed", left: tooltipPos.left, zIndex: 9999,
          ...(tooltipPos.below ? { top: tooltipPos.top } : { bottom: window.innerHeight - tooltipPos.top }),
          maxWidth: 320, background: "var(--bg-card)", border: `1px solid ${accent}40`,
          borderRadius: 6, padding: "0.4rem 0.55rem", fontSize: "0.78rem", lineHeight: 1.5,
          color: "var(--text2)", boxShadow: "var(--shadow)", pointerEvents: "none",
        }}>
          {text.slice(0, 180)}{text.length > 180 ? "…" : ""}
        </div>,
        document.body
      )}
      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
        {index != null && (
          <span style={{
            fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", fontSize: "0.74rem", fontWeight: 700,
            color: accent, background: `${accent}1c`, width: 15, height: 15, borderRadius: 4,
            display: "grid", placeItems: "center", flexShrink: 0,
          }}>
            {index}
          </span>
        )}
        <span style={{ color: accent, flexShrink: 0 }}><DocIcon /></span>
        <CategoryBadge cat={cat} />
        <span style={{ flex: 1, fontSize: "0.81rem", color: "var(--text2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {name}{page ? ` · p.${page}` : ""}
        </span>
        {typeLabel && (
          <span style={{
            fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.03em",
            color: accent, background: `${accent}1a`, borderRadius: 9999,
            padding: "1px 5px", flexShrink: 0, textTransform: "uppercase",
          }}>
            {typeLabel}
          </span>
        )}
        {(numberMismatch || piiList.length > 0 || blurry) && !open && (
          // Consolidated flag dot, collapsed-state only — the three full
          // badges below used to always show, and a card with a type label
          // + confidence + all three flags read as 5-6 stacked pills at
          // once. Severity order: a number disagreement is worth verifying
          // (red) > PII present (amber) > maybe-blurry heuristic (gray).
          // Full badges with their explanations still show once expanded.
          <span
            title={numberMismatch ? "Verify number — click to expand for details"
                 : piiList.length > 0 ? `Contains ${piiList.join(", ")} — click to expand`
                 : "Maybe blurry — click to expand"}
            style={{
              width: 6, height: 6, borderRadius: 9999, flexShrink: 0,
              background: numberMismatch ? "#f87171" : piiList.length > 0 ? "#fbbf24" : "#94a3b8",
            }}
          />
        )}
        {!hideConfidence && (
          <span
            title={`${confFull} — raw model confidence: ${rawPct}%`}
            style={{
              fontSize: "0.74rem", fontWeight: 700, color: confColor,
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
          fontSize: "0.79rem",
          color: "var(--text3)",
          lineHeight: 1.6,
          borderTop: `1px solid var(--border)`,
          paddingTop: "0.35rem",
        }}>
          {chunkType === "table" ? (
            <RagTableView text={text} accent={accent} filename={`${displayName(source, cat).replace(/\.[^.]+$/, "") || "table"}-p${page ?? 1}.csv`} />
          ) : (
            <div style={{
              background: "var(--bg-glass)", borderLeft: `2px solid ${accent}`, borderRadius: 4,
              padding: "0.4rem 0.55rem", marginBottom: "0.45rem", color: "var(--text2)",
            }}>
              {text.slice(0, 220)}{text.length > 220 ? "…" : ""}
            </div>
          )}
          {hasTrace && (
            <RagRetrievalTrace accent={accent} chunkType={chunkType} retrievalSignals={retrievalSignals}
              retrievalTrace={retrievalTrace} hybridScore={hybridScore} rerankValue={rerankValue}
              typeBoost={typeBoost} usedInAnswer={usedInAnswer} traceOpen={traceOpen} setTraceOpen={setTraceOpen} />
          )}
          <RagSourceFlags numberMismatch={numberMismatch} blurry={blurry} piiList={piiList} entities={entities} />
          {page && (
            <div style={{ marginTop: "0.4rem" }}>
              {pageChunks === null && (
                <button onClick={(e) => { e.stopPropagation(); loadPageChunks(); }}
                  style={{ fontSize: "0.76rem", color: accent, background: "none", border: "none", padding: 0, cursor: "pointer", textDecoration: "underline" }}>
                  Show everything else on this page
                </button>
              )}
              {pageChunks === "loading" && (
                <span style={{ fontSize: "0.76rem", color: "var(--text3)" }}>Loading…</span>
              )}
              {Array.isArray(pageChunks) && (
                pageChunks.length === 0 ? (
                  <span style={{ fontSize: "0.76rem", color: "var(--text3)" }}>Nothing else was extracted from page {page}.</span>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                    {pageChunks.map((c, i) => (
                      <div key={i} style={{ background: "var(--bg-glass)", borderRadius: 6, padding: "0.3rem 0.45rem" }}>
                        {c.chunk_type && c.chunk_type !== "text" && (
                          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: accent, textTransform: "uppercase", marginRight: "0.3rem" }}>
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
