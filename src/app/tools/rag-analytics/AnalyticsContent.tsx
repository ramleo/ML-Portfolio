"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Database, MessageSquare, RefreshCw, Upload, Zap } from "lucide-react";
import { ML_UNIFIED_API } from "@/config/urls";
import StatCard from "./StatCard";
import ProviderDonut from "./ProviderDonut";
import UploadTypeBars from "./UploadTypeBars";
import AnalyticsSkeleton from "./AnalyticsSkeleton";
import { trackedFetch } from "@/lib/trackedFetch";

type Analytics = {
  since: number;
  uploads: Record<string, number>;
  queries: { count: number; avg_latency_ms: number; cache_hit_rate: number };
  provider_mix: Record<string, number>;
};

const panelStyle: React.CSSProperties = {
  background: "var(--bg-glass)", border: "1px solid var(--border)",
};

/** The dashboard body only — no page chrome (back button, background) — so
 * it can be reused both as the standalone /tools/rag-analytics route and
 * inside an in-page modal (the multimodal-rag tool's "Usage stats" button
 * uses the modal path specifically to avoid navigating away from, and
 * losing, that page's in-progress upload/chat session). */
export default function AnalyticsContent() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    trackedFetch(`${ML_UNIFIED_API}/rag/analytics`, undefined, { tool: "rag-analytics" })
      .then(r => r.json())
      .then(setData)
      .catch(() => setError("Couldn't load analytics — the backend may be starting up."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const uploadsExclTotal = data
    ? Object.fromEntries(Object.entries(data.uploads).filter(([k]) => k !== "total"))
    : {};

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: "var(--text3)" }}>
          Aggregate counts only — never individual queries, filenames, or document content.
          Tracked in memory{data ? ` since ${new Date(data.since * 1000).toLocaleString()}` : ""} —
          resets whenever this demo server restarts, same as everything else here.
        </p>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border transition-colors hover:bg-[rgba(var(--fg-rgb),0.05)] shrink-0 ml-3"
          style={{ borderColor: "#38bdf850", color: "#38bdf8" }}>
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="px-3 py-2 rounded-lg text-[11px]"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
          {error}
        </div>
      )}

      {loading && !data && <AnalyticsSkeleton />}

      {data && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard icon={Upload} label="Total Uploads" value={data.uploads.total ?? 0} accent="#38bdf8" index={0} />
            <StatCard icon={MessageSquare} label="Total Queries" value={data.queries.count} accent="#a78bfa" index={1} />
            <StatCard icon={Zap} label="Avg Latency" value={data.queries.avg_latency_ms} suffix="ms" accent="#fbbf24" index={2} />
            <StatCard icon={Database} label="Cache Hit Rate" value={data.queries.cache_hit_rate * 100} suffix="%"
              sub="answered instantly from cache" accent="#34d399" index={3} />
          </div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.32, duration: 0.5 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl p-4" style={panelStyle}>
              <h2 className="text-[10px] font-bold uppercase tracking-wide mb-3" style={{ color: "var(--text3)" }}>
                Provider mix (non-cached answers)
              </h2>
              <ProviderDonut data={data.provider_mix} />
            </div>
            <div className="rounded-2xl p-4" style={panelStyle}>
              <h2 className="text-[10px] font-bold uppercase tracking-wide mb-3" style={{ color: "var(--text3)" }}>
                Uploads by file type
              </h2>
              <UploadTypeBars data={uploadsExclTotal} />
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}