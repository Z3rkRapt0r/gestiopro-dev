-- ============================================================================
-- AGGIUNGI CONFIGURAZIONE SUPABASE ALLE IMPOSTAZIONI ADMIN
-- ============================================================================
-- Esegui questo script nel SQL Editor di Supabase Dashboard
-- ============================================================================

-- Aggiungi colonne
ALTER TABLE public.admin_settings
ADD COLUMN IF NOT EXISTS supabase_url TEXT,
ADD COLUMN IF NOT EXISTS supabase_service_role_key TEXT;

-- Verifica
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'admin_settings' 
  AND column_name IN ('supabase_url', 'supabase_service_role_key')
ORDER BY column_name;


