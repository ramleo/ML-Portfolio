"use client";

const ACCENT = "#10b981";

interface Props { onClose: () => void; }

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-[13px] font-bold text-white mb-3 flex items-center gap-2">
        <div className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
        {title}
      </h2>
      {children}
    </section>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex gap-3 mb-3">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
        <span style={{ color: ACCENT }}>{icon}</span>
      </div>
      <div>
        <p className="text-[12px] font-semibold text-white/90 mb-0.5">{title}</p>
        <p className="text-[11px] text-gray-400 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function Tag({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide shrink-0"
      style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>
      {label}
    </span>
  );
}

function EventChip({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded font-mono"
      style={{ background: `${color}12`, color, border: `1px solid ${color}28` }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }}/>
      {label}
    </span>
  );
}

export default function AnalyticsUserGuide({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto py-8 px-4"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 shadow-2xl" style={{ background: "#0d0d1a" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 sticky top-0 rounded-t-2xl z-10"
          style={{ background: "#0d0d1a" }}>
          <div>
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6.5" stroke={ACCENT} strokeWidth="1.3"/>
                <path d="M8 11V7.5M8 5.5v-.5" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <h1 className="text-[15px] font-bold text-white">Real-Time Analytics — User Guide</h1>
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5 ml-6">How to read the dashboard, use the range picker, and trace sessions</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-1.5 rounded-lg hover:bg-white/8 transition-all">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6">

          {/* Intro */}
          <div className="mb-6 p-4 rounded-xl border border-emerald-500/20" style={{ background: "rgba(16,185,129,0.05)" }}>
            <p className="text-[12px] text-gray-300 leading-relaxed">
              <span className="text-white font-semibold">Real-Time Analytics</span> tracks every event on this portfolio as it happens — page views, tool opens, and query runs — streamed live via Supabase Realtime. No refresh needed; the feed and stat cards update automatically.
            </p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <EventChip color="#6366f1" label="page_view"/>
              <svg width="14" height="8" viewBox="0 0 14 8" fill="none"><path d="M1 4h10M9 2l2 2-2 2" stroke={ACCENT} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <EventChip color="#10b981" label="tool_open"/>
              <svg width="14" height="8" viewBox="0 0 14 8" fill="none"><path d="M1 4h10M9 2l2 2-2 2" stroke={ACCENT} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <EventChip color="#f59e0b" label="query_run"/>
            </div>
          </div>

          {/* Range Selector */}
          <Section title="Range Selector">
            <Feature
              icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x="1" y="2" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M1 6h12M5 1v2M9 1v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>}
              title="Presets — Today / Yesterday / 7 days / 30 days"
              desc="Click any pill to reload all panels for that window. Sparkline buckets by UTC hour for single-day views, by calendar date for multi-day views."
            />
            <Feature
              icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x="1" y="2" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M1 6h12M5 1v2M9 1v2M4 9l2 2 4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              title="Custom Calendar"
              desc="Click Custom → a calendar popover opens. Click one date for a single day (hourly sparkline). Click a start date, hover to preview the range, click an end date for a multi-day range (daily sparkline). Future dates are disabled."
            />
            <Feature
              icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M2 10h10M4 10V6l3-4 3 4v4M6 10V8h2v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              title="Export CSV"
              desc="Downloads all events for the active range (up to 5 000 rows) as a CSV file with columns: id, created_at, type, path, session_id, country, duration_ms, meta. Filename includes the range and today's date. Useful for offline analysis in Excel or Pandas."
            />
          </Section>

          {/* Stat Cards */}
          <Section title="Stat Cards">
            <div className="space-y-2 mb-2">
              {[
                { tag: "#10b981", label: "Active Now", desc: "Sessions that sent an event in the last 5 minutes. Today range only — switches to Unique Sessions for all other ranges." },
                { tag: "#6366f1", label: "Unique Sessions", desc: "Distinct anonymous session IDs in the selected range. One session = one browser. Shown for Yesterday, 7 days, 30 days, and Custom." },
                { tag: "#f59e0b", label: "Total Events", desc: "Count of all event records in the selected range. Shows a ↑/↓% trend badge comparing against the equivalent previous period (e.g. yesterday when viewing Today)." },
                { tag: "#14b8a6", label: "Avg Duration", desc: "Average time a visitor spent in a tool before navigating away — computed from tool_close events which carry a duration_ms field. Shows — until tool_close events are collected in the range." },
                { tag: "#ef4444", label: "Bounce Rate", desc: "Percentage of sessions that produced exactly 1 event — the visitor loaded a page and left without any further interaction. Lower is better. Sub-line shows bounced / total sessions." },
                { tag: "#8b5cf6", label: "Query Success", desc: "Percentage of query_run events where success: true was recorded. Only the Text-to-SQL tool fires query_run events — visiting Preprocessing, Feature Engineering, or other ML tools does not count. Shows — if no SQL queries have been run yet in the range." },
              ].map(({ tag, label, desc }) => (
                <div key={label} className="flex gap-3 items-start p-3 rounded-lg border border-white/6" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <Tag color={tag} label={label}/>
                  <p className="text-[11px] text-gray-400 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* Sparkline */}
          <Section title="Events Sparkline">
            <Feature
              icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M1 10l3-4 3 2 3-5 3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              title="Area chart"
              desc="Shows event volume over time. Buckets by UTC hour for Today / Yesterday / single custom day. Buckets by calendar date for 7 days / 30 days / multi-day custom range. Hover any point to see the exact bucket label and count in a tooltip."
            />
            <Feature
              icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 1v2M7 11v2M1 7h2M11 7h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.3"/></svg>}
              title="Peak hour badge"
              desc="A green pill in the top-right of the sparkline card shows the single busiest hour across the last 7 days (e.g. Peak 14:00–15:00). Computed independently of the range selector — always based on the trailing 7-day window."
            />
            <div className="flex items-start gap-2 p-3 rounded-lg border mt-1"
              style={{ background: "rgba(239,68,68,0.06)", borderColor: "rgba(239,68,68,0.2)" }}>
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none" className="shrink-0 mt-1"><circle cx="4" cy="4" r="4" fill="#ef4444" opacity="0.85"/></svg>
              <div>
                <p className="text-[11px] font-semibold text-red-400 mb-0.5">Anomaly marker</p>
                <p className="text-[11px] text-gray-400 leading-relaxed">A red dot appears when a bucket&apos;s count exceeds <span className="text-white/70">mean + 2 standard deviations</span> of all buckets in the range. Signals a statistically unusual spike — check the Live Feed around that time to see what event types caused it.</p>
              </div>
            </div>
          </Section>

          {/* Funnel */}
          <Section title="Conversion Funnel">
            <p className="text-[11px] text-gray-400 leading-relaxed mb-3">
              Shows how many visitors moved through each stage in the selected range. The percentage next to each bar is conversion from the previous stage.
            </p>
            <div className="space-y-2">
              {[
                { color: "#6366f1", label: "page_view", desc: "Visitor landed on a page." },
                { color: "#10b981", label: "tool_open", desc: "Visitor navigated into a tool." },
                { color: "#f59e0b", label: "query_run", desc: "Visitor submitted a SQL question in Text-to-SQL. This event does not fire for ML tools like Preprocessing, Feature Engineering, or Feature Selection." },
              ].map(({ color, label, desc }) => (
                <div key={label} className="flex gap-3 items-center p-2.5 rounded-lg border border-white/5" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <EventChip color={color} label={label}/>
                  <p className="text-[11px] text-gray-400">{desc}</p>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-gray-600 mt-2 leading-relaxed">Low page_view → tool_open = visitors land but don&apos;t explore. Low tool_open → query_run = visitors open tools but don&apos;t use them.</p>
          </Section>

          {/* Per-Tool Success Rate */}
          {/* Visitors by Country */}
          <Section title="Visitors by Country">
            <Feature
              icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3"/><path d="M7 1.5C7 1.5 5 4 5 7s2 5.5 2 5.5M7 1.5C7 1.5 9 4 9 7s-2 5.5-2 5.5M1.5 7h11" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/></svg>}
              title="Equirectangular dot map"
              desc="Circles are plotted at each country's geographic centroid. Radius scales with event count — bigger dot = more traffic. Hover any circle to see the country code and exact count. Countries not in the known centroid list are silently omitted."
            />
          </Section>

          {/* Activity Heatmap */}
          <Section title="Activity Heatmap">
            <Feature
              icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.3"/><rect x="5.5" y="1" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.8"/><rect x="1" y="5.5" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.6"/><rect x="5.5" y="5.5" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.15"/><rect x="1" y="10" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.4"/><rect x="5.5" y="10" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.95"/></svg>}
              title="7 × 24 grid — day vs hour"
              desc="Fixed to the last 7 days regardless of the range selector. Rows are days of the week (Sun–Sat), columns are UTC hours (0–23). Cell intensity is proportional to event count — darker green = more events. Hover any cell for the exact count. Hidden when there is no data."
            />
          </Section>

          {/* Tool Usage Comparison */}
          <Section title="Tool Usage Comparison">
            <Feature
              icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M2 10h4M2 7h7M2 4h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>}
              title="Side-by-side bar chart per tool"
              desc="Filters top pages to only /tools/* paths and shows each tool as a proportional horizontal bar with its own color. Compares which tool gets the most engagement in the selected range. Hidden when no tool-path events exist."
            />
          </Section>

          <Section title="Query Success by Tool">
            <Feature
              icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M2 11h10M2 8h7M2 5h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>}
              title="Per-tool breakdown of SQL success rate"
              desc="Horizontal bar chart showing the query success rate for each tool that has fired query_run events. Bar color is green (≥ 90%), amber (70–89%), or red (< 70%). Each row also shows the raw count (success / total). The section is hidden entirely when no query_run events exist in the selected range."
            />
          </Section>

          {/* Top Pages */}
          <Section title="Top Pages">
            <Feature
              icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M4 5h6M4 7.5h4M4 10h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>}
              title="Event count per page path"
              desc="Pages ranked by total event count in the range — includes all event types on that path, not just page views. A page with high count but few query_run events in the funnel means visitors visit but don't engage deeply."
            />
          </Section>

          {/* Top Referrers */}
          <Section title="Top Referrers">
            <Feature
              icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M9 2l3 3-3 3M12 5H5a3 3 0 000 6h1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              title="Where traffic came from"
              desc="Grouped by hostname + path — giving page-level granularity. Query parameters are stripped so UTM-tagged URLs don't fragment the grouping."
            />
            <div className="space-y-1.5 mt-1">
              {[
                { ref: "vercel.com/…", note: "You clicking Visit from the Vercel deployment dashboard — your own traffic" },
                { ref: "ml-portfolio-rho.vercel.app/…", note: "In-app navigation — visitor moved from one page to another within the portfolio" },
                { ref: "github.com/…", note: "Traffic from a GitHub readme, profile, or repo link" },
                { ref: "(empty)", note: "Direct — typed URL, bookmark, or referrer header blocked by browser" },
              ].map(({ ref, note }) => (
                <div key={ref} className="flex gap-3 items-start p-2.5 rounded-lg border border-white/5" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <code className="text-[10px] text-indigo-400 shrink-0 mt-0.5 font-mono whitespace-nowrap">{ref}</code>
                  <p className="text-[10px] text-gray-500 leading-relaxed">{note}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* Events by Type */}
          <Section title="Events by Type">
            <p className="text-[11px] text-gray-400 leading-relaxed mb-3">Donut chart showing the mix of event types in the range. Four types are tracked:</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { color: "#6366f1", type: "page_view", when: "On app / page load", data: "path, referrer, session_id" },
                { color: "#10b981", type: "tool_open", when: "User selects a tool", data: "meta.tool" },
                { color: "#f59e0b", type: "query_run", when: "SQL query run in Text-to-SQL only", data: "meta.success, meta.rows, duration_ms" },
                { color: "#8b5cf6", type: "tool_close", when: "User navigates away from a tool", data: "duration_ms, meta.tool" },
              ].map(({ color, type, when, data }) => (
                <div key={type} className="p-3 rounded-xl border border-white/6" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <EventChip color={color} label={type}/>
                  <p className="text-[10px] text-gray-400 mt-2 leading-snug">{when}</p>
                  <p className="text-[9px] text-gray-600 mt-1 font-mono">{data}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* Live Feed */}
          <Section title="Live Feed">
            <p className="text-[11px] text-gray-400 leading-relaxed mb-3">
              Every event appears here instantly via WebSocket — no refresh. Holds the last 50 events. Each row has a <span className="text-white/70">3 px left color strip</span> matching the event type, a fixed-width type badge, a dimmed <code className="text-indigo-300 text-[10px]">/tools/</code> prefix with the tool name highlighted, country chip, session ID, and time ago. <code className="text-purple-400 text-[10px]">tool_close</code> rows also show a duration chip (e.g. <span className="text-purple-400 font-mono text-[10px]">2m 31s</span>) indicating how long that tool was open.
            </p>
            <Feature
              icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M1 4h12M1 7h8M1 10h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>}
              title="Type + Country filters"
              desc="When the feed contains more than one event type or country, filter pills appear below the header. Click a type pill to show only that event type; click a country pill to narrow by country. Click All or the active pill again to clear. Filters are client-side — they work instantly on the 50 cached events without a network request."
            />
            <Feature
              icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3"/><path d="M4.5 7h5M7 4.5v5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>}
              title="Session ID — click to trace"
              desc="The 8-character hex is the first 8 chars of the anonymous session ID. Click it (or the trace button that appears on row hover) to open the Session Trace drawer for that session. The ID turns green and the row is tinted while that trace is open."
            />
            <Feature
              icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x="1" y="3" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M4 6.5h6M4 9h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>}
              title="Event detail — click row to expand"
              desc="Click anywhere on a feed row (except the session ID or trace button) to expand an inline detail panel showing the full timestamp, referrer, duration, and any meta fields attached to that event (e.g. success, provider, rows for query_run events). Click the row again to collapse."
            />
            <Feature
              icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 1v3M7 10v3M1 7h3M10 7h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.3"/></svg>}
              title="Auto-refresh (Today only)"
              desc="When the Today range is active, stat cards and charts silently re-fetch from the server every 60 seconds in the background. The live feed updates instantly via WebSocket regardless of range."
            />
          </Section>

          {/* Session Trace */}
          <Section title="Session Trace">
            <Feature
              icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M10 1h2a1 1 0 011 1v10a1 1 0 01-1 1H2a1 1 0 01-1-1V2a1 1 0 011-1h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><path d="M4 7h6M4 4.5h4M4 9.5h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>}
              title="Opening a trace"
              desc="Click a session ID (or the trace button on row hover) in the Live Feed → a 320 px drawer slides in from the right. A blurred overlay covers the rest of the dashboard. Click outside the drawer or the × button to close."
            />
            <Feature
              icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M2 4h10M4 7h6M5 10h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>}
              title="Time per Tool — horizontal bars"
              desc="The top section of the drawer shows every tool the session visited, ordered by time spent, as proportional horizontal bars. Each bar shows the tool name, its share (%), and formatted duration (e.g. 2m 31s). Only populated when tool_close events with duration_ms > 0 exist for this session."
            />
            <Feature
              icon={<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="4" cy="4" r="1.5" stroke="currentColor" strokeWidth="1.2"/><circle cx="4" cy="10" r="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M4 5.5v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><path d="M7 4h4M7 10h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>}
              title="Event Path — vertical timeline"
              desc="Below the bars, every event is listed in chronological order as a vertical timeline with a color-coded dot, connecting spine line, event type + duration chip (for tool_close), tool name, and timestamp."
            />
            <div className="space-y-1.5 mt-2">
              {[
                { pattern: "page_view ×5 on same path", meaning: "Repeated refreshes — possible loading issue or confusion" },
                { pattern: "tool_open, no query_run", meaning: "Visitor opened a tool but didn't run anything — drop-off point" },
                { pattern: "page_view → tool_open → query_run", meaning: "Ideal path — visitor discovered and used a tool end-to-end" },
                { pattern: "query_run on multiple tools", meaning: "Power user — explored several tools in one session" },
              ].map(({ pattern, meaning }) => (
                <div key={pattern} className="flex gap-2.5 p-2.5 rounded-lg border border-white/5" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <div className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ background: ACCENT }}/>
                  <div>
                    <p className="text-[11px] font-semibold text-white/80">{pattern}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{meaning}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-start gap-2 p-2.5 rounded-lg border border-amber-500/20 mt-3" style={{ background: "rgba(245,158,11,0.05)" }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0 mt-0.5">
                <path d="M6 1l5 9H1L6 1z" stroke="#f59e0b" strokeWidth="1.2" strokeLinejoin="round"/>
                <path d="M6 5v2.5M6 9v.3" stroke="#f59e0b" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              <p className="text-[10px] text-amber-300/80 leading-relaxed"><span className="font-semibold">Session IDs are origin-scoped.</span> ML Unified (HF Space) and this portfolio (Vercel) are different origins — a visitor using both will have separate session IDs even in the same browser. Session traces only cover events from one origin.</p>
            </div>
          </Section>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/8 rounded-b-2xl flex items-center justify-between"
          style={{ background: "rgba(0,0,0,0.2)" }}>
          <span className="text-[10px] text-gray-600">Real-Time Analytics — ML Portfolio</span>
          <button onClick={onClose}
            className="text-[11px] px-3 py-1.5 rounded-lg font-medium text-white transition-all hover:brightness-110"
            style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>
            Got it
          </button>
        </div>

      </div>
    </div>
  );
}