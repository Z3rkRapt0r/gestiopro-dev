-- ============================================================================
-- MIGRAZIONE: Ottimizzazione tabelle presenze
-- Data: 2025-01-17
-- Descrizione: Separazione presenze automatiche e manuali per ottimizzare il database
-- ============================================================================

-- 1. AGGIUNGERE COLONNE MANCANTI ALLA TABELLA attendances (presenze automatiche)
-- ============================================================================

-- Aggiungere colonne per tracking ritardi e organizzazione italiana
ALTER TABLE public.attendances 
ADD COLUMN IF NOT EXISTS is_late BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS late_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS operation_path TEXT,
ADD COLUMN IF NOT EXISTS readable_id TEXT,
ADD COLUMN IF NOT EXISTS is_sick_leave BOOLEAN DEFAULT FALSE;

-- Aggiungere commenti per documentare i nuovi campi
COMMENT ON COLUMN public.attendances.is_late IS 'Indica se il dipendente è arrivato in ritardo';
COMMENT ON COLUMN public.attendances.late_minutes IS 'Numero di minuti di ritardo rispetto all''orario previsto + tolleranza';
COMMENT ON COLUMN public.attendances.operation_path IS 'Path organizzativo italiano per tracciabilità';
COMMENT ON COLUMN public.attendances.readable_id IS 'ID leggibile per identificazione italiana';
COMMENT ON COLUMN public.attendances.is_sick_leave IS 'Indica se è una presenza durante malattia';

-- 2. AGGIUNGERE COLONNE MANCANTI ALLA TABELLA manual_attendances (presenze manuali)
-- ============================================================================

-- Aggiungere colonne per tracking ritardi e organizzazione italiana
ALTER TABLE public.manual_attendances 
ADD COLUMN IF NOT EXISTS is_late BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS late_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS operation_path TEXT,
ADD COLUMN IF NOT EXISTS readable_id TEXT,
ADD COLUMN IF NOT EXISTS is_sick_leave BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_business_trip BOOLEAN DEFAULT FALSE;

-- Aggiungere commenti per documentare i nuovi campi
COMMENT ON COLUMN public.manual_attendances.is_late IS 'Indica se il dipendente è arrivato in ritardo';
COMMENT ON COLUMN public.manual_attendances.late_minutes IS 'Numero di minuti di ritardo rispetto all''orario previsto + tolleranza';
COMMENT ON COLUMN public.manual_attendances.operation_path IS 'Path organizzativo italiano per tracciabilità';
COMMENT ON COLUMN public.manual_attendances.readable_id IS 'ID leggibile per identificazione italiana';
COMMENT ON COLUMN public.manual_attendances.is_sick_leave IS 'Indica se è una presenza durante malattia';
COMMENT ON COLUMN public.manual_attendances.is_business_trip IS 'Indica se è una presenza in trasferta';

-- 3. MIGRARE DATI DA unified_attendances ALLE TABELLE CORRETTE
-- ============================================================================

-- Migrare presenze automatiche (is_manual = false) alla tabella attendances
INSERT INTO public.attendances (
    user_id, 
    date, 
    check_in_time, 
    check_out_time, 
    created_at, 
    updated_at,
    is_late,
    late_minutes,
    operation_path,
    readable_id,
    is_sick_leave
)
SELECT 
    user_id,
    date,
    check_in_time::TIMESTAMP WITH TIME ZONE,
    check_out_time::TIMESTAMP WITH TIME ZONE,
    created_at,
    updated_at,
    COALESCE(is_late, false),
    COALESCE(late_minutes, 0),
    operation_path,
    readable_id,
    COALESCE(is_sick_leave, false)
FROM public.unified_attendances 
WHERE is_manual = false
ON CONFLICT (user_id, date) 
DO UPDATE SET
    check_in_time = EXCLUDED.check_in_time,
    check_out_time = EXCLUDED.check_out_time,
    updated_at = EXCLUDED.updated_at,
    is_late = EXCLUDED.is_late,
    late_minutes = EXCLUDED.late_minutes,
    operation_path = EXCLUDED.operation_path,
    readable_id = EXCLUDED.readable_id,
    is_sick_leave = EXCLUDED.is_sick_leave;

