"use client";

import { useEffect, useState } from "react";
import type { QrResult } from "./useQrPhishingScan";

const KEY = "qr_phishing_history_v1";
const MAX = 5;

export type QrHistoryEntry = {
  id: string;
  label: string;
  at: string;
  qrCodes: QrResult[];
  reputationChecked: boolean;
};

const RISK_DOT: Record<string, string> = { low: "#34d399", medium: "#fbbf24", high: "#f87171", unknown: "var(--text3)" };

export function loadHistory(): QrHistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as QrHistoryEntry[]) : [];
    return Array.isArray(list) ? list.slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function saveHistoryEntry(entry: QrHistoryEntry) {
  try {
    const list = [entry, ...loadHistory().filter(e => e.id !== entry.id)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Quota exceeded — unlikely here (results are short text), but degrade quietly
  }
}

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function worstRisk(qrCodes: QrResult[]): string {
  if (qrCodes.some(q => q.riskLevel === "high")) return "high";
  if (qrCodes.some(q => q.riskLevel === "medium")) return "medium";
  if (qrCodes.some(q => q.riskLevel === "low")) return "low";
  return "unknown";
}

export default function QrScanHistory({ onRestore }: { onRestore: (e: QrHistoryEntry) => void }) {
  const [entries, setEntries] = useState<QrHistoryEntry[]>([]);

  useEffect(() => { setEntries(loadHistory()); }, []);

  if (entries.length === 0) return null;

  const clear = () => {
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
    setEntries([]);
  };

  return (
    <div style={{
      background: "var(--bg-glass)", backdropFilter: "blur(14px)",
      border: "1px solid var(--border)", borderRadius: 14,
    }} className="px-4 py-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-bold uppercase tracking-[0.12em]"
          style={{ color: "var(--text3)" }}>
          Recent scans
        </span>
        <button onClick={clear} className="text-[8px] px-1.5 py-0.5 rounded border transition-colors hover:bg-white/5"
          style={{ borderColor: "var(--border)", color: "var(--text3)" }}>
          Clear
        </button>
      </div>
      <div className="flex flex-col gap-1">
        {entries.map(e => (
          <button key={e.id} onClick={() => onRestore(e)}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors hover:bg-white/5"
            style={{ border: "1px solid var(--border)" }}>
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: RISK_DOT[worstRisk(e.qrCodes)] }} />
            <span className="flex-1 min-w-0">
              <span className="block text-[11px] truncate" style={{ color: "var(--text2)" }}>
                {e.label}
              </span>
              <span className="block text-[8px]" style={{ color: "var(--text3)" }}>
                {e.qrCodes.length} result{e.qrCodes.length !== 1 ? "s" : ""} · {timeAgo(e.at)}
              </span>
            </span>
            <span className="text-[8px] px-1.5 py-px rounded shrink-0"
              style={{ background: "rgba(249,115,22,0.1)", color: "#fdba74" }}>
              View again
            </span>
          </button>
        ))}
      </div>
      <p className="text-[8px]" style={{ color: "var(--text3)" }}>
        Stored in your browser only · shows the saved result, doesn&apos;t re-run reputation checks
      </p>
    </div>
  );
}
