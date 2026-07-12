"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Sparkline, TopPagesBar, TopReferrersBar, TypeDonut, FunnelChart, GeoMap } from "./AnalyticsCharts";
import type { PerMinute, TopPage, ByType, Country, Funnel, Referrer } from "./AnalyticsCharts";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? "";
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

type Range = "today" | "yesterday" | "7d" | "30d";

const RANGE_LABELS: Record<Range, string> = {
  today: "Today", yesterday: "Yesterday", "7d": "7 days", "30d": "30 days",
};

const SPARKLINE_LABEL: Record<Range, string> = {
  today: "Events by Hour — today",
  yesterday: "Events by Hour — yesterday",
  "7d": "Events by Day — last 7 days",
  "30d": "Events by Day — last 30 days",
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
}

interface FeedEvent {
  id: number;
  created_at: string;
  type: string;
  path: string;
  country: string;
  session_id: string;
}

interface SessionEvent {
  id: number;
  created_at: string;
  type: string;
  path: string;
  duration_ms: number;
  meta: Record<string, unknown>;
}

interface EventGroup {
  events: SessionEvent[];
  type: string;
  path: string;
}

function groupEvents(events: SessionEvent[]): EventGroup[] {
  const groups: EventGroup[] = [];
  for (const ev of events) {
    const last = groups[groups.length - 1];
    if (last && last.type === ev.type && last.path === ev.path) {
      last.events.push(ev);
    } else {
      groups.push({ events: [ev], type: ev.type, path: ev.path });
    }
  }
  return groups;
}

