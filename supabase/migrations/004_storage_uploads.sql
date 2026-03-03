insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'plush-images',
  'plush-images',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read plush images" on storage.objects;
create policy "Public can read plush images"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'plush-images');

drop policy if exists "Authenticated can upload plush images" on storage.objects;
create policy "Authenticated can upload plush images"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'plush-images');
