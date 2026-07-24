"use client";

import { useState } from "react";
import { ML_UNIFIED_API } from "@/config/urls";
import RagTableChart, { detectNumericColumns } from "./RagTableChart";

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
      fontSize: "0.55rem", fontWeight: 700, letterSpacing: "0.05em",
      color, background: `${color}1a`, borderRadius: 9999,
      padding: "1px 5px", flexShrink: 0, textTransform: "uppercase",
    }}>
      {cat}
    </span>
  );
}

const CHUNK_TYPE_LABEL: Record<string, string> = { table: "Table", figure: "Figure", image: "Image", video: "Video Frame" };

/** Parses the pipe-table markdown produced by extract_tables_markdown()
 * (e.g. "### Table (Page N)\n| a | b |\n| --- | --- |\n| 1 | 2 |") into
 * rows of cells. Returns null if the text doesn't look like a pipe table,
 * so callers can fall back to plain text. No markdown library needed —
 * the source format is fixed and fully known. */
function parsePipeTable(text: string): string[][] | null {
  const rows = text.split("\n")
    .map(l => l.trim())
    .filter(l => l.startsWith("|"))
    .map(l => l.slice(1, l.endsWith("|") ? -1 : undefined).split("|").map(c => c.trim()));
  if (rows.length < 2) return null;
  // Drop the "| --- | --- |" separator row (all cells are dashes/colons).
  return rows.filter(r => !r.every(c => /^:?-+:?$/.test(c)));
}

/** Wraps a cell in quotes (doubling any internal quotes) only when it
 * contains a comma, quote, or newline — plain cells stay unquoted. */
function csvCell(cell: string): string {
  return /[",\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell;
}

function downloadTableCsv(filename: string, rows: string[][]) {
  const csv = rows.map(row => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function TableView({ text, accent, filename }: { text: string; accent: string; filename: string }) {
  const [view, setView] = useState<"table" | "chart">("table");
  const rows = parsePipeTable(text);
  if (!rows || rows.length === 0) return <>{text.slice(0, 200)}{text.length > 200 ? "…" : ""}</>;
  const [header, ...body] = rows;
  const canChart = detectNumericColumns(header, body).length > 0;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.3rem" }}>
        <button onClick={(e) => { e.stopPropagation(); downloadTableCsv(filename, rows); }}
          style={{ fontSize: "0.6rem", color: accent, background: "none", border: "none", padding: 0, cursor: "pointer", textDecoration: "underline" }}>
          Download CSV
        </button>
        {canChart && (
          <div style={{ display: "flex", borderRadius: 9999, overflow: "hidden", border: "1px solid rgba(255,255,255,0.12)" }}>
            {(["table", "chart"] as const).map(v => (
              <button key={v} onClick={(e) => { e.stopPropagation(); setView(v); }}
                style={{
                  fontSize: "0.55rem", padding: "1px 8px", textTransform: "capitalize", cursor: "pointer",
                  background: view === v ? `${accent}22` : "transparent",
                  color: view === v ? accent : "rgba(255,255,255,0.4)",
                }}>
                {v}
              </button>
            ))}
          </div>
        )}
      </div>
      {view === "chart" && canChart ? (
        <RagTableChart header={header} body={body} accent={accent} />
      ) : (
        <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "0.6rem" }}>
          <thead>
            <tr>
              {header.map((c, i) => (
                <th key={i} style={{ textAlign: "left", padding: "2px 6px", color: accent, borderBottom: `1px solid ${accent}40`, whiteSpace: "nowrap" }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((r, ri) => (
              <tr key={ri}>
                {r.map((c, ci) => (
                  <td key={ci} style={{ padding: "2px 6px", color: "var(--text3)", borderBottom: "1px solid rgba(255,255,255,0.05)", whiteSpace: "nowrap" }}>{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}

export default function RagSourceCard({ source, text, score, rawScore, accent, chunkType, page, onSelect, hideConfidence, numberMismatch, piiTypes }: Props) {
  const piiList = piiTypes ? piiTypes.split(",").map(t => PII_LABEL[t] ?? t) : [];
  const [open, setOpen] = useState(false);
  const [pageChunks, setPageChunks] = useState<PageChunk[] | "loading" | null>(null);
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
          {chunkType === "table" ? <TableView text={text} accent={accent} filename={`${displayName(source, cat).replace(/\.[^.]+$/, "") || "table"}-p${page ?? 1}.csv`} /> : <>{text.slice(0, 200)}{text.length > 200 ? "…" : ""}</>}
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
