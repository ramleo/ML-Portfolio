-- Q4 M2 — offline quality scoring (golden set + LLM-as-judge). Stores the result
-- of each evaluation run so answer quality is trackable over time, alongside the
-- M1 performance/cost view.
--
-- Design (see docs/prd/05-roadmap-extensions.md · Q4):
--   * A run executes on the HF Space (fresh RAG answer per golden item + a Gemini
--     judge), then posts its results to the frontend, which writes them here. The
--     Space holds no Supabase key; these tables are service-role only.
--   * This is the OWNER evaluating their own system with their own golden set, so
--     storing the questions/answers here is intentional — it is not user content
--     (LOGGING_SPEC §6 is about visitor prompts, which never enter this table).
--   * golden_version tags the set so runs stay comparable; changing the set starts
--     a new version rather than silently breaking the trend.
--
-- Run once in the Supabase SQL editor.

create table if not exists public.eval_runs (
  id             uuid primary key default gen_random_uuid(),
  ts             timestamptz not null default now(),
  golden_version text not null,
  judge_model    text,
  status         text not null default 'running',   -- running | done | error
  n              int not null default 0,             -- items in the set
  n_scored       int not null default 0,             -- items judged so far
  pass_rate      float,                              -- all-criteria pass / n_scored
  avg_correct    float,
  avg_faithful   float,
  avg_relevant   float,
  error          text
);

alter table public.eval_runs enable row level security;
-- No policies → service-role only.

create table if not exists public.eval_scores (
  id           uuid primary key default gen_random_uuid(),
  run_id       uuid not null references public.eval_runs(id) on delete cascade,
  item_id      text not null,
  question     text not null,
  answer       text,
  correct      boolean,
  faithful     boolean,
  relevant     boolean,
  groundedness float,               -- free backend signal (score_groundedness), 0..1
  rationale    text,                -- the judge's one-line reason
  created_at   timestamptz not null default now()
);

alter table public.eval_scores enable row level security;
-- No policies → service-role only.

create index if not exists eval_scores_run_idx on public.eval_scores (run_id);
create index if not exists eval_runs_ts_idx on public.eval_runs (ts desc);
