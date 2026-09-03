"use client";

import { useState } from "react";
import { pathLabel } from "./AnalyticsQueryByTool";

export interface FeedEvent {
  id: number;
  created_at: string;
  type: string;
  path: string;
  country: string;
  session_id: string;
  duration_ms?: number;
  meta?: Record<string, unknown>;
  referrer?: string;
}

const TYPE_DOT: Record<string, string> = {
  page_view: "#6366f1", tool_open: "#10b981", query_run: "#f59e0b",
  tool_close: "#8b5cf6", custom: "#6b7280",
};

function fmtDuration(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.round((ms % 60_000) / 1000);
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h`;
}

interface Props {
  feed: FeedEvent[];
  selectedSid: string | null;
  onTraceSession: (sid: string) => void;
}

function EventDetail({ ev }: { ev: FeedEvent }) {
  const meta = ev.meta ?? {};
  const rows: [string, string][] = [
    ["time", new Date(ev.created_at).toLocaleString()],
    ...(ev.referrer ? [["referrer", ev.referrer] as [string, string]] : []),
    ...(ev.duration_ms ? [["duration", fmtDuration(ev.duration_ms)] as [string, string]] : []),
    ...Object.entries(meta).map(([k, v]) => [k, String(v)] as [string, string]),
  ];
  return (
    <div className="mx-4 mb-2 rounded-lg border border-[var(--border)] bg-[var(--bg-glass)] p-3 flex flex-col gap-1">
      {rows.map(([k, v]) => (
        <div key={k} className="flex gap-2 text-[9px]">
          <span className="text-[var(--text3)] w-20 shrink-0">{k}</span>
          <span className="text-[var(--text2)] font-mono truncate">{v}</span>
        </div>
      ))}
      {rows.length === 0 && <span className="text-[9px] text-[var(--text3)]">No extra details</span>}
    </div>
  );
}

export default function AnalyticsLiveFeed({ feed, selectedSid, onTraceSession }: Props) {
  const [typeFilter, setTypeFilter]       = useState<string | null>(null);
  const [countryFilter, setCountryFilter] = useState<string | null>(null);
  const [expandedId, setExpandedId]       = useState<string | null>(null);

  const types     = [...new Set(feed.map(e => e.type))];
  const countries = [...new Set(feed.map(e => e.country).filter(Boolean))];
  const filtered  = feed.filter(ev =>
    (!typeFilter || ev.type === typeFilter) &&
    (!countryFilter || ev.country === countryFilter)
  );

  return (
    <div className="rounded-xl overflow-hidden" style={{
      background: "var(--bg-glass)",
      border: "1px solid var(--border)",
      boxShadow: "0 0 0 1px rgba(255,255,255,0.03) inset,0 8px 32px rgba(0,0,0,0.35)",
    }}>
      <style>{`@keyframes feedIn{from{opacity:0;transform:translateY(-5px)}to{opacity:1;transform:translateY(0)}}`}</style>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{
          background: "linear-gradient(90deg,#10b981,#6366f1)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>Live Feed</p>
        <span className="relative flex h-2 w-2 ml-0.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"/>
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400"/>
        </span>
        <span className="text-[9px] text-[var(--text3)] ml-auto">click session ID to trace</span>
      </div>
      {/* Filter bar — only renders when there's something to filter */}
      {(types.length > 1 || countries.length > 1) && (
        <div className="flex items-center gap-1.5 px-4 py-2 flex-wrap border-b border-[var(--border)]">
          <button onClick={() => { setTypeFilter(null); setCountryFilter(null); }}
            className="text-[8px] px-2 py-[2px] rounded-full border transition-colors"
            style={!typeFilter && !countryFilter
              ? { borderColor: "#10b981", color: "#10b981", background: "rgba(16,185,129,0.1)" }
              : { borderColor: "var(--border)", color: "var(--text3)" }}>
            All
          </button>
          {types.map(t => (
            <button key={t} onClick={() => setTypeFilter(typeFilter === t ? null : t)}
              className="text-[8px] px-2 py-[2px] rounded-full border transition-colors"
              style={typeFilter === t
                ? { borderColor: TYPE_DOT[t] ?? "#6b7280", color: TYPE_DOT[t] ?? "#6b7280", background: `${TYPE_DOT[t] ?? "#6b7280"}18` }
                : { borderColor: "var(--border)", color: "var(--text3)" }}>
              {t}
            </button>
          ))}
          {countries.length > 1 && <span className="text-[8px] text-[var(--text3)] mx-0.5">|</span>}
          {countries.length > 1 && countries.map(c => (
            <button key={c} onClick={() => setCountryFilter(countryFilter === c ? null : c)}
              className="text-[8px] px-2 py-[2px] rounded-full border transition-colors"
              style={countryFilter === c
                ? { borderColor: "var(--text3)", color: "var(--text2)", background: "rgba(100,116,139,0.1)" }
                : { borderColor: "var(--border)", color: "var(--text3)" }}>
              {c}
            </button>
          ))}
        </div>
      )}
      {/* Feed rows */}
      <div className="flex flex-col max-h-[260px] overflow-y-auto">
        {filtered.length === 0 && <p className="text-xs text-[var(--text3)] px-4 py-3">{feed.length === 0 ? "Waiting for events…" : "No events match filter."}</p>}
        {filtered.map((ev, i) => {
          const color = TYPE_DOT[ev.type] ?? "#6b7280";
          const evKey = `${ev.session_id}:${ev.created_at}`;
          const isActive = selectedSid === ev.session_id;
          const isExpanded = expandedId === evKey;
          const friendlyPath = pathLabel(ev.path || "/");
          const showDur = ev.type === "tool_close" && (ev.duration_ms ?? 0) > 0;
          return (
            /* The newest row carries its own type in an anchor. A guided demo
               clicks Export, which posts an event into the very table this
               feed subscribes to, and needs a way to wait for that specific
               row to arrive — "an export event exists somewhere" would be
               satisfied by any earlier one. */
            <div key={ev.id ?? i} data-wt={i === 0 ? `ra-newest-${ev.type}` : undefined}
                 className="border-b border-[var(--border)]">
            <div
              className="group relative flex items-center gap-2 pr-4 transition-colors hover:bg-[var(--border)] cursor-pointer"
              onClick={() => setExpandedId(isExpanded ? null : evKey)}
              style={{
                paddingLeft: "14px", paddingTop: "11px", paddingBottom: "11px",
                background: isActive ? "rgba(16,185,129,0.055)" : undefined,
                animation: i === 0 ? "feedIn 0.2s ease" : undefined,
              }}>
              {/* Left type-color strip */}
              <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{
                background: color,
                boxShadow: isActive ? `0 0 10px ${color}50` : "none",
              }}/>
              {/* Type badge — fixed width */}
              <span className="text-[9px] font-bold py-[3px] rounded shrink-0 text-center"
                style={{ minWidth: "86px", background: `${color}18`, color, border: `1px solid ${color}25` }}>
                {ev.type}
              </span>
              {/* Path — friendly name */}
              <span className="flex-1 font-mono truncate text-[11px]" style={{ color: "var(--text2)" }}>
                {friendlyPath}
              </span>
              {/* Duration chip — tool_close only */}
              {showDur && (
                <span className="text-[9px] px-1.5 py-[2px] rounded shrink-0"
                  style={{ background: "rgba(139,92,246,0.12)", color: "#8b5cf6", border: "1px solid rgba(139,92,246,0.18)" }}>
                  {fmtDuration(ev.duration_ms!)}
                </span>
              )}
              {/* Country chip */}
              {ev.country && (
                <span className="text-[8px] font-semibold px-1.5 py-[2px] rounded shrink-0"
                  style={{ background: "var(--border)", color: "var(--text3)" }}>
                  {ev.country}
                </span>
              )}
              {/* Session ID — clickable */}
              {ev.session_id && (
                <button onClick={e => { e.stopPropagation(); onTraceSession(ev.session_id); }}
                  className="text-[8px] font-mono shrink-0 tabular-nums transition-colors hover:opacity-80"
                  style={{ color: isActive ? "#10b981" : "var(--text3)" }}>
                  {ev.session_id.slice(0, 8)}
                </button>
              )}
              {/* Time — fixed width */}
              <span className="text-[9px] tabular-nums text-right shrink-0"
                style={{ color: "var(--text3)", minWidth: "22px" }}>
                {timeAgo(ev.created_at)}
              </span>
              {/* Trace button — visible on hover only */}
              {ev.session_id && (
                <button onClick={e => { e.stopPropagation(); onTraceSession(ev.session_id); }}
                  className="text-[9px] shrink-0 px-1.5 py-[2px] rounded border transition-all opacity-0 group-hover:opacity-100"
                  style={isActive
                    ? { borderColor: "#10b981", color: "#10b981", background: "rgba(16,185,129,0.1)" }
                    : { borderColor: "var(--border)", color: "var(--text3)" }}>
                  trace
                </button>
              )}
            </div>
            {isExpanded && <EventDetail ev={ev}/>}
            </div>
          );
        })}
      </div>
    </div>
  );
}