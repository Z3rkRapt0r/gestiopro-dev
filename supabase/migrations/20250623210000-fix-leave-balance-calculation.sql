
-- Migliora la funzione per calcolare automaticamente le ore/giorni utilizzati
-- Ora gestisce anche l'eliminazione delle richieste
CREATE OR REPLACE FUNCTION calculate_leave_usage()
RETURNS TRIGGER AS $$
BEGIN
  -- Se la richiesta è approvata, aggiorna il bilancio
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Per le ferie (calcola giorni lavorativi)
    IF NEW.type = 'ferie' AND NEW.date_from IS NOT NULL AND NEW.date_to IS NOT NULL THEN
      UPDATE employee_leave_balance 
      SET vacation_days_used = vacation_days_used + (
        SELECT COUNT(*)
        FROM generate_series(NEW.date_from::date, NEW.date_to::date, '1 day'::interval) AS day
        WHERE EXTRACT(DOW FROM day) BETWEEN 1 AND 5 -- Solo giorni lavorativi (Lun-Ven)
      ),
      updated_at = now()
      WHERE user_id = NEW.user_id 
      AND year = EXTRACT(year FROM NEW.date_from);
    END IF;
    
    -- Per i permessi orari
    IF NEW.type = 'permesso' AND NEW.time_from IS NOT NULL AND NEW.time_to IS NOT NULL THEN
      UPDATE employee_leave_balance 
      SET permission_hours_used = permission_hours_used + EXTRACT(EPOCH FROM (NEW.time_to - NEW.time_from))/3600,
      updated_at = now()
      WHERE user_id = NEW.user_id 
      AND year = EXTRACT(year FROM NEW.day);
    END IF;
    
    -- Per i permessi giornalieri (8 ore)
    IF NEW.type = 'permesso' AND NEW.day IS NOT NULL AND NEW.time_from IS NULL AND NEW.time_to IS NULL THEN
      UPDATE employee_leave_balance 
      SET permission_hours_used = permission_hours_used + 8,
      updated_at = now()
      WHERE user_id = NEW.user_id 
      AND year = EXTRACT(year FROM NEW.day);
    END IF;
  END IF;
  
  -- Se la richiesta viene rifiutata o cambiata da approvata, sottrai l'utilizzo
  IF OLD.status = 'approved' AND NEW.status != 'approved' THEN
    -- Per le ferie
    IF OLD.type = 'ferie' AND OLD.date_from IS NOT NULL AND OLD.date_to IS NOT NULL THEN
      UPDATE employee_leave_balance 
      SET vacation_days_used = vacation_days_used - (
        SELECT COUNT(*)
        FROM generate_series(OLD.date_from::date, OLD.date_to::date, '1 day'::interval) AS day
        WHERE EXTRACT(DOW FROM day) BETWEEN 1 AND 5
      ),
      updated_at = now()
      WHERE user_id = OLD.user_id 
      AND year = EXTRACT(year FROM OLD.date_from);
    END IF;
    
    -- Per i permessi orari
    IF OLD.type = 'permesso' AND OLD.time_from IS NOT NULL AND OLD.time_to IS NOT NULL THEN
      UPDATE employee_leave_balance 
      SET permission_hours_used = permission_hours_used - EXTRACT(EPOCH FROM (OLD.time_to - OLD.time_from))/3600,
      updated_at = now()
      WHERE user_id = OLD.user_id 
      AND year = EXTRACT(year FROM OLD.day);
    END IF;
    
    -- Per i permessi giornalieri
    IF OLD.type = 'permesso' AND OLD.day IS NOT NULL AND OLD.time_from IS NULL AND OLD.time_to IS NULL THEN
      UPDATE employee_leave_balance 
      SET permission_hours_used = permission_hours_used - 8,
      updated_at = now()
      WHERE user_id = OLD.user_id 
      AND year = EXTRACT(year FROM OLD.day);
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Crea un trigger per gestire anche le eliminazioni
CREATE OR REPLACE FUNCTION handle_leave_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Se era approvata, sottrai dal bilancio
  IF OLD.status = 'approved' THEN
    -- Per le ferie
    IF OLD.type = 'ferie' AND OLD.date_from IS NOT NULL AND OLD.date_to IS NOT NULL THEN
      UPDATE employee_leave_balance 
      SET vacation_days_used = GREATEST(0, vacation_days_used - (
        SELECT COUNT(*)
        FROM generate_series(OLD.date_from::date, OLD.date_to::date, '1 day'::interval) AS day
        WHERE EXTRACT(DOW FROM day) BETWEEN 1 AND 5
      )),
      updated_at = now()
      WHERE user_id = OLD.user_id 
      AND year = EXTRACT(year FROM OLD.date_from);
    END IF;
    
    -- Per i permessi orari
    IF OLD.type = 'permesso' AND OLD.time_from IS NOT NULL AND OLD.time_to IS NOT NULL THEN
      UPDATE employee_leave_balance 
      SET permission_hours_used = GREATEST(0, permission_hours_used - EXTRACT(EPOCH FROM (OLD.time_to - OLD.time_from))/3600),
      updated_at = now()
      WHERE user_id = OLD.user_id 
      AND year = EXTRACT(year FROM OLD.day);
    END IF;
    
    -- Per i permessi giornalieri
    IF OLD.type = 'permesso' AND OLD.day IS NOT NULL AND OLD.time_from IS NULL AND OLD.time_to IS NULL THEN
      UPDATE employee_leave_balance 
      SET permission_hours_used = GREATEST(0, permission_hours_used - 8),
      updated_at = now()
      WHERE user_id = OLD.user_id 
      AND year = EXTRACT(year FROM OLD.day);
    END IF;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Aggiunge il trigger per le eliminazioni
DROP TRIGGER IF EXISTS leave_deletion_trigger ON leave_requests;
CREATE TRIGGER leave_deletion_trigger
  BEFORE DELETE ON leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION handle_leave_deletion();

-- Ricrea il trigger principale per aggiornamenti/inserimenti
DROP TRIGGER IF EXISTS leave_usage_trigger ON leave_requests;
CREATE TRIGGER leave_usage_trigger
  AFTER INSERT OR UPDATE ON leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION calculate_leave_usage();
