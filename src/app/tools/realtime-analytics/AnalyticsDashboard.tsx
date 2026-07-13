"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Sparkline, TopPagesBar, TopReferrersBar, TypeDonut, FunnelChart, GeoMap } from "./AnalyticsCharts";
import type { PerMinute, TopPage, ByType, Country, Funnel, Referrer } from "./AnalyticsCharts";
import SessionPathPanel from "./AnalyticsSessionPanel";
import type { SessionEvent } from "./AnalyticsSessionPanel";
import AnalyticsCalendar from "./AnalyticsCalendar";
import AnalyticsUserGuide from "./AnalyticsUserGuide";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? "";
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

type Range = "today" | "yesterday" | "7d" | "30d" | "custom";

const RANGE_LABELS: Record<Range, string> = {
  today: "Today", yesterday: "Yesterday", "7d": "7 days", "30d": "30 days", custom: "Custom",
};

interface Stats {
  active_now: number;
  is_range: boolean;
  today_count: number;
  per_minute: PerMinute[];
  top_pages: TopPage[];
  by_type: ByType[];
  top_countries: Country[];
  top_referrers: Referrer[];
  funnel: Funnel;
  query_success_rate: number | null;
  query_success_count: number;
  query_total_count: number;
}

interface FeedEvent {
  id: number;
  created_at: string;
  type: string;
  path: string;
  country: string;
  session_id: string;
}

