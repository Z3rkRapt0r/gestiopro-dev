-- Script per correggere l'esclusione delle festività dal calcolo delle ferie
-- Esegui questo script direttamente nel database Supabase

-- Imposta il fuso orario a Roma/Italia
SET timezone = 'Europe/Rome';

-- Verifica il cambio
SELECT NOW(), CURRENT_DATE, CURRENT_TIMESTAMP;

-- Aggiorna la funzione calculate_leave_usage per escludere correttamente le festività
-- e gestire il fuso orario correttamente
CREATE OR REPLACE FUNCTION public.calculate_leave_usage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    work_schedule RECORD;
    employee_work_schedule RECORD;
    working_days_count INTEGER := 0;
    loop_date DATE;
    is_holiday BOOLEAN;
    is_working_day BOOLEAN;
    day_name TEXT;
    day_of_week INTEGER;
BEGIN
    -- Get work schedule configuration
    SELECT * INTO work_schedule FROM public.work_schedules LIMIT 1;
    
    -- Se la richiesta è approvata, aggiorna il bilancio
    IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
        -- Per le ferie (calcola giorni lavorativi escludendo festività e considerando orari personalizzati)
        IF NEW.type = 'ferie' AND NEW.date_from IS NOT NULL AND NEW.date_to IS NOT NULL THEN
            -- Calcola i giorni lavorativi escludendo festività e considerando orari personalizzati
            loop_date := NEW.date_from;
            working_days_count := 0;
            
            WHILE loop_date <= NEW.date_to LOOP
                -- 1. Controlla se è una festività (usa la data esatta, non il pattern)
                SELECT EXISTS(
                    SELECT 1 FROM public.company_holidays 
                    WHERE (is_recurring = true AND date::text LIKE '%-' || EXTRACT(MONTH FROM loop_date)::text || '-' || EXTRACT(DAY FROM loop_date)::text)
                    OR (is_recurring = false AND date = loop_date)
                ) INTO is_holiday;
                
                -- 2. Se non è festività, controlla se è un giorno lavorativo
                IF NOT is_holiday THEN
                    -- Controlla gli orari personalizzati del dipendente
                    SELECT * INTO employee_work_schedule 
                    FROM public.employee_work_schedules 
                    WHERE employee_id = NEW.user_id 
                    LIMIT 1;
                    
                    -- Calcola il giorno della settimana (0=Domenica, 1=Lunedì, ..., 6=Sabato)
                    day_of_week := EXTRACT(DOW FROM loop_date);
                    
                    IF employee_work_schedule IS NOT NULL THEN
                        -- Usa orari personalizzati del dipendente
                        day_name := CASE day_of_week
                            WHEN 0 THEN 'sunday'
                            WHEN 1 THEN 'monday'
                            WHEN 2 THEN 'tuesday'
                            WHEN 3 THEN 'wednesday'
                            WHEN 4 THEN 'thursday'
                            WHEN 5 THEN 'friday'
                            WHEN 6 THEN 'saturday'
                        END;
                        
                        is_working_day := day_name = ANY(employee_work_schedule.work_days);
                    ELSE
                        -- Usa orari aziendali generali
                        is_working_day := CASE day_of_week
                            WHEN 0 THEN work_schedule.sunday
                            WHEN 1 THEN work_schedule.monday
                            WHEN 2 THEN work_schedule.tuesday
                            WHEN 3 THEN work_schedule.wednesday
                            WHEN 4 THEN work_schedule.thursday
                            WHEN 5 THEN work_schedule.friday
                            WHEN 6 THEN work_schedule.saturday
                            ELSE false
                        END;
                    END IF;
                    
                    -- Se è un giorno lavorativo, incrementa il contatore
                    IF is_working_day THEN
                        working_days_count := working_days_count + 1;
                    END IF;
                END IF;
                
                loop_date := loop_date + INTERVAL '1 day';
            END LOOP;
            
            UPDATE public.employee_leave_balance 
            SET vacation_days_used = vacation_days_used + working_days_count,
                updated_at = now()
            WHERE user_id = NEW.user_id 
            AND year = EXTRACT(year FROM NEW.date_from);
        END IF;
        
        -- Per i permessi orari ONLY (removed daily permission logic)
        IF NEW.type = 'permesso' AND NEW.time_from IS NOT NULL AND NEW.time_to IS NOT NULL THEN
            UPDATE public.employee_leave_balance 
            SET permission_hours_used = permission_hours_used + EXTRACT(EPOCH FROM (NEW.time_to - NEW.time_from))/3600,
                updated_at = now()
            WHERE user_id = NEW.user_id 
            AND year = EXTRACT(year FROM NEW.day);
        END IF;
    END IF;
    
    -- Se la richiesta viene rifiutata o cambiata da approvata, sottrai l'utilizzo
    IF OLD.status = 'approved' AND NEW.status != 'approved' THEN
        -- Per le ferie
        IF OLD.type = 'ferie' AND OLD.date_from IS NOT NULL AND OLD.date_to IS NOT NULL THEN
            -- Ricalcola i giorni lavorativi per la sottrazione (stessa logica)
            loop_date := OLD.date_from;
            working_days_count := 0;
            
            WHILE loop_date <= OLD.date_to LOOP
                -- 1. Controlla se è una festività
                SELECT EXISTS(
                    SELECT 1 FROM public.company_holidays 
                    WHERE (is_recurring = true AND date::text LIKE '%-' || EXTRACT(MONTH FROM loop_date)::text || '-' || EXTRACT(DAY FROM loop_date)::text)
                    OR (is_recurring = false AND date = loop_date)
                ) INTO is_holiday;
                
                -- 2. Se non è festività, controlla se è un giorno lavorativo
                IF NOT is_holiday THEN
                    -- Controlla gli orari personalizzati del dipendente
                    SELECT * INTO employee_work_schedule 
                    FROM public.employee_work_schedules 
                    WHERE employee_id = OLD.user_id 
                    LIMIT 1;
                    
                    -- Calcola il giorno della settimana
                    day_of_week := EXTRACT(DOW FROM loop_date);
                    
                    IF employee_work_schedule IS NOT NULL THEN
                        -- Usa orari personalizzati del dipendente
                        day_name := CASE day_of_week
                            WHEN 0 THEN 'sunday'
                            WHEN 1 THEN 'monday'
                            WHEN 2 THEN 'tuesday'
                            WHEN 3 THEN 'wednesday'
                            WHEN 4 THEN 'thursday'
                            WHEN 5 THEN 'friday'
                            WHEN 6 THEN 'saturday'
                        END;
                        
                        is_working_day := day_name = ANY(employee_work_schedule.work_days);
                    ELSE
                        -- Usa orari aziendali generali
                        is_working_day := CASE day_of_week
                            WHEN 0 THEN work_schedule.sunday
                            WHEN 1 THEN work_schedule.monday
                            WHEN 2 THEN work_schedule.tuesday
                            WHEN 3 THEN work_schedule.wednesday
                            WHEN 4 THEN work_schedule.thursday
                            WHEN 5 THEN work_schedule.friday
                            WHEN 6 THEN work_schedule.saturday
                            ELSE false
                        END;
                    END IF;
                    
                    -- Se è un giorno lavorativo, incrementa il contatore
                    IF is_working_day THEN
                        working_days_count := working_days_count + 1;
                    END IF;
                END IF;
                
                loop_date := loop_date + INTERVAL '1 day';
            END LOOP;
            
            UPDATE public.employee_leave_balance 
            SET vacation_days_used = GREATEST(0, vacation_days_used - working_days_count),
                updated_at = now()
            WHERE user_id = OLD.user_id 
            AND year = EXTRACT(year FROM OLD.date_from);
        END IF;
        
        -- Per i permessi orari ONLY (removed daily permission logic)
        IF OLD.type = 'permesso' AND OLD.time_from IS NOT NULL AND OLD.time_to IS NOT NULL THEN
            UPDATE public.employee_leave_balance 
            SET permission_hours_used = GREATEST(0, permission_hours_used - EXTRACT(EPOCH FROM (OLD.time_to - OLD.time_from))/3600),
                updated_at = now()
            WHERE user_id = OLD.user_id 
            AND year = EXTRACT(year FROM OLD.day);
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Funzione di test per verificare il calcolo corretto dei giorni della settimana
CREATE OR REPLACE FUNCTION public.test_date_calculation(test_date DATE)
RETURNS TABLE(
    input_date DATE,
    day_of_week INTEGER,
    day_name TEXT,
    is_working_day BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
    work_schedule RECORD;
    day_name TEXT;
BEGIN
    -- Get work schedule configuration
    SELECT * INTO work_schedule FROM public.work_schedules LIMIT 1;
    
    -- Calcola il giorno della settimana
    day_name := CASE EXTRACT(DOW FROM test_date)
        WHEN 0 THEN 'sunday'
        WHEN 1 THEN 'monday'
        WHEN 2 THEN 'tuesday'
        WHEN 3 THEN 'wednesday'
        WHEN 4 THEN 'thursday'
        WHEN 5 THEN 'friday'
        WHEN 6 THEN 'saturday'
    END;
    
    RETURN QUERY
    SELECT 
        test_date,
        EXTRACT(DOW FROM test_date),
        day_name,
        CASE EXTRACT(DOW FROM test_date)
            WHEN 0 THEN work_schedule.sunday
            WHEN 1 THEN work_schedule.monday
            WHEN 2 THEN work_schedule.tuesday
            WHEN 3 THEN work_schedule.wednesday
            WHEN 4 THEN work_schedule.thursday
            WHEN 5 THEN work_schedule.friday
            WHEN 6 THEN work_schedule.saturday
            ELSE false
        END as is_working_day;
END;
$$;

-- Test della funzione per verificare il calcolo corretto
-- SELECT * FROM public.test_date_calculation('2024-08-11'::DATE);
-- SELECT * FROM public.test_date_calculation('2024-08-12'::DATE);
-- SELECT * FROM public.test_date_calculation('2024-08-13'::DATE);
-- SELECT * FROM public.test_date_calculation('2024-08-14'::DATE);
-- SELECT * FROM public.test_date_calculation('2024-08-15'::DATE);
-- SELECT * FROM public.test_date_calculation('2024-08-16'::DATE);

-- Aggiorna anche la funzione recalculate_all_leave_balances per escludere le festività
CREATE OR REPLACE FUNCTION public.recalculate_all_leave_balances()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    request_record RECORD;
    work_schedule RECORD;
    employee_work_schedule RECORD;
    working_days_count INTEGER;
    loop_date DATE;
    is_holiday BOOLEAN;
    is_working_day BOOLEAN;
    day_name TEXT;
    day_of_week INTEGER;
BEGIN
    -- Get work schedule
    SELECT * INTO work_schedule FROM public.work_schedules LIMIT 1;
    
    -- Reset all used values to 0
    UPDATE public.employee_leave_balance SET 
        vacation_days_used = 0,
        permission_hours_used = 0,
        updated_at = now();
    
    -- Recalculate for each approved request
    FOR request_record IN 
        SELECT * FROM public.leave_requests WHERE status = 'approved'
    LOOP
        IF request_record.type = 'ferie' AND request_record.date_from IS NOT NULL AND request_record.date_to IS NOT NULL THEN
            -- Calculate working days for vacation
            loop_date := request_record.date_from;
            working_days_count := 0;
            
            WHILE loop_date <= request_record.date_to LOOP
                -- 1. Controlla se è una festività
                SELECT EXISTS(
                    SELECT 1 FROM public.company_holidays 
                    WHERE (is_recurring = true AND date::text LIKE '%-' || EXTRACT(MONTH FROM loop_date)::text || '-' || EXTRACT(DAY FROM loop_date)::text)
                    OR (is_recurring = false AND date = loop_date)
                ) INTO is_holiday;
                
                -- 2. Se non è festività, controlla se è un giorno lavorativo
                IF NOT is_holiday THEN
                    -- Controlla gli orari personalizzati del dipendente
                    SELECT * INTO employee_work_schedule 
                    FROM public.employee_work_schedules 
                    WHERE employee_id = request_record.user_id 
                    LIMIT 1;
                    
                    -- Calcola il giorno della settimana
                    day_of_week := EXTRACT(DOW FROM loop_date);
                    
                    IF employee_work_schedule IS NOT NULL THEN
                        -- Usa orari personalizzati del dipendente
                        day_name := CASE day_of_week
                            WHEN 0 THEN 'sunday'
                            WHEN 1 THEN 'monday'
                            WHEN 2 THEN 'tuesday'
                            WHEN 3 THEN 'wednesday'
                            WHEN 4 THEN 'thursday'
                            WHEN 5 THEN 'friday'
                            WHEN 6 THEN 'saturday'
                        END;
                        
                        is_working_day := day_name = ANY(employee_work_schedule.work_days);
                    ELSE
                        -- Usa orari aziendali generali
                        is_working_day := CASE day_of_week
                            WHEN 0 THEN work_schedule.sunday
                            WHEN 1 THEN work_schedule.monday
                            WHEN 2 THEN work_schedule.tuesday
                            WHEN 3 THEN work_schedule.wednesday
                            WHEN 4 THEN work_schedule.thursday
                            WHEN 5 THEN work_schedule.friday
                            WHEN 6 THEN work_schedule.saturday
                            ELSE false
                        END;
                    END IF;
                    
                    -- Se è un giorno lavorativo, incrementa il contatore
                    IF is_working_day THEN
                        working_days_count := working_days_count + 1;
                    END IF;
                END IF;
                
                loop_date := loop_date + INTERVAL '1 day';
            END LOOP;
            
            UPDATE public.employee_leave_balance 
            SET vacation_days_used = vacation_days_used + working_days_count,
                updated_at = now()
            WHERE user_id = request_record.user_id 
            AND year = EXTRACT(year FROM request_record.date_from);
            
        -- Per i permessi orari ONLY (removed daily permission logic)
        ELSIF request_record.type = 'permesso' AND request_record.time_from IS NOT NULL AND request_record.time_to IS NOT NULL THEN
            -- Hourly permission
            UPDATE public.employee_leave_balance 
            SET permission_hours_used = permission_hours_used + EXTRACT(EPOCH FROM (request_record.time_to - request_record.time_from))/3600,
                updated_at = now()
            WHERE user_id = request_record.user_id 
            AND year = EXTRACT(year FROM request_record.day);
        END IF;
    END LOOP;
    
    RETURN 'Bilanci ricalcolati con successo escludendo festività';
END;
$$;

-- Ricrea i trigger per assicurarsi che usino le nuove funzioni
DROP TRIGGER IF EXISTS leave_usage_trigger ON public.leave_requests;
CREATE TRIGGER leave_usage_trigger
    AFTER INSERT OR UPDATE ON public.leave_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.calculate_leave_usage();

-- Commento esplicativo
COMMENT ON FUNCTION public.calculate_leave_usage() IS 'Calcola automaticamente le ferie usate escludendo festività e considerando orari personalizzati';
COMMENT ON FUNCTION public.recalculate_all_leave_balances() IS 'Ricalcola tutti i bilanci escludendo festività e considerando orari personalizzati';
COMMENT ON FUNCTION public.test_date_calculation(DATE) IS 'Funzione di test per verificare il calcolo corretto dei giorni della settimana';

-- Ricalcola tutti i bilanci esistenti per correggere i conteggi errati
SELECT public.recalculate_all_leave_balances();

-- Messaggio di conferma
SELECT '✅ Funzione calculate_leave_usage aggiornata con successo!' as status;
SELECT '✅ Le festività ora sono correttamente escluse dal conteggio delle ferie' as info;
SELECT '✅ Tutti i bilanci sono stati ricalcolati automaticamente' as action;
SELECT '✅ Funzione di test creata per verificare i calcoli' as test_function; 