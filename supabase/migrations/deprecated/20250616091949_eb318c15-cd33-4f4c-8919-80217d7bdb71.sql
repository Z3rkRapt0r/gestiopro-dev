
-- Verifica il record esistente nella tabella dashboard_settings
SELECT * FROM public.dashboard_settings;

-- Se il logo_url è NULL o vuoto, aggiorniamo con il logo caricato
-- Assumendo che tu abbia caricato il logo nel bucket company-logos
UPDATE public.dashboard_settings 
SET logo_url = (
  SELECT 'https://nohufgceuqhkycsdffqj.supabase.co/storage/v1/object/public/company-logos/' || 
         (SELECT objects.name FROM storage.objects 
          WHERE bucket_id = 'company-logos' 
          AND objects.name LIKE '%' || admin_id || '%' 
          LIMIT 1)
)
WHERE logo_url IS NULL OR logo_url = '';
