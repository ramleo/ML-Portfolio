-- Authentication: user profiles + roles + RLS. Run once in the Supabase SQL
-- editor (idempotent; safe to re-run).
--
-- Why this exists: the site was login-less (an anonymous _ml_session id). This
-- adds real accounts via Supabase Auth and splits them into two audiences —
-- 'recruiter' and 'user' — each gated to its own surface. Supabase Auth owns the
-- auth.users table and credentials; this file adds the application-level profile
-- (the role) alongside it and locks it down with Row Level Security.
--
-- Design: ONE Supabase project, role-based (not two forked apps). The role lives
-- in a profiles row keyed to auth.users.id; RLS lets a signed-in user read ONLY
-- their own profile, and nobody change their own role (role changes are a
-- service-role / admin action, which bypasses RLS). The app reads the role to
-- decide which surface (/app/* vs /recruiter/*) a user may enter.

-- ── profiles ────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text,
  role       text        not null default 'user'
             check (role in ('user', 'recruiter')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- A signed-in user may READ their own profile row (needed so the app/middleware
-- can look up the caller's role). No INSERT/UPDATE/DELETE policies exist, so the
-- anon/authenticated keys cannot change roles; only the service-role key (which
-- bypasses RLS) or the trigger below writes rows.
drop policy if exists "profiles_self_read" on public.profiles;
create policy "profiles_self_read"
  on public.profiles for select
  using (auth.uid() = id);

-- ── auto-create a profile on signup ───────────────────────────────────────────
-- Every new auth.users row gets a matching profile, defaulted to the 'user' role.
-- Promote a recruiter later with an explicit service-role update, e.g.:
--   update public.profiles set role = 'recruiter' where email = 'x@y.com';
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'user')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── role helper ───────────────────────────────────────────────────────────────
-- Returns the caller's role (or 'user' if none). Usable inside other tables'
-- RLS policies later (e.g.  using (public.auth_role() = 'recruiter')  ) so the
-- database — not API code — decides recruiter-only visibility.
create or replace function public.auth_role()
returns text
language sql
stable security definer set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()),
    'user'
  );
$$;

-- Backfill: give any pre-existing auth.users a profile (no-op on a fresh project).
insert into public.profiles (id, email, role)
select u.id, u.email, 'user'
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);
