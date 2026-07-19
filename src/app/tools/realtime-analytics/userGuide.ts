// User guide for Real-Time Analytics — distilled from AnalyticsUserGuideSections.tsx
// and injected into the floating AI Assistant as its ONLY tool knowledge.
// Keep in sync with the visible guide when panels change.

export const ANALYTICS_GUIDE = `
# Real-Time Analytics Dashboard — User Guide

## What this tool does
A live analytics dashboard for the AIRaML portfolio: page views, tool usage,
query success rates, AI provider usage, geography, devices, and engagement —
all filterable by date range.

## Range selector
- Presets: Today / Yesterday / 7 days / 30 days — click a pill to reload every
  panel for that window.
- Custom calendar: click one date for a single day (hourly view) or a start and
  end date for a multi-day range (daily view). Future dates are disabled.
- Export CSV: downloads all events for the active range (up to 5,000 rows) with
  id, timestamp, type, path, session, country, duration, and metadata.

## Panels
- Stat cards: headline totals for the selected range.
- Events sparkline: area chart of event volume over time; hover for exact
  counts. A green "Peak hour" badge shows the busiest hour of the trailing
  7 days, independent of the selected range.
- Conversion funnel: step-by-step visitor progression.
- Visitors by Country: world dot map — circle size scales with event count;
  hover a circle for the exact number.
- Activity heatmap: 7×24 grid (day of week × UTC hour) for the last 7 days;
  darker cells = more events.
- HF Space Tools: tool-open activity tracked from the ML Unified backend, with
  per-tool page/copy/open counts.
- Portfolio Tools: tool-open events from the portfolio site itself (AutoML,
  Text-to-SQL, Document Intelligence, SHAP, Drift, and the rest).
- Tool Usage Comparison: proportional bars for the top /tools/* pages (up to 6).
- Query Success by Tool: per-tool SQL success rate — green ≥90%, amber 70–89%,
  red <70%.
- AI Provider Usage: share of queries served by each provider, plus a by-model
  breakdown (e.g. llama-3.3-70b, gemini-2.0-flash) — useful to see which models
  carry the load.
- Engagement metrics, Top Pages, Top Referrers (grouped by hostname + path,
  UTM parameters stripped), Events by Type, and a Visitors-by-Device donut
  (desktop / mobile / tablet).

## Notes
- Sparkline buckets by UTC hour for single-day views and by calendar date for
  multi-day views.
- Panels hide themselves automatically when there is no matching data in the
  selected range.
- The full visible User Guide is available on the page itself.
`.trim();

export const ANALYTICS_SUGGESTIONS = [
  "How do I select a custom date range?",
  "What does the Query Success panel show?",
  "What does Export CSV include?",
];