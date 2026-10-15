"use client";
import { useCallback, useEffect, useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import { AreaChart, Donut, type SeriesPoint } from "./charts";
import { StatCard, BarList, RecentFeed, SectionLabel, card } from "./Panels";
import type { BarRow, RecentRow } from "./Panels";

/** Internal click-audit dashboard — aggregate bird's-eye view (counts across all
 * actors in a window), the complement to the per-actor /audit lookup. Thin client
 * over the gated /api/audit/stats; data stays behind AUDIT_ADMIN_KEY on the server.
 * Fetches the current window AND the immediately-preceding equal window so every
 * KPI shows a baseline (delta vs prev). Not in any public nav. */

interface Stats {
  total: number; actors: number; sessions: number; controls: number; paths: number;
  top_controls: { control: string; label: string | null; count: number }[];
  top_paths: { path: string; count: number }[];
  top_actors: { actor: string; count: number }[];
  by_country: { country: string; count: number }[];
  series: { bucket: string; count: number }[];
  recent: RecentRow[];
}
interface StatsResult { window: { start: string; end: string }; bucket: "hour" | "day"; stats: Stats }
type Prev = { total: number; actors: number; sessions: number; controls: number; paths: number } | null;

const DAY = 24 * 3600 * 1000;
const errMap: Record<number, string> = {
  401: "Unauthorized — wrong admin key.",
  503: "Stats not configured on the server (set AUDIT_ADMIN_KEY), or the click_audit_stats function is missing — re-run supabase/click_audit.sql.",
};

function localInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Fill gaps between the first and last populated bucket with zeros. */
function densify(series: { bucket: string; count: number }[], bucket: "hour" | "day"): SeriesPoint[] {
  if (series.length === 0) return [];
  const step = bucket === "day" ? DAY : 3600 * 1000;
  const map = new Map<number, number>();
  for (const s of series) map.set(new Date(s.bucket).getTime(), s.count);
  const ts = [...map.keys()].sort((a, b) => a - b);
  const out: SeriesPoint[] = [];
  for (let t = ts[0]; t <= ts[ts.length - 1]; t += step) out.push({ t, count: map.get(t) ?? 0 });
  return out;
}

async function fetchStats(key: string, startISO: string, endISO: string): Promise<StatsResult> {
  const bucket = new Date(endISO).getTime() - new Date(startISO).getTime() > 2 * DAY ? "day" : "hour";
  const qs = new URLSearchParams({ start: startISO, end: endISO, bucket });
  const res = await fetch(`/api/audit/stats?${qs.toString()}`, { headers: { "x-audit-key": key } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(errMap[res.status] ?? (body.error || `Request failed (${res.status}).`));
  return body as StatsResult;
}

export default function AuditDashboardPage() {
  const now = new Date();
  const [key, setKey] = useState("");
  const [start, setStart] = useState(localInput(new Date(now.getTime() - DAY)));
  const [end, setEnd] = useState(localInput(now));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<StatsResult | null>(null);
  const [prev, setPrev] = useState<Prev>(null);

  useEffect(() => {
    try {
      const k = sessionStorage.getItem("_ml_audit_key");
      if (k) setKey(k);
    } catch { /* storage blocked */ }
  }, []);

  const load = useCallback(async (adminKey: string, startISO: string, endISO: string) => {
    if (!adminKey) { setError("Enter the admin key."); return; }
    try { sessionStorage.setItem("_ml_audit_key", adminKey); } catch { /* storage blocked */ }
    const width = new Date(endISO).getTime() - new Date(startISO).getTime();
    const prevStart = new Date(new Date(startISO).getTime() - width).toISOString();
    setLoading(true); setError(null);
    try {
      // Current + previous equal window in parallel, so KPIs get a baseline.
      const [cur, pre] = await Promise.all([
        fetchStats(adminKey, startISO, endISO),
        fetchStats(adminKey, prevStart, startISO).catch(() => null),
      ]);
      setData(cur);
      setPrev(pre ? { total: pre.stats.total, actors: pre.stats.actors, sessions: pre.stats.sessions, controls: pre.stats.controls, paths: pre.stats.paths } : null);
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
      setData(null); setPrev(null);
    } finally {
      setLoading(false);
    }
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    load(key, new Date(start).toISOString(), new Date(end).toISOString());
  }
  function quickRange(days: number) {
    const to = new Date();
    const from = new Date(to.getTime() - days * DAY);
    setStart(localInput(from)); setEnd(localInput(to));
    load(key, from.toISOString(), to.toISOString());
  }

  const s = data?.stats;
  const series = s ? densify(s.series, data!.bucket) : [];
  // Readable label is the hero; the full structural id moves to the hover title.
  const controlRows: BarRow[] = s ? s.top_controls.map((c) => ({ label: c.label || c.control, title: c.control, count: c.count })) : [];
  const pathRows: BarRow[] = s ? s.top_paths.map((p) => ({ label: p.path, count: p.count })) : [];
  const actorRows: BarRow[] = s ? s.top_actors.map((a) => ({ label: a.actor, count: a.count })) : [];
  const countryData = s ? s.by_country.map((c) => ({ label: c.country, count: c.count })) : [];

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "2.25rem 1rem 4rem", color: "var(--text)" }}>
      <style>{`
        .auditKpis { display:grid; gap:1rem; grid-template-columns:repeat(auto-fit,minmax(168px,1fr)); }
        .auditTrend { display:grid; gap:1rem; grid-template-columns:1fr; }
        .auditBars { display:grid; gap:1rem; grid-template-columns:1fr; }
        @media (min-width:900px){ .auditTrend{ grid-template-columns:minmax(0,2.1fr) minmax(250px,1fr); } }
        @media (min-width:720px){ .auditBars{ grid-template-columns:repeat(3,minmax(0,1fr)); } }
        @media (min-width:720px) and (max-width:1060px){ .auditBars{ grid-template-columns:repeat(2,minmax(0,1fr)); } }
      `}</style>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", marginBottom: "0.3rem" }}>
        <p style={{ textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 12, color: "var(--text3)", margin: 0 }}>Internal · Click audit · Dashboard</p>
        <ThemeToggle />
      </div>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, margin: "0 0 0.35rem", color: "var(--text)", letterSpacing: "-0.02em" }}>Click activity overview</h1>
      <p style={{ color: "var(--text2)", margin: "0 0 1.4rem", lineHeight: 1.5, maxWidth: 680 }}>
        Aggregate view of every recorded interactive click across all actors in a window. For one
        actor&apos;s row-by-row clicks, use the <a href="/audit" style={{ color: "var(--accent)" }}>lookup tool</a>.
      </p>

      <form onSubmit={submit} style={{ ...card, display: "grid", gap: "0.8rem", marginBottom: "1.4rem", position: "sticky", top: 12, zIndex: 5 }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: "0.8rem", alignItems: "end" }}>
          <Field label="Admin key"><input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="AUDIT_ADMIN_KEY" autoComplete="off" style={inputStyle} /></Field>
          <Field label="From"><input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} style={inputStyle} /></Field>
          <Field label="To"><input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} style={inputStyle} /></Field>
          <button type="submit" disabled={loading} style={{ padding: "0.6rem 1.2rem", borderRadius: 10, border: "none", background: "var(--accent)", color: "#fff", fontWeight: 600, cursor: loading ? "wait" : "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Loading…" : "Load"}
          </button>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {([["24h", 1], ["7 days", 7], ["30 days", 30]] as const).map(([lbl, d]) => (
            <button key={lbl} type="button" onClick={() => quickRange(d)} style={chip}>{lbl}</button>
          ))}
        </div>
      </form>

      {error && <p role="alert" style={{ padding: "0.8rem 1rem", borderRadius: 10, background: "rgba(239,68,68,0.14)", color: "var(--text)", border: "1px solid rgba(239,68,68,0.5)" }}>{error}</p>}

      {loading && !s && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "1rem" }}>{Array.from({ length: 5 }).map((_, i) => <div key={i} style={{ ...card, height: 110, opacity: 0.5 }} />)}</div>}

      {s && (
        <div style={{ display: "grid", gap: "1.25rem" }}>
          <section style={{ display: "grid", gap: "0.6rem" }}>
            <SectionLabel>Overview</SectionLabel>
            <div className="auditKpis">
              <StatCard label="Total clicks" value={s.total} prev={prev?.total ?? null} icon="clicks" featured spark={series} bucket={data!.bucket} />
              <StatCard label="Distinct actors" value={s.actors} prev={prev?.actors ?? null} icon="actors" />
              <StatCard label="Sessions" value={s.sessions} prev={prev?.sessions ?? null} icon="sessions" />
              <StatCard label="Controls" value={s.controls} prev={prev?.controls ?? null} icon="controls" />
              <StatCard label="Pages" value={s.paths} prev={prev?.paths ?? null} icon="pages" />
            </div>
          </section>

          <section style={{ display: "grid", gap: "0.6rem" }}>
            <SectionLabel>Trend &amp; distribution</SectionLabel>
            <div className="auditTrend">
              <div style={card}>
                <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", margin: "0 0 0.3rem" }}>Clicks over time (by {data!.bucket})</h2>
                <AreaChart points={series} bucket={data!.bucket} />
              </div>
              <div style={card}>
                <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", margin: 0 }}>By country</h2>
                <Donut rows={countryData} total={s.total} />
              </div>
            </div>
          </section>

          <section style={{ display: "grid", gap: "0.6rem" }}>
            <SectionLabel>Breakdown</SectionLabel>
            <div className="auditBars">
              <BarList title="Top controls" rows={controlRows} />
              <BarList title="Top pages" rows={pathRows} />
              <BarList title="Most active actors" rows={actorRows} />
            </div>
          </section>

          <section style={{ display: "grid", gap: "0.6rem" }}>
            <SectionLabel>Activity</SectionLabel>
            <RecentFeed rows={s.recent} />
          </section>
        </div>
      )}

      {!s && !error && !loading && <p style={{ color: "var(--text3)" }}>Enter the admin key and pick a window to load the dashboard.</p>}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "0.6rem 0.75rem", borderRadius: 9,
  border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 14,
};
const chip: React.CSSProperties = {
  padding: "0.35rem 0.85rem", borderRadius: 999, border: "1px solid var(--border2)",
  background: "var(--border)", color: "var(--text2)", fontSize: 13, cursor: "pointer",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ display: "block", fontSize: 13, color: "var(--text2)", marginBottom: 4 }}>{label}</span>
      {children}
    </label>
  );
}
