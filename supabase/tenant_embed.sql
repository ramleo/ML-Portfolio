-- Q3 M3 — embeddable chatbot widget: per-tenant embed settings + abuse controls.
-- Run once in the Supabase SQL editor (idempotent; safe to re-run).
--
-- A published bot can be dropped onto any third-party site with a one-line <script>.
-- The embed path is PUBLIC (anonymous visitors), so it is NOT owner-gated — instead a
-- layered set of controls keeps it from being abused for free LLM spend:
--
--   * public_key      — identifies the bot in the snippet (public by design, like a
--                       Stripe pk_…; rotate = regenerate). Plaintext + indexed so the
--                       session endpoint can look a bot up by it.
--   * embed_enabled   — the kill switch. Off by default: a bot is private until the
--                       owner explicitly publishes it.
--   * allowed_origins — the sites allowed to embed. Checked (with CORS) when a session
--                       is minted. A weak control alone (an Origin header is spoofable
--                       with curl), so it is layered with the three below.
--   * embed_rate_per_min — per-IP query ceiling (uses the existing rate_limit_hit RPC).
--   * embed_daily_cap    — hard messages/day ceiling (the enforceable cost cap; true
--                          $-metering lands with M4 billing — free models make per-$
--                          noisy, so this counts messages, the thing that costs money).
--
-- Only the frontend service-role client reads/writes these columns. The HF Space holds
-- no Supabase key and is unaffected; it answers exactly as it does for the owner Test
-- path (no Space change for this milestone).

alter table public.tenants
  add column if not exists public_key       text,
  add column if not exists embed_enabled    boolean     not null default false,
  add column if not exists allowed_origins  text[]      not null default '{}',
  add column if not exists embed_rate_per_min int        not null default 20,
  add column if not exists embed_daily_cap  int          not null default 500,
  add column if not exists embed_day        date         not null default current_date,
  add column if not exists embed_day_count  int          not null default 0;

-- public_key is unique when set; the partial index lets existing rows keep NULL.
create unique index if not exists tenants_public_key_idx
  on public.tenants (public_key) where public_key is not null;

-- ── daily message cap (atomic) ───────────────────────────────────────────────
-- Bumps the day counter for one bot, resetting it when the day rolls over, and
-- reports whether the bot is still WITHIN its cap. Mirrors rate_limit_hit: the
-- insert/increment and the limit test happen in one statement so concurrent
-- serverless instances cannot race past the ceiling.
--   returns true  → allowed (this message was counted),
--           false → cap reached (not counted).
create or replace function public.tenant_embed_charge(p_tenant_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  cap    int;
  newcnt int;
begin
  update public.tenants
     set embed_day       = case when embed_day = current_date then embed_day else current_date end,
         embed_day_count = case when embed_day = current_date then embed_day_count + 1 else 1 end
   where id = p_tenant_id
   returning embed_daily_cap, embed_day_count into cap, newcnt;

  if not found then
    return false;                       -- unknown bot: refuse
  end if;
  if newcnt > greatest(cap, 0) then
    -- over the cap: undo the increment so the counter can't grow unbounded
    update public.tenants set embed_day_count = embed_day_count - 1 where id = p_tenant_id;
    return false;
  end if;
  return true;
end;
$$;

-- ── Checking it ──────────────────────────────────────────────────────────────
--   select id, name, public_key, embed_enabled, allowed_origins,
--          embed_rate_per_min, embed_daily_cap, embed_day, embed_day_count
--     from public.tenants where public_key is not null;
--   select public.tenant_embed_charge('<tenant-uuid>');   -- true until the cap
