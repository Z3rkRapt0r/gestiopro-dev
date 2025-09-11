-- Script per verificare gli URL attualmente nel database
-- Esegui questo script per vedere cosa c'è nel database

-- 1. Verifica tutti i template email
SELECT 'email_templates' as table_name, 
       id, 
       name, 
       template_type, 
       template_category,
       button_url,
       CASE WHEN content LIKE '%lovable%' THEN 'HAS LOVABLE IN CONTENT' 
            WHEN content LIKE '%alm-app%' THEN 'HAS ALM-APP IN CONTENT'
            ELSE 'OK' END as content_status
FROM public.email_templates 
ORDER BY created_at DESC;

-- 2. Verifica le impostazioni admin (solo se la colonna app_url esiste)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admin_settings' 
        AND column_name = 'app_url'
    ) THEN
        -- La colonna esiste, esegui la query
        PERFORM 1;
    ELSE
        -- La colonna non esiste, mostra messaggio
        RAISE NOTICE 'Colonna app_url non esiste in admin_settings. Esegui prima add_app_url_column.sql';
    END IF;
END $$;

-- Query condizionale per app_url
SELECT 'admin_settings' as table_name,
       admin_id as id,
       'admin_settings' as name,
       COALESCE(app_url, 'COLONNA NON ESISTE') as button_url,
       CASE 
           WHEN app_url IS NULL THEN 'COLONNA NON ESISTE'
           WHEN app_url LIKE '%lovable%' THEN 'HAS LOVABLE URL' 
           WHEN app_url LIKE '%alm-app%' THEN 'HAS ALM-APP URL'
           ELSE 'OK' 
       END as url_status
FROM public.admin_settings;

-- 3. Cerca specificamente l'URL problematico
SELECT 'SEARCH RESULTS' as search_type,
       'email_templates' as table_name,
       id,
       name,
       template_type,
       button_url
FROM public.email_templates 
WHERE button_url LIKE '%@https://alm-app.lovable.app%'
   OR button_url LIKE '%alm-app.lovable.app%'
   OR content LIKE '%@https://alm-app.lovable.app%'
   OR content LIKE '%alm-app.lovable.app%'
UNION ALL
SELECT 'SEARCH RESULTS' as search_type,
       'admin_settings' as table_name,
       admin_id as id,
       'admin_settings' as name,
       'settings' as template_type,
       app_url as button_url
FROM public.admin_settings 
WHERE app_url LIKE '%@https://alm-app.lovable.app%'
   OR app_url LIKE '%alm-app.lovable.app%';
