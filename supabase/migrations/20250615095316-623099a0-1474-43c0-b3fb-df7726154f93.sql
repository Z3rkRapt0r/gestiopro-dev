
-- Crea il bucket per gli allegati delle notifiche (privato)
insert into storage.buckets (id, name, public)
values ('notification-attachments', 'notification-attachments', false);

-- Permetti agli utenti autenticati di caricare (INSERT), leggere (SELECT) e cancellare (DELETE) solo i propri file in questo bucket 
-- (assumendo che la convenzione sia che il folder principale del file corrisponda a auth.uid())
create policy "Users can access own notification attachments"
on storage.objects
for all
using (
  bucket_id = 'notification-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Permetti agli admin di accedere a tutti i file del bucket (SELECT, INSERT, DELETE, UPDATE)
create policy "Admins can access all notification attachments"
on storage.objects
for all
using (
  bucket_id = 'notification-attachments'
  and exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  )
);
