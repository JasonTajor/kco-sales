-- ============================================================================
-- 0008 - Storage buckets and their access policies (§41).
--
-- Three buckets, all private. Nothing here is public-read: this is an internal
-- tool, and a public bucket would make every uploaded asset reachable by URL
-- with no authentication at all.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  -- Profile pictures. Small, images only.
  ('avatars', 'avatars', false, 2 * 1024 * 1024,
   array['image/png','image/jpeg','image/webp','image/gif']),

  -- Images and video used inside lesson content.
  ('learning-assets', 'learning-assets', false, 25 * 1024 * 1024,
   array['image/png','image/jpeg','image/webp','image/svg+xml','video/mp4','video/webm']),

  -- Documents attached to modules or activities.
  ('attachments', 'attachments', false, 25 * 1024 * 1024,
   array['application/pdf','image/png','image/jpeg','image/webp',
         'text/plain','text/csv',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
         'application/vnd.openxmlformats-officedocument.presentationml.presentation',
         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict (id) do update
  set file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types,
      public             = excluded.public;

-- ---------------------------------------------------------------------------
-- avatars
--
-- Convention: a user's files live under a folder named with their uid, so
-- `storage.foldername(name)[1]` is the owner. That makes ownership a property
-- of the path rather than a separate column that could drift out of sync.
-- ---------------------------------------------------------------------------
create policy "avatars readable by signed-in users"
  on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and public.is_active_user());

create policy "avatars writable by owner"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars updatable by owner"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars deletable by owner or admin"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

-- ---------------------------------------------------------------------------
-- learning-assets and attachments: readable by any active user (they are
-- embedded in published lessons), writable by admins only.
-- ---------------------------------------------------------------------------
create policy "learning assets readable by signed-in users"
  on storage.objects for select to authenticated
  using (bucket_id in ('learning-assets','attachments') and public.is_active_user());

create policy "learning assets managed by admins"
  on storage.objects for insert to authenticated
  with check (bucket_id in ('learning-assets','attachments') and public.is_admin());

create policy "learning assets updatable by admins"
  on storage.objects for update to authenticated
  using (bucket_id in ('learning-assets','attachments') and public.is_admin());

create policy "learning assets deletable by admins"
  on storage.objects for delete to authenticated
  using (bucket_id in ('learning-assets','attachments') and public.is_admin());
