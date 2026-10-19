-- Q3 M1 — multi-tenant chatbot builder: tenant foundation + durable per-tenant
-- knowledge base (pgvector), with physical isolation as the primary boundary.
--
-- Design (see docs/prd/05-roadmap-extensions.md · Q3):
--   * tenant_id is the isolation key. Every chunk carries it; every query filters
--     on it inside a SECURITY-stable function — a query can never read another
--     tenant's rows.
--   * These tables are written/read ONLY by the frontend service-role client
--     (the HF Space holds no Supabase key). No RLS policies are defined, so with
--     RLS enabled every non-service-role role is denied by default (fail-closed).
--   * Embeddings are all-MiniLM-L6-v2 (384-dim), produced on the Space; this file
--     only stores and searches them.
--
-- Run once in the Supabase SQL editor.

create extension if not exists vector;

-- ── tenants ──────────────────────────────────────────────────────────────────
create table if not exists public.tenants (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid references auth.users(id) on delete set null,
  name        text not null,
  slug        text not null unique,
  config      jsonb not null default '{}'::jsonb,   -- system prompt, provider, etc. (M2)
  created_at  timestamptz not null default now()
);

alter table public.tenants enable row level security;
-- No policies → service-role only.

-- ── per-tenant knowledge chunks (pgvector) ──────────────────────────────────
create table if not exists public.tenant_chunks (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  source       text not null,                       -- document name / id
  chunk_index  int  not null,
  content      text not null,
  embedding    vector(384) not null,                -- all-MiniLM-L6-v2
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

alter table public.tenant_chunks enable row level security;
-- No policies → service-role only.

create index if not exists tenant_chunks_tenant_idx
  on public.tenant_chunks (tenant_id);

create index if not exists tenant_chunks_embedding_idx
  on public.tenant_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ── tenant-scoped nearest-neighbour search ──────────────────────────────────
-- ISOLATION: the WHERE tenant_id = p_tenant_id clause is the structural boundary.
-- Callers pass the tenant id derived from auth (owner session in M1; a JWT claim
-- once embeds exist) — never from untrusted user input.
create or replace function public.match_tenant_chunks(
  p_tenant_id        uuid,
  p_query_embedding  vector(384),
  p_match_count      int default 5
)
returns table (
  id          uuid,
  source      text,
  chunk_index int,
  content     text,
  metadata    jsonb,
  similarity  float
)
language sql
stable
as $$
  select c.id, c.source, c.chunk_index, c.content, c.metadata,
         1 - (c.embedding <=> p_query_embedding) as similarity
  from public.tenant_chunks c
  where c.tenant_id = p_tenant_id
  order by c.embedding <=> p_query_embedding
  limit greatest(p_match_count, 1);
$$;
