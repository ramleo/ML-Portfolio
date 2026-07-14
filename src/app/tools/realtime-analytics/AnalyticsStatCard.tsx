"use client";

export function formatDuration(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.round((ms % 60_000) / 1000);
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export function StatCard({ label, value, live, suffix, raw, sub, trend }: {
  label: string; value: string | number; live?: boolean;
  suffix?: string; raw?: string; sub?: string; trend?: number | null;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
      <div className="flex items-center gap-2 mb-1">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">{label}</p>
        {live && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>}
        {trend != null && (
          <span className="ml-auto text-[9px] font-semibold px-1.5 py-[1px] rounded-full tabular-nums"
            style={trend >= 0
              ? { background: "rgba(16,185,129,0.12)", color: "#10b981" }
              : { background: "rgba(239,68,68,0.12)", color: "#ef4444" }}>
            {trend >= 0 ? "↑" : "↓"}{Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-white tabular-nums">
        {raw ?? (typeof value === "number" ? value.toLocaleString() : value)}
        {suffix && <span className="text-sm font-normal text-gray-500 ml-1">{suffix}</span>}
      </p>
      {sub && <p className="text-[10px] text-gray-600 mt-1 tabular-nums">{sub}</p>}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4 animate-pulse">
      <div className="h-2.5 w-20 rounded bg-white/[0.06] mb-3"/>
      <div className="h-7 w-16 rounded bg-white/[0.08]"/>
    </div>
  );
}