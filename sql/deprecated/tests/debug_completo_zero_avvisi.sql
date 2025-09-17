-- =========================================
-- 🔍 DEBUG COMPLETO: PERCHÉ 0 AVVISI PENDENTI?
-- =========================================

-- 1. STATO CRON JOB
SELECT '⏰ Stato cron job:' as sezione;
SELECT jobid, jobname, schedule, active, database
FROM cron.job 
WHERE jobname = 'robusto-attendance-check';

-- 2. DIPENDENTI ATTIVI TOTALI
SELECT '👥 Dipendenti attivi totali:' as sezione;
SELECT COUNT(*) as totale_dipendenti_attivi
FROM profiles 
WHERE role = 'employee' AND is_active = true;

-- 3. AMMINISTRATORI ABILITATI
SELECT '👨‍💼 Amministratori abilitati:' as sezione;
SELECT 
    a.id,
    p.first_name || ' ' || p.last_name as nome,
    a.attendance_alert_enabled,
    CASE WHEN a.resend_api_key IS NOT NULL THEN 'Ha API key' ELSE 'NO API key' END as api_key,
    a.sender_email
FROM admin_settings a
JOIN profiles p ON a.id = p.id
WHERE a.attendance_alert_enabled = true;

-- 4. DETTAGLIO COMPLETO DI TUTTI I DIPENDENTI
SELECT '📋 DETTAGLIO COMPLETO TUTTI I DIPENDENTI:' as sezione;
WITH dipendenti_dettagli AS (
    SELECT 
        p.id,
        p.first_name || ' ' || p.last_name as nome_completo,
        p.email,
        p.is_active,
        -- Orari personali
        ews.work_days,
        ews.start_time as ora_inizio_personalizzata,
        -- Orari aziendali
        ws.monday, ws.tuesday, ws.wednesday, ws.thursday, ws.friday, ws.saturday, ws.sunday,
        ws.start_time as ora_inizio_aziendale,
        -- Presenza oggi
        CASE WHEN att.check_in_time IS NOT NULL THEN 'HA FATTO CHECK-IN' ELSE 'NON HA FATTO CHECK-IN' END as presenza_oggi,
        att.check_in_time as ora_checkin,
        -- Ferie/permesso oggi
        CASE WHEN lr.id IS NOT NULL THEN 'IN FERIE/PERMESSO' ELSE 'NON IN FERIE' END as stato_ferie,
        lr.date_from,
        lr.date_to,
        -- Giorno corrente
        EXTRACT(DOW FROM CURRENT_TIMESTAMP) as numero_giorno_settimana,
        to_char(CURRENT_TIMESTAMP, 'Day') as nome_giorno,
        CURRENT_TIME as ora_attuale,
        -- Calcolo se deve lavorare oggi
        CASE 
            WHEN ews.work_days IS NOT NULL THEN 
                CASE WHEN to_char(CURRENT_TIMESTAMP, 'Day') = ANY(ews.work_days) THEN 'DOVEVA LAVORARE' ELSE 'GIORNO LIBERO' END
            WHEN ws.monday AND to_char(CURRENT_TIMESTAMP, 'Day') LIKE '%Monday%' THEN 'DOVEVA LAVORARE'
            WHEN ws.tuesday AND to_char(CURRENT_TIMESTAMP, 'Day') LIKE '%Tuesday%' THEN 'DOVEVA LAVORARE'
            WHEN ws.wednesday AND to_char(CURRENT_TIMESTAMP, 'Day') LIKE '%Wednesday%' THEN 'DOVEVA LAVORARE'
            WHEN ws.thursday AND to_char(CURRENT_TIMESTAMP, 'Day') LIKE '%Thursday%' THEN 'DOVEVA LAVORARE'
            WHEN ws.friday AND to_char(CURRENT_TIMESTAMP, 'Day') LIKE '%Friday%' THEN 'DOVEVA LAVORARE'
            WHEN ws.saturday AND to_char(CURRENT_TIMESTAMP, 'Day') LIKE '%Saturday%' THEN 'DOVEVA LAVORARE'
            WHEN ws.sunday AND to_char(CURRENT_TIMESTAMP, 'Day') LIKE '%Sunday%' THEN 'DOVEVA LAVORARE'
            ELSE 'GIORNO LIBERO'
        END as doveva_lavorare,
        -- Calcolo orario previsto
        CASE 
            WHEN ews.work_days IS NOT NULL THEN ews.start_time
            ELSE ws.start_time
        END as orario_previsto,
        -- Calcolo se è in ritardo
        CASE 
            WHEN att.check_in_time IS NOT NULL THEN 'HA GIÀ FATTO CHECK-IN'
            WHEN lr.id IS NOT NULL THEN 'IN FERIE/PERMESSO'
            WHEN ews.work_days IS NOT NULL AND NOT (to_char(CURRENT_TIMESTAMP, 'Day') = ANY(ews.work_days)) THEN 'GIORNO LIBERO'
            WHEN ws.monday = false AND to_char(CURRENT_TIMESTAMP, 'Day') LIKE '%Monday%' THEN 'GIORNO LIBERO'
            WHEN ws.tuesday = false AND to_char(CURRENT_TIMESTAMP, 'Day') LIKE '%Tuesday%' THEN 'GIORNO LIBERO'
            WHEN ws.wednesday = false AND to_char(CURRENT_TIMESTAMP, 'Day') LIKE '%Wednesday%' THEN 'GIORNO LIBERO'
            WHEN ws.thursday = false AND to_char(CURRENT_TIMESTAMP, 'Day') LIKE '%Thursday%' THEN 'GIORNO LIBERO'
            WHEN ws.friday = false AND to_char(CURRENT_TIMESTAMP, 'Day') LIKE '%Friday%' THEN 'GIORNO LIBERO'
            WHEN ws.saturday = false AND to_char(CURRENT_TIMESTAMP, 'Day') LIKE '%Saturday%' THEN 'GIORNO LIBERO'
            WHEN ws.sunday = false AND to_char(CURRENT_TIMESTAMP, 'Day') LIKE '%Sunday%' THEN 'GIORNO LIBERO'
            WHEN CURRENT_TIME < (CASE WHEN ews.work_days IS NOT NULL THEN ews.start_time ELSE ws.start_time END + INTERVAL '30 minutes') THEN 'NON ANCORA IN RITARDO'
            ELSE 'DOVREBBE RICEVERE AVVISO'
        END as stato_avviso
    FROM profiles p
    CROSS JOIN work_schedules ws
    LEFT JOIN employee_work_schedules ews ON p.id = ews.employee_id
    LEFT JOIN attendances att ON p.id = att.employee_id 
        AND DATE(att.check_in_time) = CURRENT_DATE
    LEFT JOIN leave_requests lr ON p.id = lr.user_id 
        AND CURRENT_DATE BETWEEN lr.date_from AND lr.date_to 
        AND lr.status = 'approved'
    WHERE p.role = 'employee' AND p.is_active = true
)
SELECT * FROM dipendenti_dettagli
ORDER BY 
    CASE stato_avviso
        WHEN 'DOVREBBE RICEVERE AVVISO' THEN 1
        WHEN 'NON ANCORA IN RITARDO' THEN 2
        WHEN 'HA FATTO CHECK-IN' THEN 3
        WHEN 'IN FERIE/PERMESSO' THEN 4
        WHEN 'GIORNO LIBERO' THEN 5
        ELSE 6
    END,
    nome_completo;

