"use client";
import { useCallback, useEffect, useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import { StatTile, BarList, TimeSeries, RecentFeed, card } from "./Panels";
import type { BarRow, SeriesPoint, RecentRow } from "./Panels";

/** Internal click-audit dashboard (aggregate bird's-eye view).
 *
 * The forensic sibling is /audit (one actor's clicks). This is the opposite shape:
 * counts across all actors in a window — totals, top controls/paths/actors, clicks
 * over time, by country, and a recent feed. It is a thin client over the gated
 * /api/audit/stats; the data stays behind AUDIT_ADMIN_KEY on the endpoint. The key
 * is shared with /audit via the same sessionStorage slot. Not in any public nav.
 */

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

const DAY = 24 * 3600 * 1000;

function localInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Fill gaps between the first and last populated bucket with zeros, so the line
 * shows quiet stretches instead of connecting across them. */
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

export default function AuditDashboardPage() {
  const now = new Date();
  const [key, setKey] = useState("");
  const [start, setStart] = useState(localInput(new Date(now.getTime() - DAY)));
  const [end, setEnd] = useState(localInput(now));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<StatsResult | null>(null);

  useEffect(() => {
    try {
      const k = sessionStorage.getItem("_ml_audit_key");
      if (k) setKey(k);
    } catch { /* storage blocked */ }
  }, []);

  const load = useCallback(async (adminKey: string, startISO: string, endISO: string) => {
    if (!adminKey) { setError("Enter the admin key."); return; }
    try { sessionStorage.setItem("_ml_audit_key", adminKey); } catch { /* storage blocked */ }
    const widthMs = new Date(endISO).getTime() - new Date(startISO).getTime();
    const bucket = widthMs > 2 * DAY ? "day" : "hour";
    setLoading(true); setError(null);
    try {
      const qs = new URLSearchParams({ start: startISO, end: endISO, bucket });
      const res = await fetch(`/api/audit/stats?${qs.toString()}`, { headers: { "x-audit-key": adminKey } });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const map: Record<number, string> = {
          401: "Unauthorized — wrong admin key.",
          503: "Stats not configured on the server (set AUDIT_ADMIN_KEY), or the click_audit_stats function is missing — re-run supabase/click_audit.sql.",
        };
        setError(map[res.status] ?? (body.error || `Request failed (${res.status}).`));
        setData(null);
        return;
      }
      setData(body as StatsResult);
    } catch (err) {
      setError(String(err));
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
  const controlRows: BarRow[] = s ? s.top_controls.map((c) => ({ label: c.label || c.control, sub: c.label ? c.control : undefined, count: c.count })) : [];
  const pathRows: BarRow[] = s ? s.top_paths.map((p) => ({ label: p.path, count: p.count })) : [];
  const actorRows: BarRow[] = s ? s.top_actors.map((a) => ({ label: a.actor, count: a.count })) : [];
  const countryRows: BarRow[] = s ? s.by_country.map((c) => ({ label: c.country, count: c.count })) : [];

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2.5rem 1rem 4rem", color: "var(--text)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", marginBottom: "0.4rem" }}>
        <p style={{ textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 12, color: "var(--text3)", margin: 0 }}>
          Internal · Click audit · Dashboard
        </p>
        <ThemeToggle />
      </div>
      <h1 style={{ fontSize: "1.9rem", fontWeight: 700, margin: "0 0 0.4rem", color: "var(--text)" }}>Click activity overview</h1>
      <p style={{ color: "var(--text2)", margin: "0 0 1.5rem", lineHeight: 1.5 }}>
        Aggregate view of every recorded interactive click across all actors in a window. For one
        actor&apos;s row-by-row clicks, use the <a href="/audit" style={{ color: "var(--accent)" }}>lookup tool</a>.
      </p>

      <form onSubmit={submit} style={{ ...card, display: "grid", gap: "0.8rem", marginBottom: "1.25rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: "0.8rem", alignItems: "end" }}>
          <Field label="Admin key">
            <input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="AUDIT_ADMIN_KEY" autoComplete="off" style={inputStyle} />
          </Field>
          <Field label="From"><input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} style={inputStyle} /></Field>
          <Field label="To"><input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} style={inputStyle} /></Field>
          <button type="submit" disabled={loading} style={{ padding: "0.6rem 1.1rem", borderRadius: 9, border: "none", background: "var(--accent)", color: "#fff", fontWeight: 600, cursor: loading ? "wait" : "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Loading…" : "Load"}
          </button>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {[["24h", 1], ["7 days", 7], ["30 days", 30]].map(([lbl, d]) => (
            <button key={lbl} type="button" onClick={() => quickRange(d as number)} style={chip}>{lbl}</button>
          ))}
        </div>
      </form>

      {error && (
        <p role="alert" style={{ padding: "0.8rem 1rem", borderRadius: 10, background: "rgba(239,68,68,0.14)", color: "var(--text)", border: "1px solid rgba(239,68,68,0.5)" }}>{error}</p>
      )}

      {s && (
        <div style={{ display: "grid", gap: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
            <StatTile label="Total clicks" value={s.total} />
            <StatTile label="Distinct actors" value={s.actors} />
            <StatTile label="Sessions" value={s.sessions} />
            <StatTile label="Controls" value={s.controls} />
            <StatTile label="Pages" value={s.paths} />
          </div>
          <TimeSeries title={`Clicks over time (by ${data!.bucket})`} points={series} bucket={data!.bucket} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1rem" }}>
            <BarList title="Top controls" rows={controlRows} />
            <BarList title="Top pages" rows={pathRows} />
            <BarList title="Most active actors" rows={actorRows} />
            <BarList title="By country" rows={countryRows} />
          </div>
          <RecentFeed rows={s.recent} />
        </div>
      )}

      {!s && !error && !loading && (
        <p style={{ color: "var(--text3)" }}>Enter the admin key and pick a window to load the dashboard.</p>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "0.6rem 0.75rem", borderRadius: 9,
  border: "1px solid var(--border)", background: "var(--bg-glass)", color: "var(--text)", fontSize: 14,
};
const chip: React.CSSProperties = {
  padding: "0.35rem 0.8rem", borderRadius: 999, border: "1px solid var(--border2)",
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
