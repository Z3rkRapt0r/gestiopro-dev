
-- Rimuovi il constraint esistente e creane uno nuovo con tutti i valori necessari
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Aggiungi un nuovo constraint con tutti i tipi di notifica che utilizziamo
ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('document', 'system', 'message', 'announcement', 'Aggiornamenti aziendali', 'Comunicazioni importanti', 'Eventi', 'Avvisi sicurezza'));
