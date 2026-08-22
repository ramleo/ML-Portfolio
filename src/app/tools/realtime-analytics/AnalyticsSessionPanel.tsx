"use client";

export interface SessionEvent {
  id: number;
  created_at: string;
  type: string;
  path: string;
  duration_ms: number;
  meta: Record<string, unknown>;
}

function fmtMs(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.round((ms % 60_000) / 1000);
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

const TYPE_COLOR: Record<string, string> = {
  page_view: "#6366f1", tool_open: "#10b981", query_run: "#f59e0b",
  tool_close: "#8b5cf6", custom: "#6b7280",
};

interface Props {
  selectedSid: string;
  sessionEvs: SessionEvent[];
  sessLoading: boolean;
  sessError: string | null;
  onClose: () => void;
}

export default function SessionPathPanel({ selectedSid, sessionEvs, sessLoading, sessError, onClose }: Props) {
  // Time per tool from tool_close events
  const toolTimes: Record<string, number> = {};
  for (const ev of sessionEvs) {
    if (ev.type === "tool_close" && ev.duration_ms > 0) {
      const tool = String(ev.meta?.tool ?? ev.path ?? "unknown");
      toolTimes[tool] = (toolTimes[tool] ?? 0) + ev.duration_ms;
    }
  }
  const toolEntries = Object.entries(toolTimes).sort(([, a], [, b]) => b - a);
  const totalMs = toolEntries.reduce((s, [, ms]) => s + ms, 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(4,8,20,0.55)", backdropFilter: "blur(3px)" }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative z-10 flex flex-col h-full overflow-hidden"
        style={{
          width: "320px",
          background: "var(--bg-card)",
          borderLeft: "1px solid rgba(16,185,129,0.18)",
          boxShadow: "-12px 0 48px rgba(0,0,0,0.6)",
        }}>

        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>
          <p className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-widest">Session</p>
          <code className="text-[9px] text-emerald-400/70 font-mono ml-1">{selectedSid.slice(0, 12)}…</code>
          <button onClick={onClose}
            className="ml-auto text-[var(--text3)] hover:text-[var(--text2)] text-[11px] transition-colors">
            ✕
          </button>
        </div>

        {/* Time per Tool — horizontal bars */}
        {toolEntries.length > 0 && (
          <div className="px-4 py-3 shrink-0"
            style={{ borderBottom: "1px solid var(--border)" }}>
            <p className="text-[9px] font-semibold text-[var(--text3)] uppercase tracking-widest mb-3">
              Time per Tool
            </p>
            {/* Total bar */}
            <div className="h-1 rounded-full mb-3 overflow-hidden" style={{ background: "var(--border)" }}>
              <div className="h-full rounded-full" style={{
                width: "100%",
                background: "linear-gradient(90deg,#8b5cf6,#6366f1)",
                opacity: 0.4,
              }}/>
            </div>
            {/* Per-tool bars */}
            {toolEntries.map(([tool, ms]) => {
              const pct = totalMs > 0 ? Math.round((ms / totalMs) * 100) : 0;
              return (
                <div key={tool} className="mb-2.5">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] text-[var(--text2)] font-mono truncate max-w-[160px]">{tool}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[8px] tabular-nums" style={{ color: "var(--text3)" }}>{pct}%</span>
                      <span className="text-[9px] tabular-nums font-medium" style={{ color: "#8b5cf6" }}>{fmtMs(ms)}</span>
                    </div>
                  </div>
                  <div className="h-[5px] rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                    <div className="h-full rounded-full transition-all" style={{
                      width: `${pct}%`,
                      background: "linear-gradient(90deg,#8b5cf6,#6366f1)",
                    }}/>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Event path — vertical timeline */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <p className="text-[9px] font-semibold text-[var(--text3)] uppercase tracking-widest mb-3">Event Path</p>
          {sessLoading && <p className="text-xs text-[var(--text3)]">Loading…</p>}
          {!sessLoading && sessError && <p className="text-xs text-red-400">Error: {sessError}</p>}
          {!sessLoading && !sessError && sessionEvs.length === 0 && (
            <p className="text-xs text-[var(--text3)]">No events found for this session.</p>
          )}
          {!sessLoading && !sessError && sessionEvs.map((ev, i) => {
            const color = TYPE_COLOR[ev.type] ?? "#6b7280";
            const isToolPath = ev.path?.startsWith("/tools/");
            const label = isToolPath ? ev.path.replace("/tools/", "") : (ev.path || "/");
            const isLast = i === sessionEvs.length - 1;
            return (
              <div key={ev.id} className="flex gap-3">
                {/* Timeline spine */}
                <div className="flex flex-col items-center shrink-0">
                  <div className="w-2 h-2 rounded-full mt-[3px] shrink-0" style={{ background: color, boxShadow: `0 0 6px ${color}60` }}/>
                  {!isLast && <div className="w-px flex-1 mt-1" style={{ background: "var(--border)", minHeight: "20px" }}/>}
                </div>
                {/* Event content */}
                <div className="pb-3 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[9px] font-bold" style={{ color }}>{ev.type}</span>
                    {ev.duration_ms > 0 && (
                      <span className="text-[8px] tabular-nums px-1 py-[1px] rounded"
                        style={{ background: "rgba(139,92,246,0.12)", color: "#8b5cf6" }}>
                        {fmtMs(ev.duration_ms)}
                      </span>
                    )}
                  </div>
                  <p className="text-[9px] font-mono truncate" style={{ color: "var(--text3)" }}>{label}</p>
                  <p className="text-[8px] mt-0.5" style={{ color: "var(--text3)" }}>
                    {new Date(ev.created_at).toTimeString().slice(0, 8)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}