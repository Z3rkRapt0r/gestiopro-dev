
-- Fix the leave balance calculation triggers to work correctly with work schedules
-- This replaces the previous implementation with a more robust version

-- Drop existing triggers first
DROP TRIGGER IF EXISTS leave_usage_trigger ON leave_requests;
DROP TRIGGER IF EXISTS leave_deletion_trigger ON leave_requests;

-- Create improved function that uses work_schedules configuration
CREATE OR REPLACE FUNCTION calculate_leave_usage()
RETURNS TRIGGER AS $$
DECLARE
    work_schedule RECORD;
    working_days_count INTEGER := 0;
    loop_date DATE;
BEGIN
    -- Get work schedule configuration
    SELECT * INTO work_schedule FROM work_schedules LIMIT 1;
    
    -- Se la richiesta è approvata, aggiorna il bilancio
    IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
        -- Per le ferie (calcola giorni lavorativi basandosi sulla configurazione)
        IF NEW.type = 'ferie' AND NEW.date_from IS NOT NULL AND NEW.date_to IS NOT NULL THEN
            -- Calcola i giorni lavorativi basandosi sulla configurazione work_schedules
            loop_date := NEW.date_from;
            working_days_count := 0;
            
            WHILE loop_date <= NEW.date_to LOOP
                -- Controlla se il giorno è lavorativo secondo la configurazione
                CASE EXTRACT(DOW FROM loop_date)
                    WHEN 0 THEN -- Domenica
                        IF work_schedule.sunday THEN working_days_count := working_days_count + 1; END IF;
                    WHEN 1 THEN -- Lunedì
                        IF work_schedule.monday THEN working_days_count := working_days_count + 1; END IF;
                    WHEN 2 THEN -- Martedì
                        IF work_schedule.tuesday THEN working_days_count := working_days_count + 1; END IF;
                    WHEN 3 THEN -- Mercoledì
                        IF work_schedule.wednesday THEN working_days_count := working_days_count + 1; END IF;
                    WHEN 4 THEN -- Giovedì
                        IF work_schedule.thursday THEN working_days_count := working_days_count + 1; END IF;
                    WHEN 5 THEN -- Venerdì
                        IF work_schedule.friday THEN working_days_count := working_days_count + 1; END IF;
                    WHEN 6 THEN -- Sabato
                        IF work_schedule.saturday THEN working_days_count := working_days_count + 1; END IF;
                END CASE;
                
                loop_date := loop_date + INTERVAL '1 day';
            END LOOP;
            
            UPDATE employee_leave_balance 
            SET vacation_days_used = vacation_days_used + working_days_count,
                updated_at = now()
            WHERE user_id = NEW.user_id 
            AND year = EXTRACT(year FROM NEW.date_from);
        END IF;
        
        -- Per i permessi orari
        IF NEW.type = 'permesso' AND NEW.time_from IS NOT NULL AND NEW.time_to IS NOT NULL THEN
            UPDATE employee_leave_balance 
            SET permission_hours_used = permission_hours_used + EXTRACT(EPOCH FROM (NEW.time_to - NEW.time_from))/3600,
                updated_at = now()
            WHERE user_id = NEW.user_id 
            AND year = EXTRACT(year FROM NEW.day);
        END IF;
        
        -- Per i permessi giornalieri (8 ore)
        IF NEW.type = 'permesso' AND NEW.day IS NOT NULL AND NEW.time_from IS NULL AND NEW.time_to IS NULL THEN
            UPDATE employee_leave_balance 
            SET permission_hours_used = permission_hours_used + 8,
                updated_at = now()
            WHERE user_id = NEW.user_id 
            AND year = EXTRACT(year FROM NEW.day);
        END IF;
    END IF;
    
    -- Se la richiesta viene rifiutata o cambiata da approvata, sottrai l'utilizzo
    IF OLD.status = 'approved' AND NEW.status != 'approved' THEN
        -- Per le ferie
        IF OLD.type = 'ferie' AND OLD.date_from IS NOT NULL AND OLD.date_to IS NOT NULL THEN
            -- Ricalcola i giorni lavorativi per la sottrazione
            loop_date := OLD.date_from;
            working_days_count := 0;
            
            WHILE loop_date <= OLD.date_to LOOP
                CASE EXTRACT(DOW FROM loop_date)
                    WHEN 0 THEN IF work_schedule.sunday THEN working_days_count := working_days_count + 1; END IF;
                    WHEN 1 THEN IF work_schedule.monday THEN working_days_count := working_days_count + 1; END IF;
                    WHEN 2 THEN IF work_schedule.tuesday THEN working_days_count := working_days_count + 1; END IF;
                    WHEN 3 THEN IF work_schedule.wednesday THEN working_days_count := working_days_count + 1; END IF;
                    WHEN 4 THEN IF work_schedule.thursday THEN working_days_count := working_days_count + 1; END IF;
                    WHEN 5 THEN IF work_schedule.friday THEN working_days_count := working_days_count + 1; END IF;
                    WHEN 6 THEN IF work_schedule.saturday THEN working_days_count := working_days_count + 1; END IF;
                END CASE;
                loop_date := loop_date + INTERVAL '1 day';
            END LOOP;
            
            UPDATE employee_leave_balance 
            SET vacation_days_used = GREATEST(0, vacation_days_used - working_days_count),
                updated_at = now()
            WHERE user_id = OLD.user_id 
            AND year = EXTRACT(year FROM OLD.date_from);
        END IF;
        
        -- Per i permessi orari
        IF OLD.type = 'permesso' AND OLD.time_from IS NOT NULL AND OLD.time_to IS NOT NULL THEN
            UPDATE employee_leave_balance 
            SET permission_hours_used = GREATEST(0, permission_hours_used - EXTRACT(EPOCH FROM (OLD.time_to - OLD.time_from))/3600),
                updated_at = now()
            WHERE user_id = OLD.user_id 
            AND year = EXTRACT(year FROM OLD.day);
        END IF;
        
        -- Per i permessi giornalieri
        IF OLD.type = 'permesso' AND OLD.day IS NOT NULL AND OLD.time_from IS NULL AND OLD.time_to IS NULL THEN
            UPDATE employee_leave_balance 
            SET permission_hours_used = GREATEST(0, permission_hours_used - 8),
                updated_at = now()
            WHERE user_id = OLD.user_id 
            AND year = EXTRACT(year FROM OLD.day);
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Improved deletion handler
CREATE OR REPLACE FUNCTION handle_leave_deletion()
RETURNS TRIGGER AS $$
DECLARE
    work_schedule RECORD;
    working_days_count INTEGER := 0;
    loop_date DATE;
