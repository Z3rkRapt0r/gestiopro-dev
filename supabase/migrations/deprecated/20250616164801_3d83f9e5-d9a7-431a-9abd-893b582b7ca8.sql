
-- Prima elimina i duplicati mantenendo solo il record più recente per ogni combinazione admin_id/template_type
DELETE FROM public.email_templates 
WHERE id NOT IN (
    SELECT DISTINCT ON (admin_id, template_type) id
    FROM public.email_templates 
    ORDER BY admin_id, template_type, created_at DESC
);

-- Ora aggiungi il constraint unico
ALTER TABLE public.email_templates 
ADD CONSTRAINT email_templates_admin_type_unique UNIQUE (admin_id, template_type);