-- Migrare presenze manuali (is_manual = true) alla tabella manual_attendances
INSERT INTO public.manual_attendances (
    user_id, 
    date, 
    check_in_time, 
    check_out_time, 
    notes,
    created_by,
    created_at, 
    updated_at,
    is_late,
    late_minutes,
    operation_path,
    readable_id,
    is_sick_leave,
    is_business_trip
)
SELECT 
    user_id,
    date,
    check_in_time::TIMESTAMP WITH TIME ZONE,
    check_out_time::TIMESTAMP WITH TIME ZONE,
    notes,
    created_by,
    created_at,
    updated_at,
    COALESCE(is_late, false),
    COALESCE(late_minutes, 0),
    operation_path,
    readable_id,
    COALESCE(is_sick_leave, false),
    COALESCE(is_business_trip, false)
FROM public.unified_attendances 
WHERE is_manual = true
ON CONFLICT (user_id, date) 
DO UPDATE SET
    check_in_time = EXCLUDED.check_in_time,
    check_out_time = EXCLUDED.check_out_time,
    notes = EXCLUDED.notes,
    created_by = EXCLUDED.created_by,
    updated_at = EXCLUDED.updated_at,
    is_late = EXCLUDED.is_late,
    late_minutes = EXCLUDED.late_minutes,
    operation_path = EXCLUDED.operation_path,
    readable_id = EXCLUDED.readable_id,
    is_sick_leave = EXCLUDED.is_sick_leave,
    is_business_trip = EXCLUDED.is_business_trip;

-- 4. AGGIORNARE INDICI PER PERFORMANCE
-- ============================================================================

-- Indici per la tabella attendances
CREATE INDEX IF NOT EXISTS idx_attendances_is_late ON public.attendances(is_late);
CREATE INDEX IF NOT EXISTS idx_attendances_operation_path ON public.attendances(operation_path);
CREATE INDEX IF NOT EXISTS idx_attendances_readable_id ON public.attendances(readable_id);

-- Indici per la tabella manual_attendances
CREATE INDEX IF NOT EXISTS idx_manual_attendances_created_by ON public.manual_attendances(created_by);
CREATE INDEX IF NOT EXISTS idx_manual_attendances_is_late ON public.manual_attendances(is_late);
CREATE INDEX IF NOT EXISTS idx_manual_attendances_operation_path ON public.manual_attendances(operation_path);
CREATE INDEX IF NOT EXISTS idx_manual_attendances_readable_id ON public.manual_attendances(readable_id);

-- 5. VERIFICA MIGRAZIONE
-- ============================================================================

-- Controllare che tutti i dati siano stati migrati correttamente
DO $$
DECLARE
    unified_count INTEGER;
    attendances_count INTEGER;
    manual_attendances_count INTEGER;
    automatic_count INTEGER;
    manual_count INTEGER;
BEGIN
    -- Contare record in unified_attendances
    SELECT COUNT(*) INTO unified_count FROM public.unified_attendances;
    
    -- Contare record automatici in unified_attendances
    SELECT COUNT(*) INTO automatic_count FROM public.unified_attendances WHERE is_manual = false;
    
    -- Contare record manuali in unified_attendances
    SELECT COUNT(*) INTO manual_count FROM public.unified_attendances WHERE is_manual = true;
    
    -- Contare record in attendances
    SELECT COUNT(*) INTO attendances_count FROM public.attendances;
    
    -- Contare record in manual_attendances
    SELECT COUNT(*) INTO manual_attendances_count FROM public.manual_attendances;
    
    -- Log dei risultati
    RAISE NOTICE '=== VERIFICA MIGRAZIONE ===';
    RAISE NOTICE 'Record in unified_attendances: %', unified_count;
    RAISE NOTICE 'Record automatici in unified_attendances: %', automatic_count;
    RAISE NOTICE 'Record manuali in unified_attendances: %', manual_count;
    RAISE NOTICE 'Record in attendances: %', attendances_count;
    RAISE NOTICE 'Record in manual_attendances: %', manual_attendances_count;
    
    -- Verificare che la migrazione sia corretta
    IF automatic_count = attendances_count AND manual_count = manual_attendances_count THEN
        RAISE NOTICE '✅ MIGRAZIONE COMPLETATA CON SUCCESSO';
    ELSE
        RAISE NOTICE '❌ ERRORE NELLA MIGRAZIONE - Verificare i dati';
    END IF;