const Arrow = () => (
  <svg width="16" height="10" viewBox="0 0 16 10" fill="none" className="shrink-0 self-center mb-4">
    <path d="M1 5h12M10 2l3 3-3 3" stroke="#374151" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const TYPE_DOT: Record<string, string> = {
  page_view: "#6366f1",
  tool_open: "#10b981",
  query_run: "#f59e0b",
  tool_close: "#8b5cf6",
  custom:    "#6b7280",
};

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h`;
}

function StatCard({ label, value, live, suffix, raw }: { label: string; value: string | number; live?: boolean; suffix?: string; raw?: string }) {
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
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [range, setRange]        = useState<Range>("today");
  const [stats, setStats]        = useState<Stats | null>(null);
  const [feed, setFeed]          = useState<FeedEvent[]>([]);
  const [loading, setLoading]    = useState(true);
  const [error, setError]        = useState<string | null>(null);
  const [selectedSid, setSid]    = useState<string | null>(null);
  const [sessionEvs, setSessEvs] = useState<SessionEvent[]>([]);
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

  // Stats — re-fetched whenever range changes
  useEffect(() => {
    if (!configured) return;
    fetch(`/api/stats?range=${range}`).then(r => r.json())
      .then(s => setStats(s))
      .catch(err => setError(err.message));
  }, [configured, range]);

  useEffect(() => {
    if (!configured) return;
    const supabase = createClient(SB_URL, SB_KEY);
    const channel = supabase
      .channel("events-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "events" },
        (payload) => {
          const ev = payload.new as FeedEvent;
          setFeed(prev => [ev, ...prev].slice(0, 50));
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
  }, [configured]);

  const openSession = async (sid: string) => {
    if (selectedSid === sid) { setSid(null); setSessError(null); return; }
    setSid(sid); setSessLoading(true); setSessError(null);
    try {
      const r = await fetch(`/api/events/session/${encodeURIComponent(sid)}`);
      const data = await r.json();
      if (data.error) { setSessError(data.error); setSessEvs([]); }
      else setSessEvs(data.events ?? []);
    } catch (e) {
      setSessError(String(e));
      setSessEvs([]);
    }
    setSessLoading(false);
  };

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

  return (
    <div className="max-w-7xl mx-auto px-4 pb-12 flex flex-col gap-5">
      {/* Range selector */}
      <div className="flex items-center gap-1 self-start">
        {(["today","yesterday","7d","30d"] as const).map(r => (
          <button key={r} onClick={() => setRange(r)}
            className="text-[10px] px-2.5 py-1 rounded-md border transition-colors"
            style={range === r
              ? { borderColor: "#10b981", color: "#10b981", background: "rgba(16,185,129,0.1)" }
              : { borderColor: "rgba(255,255,255,0.08)", color: "#4b5563" }}>
            {RANGE_LABELS[r]}
          </button>
        ))}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label={stats?.is_range ? "Unique Sessions" : "Active Now"} value={stats?.active_now ?? 0} live={!stats?.is_range} suffix={stats?.is_range ? "sessions" : "users"}/>
        <StatCard label="Total Events" value={stats?.today_count ?? 0}/>
        <StatCard label="Query Success" value={0} raw={qsr !== null && qsr !== undefined ? `${qsr}%` : "—"}/>
      </div>

      {/* Sparkline + Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">{SPARKLINE_LABEL[range]}</p>
          <Sparkline data={stats?.per_minute ?? []}/>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">Conversion Funnel — {RANGE_LABELS[range].toLowerCase()}</p>
          <FunnelChart data={stats?.funnel ?? { page_view: 0, tool_open: 0, query_run: 0 }}/>
        </div>
      </div>

      {/* Top pages + Geo map */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">Top Pages — {RANGE_LABELS[range].toLowerCase()}</p>
          <TopPagesBar data={stats?.top_pages ?? []}/>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">Visitors by Country</p>
          <GeoMap data={stats?.top_countries ?? []}/>
        </div>
      </div>

      {/* Top Referrers */}
      <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">Top Referrers</p>
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
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-emerald-500/20 bg-[#080f1e]/95 backdrop-blur-md p-4 shadow-2xl">
          <div className="max-w-7xl mx-auto flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Session Path</p>
              <code className="text-[9px] text-emerald-400/60">{selectedSid.slice(0, 16)}…</code>
              <button onClick={() => { setSid(null); setSessError(null); }} className="ml-auto text-gray-600 hover:text-gray-400 text-[10px]">&#x2715; close</button>
            </div>
            {sessLoading && <p className="text-xs text-gray-600">Loading…</p>}
            {!sessLoading && sessError && <p className="text-xs text-red-400">Error: {sessError}</p>}
            {!sessLoading && !sessError && (
              <div className="flex items-start gap-1 overflow-x-auto pb-1">
                {sessionEvs.length === 0 && <p className="text-xs text-gray-600">No events found for this session.</p>}
                {groupEvents(sessionEvs).map((group, gi, groups) => {
                  const color = TYPE_DOT[group.type] ?? "#6b7280";
                  const isMulti = group.events.length > 1;
                  const isExpanded = expandedGroups.has(gi);
                  const toggleGroup = () => setExpandedGroups(prev => {
                    const next = new Set(prev);
                    next.has(gi) ? next.delete(gi) : next.add(gi);
                    return next;
                  });
                  const isLast = gi === groups.length - 1;

                  const SingleCard = ({ ev, showTs }: { ev: SessionEvent; showTs: boolean }) => (
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <div className="px-2 py-1.5 rounded-lg border text-center w-[82px]"
                        style={{ borderColor: `${color}40`, background: `${color}10` }}>
                        <p className="text-[9px] font-semibold truncate" style={{ color }}>{ev.type}</p>
                        <p className="text-[8px] text-gray-500 truncate">{ev.path || "/"}</p>
                        {ev.duration_ms > 0 && <p className="text-[8px] text-gray-600">{ev.duration_ms}ms</p>}
                      </div>
                      {showTs && <p className="text-[8px] text-gray-700">{new Date(ev.created_at).toTimeString().slice(0, 8)}</p>}
                    </div>
                  );

                  return (
                    <div key={gi} className="flex items-start gap-1 shrink-0">
                      {/* collapsed: single badge card */}
                      {isMulti && !isExpanded && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={toggleGroup} className="flex flex-col items-center gap-1 shrink-0 group">
                            <div className="px-2 py-1.5 rounded-lg border text-center w-[82px] cursor-pointer transition-colors"
                              style={{ borderColor: `${color}60`, background: `${color}15` }}>
                              <p className="text-[9px] font-semibold truncate" style={{ color }}>{group.type}</p>
                              <p className="text-[8px] text-gray-500 truncate">{group.path || "/"}</p>
                              <p className="text-[8px] mt-0.5 font-mono" style={{ color }}>×{group.events.length}</p>
                            </div>
                            <p className="text-[8px] text-gray-700 group-hover:text-gray-500">expand</p>
                          </button>
                          {!isLast && <Arrow />}
                        </div>
                      )}

                      {/* expanded: all individual cards inline */}
                      {(isExpanded || !isMulti) && (
                        <div className="flex items-start gap-1 shrink-0">
                          {group.events.map((ev, ei) => (
                            <div key={ev.id} className="flex items-start gap-1 shrink-0">
                              <div onClick={isMulti ? toggleGroup : undefined} className={isMulti ? "cursor-pointer" : ""}>
                                <SingleCard ev={ev} showTs />
                              </div>
                              {/* arrow between expanded cards */}
                              {ei < group.events.length - 1 && <Arrow />}
                            </div>
                          ))}
                          {/* arrow to next group */}
                          {!isLast && <Arrow />}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}