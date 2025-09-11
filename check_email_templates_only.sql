-- Script semplice per verificare solo i template email
-- Esegui questo script per vedere gli URL attuali nei template

-- Mostra tutti i template email con i loro button_url
SELECT id, 
       name, 
       template_type, 
       template_category,
       button_url,
       CASE 
           WHEN button_url LIKE '%lovable%' THEN '❌ HAS LOVABLE URL' 
           WHEN button_url LIKE '%alm-app%' THEN '❌ HAS ALM-APP URL'
           WHEN button_url IS NULL THEN '⚠️ NULL URL'
           ELSE '✅ OK' 
       END as url_status
FROM public.email_templates 
ORDER BY created_at DESC;

-- Cerca specificamente l'URL problematico
SELECT 'PROBLEMATIC URLS FOUND' as search_result,
       id, 
       name, 
       template_type,
       button_url
FROM public.email_templates 
WHERE button_url LIKE '%@https://alm-app.lovable.app%'
   OR button_url LIKE '%alm-app.lovable.app%'
   OR button_url LIKE '%lovable%';
