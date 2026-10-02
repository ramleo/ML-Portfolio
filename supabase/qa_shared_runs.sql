-- Testwright R7 Phase 1 — shareable run reports (see docs/QA_SHAREABLE_REPORTS_PLAN.md).
-- A permalink to a finished Run: status, summary, failure reason, step timeline and
-- timing, plus a link to the GitHub run. Turns a result that today lives only in one
-- browser into something you can drop into a bug report, a PR or a message.
--
-- Content-light: summary counts, the Playwright failure reason (clipped), step titles
-- + durations, timing, the GitHub run URL. The test *code* is stored ONLY when the
-- user opts in on the Share action (off by default). No screenshot / video / trace in
-- v1 (those are short-lived GitHub artifacts). Disclosed on the privacy page.
--
-- Access model: writes AND reads go through Next.js API routes on Vercel using the
-- service-role key (same pattern as supabase/errors.sql + src/app/api/error/route.ts),
-- never from the public anon key. RLS is enabled with NO anon policies, so the anon
-- key can neither read nor insert; the service role bypasses RLS. Share links are
-- unguessable ids, read back only through GET /api/qa-run/share/[id].
--
-- Run this ONCE in the Supabase SQL editor (Dashboard -> SQL -> New query -> paste ->
-- Run). Until then the Share action returns needs_setup and shows a setup hint.

create table if not exists public.qa_shared_runs (
  id            text        primary key,            -- unguessable base62 token = share id
  created_at    timestamptz not null default now(),
  expires_at    timestamptz,                        -- 90-day TTL (set by the create route)
  name          text        not null default '',    -- test name (clipped)
  status        text        not null,               -- 'passed' | 'failed' | 'flaky' | 'error'
  summary       jsonb,                              -- {expected, unexpected, flaky, skipped}
  error_message text,                               -- Playwright failure reason (clipped)
  steps         jsonb       not null default '[]'::jsonb,  -- [{title, category, duration, ok}], clipped
  test_ms       integer,                            -- sum of step durations
  total_ms      integer,                            -- wall-clock incl. CI overhead
  run_url       text,                               -- GitHub run link
  runs          integer,                            -- flakiness: number of repeats (null if single)
  passed_runs   integer,
  pass_rate     real,
  flaky         boolean,
  code          text                                -- opt-in only; clipped
);

create index if not exists qa_shared_runs_created_at_idx on public.qa_shared_runs (created_at desc);

-- Lock the table to service-role access only (reads + writes go through our routes).
alter table public.qa_shared_runs enable row level security;

-- Optional housekeeping for the 90-day TTL (run manually, or wire a pg_cron job):
-- delete from public.qa_shared_runs where expires_at is not null and expires_at < now();
