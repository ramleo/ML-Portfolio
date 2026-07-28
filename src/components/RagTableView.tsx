"use client";

import { useState } from "react";
import RagTableChart, { detectNumericColumns } from "./RagTableChart";

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

export default function RagTableView({ text, accent, filename }: { text: string; accent: string; filename: string }) {
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