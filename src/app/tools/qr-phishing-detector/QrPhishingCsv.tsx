"use client";

import type { ScanEntry } from "./useQrPhishingScan";

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Client-side CSV download — builds a Blob URL and clicks a throwaway
 * anchor, no backend involved. Same pattern as Plant Growth's CSV export. */
export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map(row => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function scanEntriesToRows(entries: ScanEntry[]): (string | number)[][] {
  const header = ["source", "data", "payload_type", "is_url", "host", "risk_level", "reasons", "reputation_checked"];
  const rows: (string | number)[][] = [];
  for (const entry of entries) {
    if (!entry.result?.found) continue;
    for (const qr of entry.result.qrCodes) {
      rows.push([
        entry.fileName,
        qr.data,
        qr.payloadType,
        qr.isUrl ? "yes" : "no",
        qr.host ?? "",
        qr.riskLevel,
        qr.reasons.join("; "),
        entry.result.reputationChecked ? "yes" : "no",
      ]);
    }
  }
  return [header, ...rows];
}

export function ExportCsvButton({ onClick, label = "Export CSV" }: { onClick: () => void; label?: string }) {
  return (
    <button onClick={onClick}
      className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors border"
      style={{ borderColor: "var(--border)", color: "var(--text3)" }}>
      {label}
    </button>
  );
}
