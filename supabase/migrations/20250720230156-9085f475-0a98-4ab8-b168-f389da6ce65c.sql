-- Aggiornare la policy per permettere ai dipendenti di inserire documenti personali
DROP POLICY IF EXISTS "Users can upload documents" ON public.documents;

CREATE POLICY "Users can upload their own documents"
ON public.documents
FOR INSERT
WITH CHECK (auth.uid() = user_id AND auth.uid() = uploaded_by);