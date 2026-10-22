-- Q4 M3 — online (live-traffic) judge scores. Run once in the Supabase SQL editor
-- (idempotent; safe to re-run).
--
-- One row per SAMPLED live answer that the Space's reference-free judge graded. It is
-- content-free: the question/answer/context were sent to the judge LLM transiently and
-- never stored — only the verdict + a few categorical signals land here. Written ONLY by
-- the token-gated /api/eval/online-ingest route (service-role); read by the owner-gated
-- /api/eval/online aggregator. RLS on, no policies → service-role only.
--
-- `surface` keeps this future-proof: 'rag' today; a tenant bot would write 'tenant:<id>'
-- with no schema change.

create table if not exists public.online_scores (
  id             uuid primary key default gen_random_uuid(),
  surface        text        not null default 'rag',
  faithful       boolean,
  relevant       boolean,
  passed         boolean,                 -- faithful AND relevant
  sampled_reason text,                    -- 'tail' | 'random'
  provider       text,
  model          text,
  answer_source  text,
  groundedness   numeric,
  created_at     timestamptz not null default now()
);

create index if not exists online_scores_created_idx on public.online_scores (created_at desc);

alter table public.online_scores enable row level security;
-- No policies on purpose: service-role only.
