-- Public API keys (Q1). Run once in the Supabase SQL editor (idempotent).
--
-- The owner mints keys and hands them to third parties. We store ONLY a SHA-256
-- hash of the key (never the key itself) plus a short prefix for display. The HF
-- Space never reads this table directly (it holds no Supabase key); it verifies a
-- key through a token-gated frontend route, which is the only reader/writer here.
-- RLS is ON with NO policies, so anon/authenticated keys cannot touch it — only
-- the service-role key (used by the owner-gated API routes) can.
--
-- Tiers: both 'free' and 'paid' are representable now (the owner sets quota +
-- budget per key). Payment collection (Stripe) is deferred; this schema is the
-- seam it will plug into.

create extension if not exists pgcrypto;

create table if not exists public.api_keys (
  id            uuid primary key default gen_random_uuid(),
  key_hash      text        not null unique,            -- sha256 hex of the full key
  key_prefix    text        not null,                   -- e.g. "ak_live_ab12cd" (display only)
  label         text,                                   -- who it's for
  tier          text        not null default 'free'
                check (tier in ('free', 'paid')),
  monthly_quota integer     not null default 1000,      -- requests per calendar month
  budget_usd    numeric     not null default 1.0,       -- provider-spend cap per month
  request_count bigint      not null default 0,         -- usage this period
  spend_usd     numeric     not null default 0,         -- spend this period
  period_start  date        not null default date_trunc('month', now())::date,
  created_at    timestamptz not null default now(),
  expires_at    timestamptz,                            -- null = never
  last_used_at  timestamptz,
  revoked       boolean     not null default false
);

create index if not exists api_keys_key_hash_idx on public.api_keys (key_hash);

alter table public.api_keys enable row level security;
-- No policies on purpose: service-role only.
