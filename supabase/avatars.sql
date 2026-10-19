-- Profile pictures. Run once in the Supabase SQL editor (idempotent).
--
-- Design: avatars are not sensitive, so the bucket is PUBLIC (served as a plain
-- cached URL). Writes go through the app's server route using the service-role
-- key, so the user's own profile row is updated for them WITHOUT a profiles
-- UPDATE policy (which would also let a user change their own `role`). The
-- per-user storage policies below are defense-in-depth for the authenticated key,
-- scoping any direct write to a folder named by the caller's own id.

-- 1. Where the URL is stored (on the existing profiles row).
alter table public.profiles add column if not exists avatar_url text;

-- 2. A public bucket for the images.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- 3. Storage RLS (defense-in-depth; the server uses service-role and bypasses it).
--    Path convention: "<user-id>/avatar.<ext>" — the first folder segment is the
--    owner's id, so each user can only touch their own file.
drop policy if exists "avatars_public_read"   on storage.objects;
drop policy if exists "avatars_own_insert"     on storage.objects;
drop policy if exists "avatars_own_update"     on storage.objects;
drop policy if exists "avatars_own_delete"     on storage.objects;

create policy "avatars_public_read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars_own_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_own_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_own_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
