-- Testwright R7 Dashboard-B — durable, cross-device run history
-- (see docs/QA_SHAREABLE_REPORTS_PLAN.md "Dashboard — Option B").
--
-- One content-light row per COMPLETED run, so the /qa/dashboard "All runs" view can
-- trend health across devices and sessions — not just the runs kept in one browser's
-- localStorage. This is a superset of the local HistoryEntry: name, outcome, per-test
-- counts, flakiness, timing and the GitHub run link. NO test code, NO screenshot, NO
-- step detail (those live in qa_shared_runs only when a user explicitly shares a run).
--
-- Access model: writes AND reads go through Next.js API routes on Vercel using the
-- service-role key (same pattern as supabase/qa_shared_runs.sql + errors.sql), never
-- from the public anon key. RLS is enabled with NO anon policies, so the anon key can
-- neither read nor insert; the service role bypasses RLS. Writes are also gated by
-- analyticsWritesEnabled() so local dev can't pollute prod. Disclosed on the privacy
-- page.
--
-- Run this ONCE in the Supabase SQL editor (Dashboard -> SQL -> New query -> paste ->
-- Run). Until then the dashboard "All runs" view shows a one-line setup hint and the
-- log route returns needs_setup (it never errors the run).

create table if not exists public.qa_runs (
  id             text        primary key,            -- unguessable base62 token
  created_at     timestamptz not null default now(),
  name           text        not null default '',    -- test name (clipped)
  status         text        not null,               -- 'passed' | 'failed' | 'error'
  tests          integer,                            -- test CASES in the run (merged suite = many)
  passed_tests   integer,
  failed_tests   integer,
  flaky          boolean,                            -- repeats disagreed (null if single run)
  duration_ms    integer,                            -- wall-clock incl. CI overhead
  correlation_id text,                               -- ties back to the GitHub run
  run_url        text,                               -- GitHub run link
  error_message  text                                -- Playwright failure reason (clipped)
);

create index if not exists qa_runs_created_at_idx on public.qa_runs (created_at desc);

-- Lock the table to service-role access only (reads + writes go through our routes).
alter table public.qa_runs enable row level security;

-- Optional retention (run manually, or wire a pg_cron job) — keep ~1 year:
-- delete from public.qa_runs where created_at < now() - interval '365 days';
