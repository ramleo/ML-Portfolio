"use client";

import { useState, useEffect, useCallback } from "react";
import { Sparkline, TopPagesBar, TopReferrersBar, TypeDonut, FunnelChart, GeoMap, ToolComparisonBar, ProviderBreakdownBar, ModelBreakdownBar } from "./AnalyticsCharts";
import { DeviceDonut } from "./AnalyticsDeviceDonut";
import { useRealtimeFeed } from "./useRealtimeFeed";
import AnalyticsHeatmap from "./AnalyticsHeatmap";
import { StatCard, SkeletonCard, formatDuration, EngagementRow } from "./AnalyticsStatCard";
import SessionPathPanel from "./AnalyticsSessionPanel";
import type { SessionEvent } from "./AnalyticsSessionPanel";
import AnalyticsLiveFeed from "./AnalyticsLiveFeed";
import type { FeedEvent } from "./AnalyticsLiveFeed";
import AnalyticsToolbar from "./AnalyticsToolbar";
import { RANGE_LABELS, type Range, type Stats } from "./analyticsTypes";
import AnalyticsUserGuide from "./AnalyticsUserGuide";
import AnalyticsHFTools from "./AnalyticsHFTools";
import AnalyticsQueryByTool from "./AnalyticsQueryByTool";
import AnalyticsPortfolioTools from "./AnalyticsPortfolioTools";
import AnalyticsSummaryCard from "./AnalyticsSummaryCard";
import AnalyticsAIPanel from "./AnalyticsAIPanel";
import { generateMarkdownReport } from "@/lib/analyticsReport";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? "";
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export default function AnalyticsDashboard() {
  const [range, setRange]          = useState<Range>("today");
  const [customRange, setCustomRange] = useState<{ start: string; end: string } | null>(null);
  const [showCal, setShowCal]      = useState(false);
  const [showGuide, setShowGuide]  = useState(false);
  const [stats, setStats]          = useState<Stats | null>(null);
  const [feed, setFeed]            = useState<FeedEvent[]>([]);
  const [loading, setLoading]      = useState(true);
  const [error, setError]          = useState<string | null>(null);
  const [showAI, setShowAI]        = useState(false);
  const [selectedSid, setSid]      = useState<string | null>(null);
  const [sessionEvs, setSessEvs]   = useState<SessionEvent[]>([]);
  const [sessLoading, setSessLoading] = useState(false);
  const [sessError, setSessError]     = useState<string | null>(null);
  const configured = !!(SB_URL && SB_KEY);

  // Feed — fetched once on mount
  useEffect(() => {
    if (!configured) { setLoading(false); return; }
    fetch("/api/events/recent").then(r => r.json())
      .then(e => setFeed(e.events ?? []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [configured]);

  // Stats — re-fetched whenever range or customRange changes
  useEffect(() => {
    if (!configured) return;
    const url = range === "custom" && customRange
      ? `/api/stats?start=${customRange.start}&end=${customRange.end}`
      : `/api/stats?range=${range}`;
    fetch(url).then(r => r.json())
      .then(s => setStats(s))
      .catch(err => setError(err.message));
  }, [configured, range, customRange]);

  // Auto-refresh stats every 60s when on "today"
  useEffect(() => {
    if (range !== "today" || !configured) return;
    const id = setInterval(() => {
      fetch("/api/stats?range=today").then(r => r.json()).then(s => setStats(s)).catch(() => {});
    }, 60_000);
    return () => clearInterval(id);
  }, [range, configured]);

  // Realtime subscription
  const realtimeSetFeed = useCallback((updater: (prev: FeedEvent[]) => FeedEvent[]) => setFeed(updater), []);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const realtimeSetStats = useCallback((updater: (prev: any) => any) => setStats(updater), []);
  useRealtimeFeed({ configured, sbUrl: SB_URL, sbKey: SB_KEY, range, setFeed: realtimeSetFeed, setStats: realtimeSetStats });

  const openSession = async (sid: string) => {
    if (selectedSid === sid) { setSid(null); setSessError(null); return; }
    setSid(sid); setSessLoading(true); setSessError(null);
    try {
      const r = await fetch(`/api/events/session/${encodeURIComponent(sid)}`);
      const data = await r.json();
      if (data.error) { setSessError(data.error); setSessEvs([]); }
      else setSessEvs(data.events ?? []);
    } catch (e) { setSessError(String(e)); setSessEvs([]); }
    setSessLoading(false);
  };

  const closeSession = () => { setSid(null); setSessError(null); };

  if (!configured) return (
    <div className="max-w-7xl mx-auto px-4 py-12 flex flex-col items-center gap-3 text-center">
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/8 p-6 max-w-md">
        <p className="text-sm text-amber-400 font-medium mb-2">Dashboard not configured</p>
        <p className="text-xs text-[var(--text3)] leading-relaxed">
          Set <code className="text-indigo-400">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code className="text-indigo-400">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in your environment.
        </p>
      </div>
    </div>
  );

  if (loading) return (
    <div className="max-w-7xl mx-auto px-4 pb-12 flex flex-col gap-5">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">{Array.from({length:5}).map((_,i) => <SkeletonCard key={i}/>)}</div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[0,1].map(i => <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--bg-glass)] backdrop-blur-[14px] p-5 animate-pulse h-32"/>)}
      </div>
    </div>
  );

  if (error) return (
    <div className="max-w-7xl mx-auto px-4 py-8 text-red-400 text-sm">{error}</div>
  );

  const qsr = stats?.query_success_rate;
  const trend = (stats?.prev_period_count ?? 0) > 0
    ? Math.round(((stats!.today_count - stats!.prev_period_count) / stats!.prev_period_count) * 100)
    : null;
  const peakHour = stats?.peak_hour != null
    ? `${stats.peak_hour}:00–${(stats.peak_hour + 1) % 24}:00`
    : null;
  const rangeLabel = range === "custom" && customRange
    ? customRange.start === customRange.end ? customRange.start : `${customRange.start} → ${customRange.end}`
    : RANGE_LABELS[range].toLowerCase();
  const sparklineLabel = range === "custom" && customRange
    ? customRange.start === customRange.end
      ? `Events by Hour — ${customRange.start}`
      : `Events by Day — ${customRange.start} → ${customRange.end}`
    : range === "7d" || range === "30d"
      ? `Events by Day — ${RANGE_LABELS[range].toLowerCase()}`
      : `Events by Hour — ${RANGE_LABELS[range].toLowerCase()}`;

  return (
    <div className="max-w-7xl mx-auto px-4 pb-12 flex flex-col gap-5">
      <AnalyticsToolbar
        range={range}
        customRange={customRange}
        rangeLabel={rangeLabel}
        showCal={showCal}
        onRange={(r) => { setRange(r); setShowCal(false); }}
        onCustom={(start, end) => { setCustomRange({ start, end }); setRange("custom"); setShowCal(false); }}
        onToggleCal={() => setShowCal(v => !v)}
        onGuide={() => setShowGuide(true)}
      />

      {showGuide && <AnalyticsUserGuide onClose={() => setShowGuide(false)}/>}

      {/* Summary card + Stat cards */}
      <div data-wt="ra-cards" className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
        <AnalyticsSummaryCard
          stats={stats}
          rangeLabel={rangeLabel}
          showAI={showAI}
          onGenerateReport={() => {
            if (!stats) return;
            const md = generateMarkdownReport(stats, rangeLabel);
            const blob = new Blob([md], { type: "text/markdown" });
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement("a");
            a.href = url; a.download = `analytics-report-${range}-${new Date().toISOString().slice(0,10)}.md`;
            a.click(); URL.revokeObjectURL(url);
          }}
          onToggleAI={() => setShowAI(v => !v)}
        />
        <div className="grid grid-cols-2 gap-4 content-start">
          <StatCard label={stats?.is_range ? "Unique Sessions" : "Active Now"} value={stats?.active_now ?? 0} live={!stats?.is_range} suffix={stats?.is_range ? "sessions" : "users"}
            accent="#10b981"
            sub={(stats?.device_breakdown ?? []).length > 0 ? stats!.device_breakdown.map(d => `${d.count} ${d.device}`).join(" · ") : undefined}/>
          <StatCard label="Total Events" value={stats?.today_count ?? 0} trend={trend} accent="#818cf8"/>
          <StatCard label="Avg Duration" value={0} accent="#38bdf8"
            raw={stats?.avg_session_duration_ms != null ? formatDuration(stats.avg_session_duration_ms) : "—"}
            sub={stats?.avg_session_duration_ms != null
              ? `per visit${stats.avg_queries_per_session != null ? ` · ${stats.avg_queries_per_session} queries/session` : ""}`
              : "no tool_close data yet"}/>
          <StatCard label="Bounce Rate" value={0} accent="#f59e0b"
            raw={stats?.bounce_rate !== null && stats?.bounce_rate !== undefined ? `${stats.bounce_rate}%` : "—"}
            sub={stats ? `${stats.bounce_session_count ?? 0}/${stats.total_session_count ?? 0} sessions${stats.returning_pct != null ? ` · ${stats.returning_pct}% returning` : ""}` : undefined}/>
          <div className="col-span-2">
            <StatCard label="Query Success" value={0}
              accent={qsr != null ? (qsr >= 80 ? "#10b981" : qsr >= 50 ? "#f59e0b" : "#ef4444") : "#6b7280"}
              raw={qsr !== null && qsr !== undefined ? `${qsr}%` : "—"}
              sub={stats ? `${stats.query_success_count ?? 0}/${stats.query_total_count ?? 0} queries · ${stats.error_count ?? 0} errors${stats.avg_query_length != null ? ` · avg ${stats.avg_query_length}ch` : ""}` : undefined}/>
          </div>
        </div>
      </div>

      {/* AI Explanation panel — manually triggered */}
      {showAI && <AnalyticsAIPanel stats={stats} rangeLabel={rangeLabel} />}

      {/* Sparkline + Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div data-wt="ra-sparkline" className="rounded-xl border border-[var(--border)] bg-[var(--bg-glass)] backdrop-blur-[14px] p-5">
          <div className="flex items-center gap-2 mb-3">
            <p className="text-[11px] font-bold text-[var(--text2)] uppercase tracking-[0.1em]">{sparklineLabel}</p>
            {peakHour && (
              <span className="ml-auto text-[9px] px-2 py-[2px] rounded-full"
                style={{ background: "rgba(16,185,129,0.1)", color: "#10b981" }}>
                Peak {peakHour}
              </span>
            )}
          </div>
          <Sparkline data={stats?.per_minute ?? []}/>
          {(stats?.error_per_minute ?? []).length > 0 && <>
            <p className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider mt-4 mb-1">Error Events</p>
            <Sparkline data={stats!.error_per_minute} color="#ef4444"/>
          </>}
        </div>
        <div data-wt="ra-funnel" className="rounded-xl border border-[var(--border)] bg-[var(--bg-glass)] backdrop-blur-[14px] p-5">
          <p className="text-[11px] font-bold text-[var(--text2)] uppercase tracking-[0.1em] mb-3">Conversion Funnel — {rangeLabel}</p>
          <FunnelChart data={stats?.funnel ?? { page_view: 0, tool_open: 0, query_run: 0 }}/>
        </div>
      </div>

      {/* HF Space Tools breakdown */}
      <AnalyticsHFTools hfTools={stats?.hf_tools ?? {}} />
      <AnalyticsPortfolioTools portfolioTools={stats?.portfolio_tools ?? {}} />

      {/* Top pages + Geo map */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-glass)] backdrop-blur-[14px] p-5">
          <p className="text-[11px] font-bold text-[var(--text2)] uppercase tracking-[0.1em] mb-3">Top Pages — {rangeLabel}</p>
          <TopPagesBar data={stats?.top_pages ?? []}/>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-glass)] backdrop-blur-[14px] p-5">
          <p className="text-[11px] font-bold text-[var(--text2)] uppercase tracking-[0.1em] mb-3">Visitors by Country</p>
          <GeoMap data={stats?.top_countries ?? []}/>
        </div>
      </div>

      {/* Top Referrers */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-glass)] backdrop-blur-[14px] p-5">
        <p className="text-[11px] font-bold text-[var(--text2)] uppercase tracking-[0.1em] mb-3">Top Referrers — {rangeLabel}</p>
        <TopReferrersBar data={stats?.top_referrers ?? []}/>
      </div>

      {/* Hourly heatmap — last 7 days */}
      {(stats?.heatmap ?? []).length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-glass)] backdrop-blur-[14px] p-5">
          <p className="text-[11px] font-bold text-[var(--text2)] uppercase tracking-[0.1em] mb-3">Activity Heatmap — Last 7 Days</p>
          <AnalyticsHeatmap data={stats!.heatmap}/>
        </div>
      )}

      {/* Tool comparison */}
      {(stats?.top_pages ?? []).some(p => p.path.startsWith("/tools/")) && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-glass)] backdrop-blur-[14px] p-5">
          <p className="text-[11px] font-bold text-[var(--text2)] uppercase tracking-[0.1em] mb-3">Tool Usage Comparison — {rangeLabel}</p>
          <ToolComparisonBar data={stats?.top_pages ?? []}/>
        </div>
      )}

      {/* Per-tool Query Success Rate */}
      <AnalyticsQueryByTool data={stats?.query_by_tool ?? []} rangeLabel={rangeLabel} />

      {/* AI Provider + Model usage — only shown when there is data */}
      {((stats?.provider_breakdown ?? []).length > 0 || (stats?.model_breakdown ?? []).length > 0) && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-glass)] backdrop-blur-[14px] p-5">
          <p className="text-[11px] font-bold text-[var(--text2)] uppercase tracking-[0.1em] mb-3">AI Model Usage — {rangeLabel}</p>
          {(stats?.provider_breakdown ?? []).length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider mb-2">By Provider</p>
                <ProviderBreakdownBar data={stats?.provider_breakdown ?? []}/>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider mb-2">By Model</p>
                <ModelBreakdownBar data={stats?.model_breakdown ?? []}/>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider mb-2">By Model</p>
              <ModelBreakdownBar data={stats?.model_breakdown ?? []}/>
            </div>
          )}
        </div>
      )}

      {/* Error Rate + User Actions */}
      <EngagementRow
        by_type={stats?.by_type ?? []}
        error_count={stats?.error_count ?? 0}
        query_total_count={stats?.query_total_count ?? 0}
        export_conversion_pct={stats?.export_conversion_pct ?? null}
      />

      {/* Donuts + Live feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-glass)] backdrop-blur-[14px] p-5">
          <p className="text-[11px] font-bold text-[var(--text2)] uppercase tracking-[0.1em] mb-3">Events by Type</p>
          <TypeDonut data={stats?.by_type ?? []}/>
          <p className="text-[11px] font-bold text-[var(--text2)] uppercase tracking-[0.1em] mt-4 mb-2">Visitors by Device</p>
          <DeviceDonut data={stats?.device_breakdown ?? []}/>
        </div>
        <div data-wt="ra-feed">
          <AnalyticsLiveFeed feed={feed} selectedSid={selectedSid} onTraceSession={openSession}/>
        </div>
      </div>

      {selectedSid && (
        <SessionPathPanel
          selectedSid={selectedSid}
          sessionEvs={sessionEvs}
          sessLoading={sessLoading}
          sessError={sessError}
          onClose={closeSession}
        />
      )}
    </div>
  );
}