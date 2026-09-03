"use client";

import { useState, useRef, useEffect } from "react";
import type { ExtractedField } from "./_types";

/* Split out of DocFieldsPanel.tsx, which was 367 lines and could not take
   another feature under the 400-line limit. Nothing about the dropdown is
   shared with the field list beyond the fields themselves. */
export default function DocExportDropdown({ fields, docTypeLabel }: { fields: ExtractedField[]; docTypeLabel: string | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const download = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  const exportJSON = () => {
    const data = {
      document_type: docTypeLabel ?? "unknown",
      exported_at: new Date().toISOString(),
      field_count: fields.length,
      fields: fields.map(f => ({
        name: f.name,
        label: f.label,
        value: f.value,
        confidence: Math.round(f.confidence * 100) / 100,
        ...(f.originalValue !== undefined && f.originalValue !== f.value
          ? { original_value: f.originalValue, human_edited: true } : {}),
      })),
    };
    download(JSON.stringify(data, null, 2), "extracted_fields.json", "application/json");
  };

  const exportCSV = () => {
    const header = ["Field Name", "Label", "Value", "Confidence %"];
    const rows = fields.map(f => [
      f.name,
      f.label,
      `"${f.value.replace(/"/g, '""')}"`,
      Math.round(f.confidence * 100).toString(),
    ]);
    const csv = [header.join(","), ...rows.map(r => r.join(","))].join("\n");
    download(csv, "extracted_fields.csv", "text/csv");
  };

  const menuStyle: React.CSSProperties = {
    position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 50,
    background: "var(--bg-card)", border: "1px solid var(--border)",
    borderRadius: 8, padding: "4px", minWidth: 130,
    boxShadow: "var(--shadow)",
  };

  const itemStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 8,
    padding: "6px 10px", borderRadius: 6, cursor: "pointer",
    fontSize: 11, color: "var(--text2)", width: "100%", border: "none",
    background: "transparent", textAlign: "left",
  };

  return (
    <div ref={ref} data-wt="doc-export" style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 text-[9px] px-2 py-1 rounded-md border transition-colors hover:bg-[rgba(var(--fg-rgb),0.05)]"
        style={{ borderColor: "var(--border2)", color: "var(--text3)" }}>
        Export
        <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
          <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>
      {open && (
        <div style={menuStyle}>
          <button style={itemStyle} onClick={exportJSON}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--border)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M3 2h7l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M10 2v4h4" stroke="currentColor" strokeWidth="1.2"/>
            </svg>
            JSON
          </button>
          <button style={itemStyle} onClick={exportCSV}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--border)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="2" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M2 6h12M2 10h12M6 2v12" stroke="currentColor" strokeWidth="1.2"/>
            </svg>
            CSV
          </button>
        </div>
      )}
    </div>
  );
}
