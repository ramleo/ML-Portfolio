"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Sparkline, TopPagesBar, TypeDonut } from "./AnalyticsCharts";
import type { PerMinute, TopPage, ByType } from "./AnalyticsCharts";
import { ML_ANALYTICS_API } from "@/config/urls";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? "";
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

interface Stats {
  active_now: number;
  today_count: number;
  per_minute: PerMinute[];
  top_pages: TopPage[];
  by_type: ByType[];
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
  page_view: "#6366f1",
  tool_open: "#10b981",
  query_run: "#f59e0b",
  custom:    "#8b5cf6",
};

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h`;
}

function StatCard({ label, value, live, suffix }: { label: string; value: number; live?: boolean; suffix?: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
      <div className="flex items-center gap-2 mb-1">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">{label}</p>
        {live && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>}
      </div>
      <p className="text-2xl font-bold text-white tabular-nums">
        {value.toLocaleString()}
        {suffix && <span className="text-sm font-normal text-gray-500 ml-1">{suffix}</span>}
      </p>
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [stats, setStats]   = useState<Stats | null>(null);
  const [feed, setFeed]     = useState<FeedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);
  const configured = !!(ML_ANALYTICS_API && SB_URL && SB_KEY);

  useEffect(() => {
    if (!configured) { setLoading(false); return; }
    Promise.all([
      fetch(`${ML_ANALYTICS_API}/stats`).then(r => r.json()),
      fetch(`${ML_ANALYTICS_API}/events/recent`).then(r => r.json()),
    ])
      .then(([s, e]) => { setStats(s); setFeed(e.events ?? []); })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [configured]);

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
            const minute = new Date().toTimeString().slice(0, 5);
            const pm = [...prev.per_minute];
            const mi = pm.findIndex(m => m.minute === minute);
            if (mi >= 0) pm[mi] = { ...pm[mi], count: pm[mi].count + 1 };
            else pm.push({ minute, count: 1 });
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
            return { ...prev, today_count: prev.today_count + 1,
              per_minute: pm.slice(-30), top_pages: tp.slice(0, 10), by_type: bt };
          });
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [configured]);

  if (!configured) return (
    <div className="max-w-7xl mx-auto px-4 py-12 flex flex-col items-center gap-3 text-center">
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/8 p-6 max-w-md">
        <p className="text-sm text-amber-400 font-medium mb-2">Dashboard not configured</p>
        <p className="text-xs text-gray-500 leading-relaxed">
          Set <code className="text-indigo-400">NEXT_PUBLIC_ML_ANALYTICS_URL</code>,{" "}
          <code className="text-indigo-400">NEXT_PUBLIC_SUPABASE_URL</code>, and{" "}
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

  return (
    <div className="max-w-7xl mx-auto px-4 pb-12 flex flex-col gap-5">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Active Now" value={stats?.active_now ?? 0} live suffix="users"/>
        <StatCard label="Events Today" value={stats?.today_count ?? 0}/>
        <StatCard label="Event Types" value={stats?.by_type.length ?? 0}/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">Events / Minute — last 30 min</p>
          <Sparkline data={stats?.per_minute ?? []}/>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">Top Pages Today</p>
          <TopPagesBar data={stats?.top_pages ?? []}/>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">Events by Type</p>
          <TypeDonut data={stats?.by_type ?? []}/>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
          <div className="flex items-center gap-2 mb-3">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Live Feed</p>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>
          </div>
          <div className="flex flex-col gap-2 max-h-52 overflow-y-auto">
            {feed.length === 0 && <p className="text-xs text-gray-600">Waiting for events…</p>}
            {feed.map((ev, i) => (
              <div key={ev.id ?? i} className="flex items-center gap-2 text-[11px]">
                <span className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: TYPE_DOT[ev.type] ?? "#6b7280" }}/>
                <span className="text-gray-500 font-mono shrink-0 w-20 truncate">{ev.type}</span>
                <span className="text-gray-400 flex-1 truncate">{ev.path || "/"}</span>
                {ev.country && <span className="text-gray-600 shrink-0 text-[10px]">{ev.country}</span>}
                <span className="text-gray-700 shrink-0 text-[10px]">{timeAgo(ev.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}