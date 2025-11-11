-- ============================================================================
-- FIX ULTIMO SECURITY WARNING RIMASTO
-- ============================================================================

-- FIX: get_blocked_overtime_dates function
CREATE OR REPLACE FUNCTION public.get_blocked_overtime_dates(
    p_user_id uuid,
    p_month integer,
    p_year integer
)
RETURNS TABLE(blocked_date date)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- ✅ AGGIUNTO
STABLE  -- ✅ AGGIUNTO per performance (indica che la funzione è read-only)
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT date as blocked_date
    FROM overtime_records
    WHERE user_id = p_user_id
    AND EXTRACT(MONTH FROM date) = p_month
    AND EXTRACT(YEAR FROM date) = p_year
    AND is_automatic = true
    ORDER BY blocked_date;
END;
$$;

-- Verifica che il fix sia stato applicato
SELECT
    '✅ Verifica funzione aggiornata' as titolo,
    proname as nome_funzione,
    prosecdef as security_definer,
    proconfig as configurazione
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND proname = 'get_blocked_overtime_dates';

-- ============================================================================
-- ISTRUZIONI PER GLI ALTRI 2 WARNING
-- ============================================================================

-- 1. LEAKED PASSWORD PROTECTION
--    Dashboard Supabase → Authentication → Policies
--    Abilita: "Check against HaveIBeenPwned database"

-- 2. POSTGRES VERSION UPGRADE
--    Dashboard Supabase → Settings → Infrastructure → Database
--    Clicca su "Upgrade" per applicare le patch di sicurezza
--    (Richiede circa 5-10 minuti di downtime)
