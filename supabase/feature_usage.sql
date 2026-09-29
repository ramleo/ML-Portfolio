-- Feature-usage aggregation for the analytics dashboard (FEATURE_TRACKING_SPEC.md
-- Phase 3). Aggregates the content-free `feature_use` events SERVER-SIDE so the
-- dashboard reads a small grouped result instead of paging every raw row to JS
-- (feature_use is the highest-volume event — a full-table scan in the browser
-- would not scale for 30-day ranges).
--
-- HOW TO APPLY: paste this into the Supabase SQL editor and run it once. It is
-- idempotent (create or replace). No table/schema change — read-only over the
-- existing `events.meta` jsonb.
--
-- Returns one row per (tool, control, action, value) with a count. `value` is
-- null for plain clicks and non-null only for enumerated controls (select option,
-- checkbox/radio state, slider quartile, or a data-ev-value button group).

create or replace function feature_usage(p_start timestamptz, p_end timestamptz)
returns table (tool text, control text, action text, value text, n bigint)
language sql
stable
as $$
  select
    meta->>'tool'    as tool,
    meta->>'control' as control,
    meta->>'action'  as action,
    meta->>'value'   as value,
    count(*)         as n
  from events
  where type = 'feature_use'
    and created_at >= p_start
    and created_at <= p_end
    and meta ? 'tool'
    and meta ? 'control'
  group by 1, 2, 3, 4
$$;

-- The dashboard route calls this with the Supabase service-role key.
grant execute on function feature_usage(timestamptz, timestamptz) to service_role;
