"use client";

export function formatDuration(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.round((ms % 60_000) / 1000);
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

const CARD_STYLE = {
  background: "var(--bg-glass)",
  backdropFilter: "blur(14px)",
  border: "1px solid var(--border)",
  borderRadius: 16,
  padding: "1.1rem 1.25rem",
} as const;

export function StatCard({ label, value, live, suffix, raw, sub, trend, accent }: {
  label: string; value: string | number; live?: boolean;
  suffix?: string; raw?: string; sub?: string; trend?: number | null;
  accent?: string;
}) {
  const displayVal = raw ?? (typeof value === "number" ? value.toLocaleString() : value);
  const color = accent ?? "#ffffff";

  return (
    <div style={{ ...CARD_STYLE, borderTop: `3px solid ${color}` }}>
      {/* Label row */}
      <div className="flex items-center gap-2 mb-2">
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.1em]">{label}</p>
        {live && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
        {trend != null && (
          <span
            className="ml-auto text-[9px] font-semibold px-1.5 py-[1px] rounded-full tabular-nums"
            style={trend >= 0
              ? { background: "rgba(16,185,129,0.12)", color: "#10b981" }
              : { background: "rgba(239,68,68,0.12)", color: "#ef4444" }}
          >
            {trend >= 0 ? "↑" : "↓"}{Math.abs(trend)}%
          </span>
        )}
      </div>

      {/* Divider */}
      <div className="mb-2.5" style={{ height: 1, background: "rgba(255,255,255,0.05)" }} />

      {/* Hero number */}
      <p className="font-bold tabular-nums leading-none" style={{ fontSize: "2rem", color }}>
        {displayVal}
        {suffix && (
          <span className="text-sm font-normal ml-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>
            {suffix}
          </span>
        )}
      </p>

      {sub && (
        <p className="text-[10px] mt-2 tabular-nums" style={{ color: "rgba(255,255,255,0.25)" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

export function EngagementRow({ by_type, error_count, query_total_count, export_conversion_pct }: {
  by_type: { type: string; count: number }[];
  error_count: number;
  query_total_count: number;
  export_conversion_pct: number | null;
}) {
  const copyCount   = by_type.find(t => t.type === "copy")?.count ?? 0;
  const exportCount = by_type.find(t => t.type === "export")?.count ?? 0;
  const errRate     = query_total_count > 0 ? Math.round((error_count / query_total_count) * 100) : 0;
  return (
    <div className="grid grid-cols-3 gap-4">
      <StatCard label="Error Rate"   raw={`${errRate}%`}  value={0} sub={`${error_count} failed queries`}    accent={error_count > 0 ? "#ef4444" : "#10b981"}/>
      <StatCard label="SQL Copies"   value={copyCount}               sub="copy events — SQL tool"              accent="#818cf8"/>
      <StatCard label="CSV Exports"  value={exportCount}             accent="#38bdf8"
        sub={export_conversion_pct != null ? `${export_conversion_pct}% of query sessions exported` : "export events — analytics"}/>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="animate-pulse" style={{ ...CARD_STYLE }}>
      <div className="h-2 w-20 rounded mb-3" style={{ background: "rgba(255,255,255,0.06)" }} />
      <div className="h-px w-full mb-3" style={{ background: "rgba(255,255,255,0.04)" }} />
      <div className="h-8 w-16 rounded" style={{ background: "rgba(255,255,255,0.08)" }} />
    </div>
  );
}