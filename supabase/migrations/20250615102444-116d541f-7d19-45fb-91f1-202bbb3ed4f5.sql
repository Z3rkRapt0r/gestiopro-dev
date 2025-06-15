
-- Crea il bucket pubblico per i loghi email
insert into storage.buckets(id, name, public)
values ('company-assets', 'company-assets', true);

-- Policy per INSERT (usa WITH CHECK)
create policy "Public upload of company logo" on storage.objects
  for insert
  with check (bucket_id = 'company-assets');

-- Policy per UPDATE (usa USING)
create policy "Public update company logo" on storage.objects
  for update
  using (bucket_id = 'company-assets');

-- Policy per DELETE (usa USING)
create policy "Public delete company logo" on storage.objects
  for delete
  using (bucket_id = 'company-assets');

-- Policy per SELECT (usa USING)
create policy "Public read company logo" on storage.objects
  for select
  using (bucket_id = 'company-assets');
