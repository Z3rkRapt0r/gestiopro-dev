-- Script per aggiornare i template esistenti e rimuovere i pulsanti
-- Eseguire questo script nel database Supabase

-- 1. Disabilita i pulsanti per tutti i template esistenti
UPDATE public.email_templates 
SET show_button = false
WHERE show_button = true;

-- 2. Mostra il risultato
SELECT 
    template_type,
    template_category,
    show_button,
    COUNT(*) as template_count
FROM public.email_templates 
GROUP BY template_type, template_category, show_button
ORDER BY template_type, template_category;

