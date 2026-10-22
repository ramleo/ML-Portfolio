-- Q3 M4b — Stripe Billing: link a user's profile to their Stripe customer/subscription.
-- Run once in the Supabase SQL editor (idempotent; safe to re-run).
--
-- The `plan` column (profiles_plan.sql) stays the single source of truth the app reads;
-- these columns just map a Stripe customer/subscription back to the user so the webhook
-- can flip `plan` on checkout and back on cancellation. Only the service-role key (the
-- billing API routes + webhook) writes these — the existing profiles RLS gives a user
-- read-only access to their own row and no write, so no one can self-upgrade.

alter table public.profiles
  add column if not exists stripe_customer_id     text,
  add column if not exists stripe_subscription_id text;

-- Subscription events arrive keyed by customer, so look the profile up by it.
create index if not exists profiles_stripe_customer_idx
  on public.profiles (stripe_customer_id) where stripe_customer_id is not null;
