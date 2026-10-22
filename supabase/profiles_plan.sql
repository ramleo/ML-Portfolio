-- Q3 M4a — self-serve plan tier on profiles. Run once in the Supabase SQL editor
-- (idempotent; safe to re-run).
--
-- Self-serve turns the chatbot builder into a platform: any signed-in user manages
-- their OWN bots (scoped by owner_id = their user id). A `plan` decides what they may
-- do. M4a ships two tiers; publishing a bot live (public embed = real LLM cost) requires
-- a non-free plan, so strangers can build + test for free but can't spend our budget at
-- scale. M4b (Stripe Billing) will flip a user to 'pro' via its webhook.
--
-- Security: the existing profiles RLS lets a user READ only their own row and has NO
-- update policy, so a user cannot change their own plan — only the service-role key
-- (the billing webhook / an admin) can. The site OWNER (OWNER_EMAIL, not a DB field) is
-- treated as unlimited in code regardless of this column.

alter table public.profiles
  add column if not exists plan text not null default 'free'
    check (plan in ('free', 'pro'));

-- Promote a user to 'pro' manually (service-role), e.g. to test the paid path before
-- Stripe is wired:
--   update public.profiles set plan = 'pro' where email = 'someone@example.com';
