
-- Aggiungere campi per gestire i ritardi nella tabella unified_attendances
ALTER TABLE public.unified_attendances 
ADD COLUMN is_late boolean DEFAULT false,
ADD COLUMN late_minutes integer DEFAULT 0;

-- Aggiungere commenti per documentare i nuovi campi
COMMENT ON COLUMN public.unified_attendances.is_late IS 'Indica se il dipendente è arrivato in ritardo';
COMMENT ON COLUMN public.unified_attendances.late_minutes IS 'Numero di minuti di ritardo rispetto all''orario previsto + tolleranza';
