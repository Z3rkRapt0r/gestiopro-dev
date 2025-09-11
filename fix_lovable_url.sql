-- Script per correggere l'URL @https://alm-app.lovable.app/ nel database
-- Esegui questo script direttamente nel database Supabase

-- 1. Aggiorna tutti i template email che hanno l'URL lovable
UPDATE public.email_templates 
SET button_url = 'https://finestra-gestione-aziendale-pro.vercel.app/'
WHERE button_url LIKE '%alm-app.lovable.app%'
   OR button_url LIKE '%@https://alm-app.lovable.app%'
   OR button_url LIKE '%lovable.app%';

-- 2. Aggiorna le impostazioni admin che hanno l'URL lovable
UPDATE public.admin_settings 
SET app_url = 'https://finestra-gestione-aziendale-pro.vercel.app/'
WHERE app_url LIKE '%alm-app.lovable.app%'
   OR app_url LIKE '%@https://alm-app.lovable.app%'
   OR app_url LIKE '%lovable.app%';

-- 3. Aggiorna anche il contenuto dei template che potrebbe contenere l'URL lovable
UPDATE public.email_templates 
SET content = REPLACE(content, '@https://alm-app.lovable.app/', 'https://finestra-gestione-aziendale-pro.vercel.app/')
WHERE content LIKE '%@https://alm-app.lovable.app%';

UPDATE public.email_templates 
SET content = REPLACE(content, 'https://alm-app.lovable.app/', 'https://finestra-gestione-aziendale-pro.vercel.app/')
WHERE content LIKE '%alm-app.lovable.app%';

-- 4. Verifica i risultati
SELECT 'email_templates' as table_name, id, name, template_type, button_url 
FROM public.email_templates 
WHERE button_url LIKE '%lovable%' OR content LIKE '%lovable%'
UNION ALL
SELECT 'admin_settings' as table_name, admin_id as id, 'admin_settings' as name, 'settings' as template_type, app_url as button_url
FROM public.admin_settings 
WHERE app_url LIKE '%lovable%';

-- 5. Mostra tutti i template per verificare
SELECT id, name, template_type, template_category, button_url, 
       CASE WHEN content LIKE '%lovable%' THEN 'HAS LOVABLE IN CONTENT' ELSE 'OK' END as content_status
FROM public.email_templates 
ORDER BY created_at DESC;
