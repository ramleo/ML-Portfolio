-- Q4 (live RAG health) — one content-free row per answered RAG query, so the owner
-- eval dashboard can show live retrieval/answer health over time: cache-hit rate,
-- where answers come from (knowledge base / web / dataset), groundedness drift,
-- low-confidence rate. The Space computes these per query and posts them to
-- /api/rag-log (same Space→Vercel trust as llm_calls; no Supabase key on the Space).
--
-- Content-free (LOGGING_SPEC §6): categorical/numeric signals only — never the
-- query text or the answer. Service-role only (RLS on, no policies).
--
-- Run once in the Supabase SQL editor.

create table if not exists public.rag_queries (
  id             uuid primary key default gen_random_uuid(),
  ts             timestamptz not null default now(),
  cache_hit      boolean,
  answer_source  text,        -- knowledge_base | web | dataset | none
  confidence     text,        -- high | medium | low | ""
  groundedness   float,       -- 0..1, null when not scored
  low_confidence boolean,
  provider       text,        -- served provider, or "cache"
  latency_ms     int,
  web_fallback   boolean
);

alter table public.rag_queries enable row level security;
-- No policies → service-role only.

create index if not exists rag_queries_ts_idx on public.rag_queries (ts desc);
