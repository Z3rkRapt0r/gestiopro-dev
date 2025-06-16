
-- Aggiungi le nuove colonne alla tabella dashboard_settings per le personalizzazioni login e loghi dipendenti
ALTER TABLE public.dashboard_settings 
ADD COLUMN IF NOT EXISTS login_logo_url TEXT,
ADD COLUMN IF NOT EXISTS login_company_name TEXT,
ADD COLUMN IF NOT EXISTS login_primary_color TEXT DEFAULT '#2563eb',
ADD COLUMN IF NOT EXISTS login_secondary_color TEXT DEFAULT '#64748b',
ADD COLUMN IF NOT EXISTS login_background_color TEXT DEFAULT '#f1f5f9',
ADD COLUMN IF NOT EXISTS employee_default_logo_url TEXT,
ADD COLUMN IF NOT EXISTS employee_logo_enabled BOOLEAN DEFAULT true;
