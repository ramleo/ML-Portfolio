"use client";

import { useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import type { FeedEvent } from "./AnalyticsLiveFeed";

interface RealtimeStats {
  today_count: number;
  per_minute: { minute: string; count: number }[];
  top_pages: { path: string; count: number }[];
  by_type: { type: string; count: number }[];
  funnel: { page_view: number; tool_open: number; query_run: number };
  [key: string]: unknown;
}

export function useRealtimeFeed({ configured, sbUrl, sbKey, range, setFeed, setStats }: {
  configured: boolean;
  sbUrl: string;
  sbKey: string;
  range: string;
  setFeed: (updater: (prev: FeedEvent[]) => FeedEvent[]) => void;
  setStats: (updater: (prev: RealtimeStats | null) => RealtimeStats | null) => void;
}) {
  useEffect(() => {
    if (!configured) return;
    const supabase = createClient(sbUrl, sbKey);
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
  }, [configured, range, sbUrl, sbKey, setFeed, setStats]);
}