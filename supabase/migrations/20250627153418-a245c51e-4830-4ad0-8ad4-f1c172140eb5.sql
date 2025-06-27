
-- Aggiungi campo per controllare la visibilità dello storico presenze ai dipendenti
ALTER TABLE admin_settings 
ADD COLUMN hide_attendance_history_for_employees BOOLEAN DEFAULT false;

-- Commento per spiegare il campo
COMMENT ON COLUMN admin_settings.hide_attendance_history_for_employees IS 'Se true, nasconde lo storico presenze ai dipendenti normali';
