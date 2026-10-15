-- Crash-durable click audit store (Plan #1/#2) — a dedicated, durable log for
-- "did this actor actually click <control> at <time>?". Separate from the
-- analytics `events` table on purpose: audit needs its own retention, its own
-- access, and a hard uniqueness guarantee that analytics does not.
--
-- Content-free in the same sense as the rest of our logging (LOGGING_SPEC §6):
-- it stores WHICH control was clicked (a stable `data-audit` id), WHERE, WHO
-- (the session id today; the app's authenticated user id when dropped into the
-- real app), and WHEN — never the value of any field or any typed text.
--
-- Run this ONCE in the Supabase SQL editor (Dashboard -> SQL -> New query ->
-- paste -> Run). Until then /api/audit returns needs_setup and the client keeps
-- its outbox so nothing is lost before the table exists.

create table if not exists public.click_audit (
  id          bigint generated always as identity primary key,
  event_uuid  text        not null unique,          -- client-minted; the dedupe key
  created_at  timestamptz not null default now(),   -- server receive time
  client_ts   timestamptz,                          -- when the click happened in the browser
  actor       text,                                 -- authenticated user id in the real app; session_id here
  session_id  text,                                 -- links to public.events.session_id
  control     text        not null,                 -- the data-audit id, e.g. 'save-btn'
  path        text,                                 -- page where it happened
  country     text,                                 -- from the edge header, as in /api/track
  meta        jsonb       not null default '{}'::jsonb
);

-- The dedupe path (upsert on event_uuid) uses the unique constraint above.
create index if not exists click_audit_created_at_idx on public.click_audit (created_at desc);
create index if not exists click_audit_actor_idx      on public.click_audit (actor, control, created_at desc);
create index if not exists click_audit_control_idx    on public.click_audit (control, created_at desc);

-- The dispute query, as a function: "did <actor> click <control> between A and B?"
-- Returns the matching rows (empty = they did not), newest first.
create or replace function public.click_audit_lookup(
  p_actor   text,
  p_control text,
  p_start   timestamptz,
  p_end     timestamptz
)
returns table (
  event_uuid text,
  actor      text,
  control    text,
  path       text,
  client_ts  timestamptz,
  created_at timestamptz
)
language sql
stable
as $$
  select event_uuid, actor, control, path, client_ts, created_at
  from public.click_audit
  where actor = p_actor
    and control = p_control
    and created_at >= p_start
    and created_at <= p_end
  order by created_at desc;
$$;

grant execute on function public.click_audit_lookup(text, text, timestamptz, timestamptz) to service_role;

-- Aggregate stats for the internal dashboard (/audit/dashboard). One round-trip:
-- totals, top controls/paths/actors/countries, a time series, and a recent feed,
-- all for a window. GROUP BY runs in the DB so the client never pulls raw rows.
-- p_bucket is 'hour' or 'day' for the time series. Re-run this file after adding
-- it (create or replace is idempotent).
create or replace function public.click_audit_stats(
  p_start  timestamptz,
  p_end    timestamptz,
  p_bucket text default 'hour'
)
returns jsonb
language sql
stable
as $$
  with base as (
    select * from public.click_audit
    where created_at >= p_start and created_at <= p_end
  )
  select jsonb_build_object(
    'total',    (select count(*)                from base),
    'actors',   (select count(distinct actor)   from base),
    'sessions', (select count(distinct session_id) from base),
    'controls', (select count(distinct control) from base),
    'paths',    (select count(distinct path)    from base),
    'top_controls', (
      select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from (
        select control,
               (array_agg(meta->>'label' order by created_at desc)
                  filter (where meta->>'label' is not null))[1] as label,
               count(*) as count
        from base group by control order by count(*) desc, control limit 15
      ) t
    ),
    'top_paths', (
      select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from (
        select coalesce(path, '(none)') as path, count(*) as count
        from base group by coalesce(path, '(none)') order by count(*) desc, path limit 15
      ) t
    ),
    'top_actors', (
      select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from (
        select actor, count(*) as count
        from base where actor is not null group by actor order by count(*) desc, actor limit 15
      ) t
    ),
    'by_country', (
      select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from (
        select coalesce(nullif(country, ''), 'unknown') as country, count(*) as count
        from base group by coalesce(nullif(country, ''), 'unknown') order by count(*) desc limit 20
      ) t
    ),
    'series', (
      select coalesce(jsonb_agg(row_to_json(t) order by (t.bucket)), '[]'::jsonb) from (
        select date_trunc(case when p_bucket = 'day' then 'day' else 'hour' end, created_at) as bucket,
               count(*) as count
        from base group by 1
      ) t
    ),
    'recent', (
      select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from (
        select event_uuid, client_ts, created_at, actor, control,
               coalesce(path, '(none)') as path, meta->>'label' as label
        from base order by created_at desc limit 50
      ) t
    )
  );
$$;

grant execute on function public.click_audit_stats(timestamptz, timestamptz, text) to service_role;

-- Optional housekeeping (run manually or wire a pg_cron job like the events
-- table's retention): delete from public.click_audit where created_at < now() - interval '14 months';
