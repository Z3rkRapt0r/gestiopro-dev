-- ============================================================================
-- CONFIGURAZIONE ORARI LAVORATIVI AZIENDALI E DIPENDENTI
-- ============================================================================
-- Script per popolare le tabelle work_schedules e employee_work_schedules
-- Necessario per il funzionamento del sistema di monitoraggio presenze

-- Prima verifica se le tabelle esistono
DO $$
BEGIN
    -- Crea tabella work_schedules se non esiste
    CREATE TABLE IF NOT EXISTS public.work_schedules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        monday BOOLEAN DEFAULT true,
        tuesday BOOLEAN DEFAULT true,
        wednesday BOOLEAN DEFAULT true,
        thursday BOOLEAN DEFAULT true,
        friday BOOLEAN DEFAULT true,
        saturday BOOLEAN DEFAULT false,
        sunday BOOLEAN DEFAULT false,
        start_time TIME NOT NULL DEFAULT '08:00:00',
        end_time TIME NOT NULL DEFAULT '17:00:00',
        break_start TIME,
        break_end TIME,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );

    -- Crea tabella employee_work_schedules se non esiste
    CREATE TABLE IF NOT EXISTS public.employee_work_schedules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        work_days TEXT[] DEFAULT ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        start_time TIME NOT NULL DEFAULT '08:00:00',
        end_time TIME NOT NULL DEFAULT '17:00:00',
        break_start TIME,
        break_end TIME,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

        UNIQUE(employee_id)
    );

    RAISE NOTICE 'Tabelle work_schedules e employee_work_schedules verificate/creare';
END $$;

-- ============================================================================
-- POPOLA ORARI AZIENDALI DI DEFAULT
-- ============================================================================

-- Inserisci orari aziendali di default (se non esistono)
INSERT INTO public.work_schedules (
    monday, tuesday, wednesday, thursday, friday, saturday, sunday,
    start_time, end_time, break_start, break_end
) VALUES (
    true, true, true, true, true, false, false,
    '08:00:00', '17:00:00', '12:00:00', '13:00:00'
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- VERIFICA CONFIGURAZIONE
-- ============================================================================

-- Mostra configurazione attuale
SELECT
    'Orari Aziendali Configurati' as tipo,
    COUNT(*) as totale,
    json_agg(json_build_object(
        'id', id,
        'orari', json_build_object(
            'lun', monday, 'mar', tuesday, 'mer', wednesday, 'gio', thursday, 'ven', friday,
            'sab', saturday, 'dom', sunday,
            'inizio', start_time, 'fine', end_time,
            'pausa_inizio', break_start, 'pausa_fine', break_end
        )
    )) as dettagli
FROM work_schedules;

SELECT
    'Dipendenti con Orari Personalizzati' as tipo,
    COUNT(*) as totale,
    CASE
        WHEN COUNT(*) > 0 THEN 'Alcuni dipendenti hanno orari personalizzati'
        ELSE 'Tutti i dipendenti usano orari aziendali'
    END as nota
FROM employee_work_schedules
WHERE is_active = true;

-- ============================================================================
-- ESEMPI DI CONFIGURAZIONE ORARI PERSONALIZZATI
-- ============================================================================

/*
-- Esempio: Dipendente che lavora part-time lunedì-mercoledì
INSERT INTO public.employee_work_schedules (
    employee_id,
    work_days,
    start_time,
    end_time
) VALUES (
    'uuid-del-dipendente',  -- Sostituisci con l'UUID reale del dipendente
    ARRAY['monday', 'wednesday', 'friday'],
    '09:00:00',
    '15:00:00'
) ON CONFLICT (employee_id) DO UPDATE SET
    work_days = EXCLUDED.work_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    updated_at = now();

-- Esempio: Dipendente che lavora sabato
INSERT INTO public.employee_work_schedules (
    employee_id,
    work_days,
    start_time,
    end_time
) VALUES (
    'uuid-del-dipendente',  -- Sostituisci con l'UUID reale del dipendente
    ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
    '08:00:00',
    '12:00:00'
) ON CONFLICT (employee_id) DO UPDATE SET
    work_days = EXCLUDED.work_days,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    updated_at = now();
*/

-- ============================================================================
-- TEST DEL SISTEMA DOPO CONFIGURAZIONE
-- ============================================================================

-- Test: conta dipendenti che il sistema può monitorare
SELECT
    'Test Sistema Monitoraggio' as verifica,
    COUNT(DISTINCT p.id) as dipendenti_monitorabili,
    COUNT(DISTINCT ews.employee_id) as con_orari_personalizzati,
    COUNT(DISTINCT CASE WHEN ews.employee_id IS NULL THEN p.id END) as usano_orari_aziendali
FROM profiles p
LEFT JOIN employee_work_schedules ews ON p.id = ews.employee_id AND ews.is_active = true
CROSS JOIN work_schedules ws
WHERE p.role = 'employee' AND p.is_active = true;

-- Mostra esempio di come il sistema calcolerebbe gli orari oggi
SELECT
    'Esempio Calcolo Orari Oggi' as esempio,
    CURRENT_DATE as data_oggi,
    EXTRACT(DOW FROM CURRENT_DATE) as giorno_settimana,
    CASE EXTRACT(DOW FROM CURRENT_DATE)
        WHEN 0 THEN 'domenica'
        WHEN 1 THEN 'lunedì'
        WHEN 2 THEN 'martedì'
        WHEN 3 THEN 'mercoledì'
        WHEN 4 THEN 'giovedì'
        WHEN 5 THEN 'venerdì'
        WHEN 6 THEN 'sabato'
    END as nome_giorno,
    ws.start_time as orario_azienda,
    ws.monday, ws.tuesday, ws.wednesday, ws.thursday, ws.friday, ws.saturday, ws.sunday
FROM work_schedules ws
LIMIT 1;

RAISE NOTICE 'Configurazione completata! Ora il sistema può monitorare le presenze.';
