// Generates a markdown report from analytics dashboard stats

interface ReportStats {
  active_now?: number;
  today_count?: number;
  avg_session_duration_ms?: number | null;
  bounce_rate?: number | null;
  query_success_rate?: number | null;
  query_success_count?: number;
  query_total_count?: number;
  error_count?: number;
  funnel?: { page_view: number; tool_open: number; query_run: number };
  top_pages?: { path: string; count: number }[];
  top_countries?: { country: string; count: number }[];
  top_referrers?: { referrer: string; count: number }[];
  provider_breakdown?: { provider: string; count: number }[];
  model_breakdown?: { model: string; count: number }[];
  hf_tools?: Record<string, Record<string, number>>;
  portfolio_tools?: Record<string, Record<string, number>>;
  peak_hour?: number | null;
  returning_pct?: number | null;
  avg_queries_per_session?: number | null;
  by_type?: { type: string; count: number }[];
}

function fmtDur(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.round((ms % 60_000) / 1000);
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export function generateMarkdownReport(stats: ReportStats, rangeLabel: string): string {
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  const lines: string[] = [];

  lines.push(`# Analytics Report — ${rangeLabel}`);
  lines.push(`_Generated: ${now} UTC_`);
  lines.push("");

  // Summary
  lines.push("## Summary");
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Total Events | ${(stats.today_count ?? 0).toLocaleString()} |`);
  lines.push(`| Active Now | ${stats.active_now ?? 0} users |`);
  if (stats.avg_session_duration_ms != null)
    lines.push(`| Avg Session Duration | ${fmtDur(stats.avg_session_duration_ms)} |`);
  if (stats.bounce_rate != null)
    lines.push(`| Bounce Rate | ${stats.bounce_rate}% |`);
  if (stats.query_success_rate != null)
    lines.push(`| Query Success Rate | ${stats.query_success_rate}% (${stats.query_success_count ?? 0}/${stats.query_total_count ?? 0}) |`);
  if (stats.error_count)
    lines.push(`| Errors | ${stats.error_count} |`);
  if (stats.peak_hour != null)
    lines.push(`| Peak Hour | ${stats.peak_hour}:00–${(stats.peak_hour + 1) % 24}:00 |`);
  if (stats.returning_pct != null)
    lines.push(`| Returning Users | ${stats.returning_pct}% |`);
  if (stats.avg_queries_per_session != null)
    lines.push(`| Avg Queries / Session | ${stats.avg_queries_per_session} |`);
  lines.push("");

  // Funnel
  if (stats.funnel) {
    const f = stats.funnel;
    const toolConv = f.page_view > 0 ? Math.round((f.tool_open / f.page_view) * 100) : 0;
    const queryConv = f.tool_open > 0 ? Math.round((f.query_run / f.tool_open) * 100) : 0;
    lines.push("## Conversion Funnel");
    lines.push(`| Stage | Count | Conversion |`);
    lines.push(`|-------|-------|------------|`);
    lines.push(`| Page Views | ${f.page_view.toLocaleString()} | — |`);
    lines.push(`| Tool Opens | ${f.tool_open.toLocaleString()} | ${toolConv}% of page views |`);
    lines.push(`| Query Runs | ${f.query_run.toLocaleString()} | ${queryConv}% of tool opens |`);
    lines.push("");
  }

  // Top pages
  if ((stats.top_pages ?? []).length > 0) {
    lines.push("## Top Pages");
    stats.top_pages!.slice(0, 10).forEach((p, i) => {
      lines.push(`${i + 1}. \`${p.path}\` — ${p.count.toLocaleString()} events`);
    });
    lines.push("");
  }

  // HF Space Tools
  const hf = stats.hf_tools ?? {};
  const hfToolNames: Record<string, string> = { "ml-unified": "ML Unified", eda: "EDA Explorer", vision: "ML Vision" };
  if (Object.keys(hf).length > 0) {
    lines.push("## HF Space Tools");
    for (const [tool, actions] of Object.entries(hf)) {
      const total = Object.values(actions).reduce((s, n) => s + n, 0);
      if (total === 0) continue;
      lines.push(`### ${hfToolNames[tool] ?? tool} (${total.toLocaleString()} events)`);
      for (const [action, count] of Object.entries(actions).sort(([, a], [, b]) => b - a)) {
        const pct = Math.round((count / total) * 100);
        lines.push(`- ${action}: ${count} (${pct}%)`);
      }
      lines.push("");
    }
  }

  // Portfolio Tools
  const pt = stats.portfolio_tools ?? {};
  if (Object.keys(pt).length > 0) {
    lines.push("## Portfolio Tools");
    for (const [tool, actions] of Object.entries(pt)) {
      const total = Object.values(actions).reduce((s, n) => s + n, 0);
      if (total === 0) continue;
      const meaningful = Object.entries(actions).filter(([a]) => a !== "other").sort(([, a], [, b]) => b - a);
      lines.push(`### ${tool} (${total.toLocaleString()} events)`);
      for (const [action, count] of meaningful) {
        const pct = Math.round((count / total) * 100);
        lines.push(`- ${action}: ${count} (${pct}%)`);
      }
      lines.push("");
    }
  }

  // AI model usage
  if ((stats.provider_breakdown ?? []).length > 0) {
    lines.push("## AI Model Usage");
    lines.push("**By Provider**");
    stats.provider_breakdown!.forEach(p => lines.push(`- ${p.provider}: ${p.count}`));
    lines.push("");
    if ((stats.model_breakdown ?? []).length > 0) {
      lines.push("**By Model**");
      stats.model_breakdown!.forEach(m => lines.push(`- ${m.model}: ${m.count}`));
      lines.push("");
    }
  }

  // Countries
  if ((stats.top_countries ?? []).length > 0) {
    lines.push("## Top Countries");
    stats.top_countries!.slice(0, 8).forEach(c => lines.push(`- ${c.country}: ${c.count}`));
    lines.push("");
  }

  lines.push("---");
  lines.push("_Report generated by ML Portfolio Real-Time Analytics Dashboard_");

  return lines.join("\n");
}