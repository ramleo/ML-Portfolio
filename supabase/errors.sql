-- DIY error store (our own "Sentry-lite"), alongside the hosted Sentry.
-- Durable, first-party, on the Supabase you already run. Content-free per
-- LOGGING_SPEC §6 in the same sense as Sentry: it stores the error, where it
-- happened, and the page — never request bodies, and the route has its query
-- string stripped before it ever reaches here. Exception *messages* and stack
-- traces are kept (they are what makes a fault debuggable) — the trade-off
-- disclosed on the privacy page.
--
-- Run this ONCE in the Supabase SQL editor (Dashboard -> SQL -> New query ->
-- paste -> Run). Until then /api/error returns needs_setup and the dashboard
-- panel shows a setup hint.

create table if not exists public.errors (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  source      text        not null,                 -- 'frontend' | 'backend'
  level       text        not null default 'error',
  kind        text        not null,                 -- exception class / error name
  message     text,                                 -- truncated; see privacy note
  route       text,                                 -- path where it happened (no query string)
  fingerprint text        not null,                 -- grouping key: source:kind:route
  stack       text,                                 -- trace (frontend minified until source maps)
  session_id  text,                                 -- links to public.events.session_id
  meta        jsonb       not null default '{}'::jsonb
);

create index if not exists errors_created_at_idx  on public.errors (created_at desc);
create index if not exists errors_fingerprint_idx on public.errors (fingerprint);

-- Grouped read for the dashboard: one row per distinct fault, ranked by count.
-- fingerprint already encodes source/kind/route, so those are constant within a
-- group (min() just picks the single value); the sample message is the latest.
create or replace function public.error_groups(p_start timestamptz, p_end timestamptz)
returns table (
  fingerprint    text,
  source         text,
  kind           text,
  route          text,
  sample_message text,
  n              bigint,
  first_seen     timestamptz,
  last_seen      timestamptz
)
language sql
stable
as $$
  select
    fingerprint,
    min(source) as source,
    min(kind)   as kind,
    min(route)  as route,
    (array_agg(message order by created_at desc))[1] as sample_message,
    count(*)    as n,
    min(created_at) as first_seen,
    max(created_at) as last_seen
  from public.errors
  where created_at >= p_start and created_at <= p_end
  group by fingerprint
  order by n desc;
$$;

grant execute on function public.error_groups(timestamptz, timestamptz) to service_role;

-- Optional housekeeping (run manually or wire a pg_cron job like the events
-- table's 14-month retention): delete from public.errors where created_at < now() - interval '14 months';
