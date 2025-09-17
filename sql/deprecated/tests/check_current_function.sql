-- =========================================
-- 🔍 VERIFICA VERSIONE ATTUALE DELLA FUNZIONE
-- =========================================

-- Mostra la definizione attuale della funzione nel database
SELECT '📋 Definizione attuale della funzione robusto_attendance_check:' as status;
SELECT pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE proname = 'robusto_attendance_check';

-- Cerca linee che contengono alerts_created nella definizione attuale
SELECT '🔍 Righe che contengono alerts_created:' as status;
SELECT line_number, line_content
FROM (
    SELECT row_number() OVER () as line_number, 
           trim(regexp_split_to_table(pg_get_functiondef(oid), '\n')) as line_content
    FROM pg_proc 
    WHERE proname = 'robusto_attendance_check'
) t
WHERE line_content ILIKE '%alerts_created%';

-- Mostra le prime 15 righe della funzione per vedere la struttura
SELECT '📄 Prime 15 righe della funzione attuale:' as status;
SELECT line_number, line_content
FROM (
    SELECT row_number() OVER () as line_number, 
           trim(regexp_split_to_table(pg_get_functiondef(oid), '\n')) as line_content
    FROM pg_proc 
    WHERE proname = 'robusto_attendance_check'
) t
WHERE line_number <= 15;
