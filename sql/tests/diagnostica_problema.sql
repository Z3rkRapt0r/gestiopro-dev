-- DIAGNOSTICA: Perché l'Edge function non viene invocata?
-- Esegui questo script per capire cosa sta succedendo

-- 1. Controlla se ci sono avvisi pendenti
SELECT 
    '📧 AVVISI PENDENTI:' as info,
    COUNT(*) as total_pending
FROM attendance_alerts 
WHERE alert_date = CURRENT_DATE 
AND email_sent_at IS NULL;

-- 2. Controlla se ci sono admin con controllo abilitato
SELECT 
    '⚙️ ADMIN CON CONTROLLO ABILITATO:' as info,
    COUNT(*) as admin_abilitati
FROM admin_settings 
WHERE attendance_alert_enabled = true;

-- 3. Controlla i dipendenti attivi
SELECT 
    '👥 DIPENDENTI ATTIVI:' as info,
    COUNT(*) as dipendenti_totali
FROM profiles 
WHERE role = 'employee' AND is_active = true;

-- 4. Controlla se è un giorno lavorativo (lunedì = 1)
SELECT 
    '📅 GIORNO LAVORATIVO:' as info,
    EXTRACT(DOW FROM now()) as giorno_settimana,
    CASE EXTRACT(DOW FROM now())
        WHEN 0 THEN 'Domenica (non lavorativo)'
        WHEN 1 THEN 'Lunedì (lavorativo)'
        WHEN 2 THEN 'Martedì (lavorativo)'
        WHEN 3 THEN 'Mercoledì (lavorativo)'
        WHEN 4 THEN 'Giovedì (lavorativo)'
        WHEN 5 THEN 'Venerdì (lavorativo)'
        WHEN 6 THEN 'Sabato (non lavorativo)'
    END as descrizione;

-- 5. Controlla gli orari di lavoro
SELECT 
    '🕐 ORARI DI LAVORO:' as info,
    ws.monday, ws.tuesday, ws.wednesday, ws.thursday, ws.friday, ws.saturday, ws.sunday,
    ws.start_time, ws.end_time
FROM work_schedules ws;

-- 6. Controlla se ci sono dipendenti con orari personalizzati
SELECT 
    '⏰ ORARI PERSONALIZZATI:' as info,
    COUNT(*) as dipendenti_con_orari_personalizzati
FROM employee_work_schedules ews
JOIN profiles p ON ews.employee_id = p.id
WHERE p.role = 'employee' AND p.is_active = true;

-- 7. Simula la logica del cron job per vedere cosa succede
SELECT 
    '🧪 SIMULAZIONE LOGICA CRON:' as info,
    p.id as employee_id,
    p.first_name || ' ' || p.last_name as employee_name,
    p.email,
    CASE EXTRACT(DOW FROM now())
        WHEN 0 THEN 'sunday'
        WHEN 1 THEN 'monday'
        WHEN 2 THEN 'tuesday'
        WHEN 3 THEN 'wednesday'
        WHEN 4 THEN 'thursday'
        WHEN 5 THEN 'friday'
        WHEN 6 THEN 'saturday'
    END as current_day_name,
    ews.work_days,
    ews.start_time as emp_start_time,
    ws.monday, ws.tuesday, ws.wednesday, ws.thursday, ws.friday, ws.saturday, ws.sunday,
    ws.start_time as company_start_time
FROM profiles p
LEFT JOIN employee_work_schedules ews ON p.id = ews.employee_id
CROSS JOIN work_schedules ws
WHERE p.role = 'employee' AND p.is_active = true
LIMIT 5;

