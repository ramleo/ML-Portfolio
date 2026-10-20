-- Q4 (Portkey-style feedback) — thumbs up/down a visitor gives a chat answer.
-- A live quality signal to sit alongside the golden-set eval. Content-free: a
-- rating plus which tool/provider/model/session it was for — never the question
-- or the answer. Written by /api/feedback (service-role on Vercel); read only by
-- the owner eval dashboard. Service-role only (RLS on, no policies).
--
-- Run once in the Supabase SQL editor.

create table if not exists public.answer_feedback (
  id          uuid primary key default gen_random_uuid(),
  ts          timestamptz not null default now(),
  rating      smallint not null,          -- 1 = helpful, -1 = not helpful
  tool        text,
  provider    text,
  model       text,
  session_id  text
);

alter table public.answer_feedback enable row level security;
-- No policies → service-role only.

create index if not exists answer_feedback_ts_idx on public.answer_feedback (ts desc);
