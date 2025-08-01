-- Script per aggiungere le festività italiane più comuni
-- Esegui questo script nel database Supabase per aggiungere le festività

INSERT INTO company_holidays (name, date, description, is_recurring, admin_id) VALUES
('Capodanno', '2025-01-01', 'Primo giorno dell''anno', true, (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)),
('Epifania', '2025-01-06', 'Befana', true, (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)),
('Festa della Liberazione', '2025-04-25', '25 Aprile', true, (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)),
('Festa del Lavoro', '2025-05-01', '1° Maggio', true, (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)),
('Festa della Repubblica', '2025-06-02', '2 Giugno', true, (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)),
('Ferragosto', '2025-08-15', 'Assunzione di Maria', true, (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)),
('Ognissanti', '2025-11-01', 'Festa di Tutti i Santi', true, (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)),
('Immacolata Concezione', '2025-12-08', 'Immacolata', true, (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)),
('Natale', '2025-12-25', 'Natività di Gesù', true, (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)),
('Santo Stefano', '2025-12-26', 'Primo giorno dopo Natale', true, (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1))
ON CONFLICT (date, is_recurring) DO NOTHING; 