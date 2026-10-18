-- Recruiter share-links: a no-login, expiring, revocable way to show the owner's
-- private portfolio to an invited recruiter. Run once in the Supabase SQL editor
-- (idempotent; safe to re-run).
--
-- Why this exists: the portfolio (About / Skills / Timeline / Contact) is NOT
-- public — it is shown only to the owner (signed in) and to recruiters the owner
-- invites. Rather than make a recruiter create an account, the owner generates a
-- secret link ( /r/<token> ) and sends it; anyone holding a valid token sees the
-- portfolio with no login. The owner can set an expiry and revoke a link anytime.
--
-- Security: the token is a random UUID (unguessable) and is the only credential.
-- RLS is ON with NO policies, so the anon/authenticated browser keys can read
-- nothing here directly; the server validates a token and the owner manages links
-- using the service-role key (which bypasses RLS). A link is valid iff it exists,
-- is not revoked, and is unexpired.

create table if not exists public.recruiter_links (
  token      text        primary key,          -- random UUID; the secret in /r/<token>
  label      text,                              -- owner's note, e.g. "Acme Corp — Jane"
  created_at timestamptz not null default now(),
  expires_at timestamptz,                       -- null = never expires
  revoked    boolean     not null default false
);

create index if not exists recruiter_links_created
  on public.recruiter_links (created_at desc);

-- RLS ON, no policies: only the service-role key (server-side) can touch this.
alter table public.recruiter_links enable row level security;
