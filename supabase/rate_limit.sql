-- Durable, shared-across-instances per-IP rate limit. Run once in the Supabase
-- SQL editor (idempotent; safe to re-run).
--
-- Why this exists: serverless routes (Vercel) do not share memory, so an
-- in-memory per-IP counter in a route is defeated by simply spreading requests
-- across warm instances, and is wiped on every cold start. Counting in the
-- database is shared by definition and survives restarts — the same reasoning
-- as security_log.sql's log_security_event(), generalised so any route can use
-- it by passing its own bucket name, limit, and window.
--
-- Privacy: the caller is identified by a salted HMAC of its IP (computed in the
-- route with AIRAML_LOG_TOKEN, exactly as security_log does), never the raw IP.
-- This counts requests from one caller and is useless to anyone reading the row.

create table if not exists public.rate_limit_hits (
  id       bigserial primary key,
  bucket   text        not null,   -- which limiter (e.g. 'audit'); one table, many routes
  ip_hash  text        not null,   -- salted HMAC of the caller's IP, never the IP
  ts       timestamptz not null default now()
);

create index if not exists rate_limit_hits_lookup
  on public.rate_limit_hits (bucket, ip_hash, ts desc);

-- RLS ON, no policies: the browser's anon key can reach nothing here; the
-- service-role key (which bypasses RLS) still writes via the function below.
alter table public.rate_limit_hits enable row level security;

-- Records one hit and reports whether the caller is WITHIN its limit.
-- Returns true  → allowed (the hit was recorded),
--         false → over the limit (not recorded, so a flood cannot grow the table).
-- A sliding window: expired hits simply fall out of the count as `ts` ages past
-- the window, so the caller is allowed again without any separate reset.
create or replace function public.rate_limit_hit(
  p_bucket text, p_ip_hash text, p_max int, p_window_seconds int
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  recent int;
begin
  select count(*) into recent
    from public.rate_limit_hits
   where bucket = p_bucket
     and ip_hash = p_ip_hash
     and ts > now() - make_interval(secs => p_window_seconds);

  if recent >= p_max then
    return false;   -- over the limit: refuse AND do not record, so it cannot be flooded
  end if;

  insert into public.rate_limit_hits (bucket, ip_hash) values (p_bucket, p_ip_hash);
  return true;
end;
$$;

-- ── Retention ──────────────────────────────────────────────────────────────
-- Hits only matter inside their window (seconds). Keep an hour as slack, then
-- purge — this table is a counter, not a log.
create extension if not exists pg_cron with schema extensions;

create or replace function public.purge_old_rate_limit_hits()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.rate_limit_hits where ts < now() - interval '1 hour';
$$;

select cron.schedule(
  'purge-rate-limit-hits',
  '*/15 * * * *',          -- every 15 minutes; the table never needs to grow large
  $$select public.purge_old_rate_limit_hits();$$
);

-- ── Checking it ────────────────────────────────────────────────────────────
--   select bucket, count(*) from rate_limit_hits group by bucket;
--   select rate_limit_hit('audit', 'test-hash', 120, 60);   -- true until the 121st call
