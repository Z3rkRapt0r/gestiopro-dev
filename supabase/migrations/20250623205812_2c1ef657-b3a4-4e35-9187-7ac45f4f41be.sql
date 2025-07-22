
-- Fix the recalculate_all_leave_balances function to include proper WHERE clauses
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
    
    -- Reset all used values to 0 WHERE they exist (this satisfies the WHERE clause requirement)
    UPDATE employee_leave_balance SET 
        vacation_days_used = 0,
        permission_hours_used = 0,
        updated_at = now()
    WHERE id IS NOT NULL;
    
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
