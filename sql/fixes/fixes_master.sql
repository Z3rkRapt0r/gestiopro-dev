-- =========================================
-- 🔧 FIXES MASTER - Soluzioni per Problemi Database
-- =========================================
-- File master con tutte le soluzioni per problemi comuni del database
-- Scegli la soluzione appropriata commentando/decommentando

-- =========================================
-- ⚠️ IMPORTANTE: LEGGI PRIMA DI ESEGUIRE
-- =========================================
--
-- 1. Ogni sezione risolve un problema specifico
-- 2. Commenta le soluzioni che NON vuoi applicare
-- 3. Decommenta solo quella che ti serve
-- 4. Fai sempre un backup prima di eseguire
-- 5. Testa su database di sviluppo prima

-- =========================================
-- 🕐 OPZIONE 1: SOLUZIONE COMPLETA
-- =========================================
-- Sistema completo con cron job + Edge function automatica

-- -- 1. Rimozione cron job esistenti
-- DO $$
-- BEGIN
--     BEGIN
--         PERFORM cron.unschedule('check-missing-attendance');
--     EXCEPTION WHEN OTHERS THEN
--         RAISE NOTICE 'Cron job check-missing-attendance non esisteva';
--     END;
--
--     BEGIN
--         PERFORM cron.unschedule('trigger-attendance-check');
--     EXCEPTION WHEN OTHERS THEN
--         RAISE NOTICE 'Cron job trigger-attendance-check non esisteva';
--     END;
-- END $$;

-- -- 2. Creazione nuovo cron job (scegli uno)
-- -- OPZIONE A: Ogni 15 minuti
-- -- SELECT cron.schedule('check-missing-attendance', '*/15 * * * *',
-- --     'SELECT public.robusto_attendance_check();');
--
-- -- OPZIONE B: Giornaliero alle 8:32
-- -- SELECT cron.schedule('robusto-attendance-check', '32 8 * * *',
-- --     'SELECT public.robusto_attendance_check();');

-- =========================================
-- 🛡️ OPZIONE 2: SOLUZIONE ROBUSTA
-- =========================================
-- Versione migliorata che gestisce tutti gli errori e valori null

-- -- Gestione sicura rimozione cron jobs
-- DO $$
-- BEGIN
--     BEGIN
--         PERFORM cron.unschedule('check-missing-attendance');
--     EXCEPTION WHEN OTHERS THEN
--         RAISE NOTICE 'Cron job check-missing-attendance non esisteva';
--     END;
-- END $$;

-- -- Creazione cron job robusto
-- SELECT cron.schedule(
--     'robusto-attendance-check',
--     '32 8 * * *',
--     'SELECT public.robusto_attendance_check();'
-- );

-- =========================================
-- 📧 OPZIONE 3: FIX EMAIL SENDING
-- =========================================
-- Corregge problemi con l'invio delle email di avviso

-- -- Fix per email_sent_at
-- ALTER TABLE attendance_alerts
-- ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP WITH TIME ZONE;

-- -- Aggiorna records esistenti
-- UPDATE attendance_alerts
-- SET email_sent_at = created_at
-- WHERE email_sent_at IS NULL;

-- =========================================
-- 👥 OPZIONE 4: FIX EMPLOYEE SCHEDULES POLICY
-- =========================================
-- Corregge le policy RLS per gli orari dipendenti

-- -- Fix policy per employee_work_schedules
-- DROP POLICY IF EXISTS "Users can view their own work schedules" ON employee_work_schedules;
-- CREATE POLICY "Users can view their own work schedules"
-- ON employee_work_schedules FOR SELECT
-- USING (auth.uid() = employee_id);

-- =========================================
-- 📅 OPZIONE 5: FIX HOLIDAY EXCLUSION
-- =========================================
-- Corregge l'esclusione delle festività dal calcolo ferie

-- -- Fix calcolo giorni ferie escludendo festività
-- CREATE OR REPLACE FUNCTION calculate_leave_days(
--     start_date DATE,
--     end_date DATE
-- ) RETURNS INTEGER AS $$
-- DECLARE
--     total_days INTEGER;
--     weekend_days INTEGER;
--     holiday_days INTEGER;
-- BEGIN
--     -- Calcolo base giorni totali
--     total_days := end_date - start_date + 1;
--
--     -- Sottrai weekend (sabato e domenica)
--     SELECT COUNT(*) INTO weekend_days
--     FROM generate_series(start_date, end_date, '1 day'::interval) d
--     WHERE EXTRACT(DOW FROM d) IN (0, 6); -- 0=domenica, 6=sabato
--
--     -- Sottrai festività
--     SELECT COUNT(*) INTO holiday_days
--     FROM italian_holidays
--     WHERE holiday_date BETWEEN start_date AND end_date;
--
--     RETURN GREATEST(0, total_days - weekend_days - holiday_days);
-- END;
-- $$ LANGUAGE plpgsql;

-- =========================================
-- 💾 OPZIONE 6: FIX LEAVE CALCULATION
-- =========================================
-- Corregge il calcolo delle ferie residue