-- 8. Controlla se ci sono dipendenti che dovrebbero ricevere avvisi
-- (questo simula esattamente la logica del cron job)
WITH current_time AS (
    SELECT 
        now() as current_timestamp_val,
        to_char(now(), 'HH24:MI') as current_time_str,
        to_char(now(), 'YYYY-MM-DD') as current_date_str,
        CASE EXTRACT(DOW FROM now())
            WHEN 0 THEN 'sunday'
            WHEN 1 THEN 'monday'
            WHEN 2 THEN 'tuesday'
            WHEN 3 THEN 'wednesday'
            WHEN 4 THEN 'thursday'
            WHEN 5 THEN 'friday'
            WHEN 6 THEN 'saturday'
        END as current_day_name
),
admin_settings_check AS (
    SELECT admin_id, attendance_alert_delay_minutes
    FROM admin_settings 
    WHERE attendance_alert_enabled = true
    LIMIT 1
)
SELECT 
    '🎯 DIPENDENTI CHE DOVREBBERO RICEVERE AVVISI:' as info,
    p.id as employee_id,
    p.first_name || ' ' || p.last_name as employee_name,
    p.email,
    ct.current_time_str,
    ct.current_date_str,
    ct.current_day_name,
    CASE 
        WHEN ews.work_days IS NOT NULL THEN
            CASE 
                WHEN ct.current_day_name = ANY(ews.work_days) THEN 'SI (orari personalizzati)'
                ELSE 'NO (orari personalizzati)'
            END
        ELSE
            CASE ct.current_day_name
                WHEN 'monday' THEN CASE WHEN ws.monday THEN 'SI (orari aziendali)' ELSE 'NO (orari aziendali)' END
                WHEN 'tuesday' THEN CASE WHEN ws.tuesday THEN 'SI (orari aziendali)' ELSE 'NO (orari aziendali)' END
                WHEN 'wednesday' THEN CASE WHEN ws.wednesday THEN 'SI (orari aziendali)' ELSE 'NO (orari aziendali)' END
                WHEN 'thursday' THEN CASE WHEN ws.thursday THEN 'SI (orari aziendali)' ELSE 'NO (orari aziendali)' END
                WHEN 'friday' THEN CASE WHEN ws.friday THEN 'SI (orari aziendali)' ELSE 'NO (orari aziendali)' END
                WHEN 'saturday' THEN CASE WHEN ws.saturday THEN 'SI (orari aziendali)' ELSE 'NO (orari aziendali)' END
                WHEN 'sunday' THEN CASE WHEN ws.sunday THEN 'SI (orari aziendali)' ELSE 'NO (orari aziendali)' END
            END
    END as is_working_day,
    COALESCE(ews.start_time, ws.start_time) as expected_start_time,
    asc.attendance_alert_delay_minutes
FROM profiles p
LEFT JOIN employee_work_schedules ews ON p.id = ews.employee_id
CROSS JOIN work_schedules ws
CROSS JOIN current_time ct
CROSS JOIN admin_settings_check asc
WHERE p.role = 'employee' AND p.is_active = true
LIMIT 10;

-- 9. Controlla se ci sono conflitti con ferie/permessi
SELECT 
    '🏖️ CONFLITTI FERIE/PERMESSI:' as info,
    COUNT(*) as dipendenti_in_ferie_oggi
FROM leave_requests lr
JOIN profiles p ON lr.user_id = p.id
WHERE p.role = 'employee' AND p.is_active = true
AND lr.status = 'approved'
AND (
    (lr.type = 'ferie' AND lr.date_from <= CURRENT_DATE AND lr.date_to >= CURRENT_DATE)
    OR (lr.type = 'permesso' AND lr.day = CURRENT_DATE)
);

-- 10. Controlla se ci sono dipendenti che hanno già registrato l'entrata oggi
SELECT 
    '✅ ENTRATE REGISTRATE OGGI:' as info,
    COUNT(*) as dipendenti_con_entrata
FROM attendances a
JOIN profiles p ON a.user_id = p.id
WHERE p.role = 'employee' AND p.is_active = true
AND a.date = CURRENT_DATE 
AND a.check_in_time IS NOT NULL;


