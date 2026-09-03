import type {
  PerMinute, TopPage, ByType, Country, Funnel, Referrer, ProviderStat, ModelStat,
} from "./AnalyticsCharts";

/** The window every panel is filtered by. "custom" is paired with a
 *  { start, end } pair rather than carrying the dates itself, because a preset
 *  and a calendar selection are the same thing to every consumer downstream. */
export type Range = "today" | "yesterday" | "7d" | "30d" | "custom";

export const RANGE_LABELS: Record<Range, string> = {
  today: "Today", yesterday: "Yesterday", "7d": "7 days", "30d": "30 days", custom: "Custom",
};

/** One /api/stats response. Every panel on the dashboard reads a slice of this,
 *  which is why it is one wide shape rather than a request per panel: the range
 *  selector would otherwise fan out into twenty simultaneous fetches. */
export interface Stats {
  active_now: number;
  is_range: boolean;
  today_count: number;
  per_minute: PerMinute[];
  error_per_minute: PerMinute[];
  top_pages: TopPage[];
  by_type: ByType[];
  top_countries: Country[];
  top_referrers: Referrer[];
  funnel: Funnel;
  avg_session_duration_ms: number | null;
  bounce_rate: number | null;
  bounce_session_count: number;
  total_session_count: number;
  query_success_rate: number | null;
  query_success_count: number;
  query_total_count: number;
  query_by_tool: { path: string; success_count: number; total_count: number; success_rate: number }[];
  prev_period_count: number;
  heatmap: { day: number; hour: number; count: number }[];
  peak_hour: number | null;
  provider_breakdown: ProviderStat[];
  model_breakdown: ModelStat[];
  error_count: number;
  device_breakdown: { device: string; count: number }[];
  returning_pct: number | null;
  avg_query_length: number | null;
  avg_queries_per_session: number | null;
  export_conversion_pct: number | null;
  hf_tools: Record<string, Record<string, number>>;
  portfolio_tools: Record<string, Record<string, number>>;
}
