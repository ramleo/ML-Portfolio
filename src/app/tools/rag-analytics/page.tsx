"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToolTracking } from "@/hooks/useAnalytics";
import ConstellationBackground from "@/components/ConstellationBackground";
import { ML_UNIFIED_API } from "@/config/urls";

const ACCENT = "#38bdf8";

type Analytics = {
  since: number;
  uploads: Record<string, number>;
  queries: { count: number; avg_latency_ms: number; cache_hit_rate: number };
  provider_mix: Record<string, number>;
};

const UPLOAD_TYPE_LABEL: Record<string, string> = { pdf: "PDF", image: "Image", csv: "CSV", video: "Video", unknown: "Other" };

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="text-[9px] font-bold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.4)" }}>{label}</div>
      <div className="text-2xl font-bold mt-1" style={{ color: ACCENT }}>{value}</div>
      {sub && <div className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{sub}</div>}
    </div>
  );
}

function Bar({ label, count, max, accent }: { label: string; count: number; max: number; accent: string }) {
  const pct = max > 0 ? Math.max(4, Math.round((count / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="w-20 shrink-0" style={{ color: "rgba(255,255,255,0.6)" }}>{label}</span>
      <div className="flex-1 h-4 rounded overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: accent, borderRadius: 4 }} />
      </div>
      <span className="w-8 text-right shrink-0" style={{ color: "rgba(255,255,255,0.5)" }}>{count}</span>
    </div>
  );
}

export default function RagAnalyticsPage() {
  useToolTracking("rag-analytics");
  const router = useRouter();
  const handleBack = useCallback(() => router.push("/#capabilities"), [router]);
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(`${ML_UNIFIED_API}/rag/analytics`)
      .then(r => r.json())
      .then(setData)
      .catch(() => setError("Couldn't load analytics — the backend may be starting up."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const uploadEntries = data ? Object.entries(data.uploads).filter(([k]) => k !== "total") : [];
  const maxUpload = Math.max(1, ...uploadEntries.map(([, v]) => v));
  const providerEntries = data ? Object.entries(data.provider_mix) : [];
  const maxProvider = Math.max(1, ...providerEntries.map(([, v]) => v));

  return (
    <div className="relative min-h-screen text-white overflow-x-hidden">
      <ConstellationBackground />
      <div className="relative z-10 flex flex-col gap-6 pt-6 pb-12">
        <div className="max-w-3xl mx-auto px-4 w-full">
          <button onClick={handleBack} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-4 transition-colors">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back
          </button>

          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-bold">RAG Usage Analytics</h1>
            <button onClick={load} className="text-[11px] px-3 py-1.5 rounded-lg border transition-colors hover:bg-white/5"
              style={{ borderColor: `${ACCENT}35`, color: ACCENT }}>
              Refresh
            </button>
          </div>
          <p className="text-xs mb-6" style={{ color: "rgba(255,255,255,0.4)" }}>
            Aggregate counts only — never individual queries, filenames, or document content.
            Tracked in memory{data ? ` since ${new Date(data.since * 1000).toLocaleString()}` : ""} —
            resets whenever this demo server restarts, same as everything else here.
          </p>

          {loading && <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Loading…</p>}
          {error && (
            <div className="px-3 py-2 rounded-lg text-[11px]" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
              {error}
            </div>
          )}

          {data && !loading && (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Total Uploads" value={String(data.uploads.total ?? 0)} />
                <StatCard label="Total Queries" value={String(data.queries.count)} />
                <StatCard label="Avg Latency" value={`${data.queries.avg_latency_ms}ms`} />
                <StatCard label="Cache Hit Rate" value={`${Math.round(data.queries.cache_hit_rate * 100)}%`}
                  sub="fraction of queries answered instantly from cache" />
              </div>

              <div>
                <h2 className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Uploads by file type
                </h2>
                {uploadEntries.length === 0 ? (
                  <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>No uploads yet.</p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {uploadEntries.map(([type, count]) => (
                      <Bar key={type} label={UPLOAD_TYPE_LABEL[type] ?? type} count={count} max={maxUpload} accent={ACCENT} />
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h2 className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Provider mix (non-cached answers)
                </h2>
                {providerEntries.length === 0 ? (
                  <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>No provider-served answers yet.</p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {providerEntries.map(([provider, count]) => (
                      <Bar key={provider} label={provider} count={count} max={maxProvider} accent="#a78bfa" />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}