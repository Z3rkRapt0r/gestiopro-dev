-- Script per correggere l'URL lovable nella colonna button_url di email_templates
-- Esegui questo script direttamente nel database Supabase

-- 1. Mostra tutti i template che hanno URL lovable
SELECT 'BEFORE FIX' as status,
       id, 
       name, 
       template_type, 
       template_category,
       button_url
FROM public.email_templates 
WHERE button_url LIKE '%lovable%' 
   OR button_url LIKE '%@https://alm-app.lovable.app%'
   OR button_url LIKE '%alm-app.lovable.app%'
ORDER BY created_at DESC;

-- 2. Aggiorna tutti i template email che hanno l'URL lovable
UPDATE public.email_templates 
SET button_url = 'https://finestra-gestione-aziendale-pro.vercel.app/'
WHERE button_url LIKE '%lovable%'
   OR button_url LIKE '%@https://alm-app.lovable.app%'
   OR button_url LIKE '%alm-app.lovable.app%';

-- 3. Aggiorna anche il contenuto dei template che potrebbe contenere l'URL lovable
UPDATE public.email_templates 
SET content = REPLACE(content, '@https://alm-app.lovable.app/', 'https://finestra-gestione-aziendale-pro.vercel.app/')
WHERE content LIKE '%@https://alm-app.lovable.app%';

UPDATE public.email_templates 
SET content = REPLACE(content, 'https://alm-app.lovable.app/', 'https://finestra-gestione-aziendale-pro.vercel.app/')
WHERE content LIKE '%alm-app.lovable.app%';

-- 4. Verifica i risultati dopo la correzione
SELECT 'AFTER FIX' as status,
       id, 
       name, 
       template_type, 
       template_category,
       button_url,
       CASE WHEN content LIKE '%lovable%' THEN 'HAS LOVABLE IN CONTENT' ELSE 'OK' END as content_status
FROM public.email_templates 
ORDER BY created_at DESC;

-- 5. Conta quanti template sono stati aggiornati
SELECT COUNT(*) as templates_updated
FROM public.email_templates 
WHERE button_url = 'https://finestra-gestione-aziendale-pro.vercel.app/';
