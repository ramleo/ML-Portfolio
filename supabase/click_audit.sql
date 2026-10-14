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

-- Optional housekeeping (run manually or wire a pg_cron job like the events
-- table's retention): delete from public.click_audit where created_at < now() - interval '14 months';
