-- =========================================
-- ✅ TEST CON URL COMPLETO CORRETTO
-- =========================================

-- Test della Edge Function con URL completo
SELECT '🚀 Test con URL completo:' as status;
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
    '{"test": "url_completo_corretto"}'
));

-- Mostra i risultati dettagliati per ogni dipendente
SELECT '📋 Dettagli per ogni dipendente:' as status;
WITH risultati AS (
    SELECT json_array_elements(content::json->'risultati') as risultato
    FROM http((
        'POST',
        'https://nohufgceuqhkycsdffqj.supabase.co/functions/v1/check-missing-attendance',
        ARRAY[
            http_header('Content-Type', 'application/json'),
            http_header('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vaHVmZ2NldXFoa3ljc2RmZnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTg5MTI3NiwiZXhwIjoyMDY1NDY3Mjc2fQ.jbXMlI5J5sURH4oBLhm6bvTJa0G5ur_BEHNcedq4_co')
        ],
        'application/json',
        '{"test": "url_completo_corretto"}'
    ))
)
SELECT 
    risultato->>'nome_dipendente' as dipendente,
    risultato->>'stato' as stato,
    COALESCE(risultato->>'motivo', risultato->>'errore', 'Email inviata con successo') as dettaglio
FROM risultati
ORDER BY 
    CASE risultato->>'stato'
        WHEN 'inviato' THEN 1
        WHEN 'saltato' THEN 2
        WHEN 'errore_invio' THEN 3
        WHEN 'errore_database' THEN 4
        WHEN 'errore_sistema' THEN 5
        ELSE 6
    END;

-- Verifica che l'URL sia corretto
SELECT '🔗 URL utilizzato:' as status;
SELECT 'https://nohufgceuqhkycsdffqj.supabase.co/functions/v1/check-missing-attendance' as url_completo;