BEGIN
    -- Get work schedule configuration
    SELECT * INTO work_schedule FROM work_schedules LIMIT 1;
    
    -- Se era approvata, sottrai dal bilancio
    IF OLD.status = 'approved' THEN
        -- Per le ferie
        IF OLD.type = 'ferie' AND OLD.date_from IS NOT NULL AND OLD.date_to IS NOT NULL THEN
            -- Calcola i giorni lavorativi da sottrarre
            loop_date := OLD.date_from;
            working_days_count := 0;
            
            WHILE loop_date <= OLD.date_to LOOP
                CASE EXTRACT(DOW FROM loop_date)
                    WHEN 0 THEN IF work_schedule.sunday THEN working_days_count := working_days_count + 1; END IF;
                    WHEN 1 THEN IF work_schedule.monday THEN working_days_count := working_days_count + 1; END IF;
                    WHEN 2 THEN IF work_schedule.tuesday THEN working_days_count := working_days_count + 1; END IF;
                    WHEN 3 THEN IF work_schedule.wednesday THEN working_days_count := working_days_count + 1; END IF;
                    WHEN 4 THEN IF work_schedule.thursday THEN working_days_count := working_days_count + 1; END IF;
                    WHEN 5 THEN IF work_schedule.friday THEN working_days_count := working_days_count + 1; END IF;
                    WHEN 6 THEN IF work_schedule.saturday THEN working_days_count := working_days_count + 1; END IF;
                END CASE;
                loop_date := loop_date + INTERVAL '1 day';
            END LOOP;
            
            UPDATE employee_leave_balance 
            SET vacation_days_used = GREATEST(0, vacation_days_used - working_days_count),
                updated_at = now()
            WHERE user_id = OLD.user_id 
            AND year = EXTRACT(year FROM OLD.date_from);
        END IF;
        
        -- Per i permessi orari
        IF OLD.type = 'permesso' AND OLD.time_from IS NOT NULL AND OLD.time_to IS NOT NULL THEN
            UPDATE employee_leave_balance 
            SET permission_hours_used = GREATEST(0, permission_hours_used - EXTRACT(EPOCH FROM (OLD.time_to - OLD.time_from))/3600),
                updated_at = now()
            WHERE user_id = OLD.user_id 
            AND year = EXTRACT(year FROM OLD.day);
        END IF;
        
        -- Per i permessi giornalieri
        IF OLD.type = 'permesso' AND OLD.day IS NOT NULL AND OLD.time_from IS NULL AND OLD.time_to IS NULL THEN
            UPDATE employee_leave_balance 
            SET permission_hours_used = GREATEST(0, permission_hours_used - 8),
                updated_at = now()
            WHERE user_id = OLD.user_id 
            AND year = EXTRACT(year FROM OLD.day);
        END IF;
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Recreate triggers with the improved functions
CREATE TRIGGER leave_usage_trigger
    AFTER INSERT OR UPDATE ON leave_requests
    FOR EACH ROW
    EXECUTE FUNCTION calculate_leave_usage();