END $$;

-- 6. AGGIORNAMENTO POLICY RLS
-- ============================================================================

-- Policy per manual_attendances - permettere agli admin di vedere tutto
CREATE POLICY IF NOT EXISTS "Admins can view all manual attendances" ON public.manual_attendances
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy per permettere agli utenti di vedere solo le proprie presenze manuali
CREATE POLICY IF NOT EXISTS "Users can view own manual attendances" ON public.manual_attendances
  FOR SELECT USING (user_id = auth.uid());

-- Policy per permettere agli admin di gestire presenze manuali
CREATE POLICY IF NOT EXISTS "Admins can manage manual attendances" ON public.manual_attendances
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy per permettere agli utenti di gestire le proprie presenze manuali
CREATE POLICY IF NOT EXISTS "Users can manage own manual attendances" ON public.manual_attendances
  FOR ALL USING (user_id = auth.uid());

-- 7. TRIGGER PER AGGIORNARE updated_at
-- ============================================================================

-- Trigger per aggiornare updated_at in manual_attendances
CREATE OR REPLACE FUNCTION update_manual_attendances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language plpgsql;

CREATE TRIGGER IF NOT EXISTS trigger_update_manual_attendances_updated_at
  BEFORE UPDATE ON public.manual_attendances
  FOR EACH ROW EXECUTE PROCEDURE update_manual_attendances_updated_at();

-- 8. CREARE VISTA UNIFICATA PER COMPATIBILITÀ TEMPORANEA
-- ============================================================================

-- Vista per mantenere compatibilità temporanea con il codice esistente
CREATE OR REPLACE VIEW public.unified_attendances_view AS
SELECT 
    id,
    user_id,
    date,
    check_in_time::TEXT as check_in_time,
    check_out_time::TEXT as check_out_time,
    false as is_manual,
    false as is_business_trip,
    COALESCE(is_sick_leave, false) as is_sick_leave,
    COALESCE(is_late, false) as is_late,
    COALESCE(late_minutes, 0) as late_minutes,
    operation_path,
    readable_id,
    null as notes,
    null as created_by,
    created_at,
    updated_at
FROM public.attendances
UNION ALL
SELECT 
    id,
    user_id,
    date,
    check_in_time::TEXT as check_in_time,
    check_out_time::TEXT as check_out_time,
    true as is_manual,
    COALESCE(is_business_trip, false) as is_business_trip,
    COALESCE(is_sick_leave, false) as is_sick_leave,
    COALESCE(is_late, false) as is_late,
    COALESCE(late_minutes, 0) as late_minutes,
    operation_path,
    readable_id,
    notes,
    created_by,
    created_at,
    updated_at
FROM public.manual_attendances;

-- Abilitare RLS sulla vista
ALTER VIEW public.unified_attendances_view SET (security_invoker = true);

-- 9. NOTA IMPORTANTE
-- ============================================================================

-- IMPORTANTE: Dopo aver aggiornato tutto il codice per usare le tabelle corrette,
-- eseguire lo script cleanup_attendance_tables.sql per rimuovere unified_attendances
-- e la vista temporanea.

RAISE NOTICE '=== MIGRAZIONE COMPLETATA ===';
RAISE NOTICE 'Le tabelle attendances e manual_attendances sono state ottimizzate';
RAISE NOTICE 'I dati sono stati migrati da unified_attendances';
RAISE NOTICE 'È stata creata una vista temporanea per compatibilità';
RAISE NOTICE 'Prossimo passo: Aggiornare il codice React per usare le tabelle corrette';
