"use client";

import { formatDuration } from "./AnalyticsStatCard";
import { pathLabel } from "./AnalyticsQueryByTool";

interface SummaryStats {
  active_now?: number;
  today_count?: number;
  avg_session_duration_ms?: number | null;
  bounce_rate?: number | null;
  query_success_rate?: number | null;
  top_pages?: { path: string; count: number }[];
  peak_hour?: number | null;
  returning_pct?: number | null;
  portfolio_tools?: Record<string, Record<string, number>>;
}

interface Props {
  stats: SummaryStats | null;
  rangeLabel: string;
  showAI: boolean;
  onGenerateReport: () => void;
  onToggleAI: () => void;
}

const CARD: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 14,
  padding: "1.25rem",
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
};

const DIVIDER: React.CSSProperties = { height: 1, background: "rgba(255,255,255,0.05)" };

function KVRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-gray-600">{label}</span>
      <span className="text-[10px] font-semibold text-gray-300 tabular-nums">{value}</span>
    </div>
  );
}

export default function AnalyticsSummaryCard({ stats, rangeLabel, showAI, onGenerateReport, onToggleAI }: Props) {
  const topPage  = stats?.top_pages?.[0];
  const peakHour = stats?.peak_hour != null ? `${stats.peak_hour}:00–${(stats.peak_hour + 1) % 24}:00` : "—";
  const qsr      = stats?.query_success_rate;

  // Top portfolio tool by total events
  const topTool = Object.entries(stats?.portfolio_tools ?? {})
    .map(([tool, actions]) => ({ tool, total: Object.values(actions).reduce((s, n) => s + n, 0) }))
    .sort((a, b) => b.total - a.total)[0];

  return (
    <div style={CARD}>
      {/* Eyebrow + title */}
      <div>
        <p className="text-[9px] font-bold uppercase tracking-[0.14em] mb-2" style={{ color: "rgba(16,185,129,0.5)" }}>
          Real-Time Analytics
        </p>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[1.4rem] font-bold leading-none" style={{ color: "#10b981" }}>
              {(stats?.today_count ?? 0).toLocaleString()}
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>
              events · {rangeLabel}
            </p>
          </div>
          <span className="flex items-center gap-1 text-[9px] px-1.5 py-[2px] rounded-full"
            style={{ background: "rgba(16,185,129,0.1)", color: "#10b981" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
            Live
          </span>
        </div>
      </div>

      {/* 3 mini chips */}
      <div className="grid grid-cols-3 gap-1.5">
        {[
          { label: "Active", value: String(stats?.active_now ?? 0), color: "#10b981" },
          {
            label: "Duration",
            value: stats?.avg_session_duration_ms != null ? formatDuration(stats.avg_session_duration_ms) : "—",
            color: "#38bdf8",
          },
          {
            label: "QSR",
            value: qsr != null ? `${qsr}%` : "—",
            color: qsr != null ? (qsr >= 80 ? "#10b981" : qsr >= 50 ? "#f59e0b" : "#ef4444") : "#6b7280",
          },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex flex-col items-center gap-0.5 rounded-lg py-1.5"
            style={{ background: `${color}0e`, border: `1px solid ${color}22` }}>
            <span className="text-[11px] font-bold tabular-nums" style={{ color }}>{value}</span>
            <span className="text-[8px] text-gray-600 uppercase tracking-wider">{label}</span>
          </div>
        ))}
      </div>

      <div style={DIVIDER} />

      {/* Period summary key-value table */}
      <div>
        <p className="text-[9px] font-bold uppercase tracking-[0.12em] mb-2" style={{ color: "rgba(16,185,129,0.6)" }}>
          Period Summary
        </p>
        <div className="flex flex-col gap-1.5">
          <KVRow label="Top Page" value={topPage ? pathLabel(topPage.path) : "—"} />
          <KVRow label="Top Tool" value={topTool ? topTool.tool : "—"} />
          <KVRow label="Peak Hour" value={peakHour} />
          <KVRow label="Bounce" value={stats?.bounce_rate != null ? `${stats.bounce_rate}%` : "—"} />
          {stats?.returning_pct != null && <KVRow label="Returning" value={`${stats.returning_pct}%`} />}
        </div>
      </div>

      <div style={DIVIDER} />

      {/* Action buttons */}
      <div className="flex flex-col gap-2">
        <button onClick={onGenerateReport}
          className="w-full text-[10px] font-semibold py-1.5 rounded-lg border transition-colors hover:bg-white/5"
          style={{ borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)" }}>
          ↓ Generate Report
        </button>
        <button onClick={onToggleAI}
          className="w-full text-[10px] font-semibold py-1.5 rounded-lg transition-colors"
          style={showAI
            ? { background: "rgba(16,185,129,0.15)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }
            : { background: "rgba(16,185,129,0.08)", color: "#10b981", border: "1px solid rgba(16,185,129,0.18)" }}>
          ✦ AI Explain {showAI ? "▲" : "▼"}
        </button>
      </div>
    </div>
  );
}