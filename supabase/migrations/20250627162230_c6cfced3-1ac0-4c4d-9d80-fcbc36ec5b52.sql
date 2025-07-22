
-- Aggiornare il tipo di leave_requests per includere 'malattia'
ALTER TABLE public.leave_requests 
DROP CONSTRAINT IF EXISTS leave_requests_type_check;

ALTER TABLE public.leave_requests 
ADD CONSTRAINT leave_requests_type_check 
CHECK (type IN ('ferie', 'permesso', 'malattia'));
