
-- Aggiungi una colonna per collegare le richieste di ferie/permessi ai bilanci
ALTER TABLE leave_requests 
ADD COLUMN leave_balance_id uuid REFERENCES employee_leave_balance(id);

-- Crea una funzione per calcolare automaticamente le ore/giorni utilizzati
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
    IF NEW.type = 'ferie' AND NEW.date_from IS NOT NULL AND NEW.date_to IS NOT NULL THEN
      UPDATE employee_leave_balance 
      SET vacation_days_used = vacation_days_used - (
        SELECT COUNT(*)
        FROM generate_series(NEW.date_from::date, NEW.date_to::date, '1 day'::interval) AS day
        WHERE EXTRACT(DOW FROM day) BETWEEN 1 AND 5
      ),
      updated_at = now()
      WHERE user_id = NEW.user_id 
      AND year = EXTRACT(year FROM NEW.date_from);
    END IF;
    
    -- Per i permessi orari
    IF NEW.type = 'permesso' AND NEW.time_from IS NOT NULL AND NEW.time_to IS NOT NULL THEN
      UPDATE employee_leave_balance 
      SET permission_hours_used = permission_hours_used - EXTRACT(EPOCH FROM (NEW.time_to - NEW.time_from))/3600,
      updated_at = now()
      WHERE user_id = NEW.user_id 
      AND year = EXTRACT(year FROM NEW.day);
    END IF;
    
    -- Per i permessi giornalieri
    IF NEW.type = 'permesso' AND NEW.day IS NOT NULL AND NEW.time_from IS NULL AND NEW.time_to IS NULL THEN
      UPDATE employee_leave_balance 
      SET permission_hours_used = permission_hours_used - 8,
      updated_at = now()
      WHERE user_id = NEW.user_id 
      AND year = EXTRACT(year FROM NEW.day);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crea il trigger per aggiornare automaticamente i bilanci
DROP TRIGGER IF EXISTS leave_usage_trigger ON leave_requests;
CREATE TRIGGER leave_usage_trigger
  AFTER INSERT OR UPDATE ON leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION calculate_leave_usage();

-- Aggiungi indici per migliorare le performance
CREATE INDEX IF NOT EXISTS idx_leave_requests_user_year ON leave_requests(user_id, EXTRACT(year FROM COALESCE(date_from, day)));
CREATE INDEX IF NOT EXISTS idx_employee_leave_balance_user_year ON employee_leave_balance(user_id, year);
