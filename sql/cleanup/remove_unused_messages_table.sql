-- ============================================================================
-- RIMOZIONE TABELLA MESSAGES NON UTILIZZATA
-- ============================================================================
-- Questa migrazione rimuove la tabella messages che non è utilizzata
-- nell'applicazione. La funzionalità di messaggi è gestita dalla tabella
-- notifications con type: "message"
-- Data: 2025-01-17

-- ============================================================================
-- 1. VERIFICA CHE LA TABELLA SIA VUOTA (opzionale)
-- ============================================================================
-- SELECT COUNT(*) FROM public.messages; -- Dovrebbe restituire 0

-- ============================================================================
-- 2. RIMOZIONE TABELLA E VINCOLI
-- ============================================================================

-- Rimuovi foreign key constraints se esistono
DO $$ 
BEGIN
    -- Rimuovi foreign key da sender_id se esiste
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'messages_sender_id_fkey' 
        AND table_name = 'messages'
    ) THEN
        ALTER TABLE public.messages DROP CONSTRAINT messages_sender_id_fkey;
    END IF;
    
    -- Rimuovi foreign key da recipient_id se esiste
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'messages_recipient_id_fkey' 
        AND table_name = 'messages'
    ) THEN
        ALTER TABLE public.messages DROP CONSTRAINT messages_recipient_id_fkey;
    END IF;
END $$;

-- Rimuovi RLS policies se esistono
DROP POLICY IF EXISTS "Users can view their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can insert their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.messages;

-- Disabilita RLS se abilitato
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;

-- Rimuovi la tabella
DROP TABLE IF EXISTS public.messages;

-- ============================================================================
-- 3. VERIFICA RIMOZIONE
-- ============================================================================
-- Verifica che la tabella sia stata rimossa
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' AND table_name = 'messages';
-- Dovrebbe restituire 0 righe

-- ============================================================================
-- NOTE:
-- - La funzionalità di messaggi continua a funzionare tramite la tabella notifications
-- - Tutti i componenti utilizzano notifications con type: "message"
-- - Nessun codice dell'applicazione sarà impattato
-- ============================================================================
