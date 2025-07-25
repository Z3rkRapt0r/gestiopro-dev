-- Controllo le policy esistenti per il bucket documents
SELECT * FROM storage.objects WHERE bucket_id = 'documents' LIMIT 1;

-- Creo policy più permissive per permettere ai dipendenti di caricare documenti
CREATE POLICY "Users can upload documents to storage"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own documents in storage"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can manage all documents in storage"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Aggiorno la policy per la tabella documents per essere più permissiva
DROP POLICY IF EXISTS "Users can upload documents" ON public.documents;

CREATE POLICY "Users can upload documents"
ON public.documents
FOR INSERT
WITH CHECK (
  auth.uid() = uploaded_by AND
  (
    (is_personal = true AND user_id = auth.uid()) OR
    (is_personal = false)
  )
);