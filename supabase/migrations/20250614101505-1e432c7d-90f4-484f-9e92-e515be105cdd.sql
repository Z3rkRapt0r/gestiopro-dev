
-- Policy per la tabella 'documents':
-- Permette agli utenti di visualizzare i documenti contrassegnati come non personali (aziendali).
-- Questa policy si aggiunge a quella esistente che permette agli utenti di vedere i propri documenti.
CREATE POLICY "Employees can view company documents"
  ON public.documents
  FOR SELECT
  USING (is_personal = false);

-- Policy per lo storage (bucket 'documents'):
-- Permette agli utenti di accedere ai file memorizzati nella cartella 'company_documents'.
-- Questa policy si aggiunge a quella esistente che permette agli utenti di accedere ai file nelle proprie cartelle personali.
CREATE POLICY "Users can access files in company_documents folder"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = 'company_documents'
  );

-- Per completezza, assicuriamoci che gli admin possano inserire file anche in 'company_documents'
-- La policy "Admins can access all documents" esistente per storage.objects dovrebbe già coprire questo,
-- ma esplicitare l'insert può essere utile se quella policy fosse più restrittiva per INSERT.
-- Verifichiamo la policy Admin esistente: "FOR ALL USING (...)" quindi copre SELECT, INSERT, UPDATE, DELETE. Non serve una nuova policy di insert per admin.

