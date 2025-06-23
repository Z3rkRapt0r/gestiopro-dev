
-- Aggiungi il campo is_sick_leave alla tabella unified_attendances se non esiste già
ALTER TABLE public.unified_attendances 
ADD COLUMN IF NOT EXISTS is_sick_leave boolean NOT NULL DEFAULT false;

-- Aggiorna l'indice per includere il nuovo campo
CREATE INDEX IF NOT EXISTS idx_unified_attendances_sick_leave ON public.unified_attendances(is_sick_leave);
