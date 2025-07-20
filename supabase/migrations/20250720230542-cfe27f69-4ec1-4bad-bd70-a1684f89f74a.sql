-- Aggiungo policy per permettere agli utenti di caricare file nelle proprie cartelle
CREATE POLICY "Users can upload files in their own folder"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Aggiungo policy per permettere agli utenti di accedere ai propri file
CREATE POLICY "Users can access their own files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Aggiungo policy per permettere agli utenti di aggiornare i propri file
CREATE POLICY "Users can update their own files"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Aggiungo policy per permettere agli utenti di eliminare i propri file
CREATE POLICY "Users can delete their own files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);