-- 5. AVVISI ESISTENTI OGGI
SELECT '📧 Avvisi esistenti oggi:' as sezione;
SELECT 
    aa.id,
    p.first_name || ' ' || p.last_name as dipendente,
    aa.alert_date,
    aa.alert_time,
    aa.expected_time,
    aa.email_sent_at,
    CASE WHEN aa.email_sent_at IS NOT NULL THEN 'EMAIL INVIATA' ELSE 'IN ATTESA INVIO' END as stato
FROM attendance_alerts aa
JOIN profiles p ON aa.employee_id = p.id
WHERE aa.alert_date = CURRENT_DATE
ORDER BY aa.created_at DESC;

-- 6. TEST MANUALE FUNZIONE POSTGRESQL
SELECT '🧪 Test manuale funzione PostgreSQL:' as sezione;
SELECT public.robusto_attendance_check() as risultato_funzione;

-- 7. VERIFICA ORARI AZIENDALI
SELECT '🏢 Orari aziendali correnti:' as sezione;
SELECT 
    start_time as inizio_lavoro,
    end_time as fine_lavoro,
    monday, tuesday, wednesday, thursday, friday, saturday, sunday
FROM work_schedules
LIMIT 1;

-- 8. VERIFICA TRIGGER ATTENDANCE_CHECK
SELECT '🔄 Stato trigger controllo presenze:' as sezione;
SELECT 
    trigger_date,
    status,
    execution_time,
    alerts_created,
    edge_function_response
FROM attendance_check_triggers
WHERE trigger_date = CURRENT_DATE
ORDER BY execution_time DESC
LIMIT 5;

SELECT '🎯 CONCLUSIONI:' as sezione;
SELECT '✅ Se vedi dipendenti con "DOVREBBE RICEVERE AVVISO" ma 0 avvisi pendenti = PROBLEMA NELLA FUNZIONE' as analisi_1;
SELECT '✅ Se tutti hanno "HA FATTO CHECK-IN" o "GIORNO LIBERO" = NORMALE, nessun avviso necessario' as analisi_2;
SELECT '✅ Se il cron non è attivo = controllare configurazione cron' as analisi_3;
SELECT '✅ Se funzione PostgreSQL non viene chiamata = verificare esecuzione cron' as analisi_4;
