-- Migrazione per correggere il calcolo delle ferie e bloccare le festività
-- Data: 2025-08-11

-- 1. Aggiorna la funzione calculate_leave_usage per escludere correttamente le festività
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
    epoch_days INTEGER;
BEGIN
    -- Get work schedule configuration
    SELECT * INTO work_schedule FROM public.work_schedules LIMIT 1;
    
    -- If request is approved, update balance
    IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
        -- For vacations (calculate working days excluding holidays and considering personalized schedules)
        IF NEW.type = 'ferie' AND NEW.date_from IS NOT NULL AND NEW.date_to IS NOT NULL THEN
            loop_date := NEW.date_from;
            working_days_count := 0;
            
            WHILE loop_date <= NEW.date_to LOOP
                -- 1. Check if it's a holiday
                SELECT EXISTS(
                    SELECT 1 FROM public.company_holidays 
                    WHERE (is_recurring = true AND date::text LIKE '%-' || EXTRACT(MONTH FROM loop_date)::text || '-' || EXTRACT(DAY FROM loop_date)::text)
                    OR (is_recurring = false AND date = loop_date)
                ) INTO is_holiday;
                
                -- 2. If it's NOT a holiday, check if it's a working day
                IF NOT is_holiday THEN
                    -- Check employee's personalized schedules
                    SELECT * INTO employee_work_schedule 
                    FROM public.employee_work_schedules 
                    WHERE employee_id = NEW.user_id 
                    LIMIT 1;
                    
                    -- Calculate day of the week manually (more reliable)
                    epoch_days := EXTRACT(EPOCH FROM loop_date) / 86400;
                    day_of_week := (epoch_days + 4) % 7;
                    
                    IF employee_work_schedule IS NOT NULL THEN
                        -- Use employee's personalized schedules
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
                        -- Use general company schedules
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
                    
                    -- If it's a working day, increment counter
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
        
        -- For hourly permissions ONLY
        IF NEW.type = 'permesso' AND NEW.time_from IS NOT NULL AND NEW.time_to IS NOT NULL THEN
            UPDATE public.employee_leave_balance 
            SET permission_hours_used = permission_hours_used + EXTRACT(EPOCH FROM (NEW.time_to - NEW.time_from))/3600,
                updated_at = now()
            WHERE user_id = NEW.user_id 
            AND year = EXTRACT(year FROM NEW.day);
        END IF;
    END IF;
    
    -- If request is rejected or changed from approved, subtract usage
    IF OLD.status = 'approved' AND NEW.status != 'approved' THEN
        -- For vacations
        IF OLD.type = 'ferie' AND OLD.date_from IS NOT NULL AND OLD.date_to IS NOT NULL THEN
            -- Recalculate working days for subtraction (same logic)
            loop_date := OLD.date_from;
            working_days_count := 0;
            
            WHILE loop_date <= OLD.date_to LOOP
                -- 1. Check if it's a holiday
                SELECT EXISTS(
                    SELECT 1 FROM public.company_holidays 
                    WHERE (is_recurring = true AND date::text LIKE '%-' || EXTRACT(MONTH FROM loop_date)::text || '-' || EXTRACT(DAY FROM loop_date)::text)
                    OR (is_recurring = false AND date = loop_date)
                ) INTO is_holiday;
                
                -- 2. If it's NOT a holiday, check if it's a working day
                IF NOT is_holiday THEN
                    -- Check employee's personalized schedules
                    SELECT * INTO employee_work_schedule 
                    FROM public.employee_work_schedules 
                    WHERE employee_id = OLD.user_id 
                    LIMIT 1;
                    
                    -- Calculate day of the week manually
                    epoch_days := EXTRACT(EPOCH FROM loop_date) / 86400;
                    day_of_week := (epoch_days + 4) % 7;
                    
                    IF employee_work_schedule IS NOT NULL THEN
                        -- Use employee's personalized schedules
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
                        -- Use general company schedules
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
                    
                    -- If it's a working day, increment counter
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
        
        -- For hourly permissions ONLY
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

-- 2. Crea funzione per ricalcolare tutti i bilanci
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
    day_of_week INTEGER;
    day_name TEXT;
    is_working_day BOOLEAN;
    total_requests INTEGER := 0;
    total_updated INTEGER := 0;
    epoch_days INTEGER;
