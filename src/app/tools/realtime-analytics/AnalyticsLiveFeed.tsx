"use client";

export interface FeedEvent {
  id: number;
  created_at: string;
  type: string;
  path: string;
  country: string;
  session_id: string;
  duration_ms?: number;
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

export default function AnalyticsLiveFeed({ feed, selectedSid, onTraceSession }: Props) {
  return (
    <div className="rounded-xl overflow-hidden" style={{
      background: "linear-gradient(160deg,rgba(255,255,255,0.04) 0%,rgba(255,255,255,0.02) 100%)",
      border: "1px solid rgba(255,255,255,0.10)",
      boxShadow: "0 0 0 1px rgba(255,255,255,0.03) inset,0 8px 32px rgba(0,0,0,0.35)",
    }}>
      <style>{`@keyframes feedIn{from{opacity:0;transform:translateY(-5px)}to{opacity:1;transform:translateY(0)}}`}</style>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{
          background: "linear-gradient(90deg,#10b981,#6366f1)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>Live Feed</p>
        <span className="relative flex h-2 w-2 ml-0.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"/>
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400"/>
        </span>
        <span className="text-[9px] text-gray-700 ml-auto">click session ID to trace</span>
      </div>
      {/* Feed rows */}
      <div className="flex flex-col max-h-[260px] overflow-y-auto">
        {feed.length === 0 && <p className="text-xs text-gray-600 px-4 py-3">Waiting for events…</p>}
        {feed.map((ev, i) => {
          const color = TYPE_DOT[ev.type] ?? "#6b7280";
          const isActive = selectedSid === ev.session_id;
          const isToolPath = ev.path?.startsWith("/tools/");
          const toolName = isToolPath ? ev.path.replace("/tools/", "") : (ev.path || "/");
          const showDur = ev.type === "tool_close" && (ev.duration_ms ?? 0) > 0;
          return (
            <div key={ev.id ?? i}
              className="group relative flex items-center gap-2 pr-4 border-b border-white/[0.04] transition-colors hover:bg-white/[0.015]"
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
              {/* Path — /tools/ prefix dimmed, tool name bright */}
              <span className="flex-1 font-mono truncate text-[11px]">
                {isToolPath && <span style={{ color: "#2d3748" }}>/tools/</span>}
                <span style={{ color: "#94a3b8" }}>{toolName}</span>
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
                  style={{ background: "rgba(255,255,255,0.05)", color: "#64748b" }}>
                  {ev.country}
                </span>
              )}
              {/* Session ID — clickable */}
              {ev.session_id && (
                <button onClick={() => onTraceSession(ev.session_id)}
                  className="text-[8px] font-mono shrink-0 tabular-nums transition-colors hover:opacity-80"
                  style={{ color: isActive ? "#10b981" : "#4b5563" }}>
                  {ev.session_id.slice(0, 8)}
                </button>
              )}
              {/* Time — fixed width */}
              <span className="text-[9px] tabular-nums text-right shrink-0"
                style={{ color: "#374151", minWidth: "22px" }}>
                {timeAgo(ev.created_at)}
              </span>
              {/* Trace button — visible on hover only */}
              {ev.session_id && (
                <button onClick={() => onTraceSession(ev.session_id)}
                  className="text-[9px] shrink-0 px-1.5 py-[2px] rounded border transition-all opacity-0 group-hover:opacity-100"
                  style={isActive
                    ? { borderColor: "#10b981", color: "#10b981", background: "rgba(16,185,129,0.1)" }
                    : { borderColor: "rgba(255,255,255,0.10)", color: "#4b5563" }}>
                  trace
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}