const TYPE_DOT: Record<string, string> = {
  page_view: "#6366f1", tool_open: "#10b981", query_run: "#f59e0b",
  tool_close: "#8b5cf6", custom: "#6b7280",
};

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h`;
}

function StatCard({ label, value, live, suffix, raw, sub }: { label: string; value: string | number; live?: boolean; suffix?: string; raw?: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
      <div className="flex items-center gap-2 mb-1">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">{label}</p>
        {live && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>}
      </div>
      <p className="text-2xl font-bold text-white tabular-nums">
        {raw ?? (typeof value === "number" ? value.toLocaleString() : value)}
        {suffix && <span className="text-sm font-normal text-gray-500 ml-1">{suffix}</span>}
      </p>
      {sub && <p className="text-[10px] text-gray-600 mt-1 tabular-nums">{sub}</p>}
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [range, setRange]          = useState<Range>("today");
  const [customRange, setCustomRange] = useState<{ start: string; end: string } | null>(null);
  const [showCal, setShowCal]      = useState(false);
  const [showGuide, setShowGuide]  = useState(false);
  const [stats, setStats]          = useState<Stats | null>(null);
  const [feed, setFeed]            = useState<FeedEvent[]>([]);
  const [loading, setLoading]      = useState(true);
  const [error, setError]          = useState<string | null>(null);
  const [selectedSid, setSid]      = useState<string | null>(null);
  const [sessionEvs, setSessEvs]   = useState<SessionEvent[]>([]);
  const [sessLoading, setSessLoading] = useState(false);
  const [sessError, setSessError]     = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
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

  // Realtime subscription
  useEffect(() => {
    if (!configured) return;
    const supabase = createClient(SB_URL, SB_KEY);
    const channel = supabase
      .channel("events-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "events" },
        (payload) => {
          const ev = payload.new as FeedEvent;
          setFeed(prev => [ev, ...prev].slice(0, 50));
          if (range !== "today") return;
          setStats(prev => {
            if (!prev) return prev;
            const hour = new Date().toISOString().slice(11, 13) + ":00";
            const pm = [...prev.per_minute];
            const mi = pm.findIndex(m => m.minute === hour);
            if (mi >= 0) pm[mi] = { ...pm[mi], count: pm[mi].count + 1 };
            else pm.push({ minute: hour, count: 1 });
            const tp = [...prev.top_pages];
            if (ev.path) {
              const pi = tp.findIndex(p => p.path === ev.path);
              if (pi >= 0) tp[pi] = { ...tp[pi], count: tp[pi].count + 1 };
              else tp.push({ path: ev.path, count: 1 });
              tp.sort((a, b) => b.count - a.count);
            }
            const bt = [...prev.by_type];
            const ti = bt.findIndex(t => t.type === ev.type);
            if (ti >= 0) bt[ti] = { ...bt[ti], count: bt[ti].count + 1 };
            else bt.push({ type: ev.type, count: 1 });
            const fn = { ...prev.funnel };
            if (ev.type === "page_view") fn.page_view++;
            else if (ev.type === "tool_open") fn.tool_open++;
            else if (ev.type === "query_run") fn.query_run++;
            return { ...prev, today_count: prev.today_count + 1,
              per_minute: pm.slice(-30), top_pages: tp.slice(0, 10), by_type: bt, funnel: fn };
          });
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [configured, range]);

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

  const toggleGroup = (gi: number) => setExpandedGroups(prev => {
    const next = new Set(prev);
    next.has(gi) ? next.delete(gi) : next.add(gi);
    return next;
  });

  const closeSession = () => { setSid(null); setSessError(null); setExpandedGroups(new Set()); };

  if (!configured) return (
    <div className="max-w-7xl mx-auto px-4 py-12 flex flex-col items-center gap-3 text-center">
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/8 p-6 max-w-md">
        <p className="text-sm text-amber-400 font-medium mb-2">Dashboard not configured</p>
        <p className="text-xs text-gray-500 leading-relaxed">
          Set <code className="text-indigo-400">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code className="text-indigo-400">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in your environment.
        </p>
      </div>
    </div>
  );

  if (loading) return (
    <div className="max-w-7xl mx-auto px-4 py-12 flex items-center gap-2 text-gray-500 text-sm">
      <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeDasharray="28 56" strokeLinecap="round"/>
      </svg>
      Loading analytics…
    </div>
  );

  if (error) return (
    <div className="max-w-7xl mx-auto px-4 py-8 text-red-400 text-sm">{error}</div>
  );

  const qsr = stats?.query_success_rate;
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
      {/* Range selector */}
      <div className="flex items-center gap-3 self-start">
        <div className="relative flex items-center gap-1">
          {(["today","yesterday","7d","30d"] as const).map(r => (
            <button key={r} onClick={() => { setRange(r); setShowCal(false); }}
              className="text-[10px] px-2.5 py-1 rounded-md border transition-colors"
              style={range === r
                ? { borderColor: "#10b981", color: "#10b981", background: "rgba(16,185,129,0.1)" }
                : { borderColor: "rgba(255,255,255,0.08)", color: "#4b5563" }}>
              {RANGE_LABELS[r]}
            </button>
          ))}
          <button onClick={() => setShowCal(v => !v)}
            className="text-[10px] px-2.5 py-1 rounded-md border transition-colors"
            style={range === "custom"
              ? { borderColor: "#10b981", color: "#10b981", background: "rgba(16,185,129,0.1)" }
              : { borderColor: "rgba(255,255,255,0.08)", color: "#4b5563" }}>
            {range === "custom" && customRange ? rangeLabel : "Custom"}
          </button>
          {showCal && (
            <AnalyticsCalendar onSelect={(start, end) => {
              setCustomRange({ start, end }); setRange("custom"); setShowCal(false);
            }}/>
          )}
        </div>
        <button onClick={() => setShowGuide(true)}
          className="text-[10px] px-2.5 py-1 rounded-md border transition-colors hover:border-white/20"
          style={{ borderColor: "rgba(255,255,255,0.08)", color: "#4b5563" }}>
          User Guide
        </button>
      </div>

      {showGuide && <AnalyticsUserGuide onClose={() => setShowGuide(false)}/>}

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label={stats?.is_range ? "Unique Sessions" : "Active Now"} value={stats?.active_now ?? 0} live={!stats?.is_range} suffix={stats?.is_range ? "sessions" : "users"}/>
        <StatCard label="Total Events" value={stats?.today_count ?? 0}/>
        <StatCard label="Query Success" value={0}
          raw={qsr !== null && qsr !== undefined ? `${qsr}%` : "—"}
          sub={stats && stats.query_total_count > 0 ? `${stats.query_success_count} / ${stats.query_total_count} queries` : undefined}/>
      </div>

      {/* Sparkline + Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">{sparklineLabel}</p>
          <Sparkline data={stats?.per_minute ?? []}/>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">Conversion Funnel — {rangeLabel}</p>
          <FunnelChart data={stats?.funnel ?? { page_view: 0, tool_open: 0, query_run: 0 }}/>
        </div>
      </div>

      {/* Top pages + Geo map */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">Top Pages — {rangeLabel}</p>
          <TopPagesBar data={stats?.top_pages ?? []}/>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">Visitors by Country</p>
          <GeoMap data={stats?.top_countries ?? []}/>
        </div>
      </div>

      {/* Top Referrers */}
      <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">Top Referrers — {rangeLabel}</p>
        <TopReferrersBar data={stats?.top_referrers ?? []}/>
      </div>

      {/* Donut + Live feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">Events by Type</p>
          <TypeDonut data={stats?.by_type ?? []}/>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
          <div className="flex items-center gap-2 mb-3">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Live Feed</p>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>
            <span className="text-[9px] text-gray-700 ml-auto">click session to trace path</span>
          </div>
          <div className="flex flex-col gap-2 max-h-52 overflow-y-auto">
            {feed.length === 0 && <p className="text-xs text-gray-600">Waiting for events…</p>}
            {feed.map((ev, i) => (
              <div key={ev.id ?? i} className="flex items-center gap-2 text-[11px]">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: TYPE_DOT[ev.type] ?? "#6b7280" }}/>
                <span className="text-gray-500 font-mono shrink-0 w-20 truncate">{ev.type}</span>
                <span className="text-gray-400 flex-1 truncate">{ev.path || "/"}</span>
                {ev.country && <span className="text-gray-600 shrink-0 text-[10px]">{ev.country}</span>}
                {ev.session_id && (
                  <span className="text-[9px] font-mono shrink-0 tabular-nums"
                    style={{ color: selectedSid === ev.session_id ? "#10b981" : "#374151" }}>
                    {ev.session_id.slice(0, 8)}
                  </span>
                )}
                <span className="text-gray-700 shrink-0 text-[10px]">{timeAgo(ev.created_at)}</span>
                {ev.session_id && (
                  <button onClick={() => openSession(ev.session_id)}
                    className="text-[9px] shrink-0 px-1.5 py-0.5 rounded border transition-colors"
                    style={selectedSid === ev.session_id
                      ? { borderColor: "#10b981", color: "#10b981", background: "rgba(16,185,129,0.1)" }
                      : { borderColor: "rgba(255,255,255,0.08)", color: "#4b5563" }}>
                    trace
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedSid && (
        <SessionPathPanel
          selectedSid={selectedSid}
          sessionEvs={sessionEvs}
          sessLoading={sessLoading}
          sessError={sessError}
          expandedGroups={expandedGroups}
          onClose={closeSession}
          onToggleGroup={toggleGroup}
        />
      )}
    </div>
  );
}