BEGIN
    -- Get work schedule configuration
    SELECT * INTO work_schedule FROM public.work_schedules LIMIT 1;
    
    IF work_schedule IS NULL THEN
        RETURN 'ERRORE: Nessuna configurazione orari di lavoro trovata';
    END IF;
    
    -- Reset all used values to 0
    UPDATE public.employee_leave_balance SET 
        vacation_days_used = 0,
        permission_hours_used = 0,
        updated_at = now();
    
    -- Recalculate for each approved request
    FOR request_record IN 
        SELECT * FROM public.leave_requests WHERE status = 'approved'
    LOOP
        total_requests := total_requests + 1;
        
        IF request_record.type = 'ferie' AND request_record.date_from IS NOT NULL AND request_record.date_to IS NOT NULL THEN
            -- Calculate working days for vacation
            loop_date := request_record.date_from;
            working_days_count := 0;
            
            WHILE loop_date <= request_record.date_to LOOP
                -- Calcolo manuale del giorno della settimana (più affidabile)
                epoch_days := EXTRACT(EPOCH FROM loop_date) / 86400;
                day_of_week := (epoch_days + 4) % 7;
                
                day_name := CASE day_of_week
                    WHEN 0 THEN 'Domenica'
                    WHEN 1 THEN 'Lunedì'
                    WHEN 2 THEN 'Martedì'
                    WHEN 3 THEN 'Mercoledì'
                    WHEN 4 THEN 'Giovedì'
                    WHEN 5 THEN 'Venerdì'
                    WHEN 6 THEN 'Sabato'
                END;
                
                -- Controlla se è una festività
                SELECT EXISTS(
                    SELECT 1 FROM public.company_holidays 
                    WHERE date = loop_date
                ) INTO is_holiday;
                
                -- Se non è festività, controlla se è lavorativo
                IF NOT is_holiday THEN
                    -- Controlla gli orari personalizzati del dipendente
                    SELECT * INTO employee_work_schedule 
                    FROM public.employee_work_schedules 
                    WHERE employee_id = request_record.user_id 
                    LIMIT 1;
                    
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
            
            -- Aggiorna il bilancio
            UPDATE public.employee_leave_balance 
            SET vacation_days_used = vacation_days_used + working_days_count,
                updated_at = now()
            WHERE user_id = request_record.user_id 
            AND year = EXTRACT(year FROM request_record.date_from);
            
            IF FOUND THEN
                total_updated := total_updated + 1;
            END IF;
            
        -- Per i permessi orari
        ELSIF request_record.type = 'permesso' AND request_record.time_from IS NOT NULL AND request_record.time_to IS NOT NULL THEN
            -- Hourly permission
            UPDATE public.employee_leave_balance 
            SET permission_hours_used = permission_hours_used + EXTRACT(EPOCH FROM (request_record.time_to - request_record.time_from))/3600,
                updated_at = now()
            WHERE user_id = request_record.user_id 
            AND year = EXTRACT(year FROM request_record.day);
            
            IF FOUND THEN
                total_updated := total_updated + 1;
            END IF;
        END IF;
    END LOOP;
    
    RETURN format('Bilanci ricalcolati con successo! Richieste processate: %s, Bilanci aggiornati: %s', 
                  total_requests, total_updated);
END;
$$;

-- 3. Crea funzione per verificare un bilancio specifico
CREATE OR REPLACE FUNCTION public.verify_leave_balance(p_user_id UUID, p_year INTEGER)
RETURNS TABLE(
    user_id UUID,
    year INTEGER,
    vacation_days_total INTEGER,
    vacation_days_used INTEGER,
    vacation_days_remaining INTEGER,
    permission_hours_total INTEGER,
    permission_hours_used INTEGER,
    permission_hours_remaining INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        elb.user_id,
        elb.year,
        elb.vacation_days_total,
        elb.vacation_days_used,
        GREATEST(0, elb.vacation_days_total - elb.vacation_days_used) as vacation_days_remaining,
        elb.permission_hours_total,
        elb.permission_hours_used,
        GREATEST(0, elb.permission_hours_total - elb.permission_hours_used) as permission_hours_remaining
    FROM public.employee_leave_balance elb
    WHERE elb.user_id = p_user_id AND elb.year = p_year;
END;
$$;

-- 4. Commenta le funzioni per documentazione
COMMENT ON FUNCTION public.calculate_leave_usage() IS 'Calcola l''utilizzo delle ferie escludendo le festività e considerando gli orari personalizzati';
COMMENT ON FUNCTION public.recalculate_all_leave_balances() IS 'Ricalcola tutti i bilanci delle ferie basandosi sulle richieste approvate';
COMMENT ON FUNCTION public.verify_leave_balance(UUID, INTEGER) IS 'Verifica il bilancio di un dipendente per un anno specifico';
