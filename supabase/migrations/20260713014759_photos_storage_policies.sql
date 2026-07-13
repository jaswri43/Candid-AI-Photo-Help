-- Photos storage bucket + RLS policies
--
-- Candid is a single-profile, no-auth app for v1 (see CLAUDE.md), so all
-- storage access from the app goes through the anon key. These policies
-- scope that access to the "photos" bucket only, rather than opening up
-- storage.objects more broadly.

-- Create the bucket if it doesn't already exist, and make it public so
-- getPublicUrl() (used in src/utils/uploadImage.ts) resolves to a URL that
-- serves the image directly, without needing a signed URL.
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do update set public = true;

-- Allow uploads from the anon key, scoped to the "photos" bucket only.
create policy "Public can upload to photos bucket"
on storage.objects
for insert
to anon
with check (bucket_id = 'photos');

-- Allow reads from the anon key, scoped to the "photos" bucket only.
-- Belt-and-suspenders alongside the bucket's public flag above — covers
-- non-public-URL reads (e.g. storage.list()) and keeps this working if the
-- bucket is ever switched to private.
create policy "Public can read photos bucket"
on storage.objects
for select
to anon
using (bucket_id = 'photos');
