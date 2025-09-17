
-- Prima verifica e rimuovi TUTTI i constraint che potrebbero causare conflitto
ALTER TABLE public.email_templates 
DROP CONSTRAINT IF EXISTS email_templates_admin_type_unique;

ALTER TABLE public.email_templates 
DROP CONSTRAINT IF EXISTS email_templates_admin_type_category_unique;

-- Rimuovi eventuali indici duplicati
DROP INDEX IF EXISTS email_templates_admin_type_unique;

-- Pulisci eventuali record duplicati prima di creare il nuovo constraint
DELETE FROM public.email_templates a USING (
  SELECT MIN(ctid) as ctid, admin_id, template_type, template_category
  FROM public.email_templates 
  GROUP BY admin_id, template_type, template_category 
  HAVING COUNT(*) > 1
) b
WHERE a.admin_id = b.admin_id 
  AND a.template_type = b.template_type 
  AND a.template_category = b.template_category 
  AND a.ctid <> b.ctid;

-- Ora crea il nuovo constraint unico corretto
ALTER TABLE public.email_templates 
ADD CONSTRAINT email_templates_admin_type_category_unique 
UNIQUE (admin_id, template_type, template_category);
