
-- Aggiungi la colonna sender_name per personalizzare il nome del mittente nel modello globale email
ALTER TABLE public.email_templates ADD COLUMN sender_name TEXT;

-- Facoltativo: aggiorna tutti i template esistenti con il precedente default come esempio
UPDATE public.email_templates SET sender_name = 'Admin SerramentiCorp - Sistema notifiche' WHERE sender_name IS NULL;
