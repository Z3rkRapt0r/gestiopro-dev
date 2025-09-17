-- =========================================
-- 🧪 TEST LOG DETTAGLIATI IN ITALIANO
-- =========================================

-- Test della Edge Function con log dettagliati per ogni dipendente
SELECT '🚀 Test funzione con log italiani dettagliati:' as status;
SELECT status, 
       content::json->>'messaggio' as messaggio,
       content::json->>'inviati' as inviati,
       content::json->>'errori' as errori,
       json_array_length(content::json->>'risultati') as dipendenti_processati
FROM http((
    'POST',
    'https://nohufgceuqhkycsdffqj.supabase.co/functions/v1/check-missing-attendance',
    ARRAY[
        http_header('Content-Type', 'application/json'),
        http_header('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vaHVmZ2NldXFoa3ljc2RmZnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTg5MTI3NiwiZXhwIjoyMDY1NDY3Mjc2fQ.jbXMlI5J5sURH4oBLhm6bvTJa0G5ur_BEHNcedq4_co')
    ],
    'application/json',
    '{"test": "log_dettagliati_italiani"}'
));

-- Mostra i risultati dettagliati per ogni dipendente
SELECT '📋 Risultati dettagliati per ogni dipendente:' as status;

-- Estrai i risultati JSON e mostrali in formato tabellare
WITH risultati AS (
    SELECT 
        json_array_elements(content::json->'risultati') as risultato
    FROM http((
        'POST',
        'https://nohufgceuqhkycsdffqj.supabase.co/functions/v1/check-missing-attendance',
        ARRAY[
            http_header('Content-Type', 'application/json'),
            http_header('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vaHVmZ2NldXFoa3ljc2RmZnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTg5MTI3NiwiZXhwIjoyMDY1NDY3Mjc2fQ.jbXMlI5J5sURH4oBLhm6bvTJa0G5ur_BEHNcedq4_co')
        ],
        'application/json',
        '{"test": "log_dettagliati_italiani"}'
    ))
)
SELECT 
    risultato->>'nome_dipendente' as dipendente,
    risultato->>'stato' as stato,
    COALESCE(risultato->>'motivo', risultato->>'errore') as motivo_dettagliato
FROM risultati
ORDER BY 
    CASE 
        WHEN risultato->>'stato' = 'inviato' THEN 1
        WHEN risultato->>'stato' = 'saltato' THEN 2
        WHEN risultato->>'stato' = 'errore_invio' THEN 3
        WHEN risultato->>'stato' = 'errore_database' THEN 4
        WHEN risultato->>'stato' = 'errore_sistema' THEN 5
        ELSE 6
    END;

-- Verifica stato finale
SELECT '📊 Riepilogo finale:' as status;
SELECT 
    COUNT(*) as avvisi_total_oggi,
    COUNT(CASE WHEN email_sent_at IS NULL THEN 1 END) as ancora_pendenti,
    COUNT(CASE WHEN email_sent_at IS NOT NULL THEN 1 END) as email_inviate_oggi,
    MAX(email_sent_at) as ultimo_invio
FROM attendance_alerts 
WHERE alert_date = CURRENT_DATE;

SELECT '🎯 LOG ATTESI:' as status;
SELECT '✅ Per ogni dipendente elaborato, ora vedrai:' as esempio_1;
SELECT '   - 👤 Processamento avviso per dipendente: [NOME]' as esempio_2;
SELECT '   - ❌ SALTATO/✅ INVIATO con motivo dettagliato' as esempio_3;
SELECT '   - 📧 Tentativo invio email a [email]' as esempio_4;
SELECT '   - 📡 Risposta API Resend - Status: [codice]' as esempio_5;
