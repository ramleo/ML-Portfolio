"use client";

const A = "#10b981";

export function Sec({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-7 scroll-mt-2">
      <div className="flex items-center gap-3 mb-3.5">
        <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, transparent, ${A}33)` }}/>
        <span className="text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: A }}>{title}</span>
        <div className="h-px flex-1" style={{ background: `linear-gradient(270deg, transparent, ${A}33)` }}/>
      </div>
      {children}
    </section>
  );
}

function Feat({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex gap-3 mb-2 p-3 rounded-xl" style={{
      background: "var(--bg-glass)", borderLeft: `2px solid ${A}55`,
      border: "1px solid var(--border)", borderLeftColor: `${A}55`,
    }}>
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{
        background: "linear-gradient(135deg,rgba(16,185,129,0.15),rgba(99,102,241,0.08))",
        border: "1px solid rgba(16,185,129,0.22)",
      }}>
        <span style={{ color: A }}>{icon}</span>
      </div>
      <div>
        <p className="text-[11.5px] font-semibold text-[var(--text)] mb-0.5">{title}</p>
        <p className="text-[10.5px] text-[var(--text2)] leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

export function Chip({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] px-2 py-[3px] rounded font-mono shrink-0"
      style={{ background: `${color}12`, color, border: `1px solid ${color}28` }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }}/>
      {label}
    </span>
  );
}

export function Tag({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide shrink-0"
      style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>
      {label}
    </span>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 p-3 rounded-xl mt-2"
      style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)" }}>
      <svg width="8" height="8" viewBox="0 0 8 8" fill="none" className="shrink-0 mt-[3px]">
        <circle cx="4" cy="4" r="4" fill="#ef4444" opacity="0.85"/>
      </svg>
      {children}
    </div>
  );
}

export default function GuideSections() {
  return (
    <>
      <div className="mb-6 p-4 rounded-xl" style={{ background: `${A}08`, border: `1px solid ${A}22` }}>
        <p className="text-[11.5px] text-[var(--text2)] leading-relaxed">
          <span className="text-[var(--text)] font-semibold">Real-Time Analytics</span> tracks every event on this portfolio as it happens — page views, tool opens, and query runs — streamed live via Supabase Realtime. No refresh needed; the feed and stat cards update automatically.
        </p>
        <div className="flex items-center gap-2 mt-2.5 flex-wrap">
          <Chip color="#6366f1" label="page_view"/>
          <svg width="14" height="8" viewBox="0 0 14 8" fill="none"><path d="M1 4h10M9 2l2 2-2 2" stroke={A} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <Chip color="#10b981" label="tool_open"/>
          <svg width="14" height="8" viewBox="0 0 14 8" fill="none"><path d="M1 4h10M9 2l2 2-2 2" stroke={A} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <Chip color="#f59e0b" label="query_run"/>
        </div>
      </div>

      <Sec id="ug-range" title="Range Selector">
        <Feat icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x="1" y="2" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M1 6h12M5 1v2M9 1v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>}
          title="Presets — Today / Yesterday / 7 days / 30 days"
          desc="Click any pill to reload all panels for that window. Sparkline buckets by UTC hour for single-day views, by calendar date for multi-day views."/>
        <Feat icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x="1" y="2" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M1 6h12M5 1v2M9 1v2M4 9l2 2 4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          title="Custom Calendar"
          desc="Click Custom → a calendar popover opens. Click one date for a single day (hourly sparkline). Click a start date, hover to preview, click an end date for a multi-day range (daily sparkline). Future dates are disabled."/>
        <Feat icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M2 10h10M4 10V6l3-4 3 4v4M6 10V8h2v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          title="Export CSV"
          desc="Downloads all events for the active range (up to 5 000 rows) as CSV — id, created_at, type, path, session_id, country, duration_ms, meta. Filename includes the range and today's date."/>
      </Sec>

      <Sec id="ug-stats" title="Stat Cards">
        <div className="grid grid-cols-2 gap-2">
          {[
            { color: "#10b981", label: "Active Now", desc: "Sessions that sent an event in the last 5 min. Today only — other ranges show Unique Sessions. Sub-line shows device split, e.g. '4 desktop · 1 mobile', from page_view meta." },
            { color: "#6366f1", label: "Unique Sessions", desc: "Distinct anonymous session IDs in range. One session = one browser tab origin." },
            { color: "#f59e0b", label: "Total Events", desc: "All event records in range. Shows a ↑/↓% trend badge vs the equivalent previous period." },
            { color: "#14b8a6", label: "Avg Duration", desc: "Mean time in a tool from tool_close events. Sub-line shows avg queries per session, e.g. '3.2 queries/session', from tool_close meta. Shows — until events exist in range." },
            { color: "#ef4444", label: "Bounce Rate", desc: "Sessions with exactly 1 event. Lower is better. Sub-line shows bounced / total sessions and returning visitor %, e.g. '25% returning', based on sessions seen before in localStorage." },
            { color: "#8b5cf6", label: "Query Success", desc: "% of query_run events with success: true. Sub-line shows avg query length, e.g. 'avg 45ch', from query_run meta. Only Text-to-SQL fires these. Shows — if none in range." },
          ].map(({ color, label, desc }) => (
            <div key={label} className="p-3 rounded-xl" style={{
              background: "var(--bg-glass)", border: "1px solid var(--border)",
              borderLeft: `2px solid ${color}`,
            }}>
              <Tag color={color} label={label}/>
              <p className="text-[10px] text-[var(--text3)] leading-relaxed mt-1.5">{desc}</p>
            </div>
          ))}
        </div>
      </Sec>

      <Sec id="ug-sparkline" title="Events Sparkline">
        <Feat icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M1 10l3-4 3 2 3-5 3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          title="Area chart with hover tooltip"
          desc="Event volume over time. Hover any point for exact bucket + count. Buckets by UTC hour for single-day; by calendar date for multi-day ranges."/>
        <Feat icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 1v2M7 11v2M1 7h2M11 7h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.3"/></svg>}
          title="Peak hour badge"
          desc="Green pill showing the busiest hour across the last 7 days (e.g. Peak 14:00–15:00). Always based on the trailing 7-day window, independent of the range selector."/>
        <Note>
          <div>
            <p className="text-[11px] font-semibold text-red-400 mb-0.5">Anomaly marker</p>
            <p className="text-[10.5px] text-[var(--text2)] leading-relaxed">A red dot when a bucket exceeds <span className="text-[var(--text)]">mean + 2σ</span> of all buckets. Signals an unusual spike — check the Live Feed around that time.</p>
          </div>
        </Note>
      </Sec>

      <Sec id="ug-funnel" title="Conversion Funnel">
        <p className="text-[10.5px] text-[var(--text3)] leading-relaxed mb-3">How many visitors moved through each stage. % next to each bar is conversion from the previous stage.</p>
        <div className="space-y-2">
          {[
            { color: "#6366f1", label: "page_view", desc: "Visitor landed on a page." },
            { color: "#10b981", label: "tool_open", desc: "Visitor navigated into a tool." },
            { color: "#f59e0b", label: "query_run", desc: "Visitor ran a SQL query in Text-to-SQL. Does not fire for ML tools." },
          ].map(({ color, label, desc }) => (
            <div key={label} className="flex gap-3 items-center p-2.5 rounded-lg" style={{ background: "var(--bg-glass)", border: "1px solid var(--border)" }}>
              <Chip color={color} label={label}/>
              <p className="text-[10.5px] text-[var(--text2)]">{desc}</p>
            </div>
          ))}
        </div>
        <p className="text-[9.5px] text-[var(--text3)] mt-2 leading-relaxed">Low page_view → tool_open = visitors don&apos;t explore. Low tool_open → query_run = visitors open but don&apos;t use.</p>
      </Sec>

      <Sec id="ug-geo" title="Visitors by Country">
        <Feat icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3"/><path d="M7 1.5C7 1.5 5 4 5 7s2 5.5 2 5.5M7 1.5C7 1.5 9 4 9 7s-2 5.5-2 5.5M1.5 7h11" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/></svg>}
          title="Equirectangular dot map"
          desc="Circles at each country's centroid — radius scales with event count. Hover any circle for country code + exact count. Countries not in the centroid table are silently omitted."/>
      </Sec>

      <Sec id="ug-heatmap" title="Activity Heatmap">
        <Feat icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.3"/><rect x="5.5" y="1" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.85"/><rect x="1" y="5.5" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.55"/><rect x="5.5" y="5.5" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.12"/><rect x="1" y="10" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.4"/><rect x="5.5" y="10" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.95"/></svg>}
          title="7 × 24 grid — day vs UTC hour"
          desc="Fixed to the last 7 days (rows = Sun–Sat, columns = 0–23 h). Cell intensity = event count. Hover any cell for the exact count. Hidden when there is no data."/>
      </Sec>

      <Sec id="ug-hf-tools" title="HF Space Tools">
        <Feat icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x="1" y="3" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M4 1v2M10 1v2M1 7h12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>}
          title="ML Unified API activity"
          desc="Shows tool_open events tracked from the HF Space backend (ml-unified). Each card displays the tool name, total event count, and a proportional activity bar. Only tools with at least one event in the selected range appear."/>
        <Feat icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3"/><path d="M7 4.5v3l2 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          title="Page-Copy-Open counts"
          desc="Sub-line under each tool shows page views, copy events (sql_copy), and tool opens separately — so you can see whether visitors viewed a tool page without opening it."/>
      </Sec>

      <Sec id="ug-portfolio-tools" title="Portfolio Tools">
        <Feat icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M2 4h10M2 7h7M2 10h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>}
          title="Per-tool event cards on the portfolio"
          desc="Shows tool_open events fired from the Vercel-hosted portfolio (ml-portfolio-rho.vercel.app). Covers AutoML, Text-to-SQL, SHAP, Feature Engineering, Drift, Ensemble, Pipeline Builder, Pipeline Cinema, Preprocessing, Optuna, and Document Intelligence. Hidden when no tool events exist."/>
        <p className="text-[9.5px] text-[var(--text3)] mt-2 leading-relaxed">HF Space Tools and Portfolio Tools are separate sections because they run on different origins — session IDs do not overlap between them.</p>
      </Sec>

      <Sec id="ug-tools" title="Tool Usage Comparison">
        <Feat icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M2 10h4M2 7h7M2 4h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>}
          title="Side-by-side bars per tool"
          desc="Filters top pages to /tools/* paths and renders each as a proportional bar with its own color. Up to 6 tools. Hidden when no tool-path events exist in the selected range."/>
      </Sec>

      <Sec id="ug-qsr" title="Query Success by Tool">
        <Feat icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M2 11h10M2 8h7M2 5h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>}
          title="Per-tool SQL success rate"
          desc="Bar color: green ≥ 90%, amber 70–89%, red < 70%. Each row shows success / total count. Hidden when no query_run events exist in range."/>
      </Sec>

      <Sec id="ug-provider" title="AI Provider Usage">
        <p className="text-[10.5px] text-[var(--text3)] leading-relaxed mb-3">
          Always-visible horizontal bar chart showing total query counts broken down by the AI provider that handled each request. Appears directly after the Query Success by Tool panel.
        </p>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { color: "#f97316", label: "Groq", desc: "Fast inference via Groq Cloud." },
            { color: "#6366f1", label: "OpenAI", desc: "GPT-series models via OpenAI API." },
            { color: "#8b5cf6", label: "Anthropic", desc: "Claude models via Anthropic API." },
          ].map(({ color, label, desc }) => (
            <div key={label} className="p-2.5 rounded-xl" style={{ background: "var(--bg-glass)", border: "1px solid var(--border)" }}>
              <Tag color={color} label={label}/>
              <p className="text-[9.5px] text-[var(--text3)] leading-relaxed mt-1.5">{desc}</p>
            </div>
          ))}
        </div>
        <Feat icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M2 10h10M2 7h7M2 4h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>}
          title="By Provider — bar length = query share"
          desc="Each bar is proportional to that provider's share of all query_run events in the active range. Provider is read from meta.provider on each query_run event. Hidden when no query_run events exist."/>
        <Feat icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M2 10h10M2 7h8M2 4h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>}
          title="By Model — specific model breakdown"
          desc="Second chart below the provider bars. Shows the exact model name used (e.g. llama-3.3-70b-versatile, gemini-2.0-flash, command-r-plus) from meta.model on each query_run event. Useful for tracking which models handle the most load."/>
      </Sec>

      <Sec id="ug-engage" title="Engagement Metrics">
        <p className="text-[10.5px] text-[var(--text3)] leading-relaxed mb-3">
          Three-column row of engagement cards, each counting a specific interaction type across the active range.
        </p>
        <div className="grid grid-cols-3 gap-2 mb-2">
          {[
            { color: "#ef4444", label: "Error Rate", desc: "% of query_run events where success was false. Sub-line shows the raw failed / total count." },
            { color: "#14b8a6", label: "SQL Copies", desc: "Number of copy-to-clipboard events fired from the Text-to-SQL tool. Tracked as a copy_sql event type." },
            { color: "#10b981", label: "CSV Exports", desc: "Number of times the Export CSV button on this dashboard was clicked. Tracked as a csv_export event." },
          ].map(({ color, label, desc }) => (
            <div key={label} className="p-3 rounded-xl" style={{
              background: "var(--bg-glass)", border: "1px solid var(--border)",
              borderLeft: `2px solid ${color}`,
            }}>
              <Tag color={color} label={label}/>
              <p className="text-[10px] text-[var(--text3)] leading-relaxed mt-1.5">{desc}</p>
            </div>
          ))}
        </div>
        <p className="text-[9.5px] text-[var(--text3)] mt-2 leading-relaxed">High error rate paired with high SQL copies suggests users are correcting output manually. High CSV exports relative to query_run counts indicates the data is being used downstream.</p>
      </Sec>

      <Sec id="ug-pages" title="Top Pages">
        <Feat icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M4 5h6M4 7.5h4M4 10h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>}
          title="Event count per page path"
          desc="All event types counted per path — not just page_view. High count + few query_run = visitors visit but don't engage deeply."/>
      </Sec>

      <Sec id="ug-refs" title="Top Referrers">
        <Feat icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M9 2l3 3-3 3M12 5H5a3 3 0 000 6h1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          title="Where traffic came from"
          desc="Grouped by hostname + path (page-level granularity). Query parameters stripped so UTM-tagged URLs don't fragment grouping."/>
        <div className="space-y-1.5 mt-1">
          {[
            { ref: "vercel.com/…", note: "You clicking Visit in the Vercel dashboard — your own traffic" },
            { ref: "ml-portfolio-rho.vercel.app/…", note: "In-app navigation between pages" },
            { ref: "github.com/…", note: "Traffic from a GitHub readme or profile link" },
            { ref: "(empty)", note: "Direct — typed URL, bookmark, or referrer blocked by browser" },
          ].map(({ ref, note }) => (
            <div key={ref} className="flex gap-3 items-start p-2.5 rounded-lg" style={{ background: "var(--bg-glass)", border: "1px solid var(--border)" }}>
              <code className="text-[9.5px] text-indigo-400 shrink-0 mt-0.5 font-mono whitespace-nowrap">{ref}</code>
              <p className="text-[10px] text-[var(--text3)] leading-relaxed">{note}</p>
            </div>
          ))}
        </div>
      </Sec>

      <Sec id="ug-types" title="Events by Type">
        <p className="text-[10.5px] text-[var(--text3)] leading-relaxed mb-3">Donut showing event type mix. Four types tracked:</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { color: "#6366f1", type: "page_view", when: "On app / page load", data: "path, referrer, session_id, meta.device" },
            { color: "#10b981", type: "tool_open", when: "User selects a tool", data: "meta.tool" },
            { color: "#f59e0b", type: "query_run", when: "SQL query in Text-to-SQL only", data: "meta.success, meta.rows, meta.provider, meta.query_length, duration_ms" },
            { color: "#8b5cf6", type: "tool_close", when: "User navigates away from a tool", data: "duration_ms, meta.tool, meta.queries_run" },
          ].map(({ color, type, when, data }) => (
            <div key={type} className="p-3 rounded-xl" style={{ background: "var(--bg-glass)", border: "1px solid var(--border)" }}>
              <Chip color={color} label={type}/>
              <p className="text-[10px] text-[var(--text2)] mt-2 leading-snug">{when}</p>
              <p className="text-[9px] text-[var(--text3)] mt-1 font-mono">{data}</p>
            </div>
          ))}
        </div>
      </Sec>

      <Sec id="ug-device" title="Visitors by Device">
        <Feat icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x="1" y="3" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="1.3"/><path d="M9 5h3a1 1 0 011 1v2a1 1 0 01-1 1h-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><path d="M5 9v2M3 11h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>}
          title="Desktop / Mobile / Tablet split"
          desc="Donut chart showing the device type breakdown from meta.device on page_view events. Device is detected from the user agent at track time. Hidden when no page_view events with device data exist in range."/>
      </Sec>

      <Sec id="ug-feed" title="Live Feed">
        <p className="text-[10.5px] text-[var(--text3)] leading-relaxed mb-3">
          Every event arrives instantly via WebSocket. Last 50 events. Each row has a type-colored 3 px left strip, type badge, dimmed <code className="text-indigo-300 text-[9.5px]">/tools/</code> prefix, country chip, session ID, and time ago. <code className="text-purple-400 text-[9.5px]">tool_close</code> rows show a duration chip.
        </p>
        <Feat icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M1 4h12M1 7h8M1 10h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>}
          title="Type + Country filters"
          desc="Filter pills appear when the feed has more than one type or country. Click a pill to narrow; click again or All to clear. Client-side — instant, no network request."/>
        <Feat icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x="1" y="3" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M4 6.5h6M4 9h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>}
          title="Event Detail Drawer — click row to expand"
          desc="Click any row (not the session ID or trace button) to expand an inline detail panel: full timestamp, referrer, duration_ms, and all meta fields (query_length, provider, success, rows, queries_run, device). Click again to collapse. Only one row expands at a time."/>
        <Feat icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3"/><path d="M4.5 7h5M7 4.5v5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>}
          title="Session ID — click to trace"
          desc="The 8-char hex is the first 8 chars of the anonymous session ID. Click it (or the hover trace button) to open the Session Trace drawer."/>
        <Feat icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 1v3M7 10v3M1 7h3M10 7h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.3"/></svg>}
          title="Auto-refresh (Today only)"
          desc="Stat cards and charts re-fetch every 60 seconds while on the Today range. The live feed always updates instantly via WebSocket regardless of range."/>
      </Sec>

      <Sec id="ug-session" title="Session Trace">
        <Feat icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M10 1h2a1 1 0 011 1v10a1 1 0 01-1 1H2a1 1 0 01-1-1V2a1 1 0 011-1h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><path d="M4 7h6M4 4.5h4M4 9.5h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>}
          title="Opening a trace"
          desc="Click a session ID in the Live Feed → a 320 px drawer slides in from the right. Click outside or × to close."/>
        <Feat icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M2 4h10M4 7h6M5 10h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>}
          title="Time per Tool — horizontal bars"
          desc="Tools visited ordered by time spent, as proportional bars with name, share %, and formatted duration. Populated only when tool_close events with duration_ms exist."/>
        <Feat icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="4" cy="4" r="1.5" stroke="currentColor" strokeWidth="1.2"/><circle cx="4" cy="10" r="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M4 5.5v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><path d="M7 4h4M7 10h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>}
          title="Event Path — vertical timeline"
          desc="All events in chronological order with color-coded dots, event type, duration chip (tool_close), tool name, and timestamp."/>
        <div className="space-y-1.5 mt-2">
          {[
            { p: "page_view ×5 on same path", m: "Repeated refreshes — possible loading issue or confusion" },
            { p: "tool_open, no query_run", m: "Opened a tool but didn't use it — drop-off point" },
            { p: "page_view → tool_open → query_run", m: "Ideal path — discovered and used a tool end-to-end" },
            { p: "query_run on multiple tools", m: "Power user — explored several tools in one session" },
          ].map(({ p, m }) => (
            <div key={p} className="flex gap-2.5 p-2.5 rounded-lg" style={{ background: "var(--bg-glass)", border: "1px solid var(--border)" }}>
              <div className="w-1 h-1 rounded-full mt-[5px] shrink-0" style={{ background: A }}/>
              <div>
                <p className="text-[10.5px] font-semibold text-[var(--text)]">{p}</p>
                <p className="text-[9.5px] text-[var(--text3)] mt-0.5">{m}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-start gap-2 p-3 rounded-xl mt-3" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.18)" }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0 mt-0.5">
            <path d="M6 1l5 9H1L6 1z" stroke="#f59e0b" strokeWidth="1.2" strokeLinejoin="round"/>
            <path d="M6 5v2.5M6 9v.3" stroke="#f59e0b" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          <p className="text-[10px] text-amber-300/80 leading-relaxed"><span className="font-semibold">Session IDs are origin-scoped.</span> ML Unified (HF Space) and this portfolio (Vercel) are different origins — a visitor using both will have separate session IDs even in the same browser.</p>
        </div>
      </Sec>
    </>
  );
}