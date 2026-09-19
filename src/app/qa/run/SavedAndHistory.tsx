"use client";

import { useEffect, useState } from "react";
import {
  getSavedTests, deleteSavedTest, getHistory, clearHistory,
  type SavedTest, type HistoryEntry,
} from "./storage";

function ago(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const STATUS_COLOR: Record<HistoryEntry["status"], string> = {
  passed: "#34d399", failed: "#f43f5e", error: "#f59e0b",
};

export default function SavedAndHistory({ accent, refreshKey, onLoad, onRun }: {
  accent: string;
  refreshKey: number;
  onLoad: (code: string, name: string) => void;
  onRun: (code: string, name: string) => void;
}) {
  const [saved, setSaved] = useState<SavedTest[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const refresh = () => { setSaved(getSavedTests()); setHistory(getHistory()); };
  useEffect(refresh, [refreshKey]);

  if (!saved.length && !history.length) return null;

  const passed = history.filter((h) => h.status === "passed").length;
  const passRate = history.length ? Math.round((100 * passed) / history.length) : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Recent runs */}
      <section className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: "var(--border)" }}>
          <span className="text-[12px] font-bold" style={{ color: "var(--text)" }}>Recent runs</span>
          {history.length > 0 && (
            <div className="flex items-center gap-2.5">
              <span className="text-[11px] tabular-nums" style={{ color: "var(--text3)" }}>{history.length} runs · {passRate}% passed</span>
              <button onClick={() => { clearHistory(); refresh(); }} className="text-[11px]" style={{ color: "var(--text3)" }}>Clear</button>
            </div>
          )}
        </div>
        {history.length === 0 ? (
          <p className="px-4 py-4 text-[12px]" style={{ color: "var(--text3)" }}>No runs yet.</p>
        ) : (
          <ul className="max-h-64 overflow-y-auto">
            {history.slice(0, 12).map((h) => (
              <li key={h.id} className="flex items-center gap-2.5 px-4 py-2 border-b last:border-0 text-[12px]" style={{ borderColor: "var(--border)" }}>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: STATUS_COLOR[h.status] }} />
                <span className="flex-1 truncate" style={{ color: "var(--text2)" }}>{h.name}</span>
                <span className="text-[11px] shrink-0" style={{ color: "var(--text3)" }}>{ago(h.at)}</span>
                <button onClick={() => onRun(h.code, h.name)} className="text-[11px] shrink-0 px-2 py-0.5 rounded border"
                  style={{ borderColor: `${accent}45`, color: accent }}>Re-run</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Saved tests */}
      <section className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: "var(--border)" }}>
          <span className="text-[12px] font-bold" style={{ color: "var(--text)" }}>Saved tests</span>
          <span className="text-[11px]" style={{ color: "var(--text3)" }}>{saved.length}</span>
        </div>
        {saved.length === 0 ? (
          <p className="px-4 py-4 text-[12px]" style={{ color: "var(--text3)" }}>
            Nothing saved yet — use <span style={{ color: "var(--text2)" }}>Save test</span> on a result.
          </p>
        ) : (
          <ul className="max-h-64 overflow-y-auto">
            {saved.slice(0, 12).map((t) => (
              <li key={t.id} className="flex items-center gap-2 px-4 py-2 border-b last:border-0 text-[12px]" style={{ borderColor: "var(--border)" }}>
                <span className="flex-1 truncate" style={{ color: "var(--text2)" }}>{t.name}</span>
                <span className="text-[11px] shrink-0" style={{ color: "var(--text3)" }}>{ago(t.savedAt)}</span>
                <button onClick={() => onLoad(t.code, t.name)} className="text-[11px] shrink-0" style={{ color: "var(--text3)" }}>Load</button>
                <button onClick={() => onRun(t.code, t.name)} className="text-[11px] shrink-0 px-2 py-0.5 rounded border"
                  style={{ borderColor: `${accent}45`, color: accent }}>Run</button>
                <button onClick={() => { deleteSavedTest(t.id); refresh(); }} className="text-[11px] shrink-0" style={{ color: "#f43f5e" }} aria-label="Delete">✕</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
