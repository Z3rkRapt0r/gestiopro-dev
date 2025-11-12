-- Verifica configurazione app_config necessaria per i trigger
SELECT
    id,
    project_ref,
    CASE
        WHEN service_role_key IS NOT NULL THEN '✅ Configurata'
        ELSE '❌ Mancante'
    END as service_role_key_status,
    CASE
        WHEN project_ref IS NOT NULL AND project_ref != '' THEN '✅ Configurata'
        ELSE '❌ Mancante'
    END as project_ref_status
FROM app_config
WHERE id = 1;
