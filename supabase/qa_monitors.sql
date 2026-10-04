-- Testwright R8 — scheduled monitoring (see docs/TESTWRIGHT_IMPROVEMENT_PLAN.md §9b).
-- A saved test marked "monitor this" re-runs on a schedule as an uptime check; a failure
-- (or a pass->fail transition) raises an alert and shows as uptime history. Monitor runs
-- flow into qa_runs (Dashboard-B), so the dashboard aggregates them for free.
--
-- Unlike qa_shared_runs (one-shot, code opt-in), a monitor MUST store the test code so the
-- scheduled job can re-run it, and it is OWNER-GATED (recurring CI cost — not open to
-- arbitrary visitors). Content is otherwise light: name, target URL, schedule, last status.
-- Disclosed on the privacy page.
--
-- Access model: writes AND reads go through Next.js API routes on Vercel using the
-- service-role key (same pattern as supabase/qa_shared_runs.sql + errors.sql), never from
-- the public anon key. RLS is enabled with NO anon policies, so the anon key can neither
-- read nor insert; the service role bypasses RLS. The scheduled ml-qa-runner workflow reads
-- due monitors through a token-guarded route, never the DB directly.
--
-- Run this ONCE in the Supabase SQL editor (Dashboard -> SQL -> New query -> paste -> Run).
-- Until then the Monitor action returns needs_setup and shows a setup hint.

create table if not exists public.qa_monitors (
  id                    text        primary key,                 -- unguessable base62 token = monitor id
  created_at            timestamptz not null default now(),
  name                  text        not null default '',         -- test name (clipped)
  code                  text        not null,                    -- the Playwright test (required to re-run)
  base_url              text        not null default '',         -- target site under test
  interval             text        not null default 'daily',    -- 'daily' | 'hourly'
  enabled               boolean     not null default true,
  last_run_at           timestamptz,
  last_status           text,                                    -- 'passed' | 'failed' | 'flaky' | 'error'
  consecutive_failures  integer     not null default 0,          -- drives alert on pass->fail transition
  last_correlation_id   text                                     -- links the latest monitor run to its qa_runs row
);

-- Due-check and listing both scan by enabled + last_run_at.
create index if not exists qa_monitors_due_idx on public.qa_monitors (enabled, last_run_at);

-- Lock the table to service-role access only (reads + writes go through our routes).
alter table public.qa_monitors enable row level security;

-- The <=5 active-monitor cap is enforced in the create route (POST /api/qa-run/monitor),
-- not here, so the limit can be tuned without a migration.