CREATE TRIGGER leave_deletion_trigger
    BEFORE DELETE ON leave_requests
    FOR EACH ROW
    EXECUTE FUNCTION handle_leave_deletion();

-- Function to recalculate all balances based on current approved requests
CREATE OR REPLACE FUNCTION recalculate_all_leave_balances()
RETURNS TEXT AS $$
DECLARE
    request_record RECORD;
    work_schedule RECORD;
    working_days_count INTEGER;
    loop_date DATE;
BEGIN
    -- Get work schedule
    SELECT * INTO work_schedule FROM work_schedules LIMIT 1;
    
    -- Reset all used values to 0
    UPDATE employee_leave_balance SET 
        vacation_days_used = 0,
        permission_hours_used = 0,
        updated_at = now();
    
    -- Recalculate for each approved request
    FOR request_record IN 
        SELECT * FROM leave_requests WHERE status = 'approved'
    LOOP
        IF request_record.type = 'ferie' AND request_record.date_from IS NOT NULL AND request_record.date_to IS NOT NULL THEN
            -- Calculate working days for vacation
            loop_date := request_record.date_from;
            working_days_count := 0;
            
            WHILE loop_date <= request_record.date_to LOOP
                CASE EXTRACT(DOW FROM loop_date)
                    WHEN 0 THEN IF work_schedule.sunday THEN working_days_count := working_days_count + 1; END IF;
                    WHEN 1 THEN IF work_schedule.monday THEN working_days_count := working_days_count + 1; END IF;
                    WHEN 2 THEN IF work_schedule.tuesday THEN working_days_count := working_days_count + 1; END IF;
                    WHEN 3 THEN IF work_schedule.wednesday THEN working_days_count := working_days_count + 1; END IF;
                    WHEN 4 THEN IF work_schedule.thursday THEN working_days_count := working_days_count + 1; END IF;
                    WHEN 5 THEN IF work_schedule.friday THEN working_days_count := working_days_count + 1; END IF;
                    WHEN 6 THEN IF work_schedule.saturday THEN working_days_count := working_days_count + 1; END IF;
                END CASE;
                loop_date := loop_date + INTERVAL '1 day';
            END LOOP;
            
            UPDATE employee_leave_balance 
            SET vacation_days_used = vacation_days_used + working_days_count,
                updated_at = now()
            WHERE user_id = request_record.user_id 
            AND year = EXTRACT(year FROM request_record.date_from);
            
        ELSIF request_record.type = 'permesso' THEN
            IF request_record.time_from IS NOT NULL AND request_record.time_to IS NOT NULL THEN
                -- Hourly permission
                UPDATE employee_leave_balance 
                SET permission_hours_used = permission_hours_used + EXTRACT(EPOCH FROM (request_record.time_to - request_record.time_from))/3600,
                    updated_at = now()
                WHERE user_id = request_record.user_id 
                AND year = EXTRACT(year FROM request_record.day);
            ELSIF request_record.day IS NOT NULL THEN
                -- Daily permission (8 hours)
                UPDATE employee_leave_balance 
                SET permission_hours_used = permission_hours_used + 8,
                    updated_at = now()
                WHERE user_id = request_record.user_id 
                AND year = EXTRACT(year FROM request_record.day);
            END IF;
        END IF;
    END LOOP;
    
    RETURN 'Recalculation completed successfully';
END;
$$ LANGUAGE plpgsql;