-- -- Fix funzione calcolo ferie
-- CREATE OR REPLACE FUNCTION get_remaining_leave_days(user_id UUID)
-- RETURNS INTEGER AS $$
-- DECLARE
--     used_days INTEGER := 0;
--     total_days INTEGER := 25; -- Giorni ferie annuali
-- BEGIN
--     -- Conta giorni ferie usati quest'anno
--     SELECT COALESCE(SUM(calculate_leave_days(date_from, date_to)), 0) INTO used_days
--     FROM leave_requests
--     WHERE user_id = $1
--       AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
--       AND status = 'approved'
--       AND type = 'ferie';
--
--     RETURN GREATEST(0, total_days - used_days);
-- END;
-- $$ LANGUAGE plpgsql;

-- =========================================
-- 🔧 OPZIONE 7: FIX TEMPLATE CONSTRAINT
-- =========================================
-- Corregge vincoli sui template email

-- -- Fix constraint sui template email
-- ALTER TABLE email_templates
-- DROP CONSTRAINT IF EXISTS email_templates_unique_active_per_admin;

-- ALTER TABLE email_templates
-- ADD CONSTRAINT email_templates_unique_active_per_admin
-- EXCLUDE (admin_id WITH =, template_type WITH =, template_category WITH =)
-- WHERE (is_active = true);

-- =========================================
-- 🎯 OPZIONE 8: FIX PERSONAL SCHEDULES LEAVE CALCULATION
-- =========================================
-- Corregge calcolo ferie con orari personalizzati

-- -- Fix per dipendenti con orari personalizzati
-- CREATE OR REPLACE FUNCTION calculate_leave_with_schedule(
--     user_id UUID,
--     start_date DATE,
--     end_date DATE
-- ) RETURNS INTEGER AS $$
-- DECLARE
--     working_days INTEGER := 0;
--     personal_schedule RECORD;
-- BEGIN
--     -- Controlla se ha orari personalizzati
--     SELECT * INTO personal_schedule
--     FROM employee_work_schedules
--     WHERE employee_id = user_id;
--
--     IF FOUND THEN
--         -- Usa giorni lavorativi personalizzati
--         FOR i IN 0..6 LOOP
--             IF personal_schedule.work_days[i] THEN
--                 SELECT working_days + COUNT(*) INTO working_days
--                 FROM generate_series(start_date, end_date, '1 day'::interval) d
--                 WHERE EXTRACT(DOW FROM d) = i
--                   AND d NOT IN (SELECT holiday_date FROM italian_holidays);
--             END IF;
--         END LOOP;
--     ELSE
--         -- Usa calendario aziendale standard
--         SELECT COUNT(*) INTO working_days
--         FROM generate_series(start_date, end_date, '1 day'::interval) d
--         WHERE EXTRACT(DOW FROM d) NOT IN (0, 6) -- Non weekend
--           AND d NOT IN (SELECT holiday_date FROM italian_holidays);
--     END IF;
--
--     RETURN working_days;
-- END;
-- $$ LANGUAGE plpgsql;

-- =========================================
-- ❌ OPZIONE 9: DISABLE EMAIL BUTTONS
-- =========================================
-- Disabilita temporaneamente i pulsanti email

-- -- Fix per disabilitare pulsanti email
-- UPDATE admin_settings
-- SET attendance_alert_enabled = false
-- WHERE attendance_alert_enabled = true;

-- =========================================
-- 🔄 OPZIONE 10: FINAL SOLUTION
-- =========================================
-- Soluzione finale completa (include tutto sopra)

-- -- 1. Fix completo del sistema avvisi
-- -- [Includerebbe tutti i fix precedenti in ordine corretto]

-- =========================================
-- 📊 VERIFICA STATO SISTEMA
-- =========================================

-- Verifica configurazione cron attuale
SELECT
    '📋 Cron jobs attivi:' as info,
    jobname,
    schedule,
    active,
    next_run
FROM cron.job
ORDER BY next_run;

-- Verifica avvisi recenti
SELECT
    '📧 Avvisi recenti:' as info,
    COUNT(*) as total_alerts,
    COUNT(CASE WHEN email_sent_at IS NOT NULL THEN 1 END) as sent_alerts,
    COUNT(CASE WHEN email_sent_at IS NULL THEN 1 END) as pending_alerts
FROM attendance_alerts
WHERE alert_date >= CURRENT_DATE - INTERVAL '7 days';

-- Verifica richieste ferie
SELECT
    '🏖️ Richieste ferie recenti:' as info,
    status,
    COUNT(*) as count
FROM leave_requests
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY status;

-- =========================================
-- 🧹 PULIZIA (ESEGUI SOLO SE NECESSARIO)
-- =========================================

-- Rimozione avvisi vecchi (opzionale)
-- DELETE FROM attendance_alerts
-- WHERE alert_date < CURRENT_DATE - INTERVAL '90 days';

-- Rimozione richieste ferie vecchie (opzionale)
-- DELETE FROM leave_requests
-- WHERE created_at < CURRENT_DATE - INTERVAL '2 years'
--   AND status IN ('cancelled', 'rejected');

-- =========================================
-- 📝 NOTE IMPORTANTI
-- =========================================
--
-- 1. **NON ESEGUIRE TUTTO INSIEME** - Scegli solo la soluzione che ti serve
-- 2. **FAI SEMPRE BACKUP** prima di applicare fix
-- 3. **TESTA SU DEVELOPMENT** prima di production
-- 4. **VERIFICA I LOG** dopo l'applicazione
-- 5. Alcuni fix potrebbero richiedere riavvio dell'applicazione
--
-- **Se non sei sicuro di quale soluzione applicare,
-- contatta il supporto tecnico!**
--
-- =========================================
