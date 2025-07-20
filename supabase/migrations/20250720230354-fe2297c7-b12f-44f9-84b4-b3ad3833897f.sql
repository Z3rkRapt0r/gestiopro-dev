-- Correggo la policy per gestire correttamente i documenti personali e aziendali
DROP POLICY IF EXISTS "Users can upload their own documents" ON public.documents;

CREATE POLICY "Users can upload documents"
ON public.documents  
FOR INSERT
WITH CHECK (
  auth.uid() = uploaded_by AND (
    -- Per documenti personali: user_id deve essere uguale a uploaded_by
    (is_personal = true AND user_id = auth.uid()) OR
    -- Per documenti aziendali: uploaded_by può caricare per qualsiasi user_id
    (is_personal = false)
  )
);