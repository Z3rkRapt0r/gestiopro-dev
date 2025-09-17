
-- Aggiunge il supporto per le malattie nella tabella unified_attendances
ALTER TABLE unified_attendances 
ADD COLUMN is_sick_leave boolean NOT NULL DEFAULT false;

-- Aggiunge un indice per migliorare le performance delle query
CREATE INDEX idx_unified_attendances_sick_leave ON unified_attendances(is_sick_leave) WHERE is_sick_leave = true;

-- Aggiunge commento per documentare la colonna
COMMENT ON COLUMN unified_attendances.is_sick_leave IS 'Indica se la presenza è relativa a un giorno di malattia';
